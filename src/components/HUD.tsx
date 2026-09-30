import React from 'react';
import type { ScoreState, KeyState, Beatmap } from '../types/game';

interface HUDProps {
  scoreState: ScoreState;
  keyState: KeyState;
  beatmap: Beatmap;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  scoreState,
  keyState,
  beatmap,
  onPause
}) => {
  const formattedScore = scoreState.score.toString().padStart(8, '0');
  const formattedAccuracy = scoreState.accuracy.toFixed(2);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 overflow-hidden">
      {/* BARRA SUPERIOR */}
      <div className="flex items-start justify-between w-full">
        {/* Esquina Superior Izquierda: Barra de Vida */}
        <div className="flex flex-col gap-1 w-64 md:w-80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 pl-0.5">
            VIDA
          </div>
          <div className="relative h-2.5 w-full bg-neutral-900/80 rounded-full border border-neutral-700/60 overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-neutral-200 to-white transition-all duration-150 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]"
              style={{ width: `${Math.max(0, Math.min(100, scoreState.hp))}%` }}
            />
          </div>
        </div>

        {/* Centro Superior: Precisión (%) */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-neutral-800/80 backdrop-blur-md">
          <div className="relative w-4 h-4 rounded-full border border-white/80 overflow-hidden flex items-center justify-center">
            <div className="w-2 h-2 bg-white/90 rounded-tl-full" />
          </div>
          <span className="font-mono text-base md:text-lg font-bold text-white tracking-tight">
            {formattedAccuracy}%
          </span>
        </div>

        {/* Esquina Superior Derecha: Puntos */}
        <div className="flex flex-col items-end">
          <div className="font-mono text-2xl md:text-3xl font-black text-white tracking-wider drop-shadow-md">
            {formattedScore}
          </div>
          <div className="w-full h-[1px] bg-white/40 my-0.5" />
          <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">
            PUNTOS
          </div>
        </div>
      </div>

      {/* OVERLAY CENTRAL (Nombre de Canción y Botón Pausa) */}
      <div className="flex items-center justify-between w-full opacity-0 hover:opacity-100 transition-opacity pointer-events-auto">
        <div className="text-xs text-neutral-400 bg-black/60 px-3 py-1.5 rounded-lg border border-neutral-800 backdrop-blur-sm">
          {beatmap.title} - {beatmap.version}
        </div>
        <button
          onClick={onPause}
          className="text-xs bg-neutral-800/80 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg border border-neutral-600 backdrop-blur-sm transition-colors cursor-pointer"
        >
          ESC / Pausa
        </button>
      </div>

      {/* BARRA INFERIOR */}
      <div className="flex items-end justify-between w-full relative">
        {/* Esquina Inferior Izquierda: Contador de Combo */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
            {scoreState.combo}
          </span>
          <span className="font-mono text-2xl md:text-3xl font-bold text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]">
            x
          </span>
          {scoreState.misses > 0 && (
            <div className="flex gap-0.5 ml-2">
              {Array.from({ length: Math.min(3, scoreState.misses) }).map((_, i) => (
                <span key={i} className="text-xs text-pink-500/80 font-bold">✕</span>
              ))}
            </div>
          )}
        </div>

        {/* Centro Inferior: Medidor de Sincronización UR (Hit Error Bar) */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-48 md:w-64 h-2 bg-neutral-900/90 rounded-full border border-neutral-700/80 overflow-hidden flex items-center justify-center shadow-inner">
            {/* Zona Verde Central 300 */}
            <div className="w-12 h-full bg-emerald-500/30 border-x border-emerald-500/50" />
            
            {/* Indicador Central ^ */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-sky-400 z-10 shadow-[0_0_6px_#38bdf8]" />

            {/* Dynamic hit error ticks */}
            {scoreState.hitErrors.slice(-12).map((err, idx) => {
              const leftPercent = 50 + (err.offset / 100) * 50;
              const colorClass =
                err.type === 300
                  ? 'bg-sky-400'
                  : err.type === 100
                  ? 'bg-emerald-400'
                  : err.type === 50
                  ? 'bg-yellow-400'
                  : 'bg-red-500';

              return (
                <div
                  key={idx}
                  className={`absolute top-0 bottom-0 w-1 ${colorClass} opacity-80 z-20`}
                  style={{ left: `${Math.max(2, Math.min(98, leftPercent))}%` }}
                />
              );
            })}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            ▲
          </div>
        </div>

        {/* Esquina Inferior Derecha: Contador de Teclas Press (Z / X) */}
        <div className="flex flex-col gap-1 items-end pointer-events-auto">
          <div className="flex gap-1.5">
            <div
              className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-mono border transition-all duration-75 ${
                keyState.k1
                  ? 'bg-white text-black border-white scale-95 shadow-[0_0_12px_#ffffff]'
                  : 'bg-black/60 text-white/80 border-neutral-800'
              }`}
            >
              <span className="text-[10px] font-bold">Z</span>
              <span className="text-xs font-semibold">{keyState.k1Count}</span>
            </div>
            <div
              className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-mono border transition-all duration-75 ${
                keyState.k2
                  ? 'bg-white text-black border-white scale-95 shadow-[0_0_12px_#ffffff]'
                  : 'bg-black/60 text-white/80 border-neutral-800'
              }`}
            >
              <span className="text-[10px] font-bold">X</span>
              <span className="text-xs font-semibold">{keyState.k2Count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
