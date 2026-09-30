import React, { useEffect, useRef } from 'react';
import { Play, RotateCcw, Menu } from 'lucide-react';
import { gsap } from 'gsap';

interface PauseMenuProps {
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRetry, onMenu }) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.2, ease: 'power2.out', clearProps: 'all' }
        );
      }

      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { scale: 0.85, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)', clearProps: 'all' }
        );

        gsap.fromTo(
          cardRef.current.querySelectorAll('button'),
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.3, ease: 'power3.out', delay: 0.1, clearProps: 'all' }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={overlayRef} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div ref={cardRef} className="w-full max-w-sm bg-neutral-900 border-2 border-neutral-700/80 rounded-3xl p-6 flex flex-col items-center gap-4 text-center shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        <div>
          <h2 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">Pausado</h2>
          <p className="text-xs font-semibold text-neutral-300 mt-1">El juego está pausado</p>
        </div>

        <button
          onClick={onResume}
          className="w-full py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white border border-pink-400/40 shadow-lg shadow-pink-500/25 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-95"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>REANUDAR</span>
        </button>

        <button
          onClick={onRetry}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-95 shadow-md"
        >
          <RotateCcw className="w-4 h-4 text-neutral-200" />
          <span>REINTENTAR</span>
        </button>

        <button
          onClick={onMenu}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-neutral-950 hover:bg-neutral-900 text-neutral-200 border border-neutral-700 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-95 shadow-md"
        >
          <Menu className="w-4 h-4 text-neutral-300" />
          <span>SELECCIÓN DE CANCIÓN</span>
        </button>
      </div>
    </div>
  );
};


