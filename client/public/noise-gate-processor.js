class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.enabled = false;
    this.thresholdDb = -55;
    this.hysteresisDb = 6;
    this.reductionDb = 18;
    this.attackMs = 10;
    this.releaseMs = 200;
    this.holdMs = 120;
    this.currentGain = 1.0;
    this.isOpen = true;
    this.holdSamplesLeft = 0;

    this.port.onmessage = (event) => {
      const d = event.data || {};
      if (d.type !== "set") return;
      if (typeof d.enabled === "boolean") this.enabled = d.enabled;
      if (typeof d.thresholdDb === "number") this.thresholdDb = d.thresholdDb;
      if (typeof d.hysteresisDb === "number") this.hysteresisDb = d.hysteresisDb;
      if (typeof d.reductionDb === "number") this.reductionDb = d.reductionDb;
      if (typeof d.attackMs === "number") this.attackMs = d.attackMs;
      if (typeof d.releaseMs === "number") this.releaseMs = d.releaseMs;
      if (typeof d.holdMs === "number") this.holdMs = d.holdMs;
    };
  }

  static get parameterDescriptors() {
    return [];
  }

  dbToGain(db) {
    return Math.pow(10, db / 20);
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

    const minGain = this.dbToGain(-Math.abs(this.reductionDb));

    const openThreshold = this.thresholdDb;
    const closeThreshold = this.thresholdDb - Math.max(0, this.hysteresisDb);

    if (!this.enabled) {
      this.isOpen = true;
      this.holdSamplesLeft = 0;
    } else {
      if (this.isOpen) {
        if (rmsDb < closeThreshold) {
          // Give speech tails a moment before closing.
          if (this.holdSamplesLeft <= 0) {
            this.holdSamplesLeft = Math.round((this.holdMs / 1000) * sampleRate);
          }
          this.holdSamplesLeft = Math.max(0, this.holdSamplesLeft - blockSize);
          if (this.holdSamplesLeft === 0) {
            this.isOpen = false;
          }
        } else {
          this.holdSamplesLeft = 0;
        }
      } else {
        // Closed: reopen only when signal is clearly above threshold.
        if (rmsDb >= openThreshold) {
          this.isOpen = true;
          this.holdSamplesLeft = 0;
        }
      }
    }

    const targetGain = this.enabled && !this.isOpen ? minGain : 1.0;

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

