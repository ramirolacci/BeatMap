// Audio Engine using Web Audio API for ultra-precise timing, zero-latency hitsounds and sound effects

class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGainNode: GainNode | null = null;
  private hitsoundGainNode: GainNode | null = null;
  
  // Preview source node for menu music previews
  private previewSource: AudioBufferSourceNode | null = null;
  private previewGainNode: GainNode | null = null;

  private startTime: number = 0;
  private rawPauseOffset: number = 0; // Tiempo puro de audio sin offset de calibración
  private isPlaying: boolean = false;
  private musicVolume: number = 0.7;
  private hitsoundVolume: number = 0.75;
  private audioOffsetMs: number = 0; // Calibración de latencia de hardware (-150ms a +150ms)

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
      this.previewGainNode = this.ctx.createGain();

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.musicGainNode.gain.value = this.musicVolume;
      this.hitsoundGainNode.gain.value = this.hitsoundVolume;
      this.previewGainNode.gain.value = this.musicVolume * 0.6;

      this.musicGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
      this.previewGainNode.connect(this.analyserNode);
      this.hitsoundGainNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setAudioOffset(offsetMs: number) {
    this.audioOffsetMs = offsetMs;
  }

  public getAudioOffset(): number {
    return this.audioOffsetMs;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(64);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  public setVolumes(music: number, hitsound: number) {
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.hitsoundVolume = Math.max(0, Math.min(1, hitsound));
    if (this.musicGainNode && this.ctx) {
      this.musicGainNode.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
    if (this.previewGainNode && this.ctx) {
      this.previewGainNode.gain.setValueAtTime(this.musicVolume * 0.6, this.ctx.currentTime);
    }
    if (this.hitsoundGainNode && this.ctx) {
      this.hitsoundGainNode.gain.setValueAtTime(this.hitsoundVolume, this.ctx.currentTime);
    }
  }

  // Reproduce un hitsound nítido (caja/click osu!) con latencia cero
  public playHitsound() {
    if (!this.ctx || this.hitsoundVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      
      // 1. High pitch transient click (rim/woodblock)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1050, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.032);

      oscGain.gain.setValueAtTime(0.75 * this.hitsoundVolume, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.032);

      osc.connect(oscGain);
      oscGain.connect(this.hitsoundGainNode!);

      osc.start(t);
      osc.stop(t + 0.032);

      // 2. Snappy noise snare body
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45 * this.hitsoundVolume, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.hitsoundGainNode!);

      noise.start(t);
      noise.stop(t + 0.035);
    } catch (e) {
      console.warn('Hitsound error:', e);
    }
  }

  // Sonido de combo break sutil cuando se falla una nota
  public playComboBreak() {
    if (!this.ctx || this.hitsoundVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.14);

      gain.gain.setValueAtTime(0.35 * this.hitsoundVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.hitsoundGainNode!);

      osc.start(t);
      osc.stop(t + 0.14);
    } catch (e) {
      console.warn('Combo break sound error:', e);
    }
  }

  // Sonido dramático de fallo de canción (Game Over por HP = 0)
  public playFailSound() {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      
      // Vinilo deslizándose hacia abajo
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.8);
    } catch (e) {
      console.warn('Fail sound error:', e);
    }
  }

  // Sonido táctil para clics de UI
  public playUiClick() {
    if (!this.ctx || this.hitsoundVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

      gain.gain.setValueAtTime(0.12 * this.hitsoundVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch {}
  }

  public async decodeAudio(arrayBuf: ArrayBuffer): Promise<AudioBuffer> {
    this.init();
    return await this.ctx!.decodeAudioData(arrayBuf);
  }

  public async loadAudioFromUrl(url: string): Promise<AudioBuffer> {
    this.init();
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    const buf = await this.ctx!.decodeAudioData(arrayBuf);
    this.musicBuffer = buf;
    return buf;
  }

  public setCustomBuffer(buffer: AudioBuffer) {
    this.init();
    this.musicBuffer = buffer;
  }

  public async loadAudioFile(file: File): Promise<AudioBuffer> {
    this.init();
    const arrayBuf = await file.arrayBuffer();
    const buf = await this.ctx!.decodeAudioData(arrayBuf);
    this.musicBuffer = buf;
    return buf;
  }

  // Generador dinámico de pistas sintéticas procedimentales (para mapas integrados)
  public generateProceduralTrack(theme: 'synthwave' | 'cyberpunk' | 'chillhop' | 'fast-techno', durationSec: number = 75): AudioBuffer {
    this.init();
    const sampleRate = this.ctx!.sampleRate;
    const numSamples = sampleRate * durationSec;
    const buffer = this.ctx!.createBuffer(2, numSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = theme === 'fast-techno' ? 160 : theme === 'cyberpunk' ? 128 : theme === 'synthwave' ? 120 : 100;
    const beatLen = 60 / bpm;
    const eighthLen = beatLen / 2;

    for (let i = 0; i < numSamples; i++) {
      const time = i / sampleRate;
      const beatIndex = Math.floor(time / beatLen);
      const eighthIndex = Math.floor(time / eighthLen);
      const beatTime = time % beatLen;

      let sample = 0;

      // Kick drum
      if (beatTime < 0.15) {
        const kickEnv = Math.exp(-beatTime * 35);
        const kickFreq = 140 * Math.exp(-beatTime * 40) + 40;
        sample += Math.sin(2 * Math.PI * kickFreq * beatTime) * kickEnv * 0.7;
      }

      // Snare on beats 2 & 4
      if ((beatIndex % 2 === 1) && beatTime < 0.2) {
        const snareEnv = Math.exp(-beatTime * 25);
        const noise = (Math.random() * 2 - 1) * 0.4;
        const tone = Math.sin(2 * Math.PI * 180 * beatTime) * 0.3;
        sample += (noise + tone) * snareEnv * 0.5;
      }

      // Hi-hat
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

      // Melodic arpeggio
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

  // Vista previa de audio para el menú
  public playPreview(buffer: AudioBuffer, startOffsetSec: number = 20) {
    this.stopPreview();
    if (!this.ctx || !this.previewGainNode) return;
    try {
      this.previewSource = this.ctx.createBufferSource();
      this.previewSource.buffer = buffer;
      this.previewSource.loop = true;
      this.previewSource.connect(this.previewGainNode);

      const offset = Math.min(buffer.duration * 0.3, Math.max(0, startOffsetSec));
      this.previewSource.start(0, offset);
    } catch (e) {
      console.warn('Error al reproducir preview:', e);
    }
  }

  public stopPreview() {
    if (this.previewSource) {
      try {
        this.previewSource.stop();
      } catch {}
      this.previewSource = null;
    }
  }

  // Reproducción principal de la pista del juego
  public play(startTimeMs: number = 0) {
    if (!this.ctx || !this.musicBuffer) return;
    this.stop();
    this.stopPreview();

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.connect(this.musicGainNode!);

    const offsetSec = Math.max(0, startTimeMs / 1000);
    this.startTime = this.ctx.currentTime - offsetSec;
    this.rawPauseOffset = startTimeMs;
    this.musicSource.start(0, offsetSec);
    this.isPlaying = true;
  }

  public pause() {
    if (this.isPlaying && this.musicSource && this.ctx) {
      // Guardar tiempo puro sin offset de hardware para no acumularlo al reanudar
      this.rawPauseOffset = (this.ctx.currentTime - this.startTime) * 1000;
      try {
        this.musicSource.stop();
      } catch {}
      this.musicSource = null;
      this.isPlaying = false;
    }
  }

  public resume() {
    if (!this.isPlaying) {
      this.play(this.rawPauseOffset);
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
    this.rawPauseOffset = 0;
  }

  // Retorna el tiempo exacto en ms compensado con la calibración del usuario
  public getCurrentTimeMs(): number {
    if (!this.ctx || !this.isPlaying) return this.rawPauseOffset + this.audioOffsetMs;
    return (this.ctx.currentTime - this.startTime) * 1000 + this.audioOffsetMs;
  }

  public getDurationMs(): number {
    return (this.musicBuffer?.duration || 0) * 1000;
  }

  public isEnded(): boolean {
    if (!this.musicBuffer) return false;
    return this.getCurrentTimeMs() >= this.getDurationMs() + 300;
  }
}

export const audioEngine = new AudioEngine();
