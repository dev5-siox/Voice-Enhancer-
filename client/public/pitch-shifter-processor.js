class PitchShifterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.grainSize = 1024;
    this.hopSize = 256;
    this.pitchRatio = 1.0;
    this.targetPitchRatio = 1.0;

    const bufSize = 16384;
    this.inputRing = new Float32Array(bufSize);
    this.inputRingLen = bufSize;
    this.inputWritePos = 0;
    this.inputReadPos = 0;
    this.inputAvailable = 0;

    this.outputRing = new Float32Array(bufSize);
    this.outputRingLen = bufSize;
    this.outputReadPos = 0;
    this.grainWritePos = 0;
    this.outputFrontier = 0;

    this.window = new Float32Array(this.grainSize);
    this.windowSum = new Float32Array(bufSize);
    for (let i = 0; i < this.grainSize; i++) {
      this.window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.grainSize - 1)));
    }

    this.started = false;

    this.port.onmessage = (event) => {
      if (event.data.type === 'setPitchRatio') {
        this.targetPitchRatio = Math.max(0.5, Math.min(2.0, event.data.value));
      }
    };
  }

  static get parameterDescriptors() {
    return [];
  }

  ringDist(writePos, readPos, len) {
    return (writePos - readPos + len) % len;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0] || !output || !output[0]) return true;

    const inCh = input[0];
    const outCh = output[0];
    const blockSize = inCh.length;

    const smooth = 0.05;
    this.pitchRatio += (this.targetPitchRatio - this.pitchRatio) * smooth;
    if (Math.abs(this.pitchRatio - this.targetPitchRatio) < 0.001) {
      this.pitchRatio = this.targetPitchRatio;
    }

    if (Math.abs(this.pitchRatio - 1.0) < 0.01) {
      for (let i = 0; i < blockSize; i++) {
        outCh[i] = inCh[i];
      }
      this.inputAvailable = 0;
      this.started = false;
      return true;
    }

    for (let i = 0; i < blockSize; i++) {
      this.inputRing[this.inputWritePos] = inCh[i];
      this.inputWritePos = (this.inputWritePos + 1) % this.inputRingLen;
      this.inputAvailable++;
    }

    if (this.inputAvailable > this.inputRingLen - this.grainSize * 2) {
      const excess = this.inputAvailable - (this.inputRingLen - this.grainSize * 2);
      this.inputReadPos = (this.inputReadPos + excess) % this.inputRingLen;
      this.inputAvailable -= excess;
    }

    while (this.inputAvailable >= this.grainSize) {
      this.synthesizeGrain();
    }

    const outputAvailable = this.ringDist(this.outputFrontier, this.outputReadPos, this.outputRingLen);

    for (let i = 0; i < blockSize; i++) {
      if (i < outputAvailable) {
        let sample = this.outputRing[this.outputReadPos];
        const norm = this.windowSum[this.outputReadPos];
        if (norm > 0.001) {
          sample /= norm;
        }
        outCh[i] = sample;
        this.outputRing[this.outputReadPos] = 0;
        this.windowSum[this.outputReadPos] = 0;
        this.outputReadPos = (this.outputReadPos + 1) % this.outputRingLen;
      } else {
        outCh[i] = 0;
      }
    }

    return true;
  }

  synthesizeGrain() {
    const gs = this.grainSize;
    const ratio = this.pitchRatio;
    const inputSpan = Math.min(Math.round(gs * ratio), this.inputAvailable);
    if (inputSpan < 2) {
      const inputHop = Math.max(1, Math.round(this.hopSize * ratio));
      this.inputReadPos = (this.inputReadPos + inputHop) % this.inputRingLen;
      this.inputAvailable = Math.max(0, this.inputAvailable - inputHop);
      return;
    }

    for (let i = 0; i < gs; i++) {
      const srcPos = (i / (gs - 1)) * (inputSpan - 1);
      const srcFloor = Math.floor(srcPos);
      const frac = srcPos - srcFloor;

      const idx0 = (this.inputReadPos + srcFloor) % this.inputRingLen;
      const idx1 = (this.inputReadPos + Math.min(srcFloor + 1, inputSpan - 1)) % this.inputRingLen;

      const s0 = this.inputRing[idx0];
      const s1 = this.inputRing[idx1];
      const sample = (s0 + frac * (s1 - s0)) * this.window[i];

      const outIdx = (this.grainWritePos + i) % this.outputRingLen;
      this.outputRing[outIdx] += sample;
      this.windowSum[outIdx] += this.window[i];
    }

    const grainEnd = (this.grainWritePos + gs) % this.outputRingLen;
    const currentFrontierDist = this.ringDist(this.outputFrontier, this.outputReadPos, this.outputRingLen);
    const newEndDist = this.ringDist(grainEnd, this.outputReadPos, this.outputRingLen);
    if (newEndDist > currentFrontierDist) {
      this.outputFrontier = grainEnd;
    }

    this.grainWritePos = (this.grainWritePos + this.hopSize) % this.outputRingLen;

    const inputHop = Math.max(1, Math.round(this.hopSize * ratio));
    this.inputReadPos = (this.inputReadPos + inputHop) % this.inputRingLen;
    this.inputAvailable = Math.max(0, this.inputAvailable - inputHop);
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
