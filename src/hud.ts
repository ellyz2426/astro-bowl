/**
 * Astro Bowl VR — HUD System
 * Bowling scorecard, current frame indicator, pins remaining, power meter.
 */
export class HUDManager {
  private container: HTMLDivElement;
  private scorecard: HTMLDivElement;
  private frameIndicator: HTMLDivElement;
  private pinDisplay: HTMLDivElement;
  private powerBar: HTMLDivElement;
  private messageDisplay: HTMLDivElement;
  private visible: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    this.container.innerHTML = `
      <style>
        #hud-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          font-family: 'Courier New', monospace;
          z-index: 100;
          display: none;
        }
        #hud-container.visible { display: block; }

        .hud-scorecard {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 10, 20, 0.85);
          border: 1px solid rgba(0, 255, 255, 0.4);
          border-radius: 6px;
          padding: 8px 12px;
          color: #00ffff;
          font-size: 11px;
          backdrop-filter: blur(4px);
          min-width: 580px;
        }
        .hud-scorecard table {
          width: 100%;
          border-collapse: collapse;
        }
        .hud-scorecard th, .hud-scorecard td {
          border: 1px solid rgba(0, 255, 255, 0.2);
          padding: 3px 6px;
          text-align: center;
          min-width: 38px;
        }
        .hud-scorecard th {
          color: rgba(0, 255, 255, 0.6);
          font-size: 9px;
          font-weight: normal;
        }
        .hud-scorecard .roll-cell {
          font-size: 10px;
          height: 18px;
          color: #ffffff;
        }
        .hud-scorecard .score-cell {
          font-size: 13px;
          font-weight: bold;
          height: 22px;
          color: #00ffff;
        }
        .hud-scorecard .active-frame {
          background: rgba(0, 255, 255, 0.1);
          border-color: rgba(0, 255, 255, 0.5);
        }
        .hud-scorecard .strike { color: #ff4444; }
        .hud-scorecard .spare { color: #ffaa00; }

        .hud-frame-indicator {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 10, 20, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 8px 20px;
          color: #ffffff;
          font-size: 16px;
          text-align: center;
        }
        .hud-frame-indicator .frame-num {
          color: #00ffff;
          font-size: 24px;
          font-weight: bold;
        }
        .hud-frame-indicator .roll-num {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
        }

        .hud-pin-display {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 10, 20, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .pin-grid {
          display: grid;
          grid-template-columns: repeat(4, 22px);
          gap: 4px;
          justify-items: center;
        }
        .pin-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid rgba(0, 255, 255, 0.5);
          transition: all 0.3s;
        }
        .pin-dot.standing {
          background: #00ffff;
          box-shadow: 0 0 6px rgba(0, 255, 255, 0.5);
        }
        .pin-dot.down {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .pin-count {
          color: #00ffff;
          font-size: 18px;
          margin-top: 8px;
          font-weight: bold;
        }

        .hud-power-bar {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 30px;
          height: 200px;
          background: rgba(0, 10, 20, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 4px;
          display: none;
        }
        .power-fill {
          position: absolute;
          bottom: 0;
          width: 100%;
          background: linear-gradient(to top, #00ff44, #ffff00, #ff4444);
          border-radius: 0 0 4px 4px;
          transition: height 0.05s;
        }
        .power-label {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          color: #00ffff;
          font-size: 10px;
          white-space: nowrap;
        }

        .hud-message {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ffffff;
          font-size: 48px;
          font-weight: bold;
          text-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4);
          text-align: center;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .hud-message.show { opacity: 1; }
        .hud-message .sub-message {
          font-size: 18px;
          color: rgba(0, 255, 255, 0.8);
          margin-top: 8px;
        }

        .hud-total {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 10, 20, 0.85);
          border: 1px solid rgba(0, 255, 255, 0.4);
          border-radius: 8px;
          padding: 8px 16px;
          color: #00ffff;
          font-size: 14px;
        }
        .hud-total .total-score {
          font-size: 32px;
          font-weight: bold;
        }
      </style>
      <div class="hud-scorecard" id="hud-scorecard"></div>
      <div class="hud-frame-indicator" id="hud-frame-indicator"></div>
      <div class="hud-pin-display" id="hud-pin-display"></div>
      <div class="hud-power-bar" id="hud-power-bar">
        <div class="power-label">POWER</div>
        <div class="power-fill" id="power-fill"></div>
      </div>
      <div class="hud-message" id="hud-message"></div>
      <div class="hud-total" id="hud-total"></div>
    `;
    document.body.appendChild(this.container);

