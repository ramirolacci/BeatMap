import React, { useRef } from 'react';
import type { Beatmap, GameSettings } from '../types/game';
import { Play, Volume2, Upload, Settings, Music, Disc } from 'lucide-react';
import { parseOsuFile } from '../utils/osuParser';

interface MainMenuProps {
  beatmaps: Beatmap[];
  selectedBeatmap: Beatmap;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.osu')) {
      const text = await file.text();
      const parsed = parseOsuFile(text);
      onAddCustomBeatmap(parsed);
      onSelectBeatmap(parsed);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#08080c] text-white flex flex-col justify-between p-6 md:p-10 font-sans overflow-y-auto">
      {/* Fondo Decorativo Gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-black to-neutral-950 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ENCABEZADO */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Disc className="w-6 h-6 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
              BEATMAP <span className="text-pink-500 font-mono text-xl">v1.0</span>
            </h1>
            <p className="text-xs text-neutral-400">Motor de Juego de Ritmo por Círculos</p>
          </div>
        </div>

        {/* Acciones del Menú */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Importar Archivo .osu */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".osu"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-neutral-400" />
            <span>IMPORTAR .OSU</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: Selección de Canciones y Ajustes */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-start">
        {/* Columna Izquierda: Lista de Canciones */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Music className="w-4 h-4 text-pink-400" /> Seleccionar Canción
            </h2>
            <span className="text-xs text-neutral-500">{beatmaps.length} Pistas Disponibles</span>
          </div>

          <div className="flex flex-col gap-3">
            {beatmaps.map((map) => {
              const isSelected = map.id === selectedBeatmap.id;
              return (
                <div
                  key={map.id}
                  onClick={() => onSelectBeatmap(map)}
                  className={`group relative p-4 md:p-5 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-neutral-900/90 border-pink-500/60 shadow-[0_0_25px_rgba(236,72,153,0.15)] scale-[1.01]'
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-900/50 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          {map.version}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">{map.bpm} BPM</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1 group-hover:text-pink-300 transition-colors">
                        {map.title}
                      </h3>
                      <p className="text-xs text-neutral-400">{map.artist} • Creado por {map.creator}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-neutral-400 font-mono">AR {map.ar} • CS {map.cs}</div>
                        <div className="text-[10px] text-neutral-500">{map.hitObjects.length} Objetos</div>
                      </div>

                      {isSelected && (
                        <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_10px_#ec4899]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Detalle de Canción y Volumen */}
        <div className="lg:col-span-5 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between gap-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-indigo-400" /> Detalles de Canción y Audio
            </h3>

            {/* Atributos de Dificultad */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-black/40 border border-neutral-800 p-3 rounded-xl">
                <div className="text-[10px] uppercase text-neutral-400 font-bold">Aproximación (AR)</div>
                <div className="text-xl font-mono font-bold text-white">{selectedBeatmap.ar}</div>
              </div>
              <div className="bg-black/40 border border-neutral-800 p-3 rounded-xl">
                <div className="text-[10px] uppercase text-neutral-400 font-bold">Tamaño Círculo (CS)</div>
                <div className="text-xl font-mono font-bold text-white">{selectedBeatmap.cs}</div>
              </div>
              <div className="bg-black/40 border border-neutral-800 p-3 rounded-xl">
                <div className="text-[10px] uppercase text-neutral-400 font-bold">Dificultad (OD)</div>
                <div className="text-xl font-mono font-bold text-white">{selectedBeatmap.od}</div>
              </div>
              <div className="bg-black/40 border border-neutral-800 p-3 rounded-xl">
                <div className="text-[10px] uppercase text-neutral-400 font-bold">Drenaje Vida (HP)</div>
                <div className="text-xl font-mono font-bold text-white">{selectedBeatmap.hpDrain}</div>
              </div>
            </div>

            {/* Controles de Volumen */}
            <div className="flex flex-col gap-4 border-t border-neutral-800 pt-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> Volumen de Música
                  </span>
                  <span className="font-mono text-white font-bold">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> Volumen de Efectos (Hitsounds)
                  </span>
                  <span className="font-mono text-white font-bold">{Math.round(settings.hitsoundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.hitsoundVolume}
                  onChange={(e) => onUpdateSettings({ hitsoundVolume: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* BOTÓN INICIAR JUEGO */}
          <button
            onClick={onStartGame}
            className="w-full py-4 rounded-xl font-black text-lg text-white bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>INICIAR JUEGO</span>
          </button>
        </div>
      </div>

      {/* PIE DE PÁGINA / CONTROLES */}
      <div className="relative z-10 text-center text-xs text-neutral-500 border-t border-neutral-900 pt-4">
        Controles: Usa las teclas <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">Z</kbd> y <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">X</kbd> o el Clic del Mouse para golpear los círculos • Presiona <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">ESC</kbd> para Pausar
      </div>
    </div>
  );
};
