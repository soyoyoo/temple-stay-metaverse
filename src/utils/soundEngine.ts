/**
 * Serene Web Audio API Sound Synthesizer
 * Provides authentic Korean temple bells (범종), Singing Bowls (싱잉볼),
 * Wooden Fish Moktak (목탁), and soothing nature noise textures.
 */

export interface DharmaTalkAudioItem {
  id: string;
  title: string;
  durationSec: number;
  fullTranscript: string;
}

export interface DharmaPlaybackState {
  activeTalk: DharmaTalkAudioItem | null;
  isPlaying: boolean;
  elapsedSec: number;
  speed: number;
  sentences: string[];
  currentSentenceIdx: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private moktakTimer: ReturnType<typeof setInterval> | null = null;
  private isPacing = false;
  private pacingBpm = 45;
  private isAmbientOn = false;
  private listeners: Set<() => void> = new Set();

  // Global Dharma talk audio state
  private dharmaTalk: DharmaTalkAudioItem | null = null;
  private dharmaPlaying = false;
  private dharmaElapsedSec = 0;
  private dharmaSpeed = 1;
  private dharmaSentences: string[] = [];
  private dharmaSentenceCharEnds: number[] = [];
  private dharmaTotalChars = 0;
  private dharmaSentenceIdx = 0;
  private dharmaAudioOffsetSec = 0;
  private dharmaTimer: ReturnType<typeof setInterval> | null = null;
  private speechSessionId = 0;
  private speechSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private activeAudioUrl: string | null = null;
  private ttsBlobCache = new Map<string, Promise<Blob | null>>();
  private ttsBlockedUntil = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      } catch {
        // ignore
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public isMoktakPacing(): boolean {
    return this.isPacing;
  }

  public isAmbientPlaying(): boolean {
    return this.isAmbientOn;
  }

  public isDharmaPlaying(): boolean {
    return this.dharmaPlaying;
  }

  public getDharmaState(): DharmaPlaybackState {
    return {
      activeTalk: this.dharmaTalk,
      isPlaying: this.dharmaPlaying,
      elapsedSec: this.dharmaElapsedSec,
      speed: this.dharmaSpeed,
      sentences: this.dharmaSentences,
      currentSentenceIdx: this.dharmaSentenceIdx,
    };
  }

  private splitSentences(transcript: string): string[] {
    const rawLines = transcript
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    for (const line of rawLines) {
      const parts = line
        .split(/(?<=[.!?。])\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of parts) {
        if (p.length <= 130) {
          chunks.push(p);
        } else {
          // Sub-split long sentences on commas to avoid Web Speech API ~15s cutoff
          const sub = p.split(/(?<=,)\s+/);
          let buf = '';
          for (const s of sub) {
            if ((buf + ' ' + s).trim().length > 120 && buf) {
              chunks.push(buf.trim());
              buf = s;
            } else {
              buf = buf ? `${buf} ${s}` : s;
            }
          }
          if (buf.trim()) chunks.push(buf.trim());
        }
      }
    }
    return chunks.length > 0 ? chunks : [transcript.trim()];
  }

  private computeSentenceOffsets(sentences: string[]) {
    const ends: number[] = [];
    let total = 0;
    for (const s of sentences) {
      total += Math.max(1, s.length);
      ends.push(total);
    }
    this.dharmaSentenceCharEnds = ends;
    this.dharmaTotalChars = Math.max(1, total);
  }

  private getSentenceIdxForRatio(ratio: number): number {
    if (this.dharmaSentences.length <= 1) return 0;
    const clamped = Math.max(0, Math.min(0.9999, ratio));
    const targetChar = clamped * this.dharmaTotalChars;
    for (let i = 0; i < this.dharmaSentenceCharEnds.length; i++) {
      if (targetChar <= this.dharmaSentenceCharEnds[i]) {
        return i;
      }
    }
    return this.dharmaSentences.length - 1;
  }

  private cancelSpeechOnly() {
    this.speechSessionId += 1;
    if (this.speechSafetyTimer) {
      clearTimeout(this.speechSafetyTimer);
      this.speechSafetyTimer = null;
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.ontimeupdate = null;
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
        this.activeAudio.pause();
        this.activeAudio.src = '';
      } catch {
        // ignore
      }
      this.activeAudio = null;
    }
    if (this.activeAudioUrl) {
      try {
        URL.revokeObjectURL(this.activeAudioUrl);
      } catch {
        // ignore
      }
      this.activeAudioUrl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  private fetchFullTalkTtsBlob(talk: DharmaTalkAudioItem): Promise<Blob | null> {
    if (Date.now() < this.ttsBlockedUntil) {
      return Promise.resolve(null);
    }

    const cacheKey = `${talk.id}:${talk.fullTranscript.trim()}`;
    const existing = this.ttsBlobCache.get(cacheKey);
    if (existing) return existing;

    const rawBase = (
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL || ''
    )
      .trim()
      .replace(/\/+$/, '');
    const ttsUrl = rawBase ? `${rawBase}/api/dharma-tts` : '/api/dharma-tts';

    const reqPromise = fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: talk.fullTranscript.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          this.ttsBlobCache.delete(cacheKey);
          if (res.status === 404 || res.status === 429 || res.status === 503) {
            const payload = await res.json().catch(() => null) as { retryAfterSec?: number } | null;
            const retrySec =
              payload && typeof payload.retryAfterSec === 'number' && payload.retryAfterSec > 0
                ? payload.retryAfterSec
                : 3600;
            this.ttsBlockedUntil = Date.now() + retrySec * 1000;
          }
          return null;
        }
        const blob = await res.blob();
        if (!blob || blob.size === 0) {
          this.ttsBlobCache.delete(cacheKey);
          return null;
        }
        return blob;
      })
      .catch(() => {
        this.ttsBlobCache.delete(cacheKey);
        return null;
      });

    if (this.ttsBlobCache.size > 30) {
      const oldest = this.ttsBlobCache.keys().next().value;
      if (oldest) this.ttsBlobCache.delete(oldest);
    }
    this.ttsBlobCache.set(cacheKey, reqPromise);
    return reqPromise;
  }

  private pickKoreanMaleVoice(): { voice: SpeechSynthesisVoice | null; isExplicitMale: boolean } {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return { voice: null, isExplicitMale: false };
    }
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      return { voice: null, isExplicitMale: false };
    }

    const koVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ko'));
    if (koVoices.length === 0) {
      return { voice: null, isExplicitMale: false };
    }

    const explicitMaleRegex =
      /\b(injoon|hyunsu|bongjin|gookmin|minho|male|man|wavenet-c|wavenet-d|standard-c|standard-d|neural2-c)\b|남성|남자|인준|현수|봉진|국민|민호/i;
    const explicitFemaleRegex =
      /\b(yuna|sora|heami|sunhi|seoyeon|jiyun|female|woman|wavenet-a|wavenet-b|standard-a|standard-b|neural2-a|neural2-b)\b|여성|여자|유나|소라|해미|선히|서연|지윤/i;

    const explicitMale = koVoices.find((v) => explicitMaleRegex.test(v.name));
    if (explicitMale) {
      return { voice: explicitMale, isExplicitMale: true };
    }

    const nonFemale = koVoices.find((v) => !explicitFemaleRegex.test(v.name));
    if (nonFemale) {
      return { voice: nonFemale, isExplicitMale: false };
    }

    return { voice: koVoices[0], isExplicitMale: false };
  }

  private startFallbackElapsedTimer() {
    if (this.dharmaTimer) {
      clearInterval(this.dharmaTimer);
      this.dharmaTimer = null;
    }
    this.dharmaTimer = setInterval(() => {
      if (!this.dharmaPlaying || !this.dharmaTalk) return;
      this.dharmaElapsedSec = Math.min(this.dharmaTalk.durationSec, this.dharmaElapsedSec + 1);
      this.notify();
    }, Math.round(1000 / this.dharmaSpeed));
  }

  private speakSentenceFallback(idx: number, sessionId: number) {
    if (!this.dharmaPlaying || sessionId !== this.speechSessionId) return;

    if (idx >= this.dharmaSentences.length) {
      this.playSingingBowl();
      this.stopDharmaTalk();
      return;
    }

    this.dharmaSentenceIdx = idx;
    this.notify();

    const sentence = this.dharmaSentences[idx];
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      const utter = new SpeechSynthesisUtterance(sentence);
      utter.lang = 'ko-KR';
      utter.rate = Math.max(0.75, Math.min(1.45, this.dharmaSpeed * 0.9));
      const { voice, isExplicitMale } = this.pickKoreanMaleVoice();
      if (voice) {
        utter.voice = voice;
      }
      // Pitch down noticeably if OS only exposes a neutral/female default voice so tone stays calm & male
      utter.pitch = isExplicitMale ? 0.86 : 0.68;
      utter.volume = 1.0;

      let advanced = false;
      const advanceNext = () => {
        if (advanced || sessionId !== this.speechSessionId || !this.dharmaPlaying) return;
        advanced = true;
        if (this.speechSafetyTimer) {
          clearTimeout(this.speechSafetyTimer);
          this.speechSafetyTimer = null;
        }
        this.speakSentenceFallback(idx + 1, sessionId);
      };

      utter.onend = () => {
        advanceNext();
      };

      utter.onerror = (ev) => {
        if (ev.error === 'interrupted' || ev.error === 'canceled') return;
        const fallbackMs = Math.max(2200, (sentence.length * 140) / this.dharmaSpeed);
        this.speechSafetyTimer = setTimeout(advanceNext, fallbackMs);
      };

      window.speechSynthesis.speak(utter);

      const maxExpectedMs = Math.max(4500, (sentence.length * 240) / this.dharmaSpeed + 2500);
      this.speechSafetyTimer = setTimeout(advanceNext, maxExpectedMs);
    } catch {
      // Fallback timer keeps text synchronized
    }
  }

  private async playFullTalkOrFallback(talk: DharmaTalkAudioItem, sessionId: number) {
    if (!this.dharmaPlaying || sessionId !== this.speechSessionId) return;

    const wavBlob = await this.fetchFullTalkTtsBlob(talk);
    if (!this.dharmaPlaying || sessionId !== this.speechSessionId) return;

    if (wavBlob) {
      try {
        const audioUrl = URL.createObjectURL(wavBlob);
        this.activeAudioUrl = audioUrl;
        const audio = new Audio(audioUrl);
        this.activeAudio = audio;
        audio.playbackRate = Math.max(0.75, Math.min(1.5, this.dharmaSpeed));
        audio.volume = 1.0;

        const applyInitialOffset = () => {
          if (sessionId !== this.speechSessionId || !this.dharmaPlaying) return;
          if (this.dharmaAudioOffsetSec > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Math.min(this.dharmaAudioOffsetSec, Math.max(0, audio.duration - 0.25));
          } else if (this.dharmaSentenceIdx > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
            const startChar =
              this.dharmaSentenceIdx > 0 ? this.dharmaSentenceCharEnds[this.dharmaSentenceIdx - 1] ?? 0 : 0;
            const ratio = startChar / this.dharmaTotalChars;
            audio.currentTime = Math.min(ratio * audio.duration, Math.max(0, audio.duration - 0.25));
          }
        };

        if (audio.readyState >= 1) {
          applyInitialOffset();
        } else {
          audio.addEventListener('loadedmetadata', applyInitialOffset, { once: true });
        }

        audio.ontimeupdate = () => {
          if (sessionId !== this.speechSessionId || !this.dharmaPlaying) return;
          const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : talk.durationSec;
          this.dharmaAudioOffsetSec = audio.currentTime;
          const nextElapsed = Math.min(talk.durationSec, Math.floor(audio.currentTime));
          const nextIdx = this.getSentenceIdxForRatio(dur > 0 ? audio.currentTime / dur : 0);
          if (nextElapsed !== this.dharmaElapsedSec || nextIdx !== this.dharmaSentenceIdx) {
            this.dharmaElapsedSec = nextElapsed;
            this.dharmaSentenceIdx = nextIdx;
            this.notify();
          }
        };

        audio.onended = () => {
          if (this.activeAudio === audio) this.activeAudio = null;
          if (this.activeAudioUrl === audioUrl) {
            URL.revokeObjectURL(audioUrl);
            this.activeAudioUrl = null;
          }
          if (sessionId === this.speechSessionId && this.dharmaPlaying) {
            this.playSingingBowl();
            this.stopDharmaTalk();
          }
        };

        audio.onerror = () => {
          if (this.activeAudio === audio) this.activeAudio = null;
          if (this.activeAudioUrl === audioUrl) {
            URL.revokeObjectURL(audioUrl);
            this.activeAudioUrl = null;
          }
          if (sessionId === this.speechSessionId && this.dharmaPlaying) {
            this.startFallbackElapsedTimer();
            this.speakSentenceFallback(this.dharmaSentenceIdx, sessionId);
          }
        };

        await audio.play();
        return;
      } catch {
        if (this.activeAudioUrl) {
          URL.revokeObjectURL(this.activeAudioUrl);
          this.activeAudioUrl = null;
        }
        this.activeAudio = null;
      }
    }

    if (sessionId === this.speechSessionId && this.dharmaPlaying) {
      this.startFallbackElapsedTimer();
      this.speakSentenceFallback(this.dharmaSentenceIdx, sessionId);
    }
  }

  public selectDharmaTalk(talk: DharmaTalkAudioItem) {
    this.cancelSpeechOnly();
    if (this.dharmaTimer) {
      clearInterval(this.dharmaTimer);
      this.dharmaTimer = null;
    }
    this.dharmaTalk = talk;
    this.dharmaPlaying = false;
    this.dharmaElapsedSec = 0;
    this.dharmaAudioOffsetSec = 0;
    this.dharmaSentences = this.splitSentences(talk.fullTranscript);
    this.computeSentenceOffsets(this.dharmaSentences);
    this.dharmaSentenceIdx = 0;
    this.notify();
  }

  public startDharmaTalk(talk: DharmaTalkAudioItem, speed?: number) {
    const isSameTalk = this.dharmaTalk?.id === talk.id;
    if (!isSameTalk) {
      this.dharmaTalk = talk;
      this.dharmaElapsedSec = 0;
      this.dharmaAudioOffsetSec = 0;
      this.dharmaSentences = this.splitSentences(talk.fullTranscript);
      this.computeSentenceOffsets(this.dharmaSentences);
      this.dharmaSentenceIdx = 0;
    } else if (this.dharmaSentences.length === 0) {
      this.dharmaSentences = this.splitSentences(talk.fullTranscript);
      this.computeSentenceOffsets(this.dharmaSentences);
    }

    if (typeof speed === 'number') {
      this.dharmaSpeed = speed;
    }

    this.cancelSpeechOnly();
    if (this.dharmaTimer) {
      clearInterval(this.dharmaTimer);
      this.dharmaTimer = null;
    }

    if (this.dharmaElapsedSec === 0 && this.dharmaSentenceIdx === 0 && this.dharmaAudioOffsetSec === 0) {
      this.playSingingBowl();
    }

    this.dharmaPlaying = true;
    const sessionId = ++this.speechSessionId;
    this.notify();

    // Small delay after cancel() prevents Chrome from swallowing the new utterance
    setTimeout(() => {
      if (this.dharmaPlaying && this.speechSessionId === sessionId) {
        void this.playFullTalkOrFallback(talk, sessionId);
      }
    }, 60);
  }

  public pauseDharmaTalk() {
    if (this.activeAudio) {
      this.dharmaAudioOffsetSec = this.activeAudio.currentTime || this.dharmaAudioOffsetSec;
    }
    this.cancelSpeechOnly();
    if (this.dharmaTimer) {
      clearInterval(this.dharmaTimer);
      this.dharmaTimer = null;
    }
    if (this.dharmaPlaying) {
      this.dharmaPlaying = false;
      this.notify();
    }
  }

  public stopDharmaTalk() {
    this.cancelSpeechOnly();
    if (this.dharmaTimer) {
      clearInterval(this.dharmaTimer);
      this.dharmaTimer = null;
    }
    const wasActive =
      this.dharmaPlaying ||
      this.dharmaElapsedSec > 0 ||
      this.dharmaSentenceIdx > 0 ||
      this.dharmaAudioOffsetSec > 0;
    this.dharmaPlaying = false;
    this.dharmaElapsedSec = 0;
    this.dharmaAudioOffsetSec = 0;
    this.dharmaSentenceIdx = 0;
    if (wasActive) {
      this.notify();
    }
  }

  public setDharmaSpeed(speed: number) {
    this.dharmaSpeed = speed;
    if (this.dharmaPlaying && this.activeAudio) {
      this.activeAudio.playbackRate = Math.max(0.75, Math.min(1.5, speed));
      this.notify();
    } else if (this.dharmaPlaying && this.dharmaTalk) {
      this.startDharmaTalk(this.dharmaTalk, speed);
    } else {
      this.notify();
    }
  }

  public startMoktakPacer(bpm = 45) {
    this.pacingBpm = bpm;
    if (this.moktakTimer) {
      clearInterval(this.moktakTimer);
      this.moktakTimer = null;
    }
    this.isPacing = true;
    this.playMoktak();
    this.moktakTimer = setInterval(() => {
      this.playMoktak();
    }, (60 / this.pacingBpm) * 1000);
    this.notify();
  }

  public setMoktakBpm(bpm: number) {
    this.pacingBpm = bpm;
    if (this.isPacing) {
      if (this.moktakTimer) {
        clearInterval(this.moktakTimer);
      }
      this.moktakTimer = setInterval(() => {
        this.playMoktak();
      }, (60 / this.pacingBpm) * 1000);
    }
  }

  public stopMoktakPacer() {
    if (this.moktakTimer) {
      clearInterval(this.moktakTimer);
      this.moktakTimer = null;
    }
    if (this.isPacing) {
      this.isPacing = false;
      this.notify();
    }
  }

  public stopAllWalkingAudio() {
    this.stopMoktakPacer();
    this.stopAmbient();
  }

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
      this.isAmbientOn = true;
      this.notify();
    } catch {
      // ignore
    }
  }

  public stopAmbient() {
    const prevSource = this.ambientSource;
    const prevGain = this.ambientGain;
    this.ambientSource = null;
    this.ambientGain = null;
    if (this.isAmbientOn) {
      this.isAmbientOn = false;
      this.notify();
    }
    if (prevGain && this.ctx) {
      try {
        prevGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        setTimeout(() => {
          if (prevSource) {
            try {
              (prevSource as AudioBufferSourceNode).stop();
              prevSource.disconnect();
            } catch {
              // ignore
            }
          }
        }, 600);
      } catch {
        // ignore
      }
    }
  }
}

export const sound = new SoundEngine();