    this.scorecard = document.getElementById('hud-scorecard') as HTMLDivElement;
    this.frameIndicator = document.getElementById('hud-frame-indicator') as HTMLDivElement;
    this.pinDisplay = document.getElementById('hud-pin-display') as HTMLDivElement;
    this.powerBar = document.getElementById('hud-power-bar') as HTMLDivElement;
    this.messageDisplay = document.getElementById('hud-message') as HTMLDivElement;
  }

  show() {
    this.visible = true;
    this.container.classList.add('visible');
  }

  hide() {
    this.visible = false;
    this.container.classList.remove('visible');
  }

  updateScorecard(frames: { rolls: number[]; score: number | null; isStrike: boolean; isSpare: boolean }[], currentFrame: number) {
    let html = '<table><tr>';
    for (let i = 0; i < 10; i++) {
      const colspan = i === 9 ? 3 : 2;
      const active = i === currentFrame ? ' active-frame' : '';
      html += `<th colspan="${colspan}" class="${active}">F${i + 1}</th>`;
    }
    html += '</tr><tr>';

    for (let i = 0; i < 10; i++) {
      const frame = frames[i];
      const active = i === currentFrame ? ' active-frame' : '';

      if (i < 9) {
        // Normal frame: 2 cells
        let r1 = '', r2 = '';
        if (frame.isStrike) {
          r1 = '';
          r2 = '<span class="strike">X</span>';
        } else if (frame.rolls.length > 0) {
          r1 = frame.rolls[0] === 0 ? '-' : frame.rolls[0].toString();
          if (frame.rolls.length > 1) {
            if (frame.isSpare) {
              r2 = '<span class="spare">/</span>';
            } else {
              r2 = frame.rolls[1] === 0 ? '-' : frame.rolls[1].toString();
            }
          }
        }
        html += `<td class="roll-cell${active}">${r1}</td><td class="roll-cell${active}">${r2}</td>`;
      } else {
        // 10th frame: 3 cells
        let cells = ['', '', ''];
        for (let j = 0; j < frame.rolls.length; j++) {
          const r = frame.rolls[j];
          if (r === 10) {
            cells[j] = '<span class="strike">X</span>';
          } else if (j > 0 && frame.rolls[j - 1] !== 10 && frame.rolls[j - 1] + r === 10) {
            cells[j] = '<span class="spare">/</span>';
          } else {
            cells[j] = r === 0 ? '-' : r.toString();
          }
        }
        html += `<td class="roll-cell${active}">${cells[0]}</td><td class="roll-cell${active}">${cells[1]}</td><td class="roll-cell${active}">${cells[2]}</td>`;
      }
    }

    html += '</tr><tr>';
    for (let i = 0; i < 10; i++) {
      const colspan = i === 9 ? 3 : 2;
      const active = i === currentFrame ? ' active-frame' : '';
      const score = frames[i].score !== null ? frames[i].score : '';
      html += `<td colspan="${colspan}" class="score-cell${active}">${score}</td>`;
    }
    html += '</tr></table>';
    this.scorecard.innerHTML = html;
  }

  updateFrameIndicator(frame: number, roll: number, ballType: string) {
    this.frameIndicator.innerHTML = `
      <div class="roll-num">FRAME</div>
      <div class="frame-num">${frame + 1}</div>
      <div class="roll-num">Ball ${roll + 1} · ${ballType}</div>
    `;
  }

  updatePinDisplay(pinsStanding: boolean[]) {
    // Bowling pin triangle layout: row 4 (7-8-9-10), row 3 (4-5-6), row 2 (2-3), row 1 (1)
    const rows = [
      [6, 7, 8, 9],   // Back row
      [-1, 3, 4, 5],   // -1 = spacer
      [-1, -1, 1, 2],
      [-1, -1, -1, 0], // Headpin
    ];

    let html = '<div class="pin-grid">';
    // We need a custom layout, not a simple grid
    html = '<div style="text-align:center">';

    // Row 4 (pins 7,8,9,10)
    html += '<div style="display:flex; justify-content:center; gap:4px; margin-bottom:3px">';
    for (const idx of [6, 7, 8, 9]) {
      const cls = pinsStanding[idx] ? 'standing' : 'down';
      html += `<div class="pin-dot ${cls}"></div>`;
    }
    html += '</div>';

    // Row 3 (pins 4,5,6)
    html += '<div style="display:flex; justify-content:center; gap:4px; margin-bottom:3px">';
    for (const idx of [3, 4, 5]) {
      const cls = pinsStanding[idx] ? 'standing' : 'down';
      html += `<div class="pin-dot ${cls}"></div>`;
    }
    html += '</div>';

    // Row 2 (pins 2,3)
    html += '<div style="display:flex; justify-content:center; gap:4px; margin-bottom:3px">';
    for (const idx of [1, 2]) {
      const cls = pinsStanding[idx] ? 'standing' : 'down';
      html += `<div class="pin-dot ${cls}"></div>`;
    }
    html += '</div>';

    // Row 1 (pin 1 - headpin)
    html += '<div style="display:flex; justify-content:center; gap:4px">';
    const cls = pinsStanding[0] ? 'standing' : 'down';
    html += `<div class="pin-dot ${cls}"></div>`;
    html += '</div>';

    const count = pinsStanding.filter(p => p).length;
    html += `<div class="pin-count">${count}/10</div>`;
    html += '</div>';
    this.pinDisplay.innerHTML = html;
  }

  showPowerBar() {
    this.powerBar.style.display = 'block';
  }

  hidePowerBar() {
    this.powerBar.style.display = 'none';
  }

  setPower(power: number) {
    const fill = document.getElementById('power-fill');
    if (fill) {
      fill.style.height = `${Math.min(100, power * 100)}%`;
    }
  }

  showMessage(text: string, subText?: string, duration: number = 2000) {
    let html = text;
    if (subText) html += `<div class="sub-message">${subText}</div>`;
    this.messageDisplay.innerHTML = html;
    this.messageDisplay.classList.add('show');

    setTimeout(() => {
      this.messageDisplay.classList.remove('show');
    }, duration);
  }

  updateTotal(score: number) {
    const total = document.getElementById('hud-total');
    if (total) {
      total.innerHTML = `
        <div style="font-size: 11px; color: rgba(0,255,255,0.6)">TOTAL</div>
        <div class="total-score">${score}</div>
      `;
    }
  }
}
