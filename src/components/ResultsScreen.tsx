import React, { useEffect } from 'react';
import type { ScoreState, Beatmap } from '../types/game';
import confetti from 'canvas-confetti';
import { RotateCcw, Menu } from 'lucide-react';

interface ResultsScreenProps {
  scoreState: ScoreState;
  beatmap: Beatmap;
  onRetry: () => void;
  onMenu: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  scoreState,
  beatmap,
  onRetry,
  onMenu
}) => {
  // Determine Grade
  let grade = 'D';
  let gradeColor = 'text-red-500';

  if (scoreState.accuracy >= 98 && scoreState.misses === 0) {
    grade = 'S';
    gradeColor = 'text-amber-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.8)]';
  } else if (scoreState.accuracy >= 95) {
    grade = 'A';
    gradeColor = 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]';
  } else if (scoreState.accuracy >= 90) {
    grade = 'B';
    gradeColor = 'text-sky-400';
  } else if (scoreState.accuracy >= 80) {
    grade = 'C';
    gradeColor = 'text-indigo-400';
  }

  useEffect(() => {
    if (grade === 'S' || grade === 'A') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [grade]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#060609] text-white flex items-center justify-center p-6 select-none overflow-hidden">
      <div className="relative z-10 w-full max-w-2xl bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Canción Completada</span>
            <h2 className="text-2xl font-black text-white">{beatmap.title}</h2>
            <p className="text-xs text-neutral-400">{beatmap.artist} [{beatmap.version}]</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-500">Puntuación Total</span>
            <div className="font-mono text-3xl font-black text-white">
              {scoreState.score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Calificación y Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center my-2">
          {/* Insignia de Calificación */}
          <div className="flex flex-col items-center justify-center bg-black/50 border border-neutral-800 rounded-2xl p-6">
            <span className="text-xs uppercase font-bold text-neutral-400 mb-1">Calificación</span>
            <span className={`font-black text-7xl md:text-8xl ${gradeColor}`}>
              {grade}
            </span>
          </div>

          {/* Rejilla de Estadísticas */}
          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <div className="bg-black/40 border border-neutral-800/80 p-3.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Precisión</span>
              <div className="text-2xl font-mono font-black text-white">{scoreState.accuracy}%</div>
            </div>
            <div className="bg-black/40 border border-neutral-800/80 p-3.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Combo Máximo</span>
              <div className="text-2xl font-mono font-black text-pink-400">{scoreState.maxCombo}x</div>
            </div>

            {/* Desglose de Impactos */}
            <div className="col-span-2 grid grid-cols-4 gap-2 bg-black/50 border border-neutral-800 p-3 rounded-xl text-center">
              <div>
                <div className="text-[9px] font-bold text-sky-400">300</div>
                <div className="font-mono text-base font-bold text-white">{scoreState.hits300}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-emerald-400">100</div>
                <div className="font-mono text-base font-bold text-white">{scoreState.hits100}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-yellow-400">50</div>
                <div className="font-mono text-base font-bold text-white">{scoreState.hits50}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-red-400">FALLOS</div>
                <div className="font-mono text-base font-bold text-white">{scoreState.misses}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-4 pt-2">
          <button
            onClick={onRetry}
            className="flex-1 py-3.5 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REINTENTAR</span>
          </button>

          <button
            onClick={onMenu}
            className="flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
          >
            <Menu className="w-4 h-4" />
            <span>SELECCIÓN DE CANCIÓN</span>
          </button>
        </div>

      </div>
    </div>
  );
};
