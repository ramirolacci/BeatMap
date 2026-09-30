// Audio Engine using Web Audio API for precise audio timing and zero-latency hitsounds

class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGainNode: GainNode | null = null;
  private hitsoundGainNode: GainNode | null = null;
  
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private isPlaying: boolean = false;
  private musicVolume: number = 0.7;
  private hitsoundVolume: number = 0;

  private analyserNode: AnalyserNode | null = null;

  constructor() {
    // Lazy init audio context on user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.musicGainNode = this.ctx.createGain();
      this.hitsoundGainNode = this.ctx.createGain();
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.musicGainNode.gain.value = this.musicVolume;
      this.hitsoundGainNode.gain.value = this.hitsoundVolume;

      this.musicGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
      this.hitsoundGainNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(64);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  public setVolumes(music: number, hitsound: number) {
    this.musicVolume = music;
    this.hitsoundVolume = hitsound;
    if (this.musicGainNode) this.musicGainNode.gain.value = music;
    if (this.hitsoundGainNode) this.hitsoundGainNode.gain.value = hitsound;
  }

  // Play crisp osu! drum/snare hitsound procedurally
  public playHitsound() {
    if (!this.ctx || this.hitsoundVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      
      // High pitch transient click
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

      oscGain.gain.setValueAtTime(0.6 * this.hitsoundVolume, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(oscGain);
      oscGain.connect(this.hitsoundGainNode!);

      osc.start(t);
      osc.stop(t + 0.04);

      // Noise snare snap
      const bufferSize = this.ctx.sampleRate * 0.05;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1500;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4 * this.hitsoundVolume, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.hitsoundGainNode!);

      noise.start(t);
      noise.stop(t + 0.05);
    } catch (e) {
      console.warn('Hitsound error:', e);
    }
  }

  // Load custom user audio from ArrayBuffer / Blob URL
  public async loadAudioFromUrl(url: string): Promise<AudioBuffer> {
    this.init();
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    this.musicBuffer = await this.ctx!.decodeAudioData(arrayBuf);
    return this.musicBuffer;
  }

  public setCustomBuffer(buffer: AudioBuffer) {
    this.init();
    this.musicBuffer = buffer;
  }

  public async loadAudioFile(file: File): Promise<AudioBuffer> {
    this.init();
    const arrayBuf = await file.arrayBuffer();
    this.musicBuffer = await this.ctx!.decodeAudioData(arrayBuf);
    return this.musicBuffer;
  }

  // Generate synthetic song dynamically for built-in maps if no external audio file is available
  public generateProceduralTrack(theme: 'synthwave' | 'cyberpunk' | 'chillhop' | 'fast-techno', durationSec: number = 60): AudioBuffer {
    this.init();
    const sampleRate = this.ctx!.sampleRate;
    const numSamples = sampleRate * durationSec;
    const buffer = this.ctx!.createBuffer(2, numSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = theme === 'fast-techno' ? 175 : theme === 'cyberpunk' ? 150 : theme === 'synthwave' ? 128 : 110;
    const beatLen = 60 / bpm;
    const eighthLen = beatLen / 2;

    for (let i = 0; i < numSamples; i++) {
      const time = i / sampleRate;
      const beatIndex = Math.floor(time / beatLen);
      const eighthIndex = Math.floor(time / eighthLen);
      const beatTime = time % beatLen;

      let sample = 0;

      // Kick drum on beat 1, 2, 3, 4
      if (beatTime < 0.15) {
        const kickEnv = Math.exp(-beatTime * 35);
        const kickFreq = 140 * Math.exp(-beatTime * 40) + 40;
        sample += Math.sin(2 * Math.PI * kickFreq * beatTime) * kickEnv * 0.7;
      }

      // Snare on beat 2 & 4
      if ((beatIndex % 2 === 1) && beatTime < 0.2) {
        const snareEnv = Math.exp(-beatTime * 25);
        const noise = (Math.random() * 2 - 1) * 0.4;
        const tone = Math.sin(2 * Math.PI * 180 * beatTime) * 0.3;
        sample += (noise + tone) * snareEnv * 0.5;
      }

      // Hi-hat on every 8th note
      const eighthTime = time % eighthLen;
      if (eighthTime < 0.05) {
        const hatEnv = Math.exp(-eighthTime * 60);
        sample += (Math.random() * 2 - 1) * hatEnv * 0.15;
      }

      // Bass synth line
      const barTime = time % (beatLen * 4);
      const bassNotes = theme === 'fast-techno' 
        ? [55, 55, 65, 58] 
        : theme === 'cyberpunk' 
        ? [65, 61, 58, 55] 
        : [110, 110, 130, 98];
      const currentNote = bassNotes[Math.floor(barTime / beatLen) % bassNotes.length];
      const synthEnv = Math.exp(-(eighthTime % beatLen) * 6);
      const sawWave = ((eighthTime * currentNote) % 1) * 2 - 1;
      sample += sawWave * synthEnv * 0.25;

      // Melodic arpeggio in theme
      const arpNotes = [220, 277.18, 329.63, 440, 554.37, 659.25];
      const arpNote = arpNotes[eighthIndex % arpNotes.length];
      const arpEnv = Math.exp(-(eighthTime * 12));
      const arpWave = Math.sin(2 * Math.PI * arpNote * time);
      sample += arpWave * arpEnv * 0.15;

      left[i] = Math.max(-1, Math.min(1, sample));
      right[i] = Math.max(-1, Math.min(1, sample));
    }

    this.musicBuffer = buffer;
    return buffer;
  }

  public play(startTimeMs: number = 0) {
    if (!this.ctx || !this.musicBuffer) return;
    this.stop();

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.connect(this.musicGainNode!);

    const offsetSec = startTimeMs / 1000;
    this.startTime = this.ctx.currentTime - offsetSec;
    this.pauseOffset = startTimeMs;
    this.musicSource.start(0, offsetSec);
    this.isPlaying = true;
  }

  public pause() {
    if (this.isPlaying && this.musicSource) {
      this.pauseOffset = this.getCurrentTimeMs();
      this.musicSource.stop();
      this.musicSource = null;
      this.isPlaying = false;
    }
  }

  public resume() {
    if (!this.isPlaying) {
      this.play(this.pauseOffset);
    }
  }

  public stop() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {}
      this.musicSource = null;
    }
    this.isPlaying = false;
    this.pauseOffset = 0;
  }

  public getCurrentTimeMs(): number {
    if (!this.ctx || !this.isPlaying) return this.pauseOffset;
    return (this.ctx.currentTime - this.startTime) * 1000;
  }

  public getDurationMs(): number {
    return (this.musicBuffer?.duration || 0) * 1000;
  }

  public isEnded(): boolean {
    if (!this.musicBuffer) return false;
    return this.getCurrentTimeMs() >= this.getDurationMs() + 500;
  }
}

export const audioEngine = new AudioEngine();
