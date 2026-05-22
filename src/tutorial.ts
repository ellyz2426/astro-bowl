/**
 * Astro Bowl VR — Tutorial System
 * Step-by-step interactive guide for first-time players.
 * Covers aiming, power control, ball types, and VR-specific instructions.
 */

export interface TutorialStep {
  id: string;
  title: string;
  message: string;
  subMessage: string;
  highlightElement?: string; // CSS selector to highlight
  waitForAction?: string; // action name to wait for
  duration?: number; // auto-advance after ms
  position: 'center' | 'bottom' | 'top';
}

const BROWSER_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'WELCOME TO ASTRO BOWL',
    message: 'A holodeck bowling experience in VR and browser.',
    subMessage: 'Let\'s learn the basics!',
    duration: 3000,
    position: 'center',
  },
  {
    id: 'aim',
    title: 'AIMING',
    message: 'Click and drag left or right to aim your throw.',
    subMessage: 'The trajectory line shows where the ball will go.',
    waitForAction: 'startCharge',
    position: 'bottom',
  },
  {
    id: 'power',
    title: 'POWER',
    message: 'Hold the mouse button to charge power.',
    subMessage: 'The power bar oscillates — release at the right moment!',
    waitForAction: 'throw',
    position: 'bottom',
  },
  {
    id: 'scoring',
    title: 'SCORING',
    message: 'Knock down all 10 pins for a STRIKE! Clear remaining pins for a SPARE.',
    subMessage: 'Strikes and spares earn bonus points from future rolls.',
    duration: 4000,
    position: 'top',
  },
  {
    id: 'balls',
    title: 'BALL TYPES',
    message: 'Try different balls from the main menu — each has unique properties.',
    subMessage: 'Curve balls hook, Heavy balls demolish, Phantom balls phase through!',
    duration: 4000,
    position: 'center',
  },
  {
    id: 'shortcuts',
    title: 'KEYBOARD SHORTCUTS',
    message: 'ESC = Pause · Enter/Space = Confirm · Backspace = Back',
    subMessage: 'Now go bowl a perfect game! 🎳',
    duration: 3500,
    position: 'center',
  },
];

const VR_STEPS: TutorialStep[] = [
  {
    id: 'welcome_vr',
    title: 'WELCOME TO ASTRO BOWL VR',
    message: 'Grab, aim, and throw — just like real bowling!',
    subMessage: 'Let\'s learn the VR controls.',
    duration: 3000,
    position: 'center',
  },
  {
    id: 'grab_vr',
    title: 'GRABBING THE BALL',
    message: 'Squeeze the GRIP button on your right controller to pick up the ball.',
    subMessage: 'The ball is on the return rack to your right.',
    waitForAction: 'grab',
    position: 'bottom',
  },
  {
    id: 'throw_vr',
    title: 'THROWING',
    message: 'Swing your arm forward and release GRIP or press TRIGGER to throw.',
    subMessage: 'Your throw speed and direction come from your hand movement!',
    waitForAction: 'throw',
    position: 'bottom',
  },
  {
    id: 'buttons_vr',
    title: 'BUTTONS',
    message: 'A = Confirm / Quick Throw · B = Back / Pause',
    subMessage: 'Use the thumbstick to navigate menus.',
    duration: 4000,
    position: 'center',
  },
  {
    id: 'ready_vr',
    title: 'READY TO BOWL!',
    message: 'Strikes, spares, and challenges await.',
    subMessage: 'Bowl a perfect 300! 🎳',
    duration: 3000,
    position: 'center',
  },
];

export class TutorialManager {
  private storageKey = 'astro-bowl-tutorial-complete';
  private overlay: HTMLDivElement;
  private steps: TutorialStep[] = [];
  private currentStep: number = -1;
  isActive: boolean = false;
  private autoAdvanceTimer: number | null = null;
  private onComplete: () => void = () => {};
  private onStepAction: Map<string, () => void> = new Map();

