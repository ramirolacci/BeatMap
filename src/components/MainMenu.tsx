import React, { useRef, useState, useEffect } from 'react';
import type { Beatmap, GameSettings } from '../types/game';
import type { DifficultyLevel } from '../utils/audioBeatmapGenerator';
import { Play, Volume2, Upload, Music, Disc, Sparkles, SlidersHorizontal, Zap, FileAudio, Loader2, Clock, Keyboard, CheckCircle2 } from 'lucide-react';
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
  onChangeDifficulty?: (difficulty: DifficultyLevel) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  beatmaps,
  selectedBeatmap,
  settings,
  onSelectBeatmap,
  onStartGame,
  onUpdateSettings,
  onAddCustomBeatmap,
  onChangeDifficulty
}) => {
  const osuInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const trackListRef = useRef<HTMLDivElement | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('Procesando archivo...');
  const [bindingKey, setBindingKey] = useState<'key1' | 'key2' | null>(null);

  // Escuchar cambio de teclas cuando el usuario hace clic en reasignar
  useEffect(() => {
    if (!bindingKey) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') {
        setBindingKey(null);
        return;
      }
      onUpdateSettings({ [bindingKey]: e.key.toLowerCase() });
      setBindingKey(null);
    };

    window.addEventListener('keydown', handleKeyCapture);
    return () => window.removeEventListener('keydown', handleKeyCapture);
  }, [bindingKey, onUpdateSettings]);

  // Entrance GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', clearProps: 'all' }
        );
      }

      if (trackListRef.current) {
        gsap.fromTo(
          trackListRef.current.children,
          { x: -50, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out', clearProps: 'all' }
        );
      }

      if (detailsPanelRef.current) {
        gsap.fromTo(
          detailsPanelRef.current,
          { x: 50, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.15, clearProps: 'all' }
        );
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
        const beatmap = generateBeatmapFromAudioBuffer(buffer, file.name, 'Normal');
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

  const handleSelectSong = (map: Beatmap) => {
    audioEngine.playUiClick();
    onSelectBeatmap(map);
  };

  // Badge con estilos diferenciados y legibles para cada nivel
  const getDifficultyBadge = (version: string) => {
    const v = version.toLowerCase();
    if (v.includes('fácil') || v.includes('facil') || v.includes('easy')) {
      return { 
        label: 'Fácil', 
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20' 
      };
    }
    if (v.includes('normal') || v.includes('medio')) {
      return { 
        label: 'Normal', 
        color: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20' 
      };
    }
    if (v.includes('experto') || v.includes('expert') || v.includes('insano') || v.includes('insane')) {
      return { 
        label: 'Experto', 
        color: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/50 shadow-purple-500/20' 
      };
    }
    return { 
      label: 'Difícil', 
      color: 'from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/20' 
    };
  };

  // Determinar la dificultad activa actualmente
  const currentDiff: DifficultyLevel = (() => {
    const v = selectedBeatmap?.version.toLowerCase() || '';
    if (v.includes('fácil') || v.includes('facil') || v.includes('easy')) return 'Easy';
    if (v.includes('normal') || v.includes('medio')) return 'Normal';
    if (v.includes('experto') || v.includes('expert')) return 'Expert';
    return 'Hard';
  })();

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050508] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans overflow-y-auto selection:bg-pink-500 selection:text-white">

      {/* Modal de Procesamiento de Audio */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-white tracking-wide">{processingMsg}</h3>
          <p className="text-xs text-neutral-400 mt-1">Generando notas y sincronización de ritmo...</p>
        </div>
      )}

      {/* Luces Ambientales Neón */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black pointer-events-none" />
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/15 blur-[140px] rounded-full pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* HEADER / BARRA SUPERIOR */}
      <header ref={headerRef} className="relative z-10 max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5 pt-2">
        <div className="flex items-center gap-3.5">
          {/* Logo Estilizado */}
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
                PRO ENGINE
              </span>
            </div>
            <p className="text-[11px] font-medium tracking-wide text-neutral-400">
              Juego de Ritmo de Círculos & Analizador de Audio
            </p>
          </div>
        </div>

        {/* Acciones de Carga */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cargar MP3 */}
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

          {/* Importar .OSU */}
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

      {/* REJILLA PRINCIPAL */}
      <main className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-start">
        
        {/* Columna Izquierda: Selector de Pistas */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Music className="w-4 h-4 text-pink-400" /> Seleccionar Canción
            </h2>
            <span className="text-xs text-neutral-400 font-mono font-medium">
              {beatmaps.length} Canciones Disponibles
            </span>
          </div>

          <div ref={trackListRef} className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
            {beatmaps.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-pink-500/30 bg-neutral-950/40 text-center flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-1 shadow-lg shadow-pink-500/10">
                  <FileAudio className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">¡No tienes canciones cargadas!</h3>
                <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                  Haz clic en <span className="text-pink-300 font-semibold">CARGAR CANCIÓN (MP3)</span> o <span className="text-pink-300 font-semibold">IMPORTAR .OSU</span> en la barra superior.
                </p>
              </div>
            ) : (
              beatmaps.map((map) => {
                const isSelected = selectedBeatmap?.id === map.id;
                const badge = getDifficultyBadge(map.version);

                return (
                  <div
                    key={map.id}
                    onClick={() => handleSelectSong(map)}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'bg-neutral-900/95 border-pink-500/80 shadow-[0_0_28px_rgba(236,72,153,0.22)] scale-[1.01]'
                        : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    {/* Barra de acento activo vertical */}
                    {isSelected && (
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-pink-500 to-indigo-500 shadow-[0_0_12px_#ec4899]" />
                    )}

                    <div className="flex items-center justify-between gap-4 relative z-10 pl-1.5">
                      
                      {/* Bloque Izquierdo: Vinilo + Textos Alineados */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Disco de Vinilo (48x48 centrado) */}
                        <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center border transition-all ${
                          isSelected 
                            ? 'bg-gradient-to-br from-pink-500/20 to-indigo-500/20 border-pink-500/50 shadow-inner' 
                            : 'bg-neutral-900 border-neutral-800'
                        }`}>
                          <Disc className={`w-6 h-6 ${isSelected ? 'text-pink-400 animate-spin-slow' : 'text-neutral-500'}`} />
                        </div>

                        {/* Textos de Canción (Alineación vertical perfecta en 2 filas limpias) */}
                        <div className="flex flex-col justify-center min-w-0 gap-1">
                          
                          {/* Fila 1: Título + Badges en la misma línea */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors tracking-tight truncate leading-tight">
                              {map.title}
                            </h3>

                            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${badge.color}`}>
                              {badge.label}
                            </span>

                            <span className="text-[11px] font-mono font-medium text-neutral-400 flex items-center gap-0.5">
                              <Zap className="w-3 h-3 text-amber-400 inline" /> {map.bpm} BPM
                            </span>

                            {map.audioBuffer && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                MP3
                              </span>
                            )}
                          </div>

                          {/* Fila 2: Artista y Creador visibles y centrados */}
                          <p className="text-xs text-neutral-400 truncate leading-normal">
                            <span className="text-neutral-300 font-medium">{map.artist}</span>
                            <span className="text-neutral-500 mx-1.5">•</span>
                            <span className="text-neutral-400">Mapeado por {map.creator}</span>
                          </p>

                        </div>
                      </div>

                      {/* Bloque Derecho: Stats Técnicos y Radio Button */}
                      <div className="flex items-center gap-3.5 shrink-0">
                        <div className="text-right hidden sm:block font-mono">
                          <div className="text-xs font-semibold text-neutral-200">
                            AR {map.ar} <span className="text-neutral-500">•</span> CS {map.cs}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {map.hitObjects && map.hitObjects.length > 0 ? `${map.hitObjects.length} Objetos` : 'Auto-sincronizado'}
                          </div>
                        </div>

                        {/* Indicador de Selección Circular */}
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

        {/* Columna Derecha: Panel de Estadísticas y Ajustes */}
        <div ref={detailsPanelRef} className="lg:col-span-5 bg-neutral-900/40 border border-neutral-800/90 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between gap-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500/60 to-transparent" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" /> Detalles de Canción y Audio
              </h3>
              {selectedBeatmap && (
                <span className="text-xs font-mono font-bold text-pink-400">
                  {selectedBeatmap.title}
                </span>
              )}
            </div>

            {/* SELECTOR DE DIFICULTAD INTERACTIVO */}
            <div className="mb-5 bg-black/50 border border-neutral-800/90 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300 mb-2.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Seleccionar Dificultad:
                </span>
                <span className="font-mono text-pink-400">{selectedBeatmap?.version || 'Normal'}</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(['Easy', 'Normal', 'Hard', 'Expert'] as DifficultyLevel[]).map((diff) => {
                  const isActive = currentDiff === diff;
                  const label = diff === 'Easy' ? 'Fácil' : diff === 'Normal' ? 'Normal' : diff === 'Hard' ? 'Difícil' : 'Experto';
                  const activeClass = 
                    diff === 'Easy' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' :
                    diff === 'Normal' ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]' :
                    diff === 'Hard' ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]' :
                    'bg-purple-500/20 text-purple-300 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]';

                  return (
                    <button
                      key={diff}
                      onClick={() => onChangeDifficulty && onChangeDifficulty(diff)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isActive
                          ? activeClass
                          : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:bg-neutral-850 hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      {isActive && <CheckCircle2 className="w-3 h-3 inline mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barras de Dificultad */}
            <div className="grid grid-cols-2 gap-3 mb-5">
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

            {/* Controles de Configuración de Teclas y Audio */}
            <div className="flex flex-col gap-3.5 border-t border-neutral-800/80 pt-4">
              
              {/* Asignación de Teclas (Key Binding) */}
              <div className="flex items-center justify-between bg-black/40 border border-neutral-800/80 p-2.5 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                  <Keyboard className="w-4 h-4 text-pink-400" />
                  <span>Teclas de Golpe:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBindingKey('key1')}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs uppercase border transition-all cursor-pointer ${
                      bindingKey === 'key1'
                        ? 'bg-pink-500 text-white border-pink-400 animate-pulse'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-pink-300 border-neutral-700'
                    }`}
                  >
                    {bindingKey === 'key1' ? 'Presiona...' : `K1: [ ${settings.key1} ]`}
                  </button>

                  <button
                    onClick={() => setBindingKey('key2')}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs uppercase border transition-all cursor-pointer ${
                      bindingKey === 'key2'
                        ? 'bg-purple-500 text-white border-purple-400 animate-pulse'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-purple-300 border-neutral-700'
                    }`}
                  >
                    {bindingKey === 'key2' ? 'Presiona...' : `K2: [ ${settings.key2} ]`}
                  </button>
                </div>
              </div>

              {/* Volumen de Música */}
              <div className="flex flex-col gap-1.5">
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

              {/* Volumen de Hitsounds */}
              <div className="flex flex-col gap-1.5">
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

              {/* Calibración de Audio Offset */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-400" /> Calibración / Audio Offset
                  </span>
                  <span className="font-mono text-sky-300 font-bold">{settings.audioOffset > 0 ? `+${settings.audioOffset}` : settings.audioOffset} ms</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="5"
                  value={settings.audioOffset}
                  onChange={(e) => onUpdateSettings({ audioOffset: parseInt(e.target.value, 10) })}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 rounded-lg bg-neutral-800"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                  <span>-150ms</span>
                  <button
                    onClick={() => onUpdateSettings({ audioOffset: 0 })}
                    className="text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    Restablecer (0ms)
                  </button>
                  <span>+150ms</span>
                </div>
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
            <span className="tracking-wider">COMENZAR</span>
            {selectedBeatmap && <Sparkles className="w-4 h-4 text-pink-200 animate-pulse" />}
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto text-center text-xs text-neutral-400 border-t border-neutral-900/80 pt-4 pb-1">
        Controles: Presiona <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-pink-300 font-mono font-bold uppercase">{settings.key1}</kbd> y <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-purple-300 font-mono font-bold uppercase">{settings.key2}</kbd> o el Clic del Mouse para golpear los círculos • <kbd className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono font-bold shadow-sm">ESPACIO</kbd> para Pausar
      </footer>
    </div>
  );
};
