/**
 * Bộ tổng hợp âm thanh Web Audio API nhẹ (0 file audio ngoài) cho hành động và Luyện Cổ.
 * Tự mở khóa AudioContext ở lần chạm đầu tiên trên iOS Safari / WKWebView.
 */
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  play(kind) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || this.ctx.state !== "running") return;

    const now = this.ctx.currentTime;
    const tone = (type, f0, f1, dur, gainVal = 0.08, delay = 0) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), now + delay + dur);
      gain.gain.setValueAtTime(gainVal, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur);
    };

    switch (kind) {
      case "slash":
        tone("triangle", 640, 220, 0.11, 0.09);
        break;
      case "blood":
        tone("sine", 420, 680, 0.09, 0.06);
        tone("sine", 540, 320, 0.12, 0.05, 0.05);
        break;
      case "poison":
        tone("sawtooth", 210, 110, 0.18, 0.05);
        break;
      case "dash":
        tone("sine", 340, 820, 0.12, 0.06);
        break;
      case "fire":
        tone("sawtooth", 180, 65, 0.24, 0.1);
        tone("square", 110, 48, 0.22, 0.05, 0.04);
        break;
      case "ult":
        tone("sawtooth", 300, 90, 0.3, 0.12);
        tone("triangle", 600, 140, 0.28, 0.09, 0.04);
        break;
      case "hit":
        tone("square", 160, 65, 0.07, 0.05);
        break;
      case "hurt":
        tone("sawtooth", 190, 75, 0.16, 0.09);
        break;
      case "pickup":
        tone("triangle", 520, 880, 0.1, 0.07);
        tone("triangle", 780, 1120, 0.12, 0.06, 0.07);
        break;
      case "fusionSuccess":
        tone("triangle", 440, 660, 0.14, 0.08);
        tone("triangle", 660, 990, 0.18, 0.08, 0.12);
        tone("sine", 880, 1320, 0.26, 0.09, 0.24);
        break;
      case "fusionFail":
        tone("sawtooth", 140, 38, 0.42, 0.14);
        tone("square", 95, 32, 0.38, 0.09, 0.06);
        break;
      case "tauHoa":
        tone("sawtooth", 150, 420, 0.25, 0.1);
        tone("sawtooth", 420, 110, 0.3, 0.09, 0.2);
        break;
      case "stun":
        tone("sine", 920, 320, 0.22, 0.08);
        break;
      default:
        tone("triangle", 420, 260, 0.08, 0.05);
    }
  }
}
