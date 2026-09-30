import React from 'react';
import { Play, RotateCcw, Menu } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRetry, onMenu }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-sm bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 flex flex-col items-center gap-4 text-center shadow-2xl">
        <h2 className="text-2xl font-black text-white tracking-widest uppercase">Pausado</h2>
        <p className="text-xs text-neutral-400 mb-2">El juego está pausado</p>

        <button
          onClick={onResume}
          className="w-full py-3 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>REANUDAR</span>
        </button>

        <button
          onClick={onRetry}
          className="w-full py-3 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>REINTENTAR</span>
        </button>

        <button
          onClick={onMenu}
          className="w-full py-3 rounded-xl font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>SELECCIÓN DE CANCIÓN</span>
        </button>
      </div>
    </div>
  );
};
