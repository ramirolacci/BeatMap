import React, { useRef, useState, useEffect } from 'react';
import type { Beatmap, GameSettings } from '../types/game';
import { Play, Volume2, Upload, Music, Disc, Sparkles, SlidersHorizontal, Zap, FileAudio, Loader2 } from 'lucide-react';
import { parseOsuFile } from '../utils/osuParser';
import { generateBeatmapFromAudioBuffer } from '../utils/audioBeatmapGenerator';
import { audioEngine } from '../audio/audioEngine';
import { gsap } from 'gsap';

interface MainMenuProps {
  beatmaps: Beatmap[];
  selectedBeatmap: Beatmap | null;
  settings: GameSettings;
  onSelectBeatmap: (map: Beatmap) => void;
  onStartGame: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onAddCustomBeatmap: (map: Beatmap) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  beatmaps,
  selectedBeatmap,
  settings,
  onSelectBeatmap,
  onStartGame,
  onUpdateSettings,
  onAddCustomBeatmap
}) => {
  const osuInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const trackListRef = useRef<HTMLDivElement | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('Procesando archivo...');

  // Entrance GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Header slide down
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: -40,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out'
        });
      }

      // 2. Track selector list slide in from left
      if (trackListRef.current) {
        gsap.from(trackListRef.current.children, {
          x: -50,
          opacity: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out'
        });
      }

      // 3. Right Details Panel slide in from right
      if (detailsPanelRef.current) {
        gsap.from(detailsPanelRef.current, {
          x: 50,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          delay: 0.15
        });
      }
    });

    return () => ctx.revert();
  }, []);

  const processFile = async (file: File) => {
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.osu')) {
      try {
        setIsProcessing(true);
        setProcessingMsg('Cargando mapa .osu...');
        const text = await file.text();
        const parsed = parseOsuFile(text);
        onAddCustomBeatmap(parsed);
        onSelectBeatmap(parsed);
      } catch (err) {
        console.error('Error al procesar .osu:', err);
      } finally {
        setIsProcessing(false);
      }
    } else if (
      file.type.startsWith('audio/') ||
      /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)
    ) {
      try {
        setIsProcessing(true);
        setProcessingMsg('Analizando audio y generando patrón de ritmo...');
        const buffer = await audioEngine.loadAudioFile(file);
        const beatmap = generateBeatmapFromAudioBuffer(buffer, file.name, 'Hard');
        onAddCustomBeatmap(beatmap);
        onSelectBeatmap(beatmap);
      } catch (err) {
        console.error('Error al decodificar audio:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleOsuUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const getDifficultyBadge = (version: string) => {
    const v = version.toLowerCase();
    if (v.includes('experto') || v.includes('expert')) {
      return { label: version, color: 'from-rose-500 to-red-600 text-rose-200 border-rose-500/40 shadow-rose-500/20' };
    }
    if (v.includes('insano') || v.includes('insane')) {
      return { label: version, color: 'from-purple-500 to-indigo-600 text-purple-200 border-purple-500/40 shadow-purple-500/20' };
    }
    return { label: version, color: 'from-pink-500 to-amber-500 text-pink-200 border-pink-500/40 shadow-pink-500/20' };
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050508] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans overflow-y-auto selection:bg-pink-500 selection:text-white">

      {/* Processing Audio Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-white tracking-wide">{processingMsg}</h3>
          <p className="text-xs text-neutral-400 mt-1">Generando notas y sincronización de ritmo...</p>
        </div>
      )}

      {/* Background Neon Ambient Glows */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black pointer-events-none" />
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/15 blur-[140px] rounded-full pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* HEADER / NAVBAR */}
      <header ref={headerRef} className="relative z-10 max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5 pt-2">
        <div className="flex items-center gap-3.5">
          {/* Logo Matching Favicon */}
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-pink-500/25 flex items-center justify-center group cursor-pointer">
            <div className="w-full h-full bg-[#0b0b12] rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <Disc className="w-6 h-6 text-pink-400 group-hover:rotate-180 transition-transform duration-700" />
              <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-1.5">
                BEATMAP
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                v1.1
              </span>
            </div>
            <p className="text-[11px] font-medium tracking-wide text-neutral-400">
              Juego de Ritmo por Círculos
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Audio MP3 Input */}
          <input
            type="file"
            ref={audioInputRef}
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
            className="hidden"
            onChange={handleAudioUpload}
          />
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600/90 to-purple-600/90 hover:from-pink-500 hover:to-purple-500 text-white border border-pink-400/40 transition-all cursor-pointer shadow-lg shadow-pink-500/20 backdrop-blur-md group active:scale-95"
          >
            <FileAudio className="w-4 h-4 text-pink-200 group-hover:scale-110 transition-transform" />
            <span>CARGAR CANCIÓN (MP3)</span>
          </button>

          {/* Osu Input */}
          <input
            type="file"
            ref={osuInputRef}
            accept=".osu"
            className="hidden"
            onChange={handleOsuUpload}
          />
          <button
            onClick={() => osuInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/60 hover:border-pink-500/50 transition-all cursor-pointer shadow-md backdrop-blur-md group active:scale-95"
          >
            <Upload className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
            <span>IMPORTAR .OSU</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-start">
        
        {/* Left Column: Track Selector */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Music className="w-4 h-4 text-pink-400" /> Seleccionar Canción
            </h2>
            <span className="text-xs text-neutral-400 font-mono font-medium">
              {beatmaps.length} Canciones Disponibles
            </span>
          </div>

          <div ref={trackListRef} className="flex flex-col gap-3">
            {beatmaps.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-pink-500/30 bg-neutral-950/40 text-center flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-1 shadow-lg shadow-pink-500/10">
                  <FileAudio className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">¡No tienes canciones cargadas!</h3>
                <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                  Haz clic en <span className="text-pink-300 font-semibold">CARGAR CANCIÓN (MP3)</span> o <span className="text-pink-300 font-semibold">IMPORTAR .OSU</span> en la cabecera superior para cargar tu música.
                </p>
              </div>
            ) : (
              beatmaps.map((map) => {
                const isSelected = selectedBeatmap?.id === map.id;
                const badge = getDifficultyBadge(map.version);

                return (
                  <div
                    key={map.id}
                    onClick={() => onSelectBeatmap(map)}
                    className={`group relative p-4 md:p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'bg-neutral-900/90 border-pink-500/70 shadow-[0_0_30px_rgba(236,72,153,0.18)] scale-[1.01]'
                        : 'bg-neutral-950/40 border-neutral-800/80 hover:bg-neutral-900/60 hover:border-neutral-700'
                    }`}
                  >
                    {/* Active Card Accent Bar */}
                    {isSelected && (
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-pink-500 to-indigo-500 shadow-[0_0_12px_#ec4899]" />
                    )}

                    <div className="flex items-center justify-between gap-4 relative z-10 pl-1">
                      <div className="flex items-center gap-4">
                        {/* Vinyl Disc Thumbnail */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                          isSelected 
                            ? 'bg-gradient-to-br from-pink-500/20 to-indigo-500/20 border-pink-500/40 shadow-inner' 
                            : 'bg-neutral-900 border-neutral-800'
                        }`}>
                          <Disc className={`w-6 h-6 ${isSelected ? 'text-pink-400 animate-spin-slow' : 'text-neutral-500'}`} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r border shadow-sm ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs font-mono font-medium text-neutral-400 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400 inline" /> {map.bpm} BPM
                            </span>
                            {map.audioBuffer && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                MP3 Personalizado
                              </span>
                            )}
                          </div>
                          <h3 className="text-base md:text-lg font-bold text-white group-hover:text-pink-300 transition-colors tracking-tight">
                            {map.title}
                          </h3>
                          <p className="text-xs text-neutral-400">
                            {map.artist} • Mapeado por <span className="text-neutral-300 font-medium">{map.creator}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block font-mono">
                          <div className="text-xs font-semibold text-neutral-300">AR {map.ar} • CS {map.cs}</div>
                          <div className="text-[10px] text-neutral-400">{map.hitObjects.length} Objetos</div>
                        </div>

                        {/* Selection Radio Circle */}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_10px_#ec4899]' : 'border-neutral-700 bg-neutral-900'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_6px_#ec4899]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Song Stats & Control Panel */}
        <div ref={detailsPanelRef} className="lg:col-span-5 bg-neutral-900/40 border border-neutral-800/90 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between gap-6 shadow-2xl relative overflow-hidden">
          {/* Glowing Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500/60 to-transparent" />

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2 mb-5">
              <SlidersHorizontal className="w-4 h-4 text-purple-400" /> Detalles de Canción y Audio
            </h3>

            {/* Atributos Visuales de Dificultad */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-black/40 border border-neutral-800/80 p-3.5 rounded-2xl hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  <span>Aproximación (AR)</span>
                  <span className="text-pink-400">{selectedBeatmap ? selectedBeatmap.ar : '-'}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-500" style={{ width: `${selectedBeatmap ? (selectedBeatmap.ar / 10) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-black/40 border border-neutral-800/80 p-3.5 rounded-2xl hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  <span>Tamaño Círculo (CS)</span>
                  <span className="text-purple-400">{selectedBeatmap ? selectedBeatmap.cs : '-'}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500" style={{ width: `${selectedBeatmap ? (selectedBeatmap.cs / 10) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-black/40 border border-neutral-800/80 p-3.5 rounded-2xl hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  <span>Dificultad (OD)</span>
                  <span className="text-sky-400">{selectedBeatmap ? selectedBeatmap.od : '-'}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${selectedBeatmap ? (selectedBeatmap.od / 10) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-black/40 border border-neutral-800/80 p-3.5 rounded-2xl hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  <span>Drenaje Vida (HP)</span>
                  <span className="text-emerald-400">{selectedBeatmap ? selectedBeatmap.hpDrain : '-'}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${selectedBeatmap ? (selectedBeatmap.hpDrain / 10) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Controles de Volumen Estilizados */}
            <div className="flex flex-col gap-4 border-t border-neutral-800/80 pt-5">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-pink-400" /> Volumen de Música
                  </span>
                  <span className="font-mono text-pink-300 font-bold">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 cursor-pointer h-1.5 rounded-lg bg-neutral-800"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-purple-400" /> Volumen de Efectos (Hitsounds)
                  </span>
                  <span className="font-mono text-purple-300 font-bold">{Math.round(settings.hitsoundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.hitsoundVolume}
                  onChange={(e) => onUpdateSettings({ hitsoundVolume: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 rounded-lg bg-neutral-800"
                />
              </div>
            </div>
          </div>

          {/* BOTÓN COMENZAR */}
          <button
            ref={startBtnRef}
            onClick={onStartGame}
            disabled={!selectedBeatmap}
            className={`group relative w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 overflow-hidden ${
              selectedBeatmap
                ? 'text-white bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 shadow-[0_0_35px_rgba(236,72,153,0.35)] hover:shadow-[0_0_45px_rgba(236,72,153,0.5)] cursor-pointer active:scale-[0.98]'
                : 'text-neutral-500 bg-neutral-900 border border-neutral-800 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
            <span className="tracking-wider">{selectedBeatmap ? 'COMENZAR' : 'CARGA UNA CANCIÓN'}</span>
            {selectedBeatmap && <Sparkles className="w-4 h-4 text-pink-200 animate-pulse" />}
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto text-center text-xs text-neutral-400 border-t border-neutral-900/80 pt-4 pb-1">
        Controles: Usa el Clic del Mouse para golpear los círculos • Presiona <kbd className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono font-bold shadow-sm">ESPACIO</kbd> para Pausar
      </footer>
    </div>
  );
};