  // Callback for when a game action matches waitForAction
  pendingAction: string | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'tutorial-overlay';
    this.overlay.innerHTML = `
      <style>
        #tutorial-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 300;
          font-family: 'Courier New', monospace;
        }
        .tutorial-card {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 10, 25, 0.92);
          border: 2px solid rgba(0, 255, 255, 0.6);
          border-radius: 12px;
          padding: 20px 32px;
          text-align: center;
          max-width: 500px;
          width: 85%;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.15);
          animation: tutorialFadeIn 0.4s ease-out;
        }
        .tutorial-card.pos-center { top: 50%; transform: translate(-50%, -50%); }
        .tutorial-card.pos-top { top: 100px; }
        .tutorial-card.pos-bottom { bottom: 120px; }
        .tutorial-step-indicator {
          font-size: 10px;
          color: rgba(0, 255, 255, 0.4);
          margin-bottom: 8px;
          letter-spacing: 3px;
        }
        .tutorial-title {
          font-size: 22px;
          font-weight: bold;
          color: #00ffff;
          text-shadow: 0 0 12px rgba(0, 255, 255, 0.4);
          margin-bottom: 8px;
        }
        .tutorial-message {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.5;
          margin-bottom: 6px;
        }
        .tutorial-sub {
          font-size: 12px;
          color: rgba(0, 255, 255, 0.6);
          margin-bottom: 12px;
        }
        .tutorial-skip {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          pointer-events: auto;
          padding: 4px 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          background: transparent;
          font-family: 'Courier New', monospace;
          transition: all 0.2s;
        }
        .tutorial-skip:hover {
          color: rgba(255, 255, 255, 0.7);
          border-color: rgba(255, 255, 255, 0.4);
        }
        .tutorial-dots {
          margin-top: 12px;
        }
        .tutorial-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(0, 255, 255, 0.2);
          margin: 0 3px;
          transition: all 0.3s;
        }
        .tutorial-dot.active {
          background: #00ffff;
          box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
        }
        .tutorial-dot.done {
          background: rgba(0, 255, 255, 0.5);
        }
        @keyframes tutorialFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .pos-top @keyframes tutorialFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>
      <div id="tutorial-card-container"></div>
    `;
    document.body.appendChild(this.overlay);
  }

  hasCompleted(): boolean {
    try {
      return localStorage.getItem(this.storageKey) === 'true';
    } catch {
      return false;
    }
  }

  markComplete() {
    try {
      localStorage.setItem(this.storageKey, 'true');
    } catch {}
  }

  start(isVR: boolean, onComplete: () => void) {
    this.steps = isVR ? VR_STEPS : BROWSER_STEPS;
    this.currentStep = -1;
    this.isActive = true;
    this.onComplete = onComplete;
    this.nextStep();
  }

  skip() {
    this.isActive = false;
    this.markComplete();
    this.clearCard();
    this.onComplete();
  }

  /**
   * Notify the tutorial that a game action occurred.
   * Returns true if the tutorial consumed the action (advance to next step).
   */
  notifyAction(action: string): boolean {
    if (!this.isActive || this.currentStep < 0) return false;
    const step = this.steps[this.currentStep];
    if (step && step.waitForAction === action) {
      this.nextStep();
      return true;
    }
    return false;
  }

  private nextStep() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }

    this.currentStep++;
    if (this.currentStep >= this.steps.length) {
      this.isActive = false;
      this.markComplete();
      this.clearCard();
      this.onComplete();
      return;
    }

    const step = this.steps[this.currentStep];
    this.showCard(step);

    if (step.duration) {
      this.autoAdvanceTimer = window.setTimeout(() => {
        this.nextStep();
      }, step.duration);
    }
  }

  private showCard(step: TutorialStep) {
    const container = document.getElementById('tutorial-card-container')!;
    const posClass = `pos-${step.position}`;
    const stepNum = this.currentStep + 1;
    const totalSteps = this.steps.length;

    let dots = '<div class="tutorial-dots">';
    for (let i = 0; i < totalSteps; i++) {
      const cls = i < this.currentStep ? 'done' : i === this.currentStep ? 'active' : '';
      dots += `<span class="tutorial-dot ${cls}"></span>`;
    }
    dots += '</div>';

    container.innerHTML = `
      <div class="tutorial-card ${posClass}">
        <div class="tutorial-step-indicator">STEP ${stepNum} / ${totalSteps}</div>
        <div class="tutorial-title">${step.title}</div>
        <div class="tutorial-message">${step.message}</div>
        <div class="tutorial-sub">${step.subMessage}</div>
        ${dots}
        <button class="tutorial-skip" onclick="window.__tutorialSkip()">SKIP TUTORIAL</button>
      </div>
    `;

    (window as any).__tutorialSkip = () => this.skip();
  }

  private clearCard() {
    const container = document.getElementById('tutorial-card-container');
    if (container) container.innerHTML = '';
  }
}
