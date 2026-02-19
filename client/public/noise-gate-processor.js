class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.enabled = false;
    this.thresholdDb = -55;
    // Soft expander controls (transparent noise reduction; avoids "breaking" speech).
    this.kneeDb = 10;
    this.ratio = 2.0;
    this.reductionDb = 12;
    this.attackMs = 10;
    this.releaseMs = 200;
    this.currentGain = 1.0;

    this.port.onmessage = (event) => {
      const d = event.data || {};
      if (d.type !== "set") return;
      if (typeof d.enabled === "boolean") this.enabled = d.enabled;
      if (typeof d.thresholdDb === "number") this.thresholdDb = d.thresholdDb;
      if (typeof d.kneeDb === "number") this.kneeDb = d.kneeDb;
      if (typeof d.ratio === "number") this.ratio = d.ratio;
      if (typeof d.reductionDb === "number") this.reductionDb = d.reductionDb;
      if (typeof d.attackMs === "number") this.attackMs = d.attackMs;
      if (typeof d.releaseMs === "number") this.releaseMs = d.releaseMs;
    };
  }

  static get parameterDescriptors() {
    return [];
  }

  dbToGain(db) {
    return Math.pow(10, db / 20);
  }

  clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;

    const inCh0 = input[0];
    const blockSize = inCh0 ? inCh0.length : 128;

    // Compute block RMS across all available channels.
    let sumSq = 0;
    let n = 0;
    for (let ch = 0; ch < input.length; ch++) {
      const chIn = input[ch];
      if (!chIn) continue;
      for (let i = 0; i < chIn.length; i++) {
        const s = chIn[i];
        sumSq += s * s;
      }
      n += chIn.length;
    }
    const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
    const rmsDb = 20 * Math.log10(Math.max(1e-8, rms));

    const maxReductionDb = Math.abs(this.reductionDb);
    const knee = Math.max(0, this.kneeDb);
    const ratio = this.clamp(this.ratio, 1.0, 8.0);

    // Downward expander:
    // - above threshold -> 0 dB gain
    // - below threshold -> gradually attenuate, capped at -reductionDb
    let gainDb = 0;
    if (this.enabled) {
      const delta = this.thresholdDb - rmsDb; // >0 means "below threshold"
      if (delta > 0) {
        // Soft knee: small deltas attenuate less to avoid chopping consonants.
        const k = knee > 0 ? this.clamp(delta / knee, 0, 1) : 1;
        const kneeScale = knee > 0 ? k * k : 1;
        const effectiveDelta = delta * kneeScale;
        gainDb = -Math.min(maxReductionDb, effectiveDelta * (ratio - 1));
      }
    }

    const targetGain = this.dbToGain(gainDb);

    const attackSec = Math.max(0.001, this.attackMs / 1000);
    const releaseSec = Math.max(0.005, this.releaseMs / 1000);
    const timeConst = targetGain < this.currentGain ? attackSec : releaseSec;
    const coef = Math.exp(-blockSize / (sampleRate * timeConst));
    this.currentGain = targetGain + (this.currentGain - targetGain) * coef;

    for (let ch = 0; ch < output.length; ch++) {
      const chIn = input[ch] || input[0];
      const chOut = output[ch];
      if (!chIn || !chOut) continue;
      for (let i = 0; i < chOut.length; i++) {
        chOut[i] = chIn[i] * this.currentGain;
      }
    }

    return true;
  }
}

registerProcessor("noise-gate-processor", NoiseGateProcessor);

