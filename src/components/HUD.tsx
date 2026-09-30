import React, { useEffect, useRef } from 'react';
import type { ScoreState, KeyState, Beatmap } from '../types/game';
import { gsap } from 'gsap';

interface HUDProps {
  scoreState: ScoreState;
  keyState: KeyState;
  beatmap: Beatmap;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  scoreState,
  keyState: _keyState,
  beatmap,
  onPause
}) => {
  const formattedScore = scoreState.score.toString().padStart(8, '0');
  const formattedAccuracy = scoreState.accuracy.toFixed(2);

  const topBarRef = useRef<HTMLDivElement | null>(null);
  const comboRef = useRef<HTMLSpanElement | null>(null);
  const prevComboRef = useRef<number>(scoreState.combo);

  // Top Bar GSAP Entrance con limpieza de propiedades para evitar opacidad atascada
  useEffect(() => {
    if (topBarRef.current) {
      gsap.fromTo(
        topBarRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', clearProps: 'all' }
      );
    }
  }, []);

  // Combo Increase GSAP Pulse
  useEffect(() => {
    if (scoreState.combo > prevComboRef.current && comboRef.current) {
      gsap.fromTo(
        comboRef.current,
        { scale: 1.35, color: '#f472b6' },
        { scale: 1, color: '#ffffff', duration: 0.22, ease: 'power2.out' }
      );
    }
    prevComboRef.current = scoreState.combo;
  }, [scoreState.combo]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* BARRA SUPERIOR (Vida, Precisión, Puntos) */}
      <div ref={topBarRef} className="flex items-start justify-between w-full">
        {/* Esquina Superior Izquierda: Barra de Vida de Alto Contraste */}
        <div className="flex flex-col gap-1 w-64 md:w-80">
          <div className="text-xs uppercase font-black tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] pl-0.5">
            VIDA
          </div>
          <div className="relative h-3.5 w-full bg-neutral-950/90 rounded-full border-2 border-white/60 overflow-hidden backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.8)]">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-400 to-white transition-all duration-150 ease-out rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9)]"
              style={{ width: `${Math.max(0, Math.min(100, scoreState.hp))}%` }}
            />
          </div>
        </div>

        {/* Centro Superior: Precisión (%) */}
        <div className="flex items-center gap-2 bg-neutral-950/90 px-4 py-1.5 rounded-full border-2 border-white/60 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.8)]">
          <div className="relative w-4 h-4 rounded-full border-2 border-white overflow-hidden flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-tl-full" />
          </div>
          <span className="font-mono text-base md:text-lg font-black text-white tracking-tight drop-shadow-md">
            {formattedAccuracy}%
          </span>
        </div>

        {/* Esquina Superior Derecha: Puntos Brillantes */}
        <div className="flex flex-col items-end drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          <div className="font-mono text-3xl md:text-4xl font-black text-white tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {formattedScore}
          </div>
          <div className="w-full h-[2px] bg-white/60 my-0.5 shadow-[0_0_8px_#ffffff]" />
          <div className="text-[10px] uppercase tracking-widest text-neutral-200 font-extrabold drop-shadow-md">
            PUNTOS
          </div>
        </div>
      </div>

      {/* OVERLAY CENTRAL (Nombre de Canción y Botón Pausa) */}
      <div className="flex items-center justify-between w-full opacity-0 hover:opacity-100 transition-opacity pointer-events-auto">
        <div className="text-xs font-semibold text-white bg-black/80 px-3.5 py-1.5 rounded-lg border border-neutral-700 backdrop-blur-md shadow-md">
          {beatmap.title} - {beatmap.version}
        </div>
        <button
          onClick={onPause}
          className="text-xs font-bold bg-neutral-800/90 hover:bg-neutral-700 text-white px-3.5 py-1.5 rounded-lg border border-neutral-500 backdrop-blur-md transition-colors cursor-pointer shadow-md"
        >
          ESPACIO / Pausa
        </button>
      </div>

      {/* BARRA INFERIOR (Combo, Error Error UR, Key Counter) */}
      <div className="flex items-end justify-between w-full relative">
        {/* Esquina Inferior Izquierda: Contador de Combo Grande */}
        <div className="flex items-baseline gap-1.5">
          <span ref={comboRef} className="font-mono text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] inline-block">
            {scoreState.combo}
          </span>
          <span className="font-mono text-3xl md:text-4xl font-black text-pink-400 drop-shadow-[0_0_12px_rgba(244,114,182,0.9)]">
            x
          </span>
          {scoreState.misses > 0 && (
            <div className="flex gap-0.5 ml-2">
              {Array.from({ length: Math.min(3, scoreState.misses) }).map((_, i) => (
                <span key={i} className="text-sm text-pink-500 font-bold drop-shadow-sm">✕</span>
              ))}
            </div>
          )}
        </div>

        {/* Centro Inferior: Medidor de Sincronización UR (Hit Error Bar) */}
        <div className="flex flex-col items-center gap-1 mx-auto">
          <div className="relative w-48 md:w-64 h-2.5 bg-black/90 rounded-full border border-neutral-600 overflow-hidden flex items-center justify-center shadow-lg">
            {/* Zona Verde Central 300 */}
            <div className="w-12 h-full bg-emerald-500/40 border-x border-emerald-400" />
            
            {/* Indicador Central ^ */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-sky-300 z-10 shadow-[0_0_6px_#38bdf8]" />

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
                  className={`absolute top-0 bottom-0 w-1 ${colorClass} opacity-90 z-20`}
                  style={{ left: `${Math.max(2, Math.min(98, leftPercent))}%` }}
                />
              );
            })}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono font-bold">
            ▲
          </div>
        </div>
      </div>
    </div>
  );
};


