/**
 * Serene Web Audio API Sound Synthesizer
 * Provides authentic Korean temple bells (범종), Singing Bowls (싱잉볼),
 * Wooden Fish Moktak (목탁), and soothing nature noise textures.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioNode | null = null;
  private ambientGain: GainNode | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Resonant Temple Bell / Gong (범종 / 맑은 종소리)
   */
  public playTempleGong(baseFreq = 220) {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Master output
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.6, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
      masterGain.connect(ctx.destination);

      // Bell partial harmonics
      const partials = [
        { mult: 1.0, gain: 0.5, decay: 4.5 },
        { mult: 2.76, gain: 0.25, decay: 3.2 },
        { mult: 5.4, gain: 0.15, decay: 2.0 },
        { mult: 8.93, gain: 0.08, decay: 1.2 },
      ];

      partials.forEach(({ mult, gain, decay }) => {
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now);

        pGain.gain.setValueAtTime(gain, now);
        pGain.gain.exponentialRampToValueAtTime(0.00001, now + decay);

        osc.connect(pGain);
        pGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + decay + 0.1);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Wooden Moktak (목탁 소리) - Authentic Korean Temple Wood Percussion
   * Uses dual resonant wood modes (680Hz and 1020Hz) with sharp natural attack
   * and clean decay without cartoon pitch sliding.
   */
  public playMoktak() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Primary hollow wood body resonance (680 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(680, now);
      gain1.gain.setValueAtTime(0.55, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.09);

      // Secondary upper wood harmonic resonance (1020 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1020, now);
      gain2.gain.setValueAtTime(0.35, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.07);

      // Sharp initial wooden mallet tap click
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'sine';
      click.frequency.setValueAtTime(1350, now);
      clickGain.gain.setValueAtTime(0.2, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(now);
      click.stop(now + 0.02);
    } catch {
      // ignore
    }
  }

  /**
   * Pure Meditation Singing Bowl (싱잉볼)
   */
  public playSingingBowl() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.4, now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 5.0);
      master.connect(ctx.destination);

      // Two slightly detuned oscillators create acoustic binaural beating
      [432, 434].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(master);
        osc.start(now);
        osc.stop(now + 5.0);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Ambient Stream & Wind Sound
   */
  public startAmbient(type: 'breeze' | 'stream' | 'bamboo' = 'breeze') {
    this.stopAmbient();
    try {
      const ctx = this.initContext();
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Generate soft pink-ish noise
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        output[i] = (b0 + b1 + b2) * 0.2;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter based on ambient type
      const filter = ctx.createBiquadFilter();
      if (type === 'stream') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);
      } else if (type === 'bamboo') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);
      } else {
        // mountain breeze
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, ctx.currentTime);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.5);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
      this.ambientSource = whiteNoise;
      this.ambientGain = gain;
    } catch {
      // ignore
    }
  }

  public stopAmbient() {
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
        setTimeout(() => {
          if (this.ambientSource) {
            try {
              (this.ambientSource as AudioBufferSourceNode).stop();
              this.ambientSource.disconnect();
            } catch {
              // ignore
            }
            this.ambientSource = null;
          }
        }, 900);
      } catch {
        this.ambientSource = null;
      }
    }
  }
}

export const sound = new SoundEngine();
