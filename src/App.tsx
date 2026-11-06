import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, Beatmap, GameSettings, ScoreState, KeyState } from './types/game';
import { GameEngine } from './engine/gameEngine';
import { audioEngine } from './audio/audioEngine';
import { getInitialBeatmapList, ensureBeatmapLoaded } from './utils/defaultSongLoader';
import { Disc, Loader2, RotateCcw, Menu, Skull } from 'lucide-react';

import { MainMenu } from './components/MainMenu';
import { CanvasPlayfield } from './components/CanvasPlayfield';
import { HUD } from './components/HUD';
import { PauseMenu } from './components/PauseMenu';
import { ResultsScreen } from './components/ResultsScreen';

export function App() {
  const [beatmaps, setBeatmaps] = useState<Beatmap[]>(() => getInitialBeatmapList());
  const [selectedBeatmap, setSelectedBeatmap] = useState<Beatmap | null>(() => {
    const list = getInitialBeatmapList();
    return list.length > 0 ? list[0] : null;
  });

  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [loadingSongMsg, setLoadingSongMsg] = useState('Preparando canción...');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [activeEngine, setActiveEngine] = useState<GameEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('beatmap_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      masterVolume: 0.8,
      musicVolume: 0.7,
      hitsoundVolume: 0.75, // Activado por defecto con retroalimentación clara
      audioOffset: 0,       // Calibración de latencia de hardware (-150 a +150ms)
      backgroundDim: 0.8,
      key1: 'z',
      key2: 'x',
      cursorTrail: true,
      showHitErrorBar: true
    };
  });

  const [scoreState, setScoreState] = useState<ScoreState>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 100,
    hp: 100,
    hits300: 0,
    hits100: 0,
    hits50: 0,
    misses: 0,
    hitErrors: []
  });

  const [keyState, setKeyState] = useState<KeyState>({
    k1: false,
    k2: false,
    m1: false,
    m2: false,
    k1Count: 0,
    k2Count: 0
  });

  const cursorPosRef = useRef({ x: 256, y: 192 });
  const gameEngineRef = useRef<GameEngine | null>(null);

  // Guardar configuración en localStorage y sincronizar volúmenes y offset
  useEffect(() => {
    localStorage.setItem('beatmap_settings', JSON.stringify(settings));
    audioEngine.setVolumes(settings.musicVolume, settings.hitsoundVolume);
    audioEngine.setAudioOffset(settings.audioOffset);
  }, [settings]);

  const handleStartGame = useCallback(async () => {
    if (!selectedBeatmap) return;

    try {
      setIsLoadingSong(true);
      setLoadingSongMsg(`Cargando ${selectedBeatmap.title}...`);

      // 1. Asegurar que la pista y objetos estén cargados (Lazy Loading)
      const readyBeatmap = await ensureBeatmapLoaded(selectedBeatmap, (msg) => setLoadingSongMsg(msg));
      setSelectedBeatmap(readyBeatmap);

      // 2. Preparar audio en el motor
      if (readyBeatmap.audioBuffer) {
        audioEngine.setCustomBuffer(readyBeatmap.audioBuffer);
      } else if (readyBeatmap.audioUrl) {
        await audioEngine.loadAudioFromUrl(readyBeatmap.audioUrl);
      } else if (readyBeatmap.synthTheme) {
        audioEngine.generateProceduralTrack(readyBeatmap.synthTheme, 75);
      }

      // 3. Inicializar motor del juego
      const engine = new GameEngine(readyBeatmap, settings);
      gameEngineRef.current = engine;
      setActiveEngine(engine);

      setScoreState({
        score: 0,
        combo: 0,
        maxCombo: 0,
        accuracy: 100,
        hp: 100,
        hits300: 0,
        hits100: 0,
        hits50: 0,
        misses: 0,
        hitErrors: []
      });

      setKeyState({
        k1: false,
        k2: false,
        m1: false,
        m2: false,
        k1Count: 0,
        k2Count: 0
      });

      setIsLoadingSong(false);
      setGameState('playing');
      audioEngine.play(0);
    } catch (err) {
      console.error('Error al iniciar el juego:', err);
      setIsLoadingSong(false);
    }
  }, [selectedBeatmap, settings]);

  // Manejo de visibilidad del cursor
  useEffect(() => {
    if (gameState === 'playing') {
      document.body.style.cursor = 'none';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [gameState]);

  // Manejadores de teclado para Z / X, Pausa (ESPACIO / ESC), Reintentar (R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Atajos en pantallas de fin / pausa
      if (e.key === 'r' || e.key === 'R') {
        if (gameState === 'results' || gameState === 'failed' || gameState === 'paused') {
          e.preventDefault();
          audioEngine.stop();
          handleStartGame();
          return;
        }
      }

      if (e.key === 'Escape' || e.code === 'Space' || e.key === ' ') {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
        }
        if (gameState === 'playing') {
          audioEngine.pause();
          setGameState('paused');
        } else if (gameState === 'paused') {
          audioEngine.resume();
          setGameState('playing');
        }
        return;
      }

      if (gameState !== 'playing' || !gameEngineRef.current) return;

      const k1Key = settings.key1.toLowerCase();
      const k2Key = settings.key2.toLowerCase();
      const pressed = e.key.toLowerCase();

      // Golpear en la posición exacta actual del cursor
      if (pressed === k1Key && !keyState.k1) {
        setKeyState(prev => ({ ...prev, k1: true, k1Count: prev.k1Count + 1 }));
        gameEngineRef.current.handleTap(cursorPosRef.current.x, cursorPosRef.current.y);
      } else if (pressed === k2Key && !keyState.k2) {
        setKeyState(prev => ({ ...prev, k2: true, k2Count: prev.k2Count + 1 }));
        gameEngineRef.current.handleTap(cursorPosRef.current.x, cursorPosRef.current.y);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k1Key = settings.key1.toLowerCase();
      const k2Key = settings.key2.toLowerCase();
      const released = e.key.toLowerCase();

      if (released === k1Key) {
        setKeyState(prev => ({ ...prev, k1: false }));
      } else if (released === k2Key) {
        setKeyState(prev => ({ ...prev, k2: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, settings, keyState.k1, keyState.k2, handleStartGame]);

  // Manejar clic directo en el canvas (Mouse Tap)
  const handlePlayfieldTap = (px: number, py: number) => {
    if (gameState !== 'playing' || !gameEngineRef.current) return;
    cursorPosRef.current = { x: px, y: py };
    setKeyState(prev => ({ ...prev, k1: true, k1Count: prev.k1Count + 1 }));
    gameEngineRef.current.handleTap(px, py);
    setTimeout(() => setKeyState(prev => ({ ...prev, k1: false })), 75);
  };

  const handleGameEnd = (isFailed: boolean = false) => {
    audioEngine.pause();
    if (isFailed) {
      setGameState('failed');
    } else {
      setGameState('results');
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Indicador de Carga Bajo Demanda */}
      {isLoadingSong && (
        <div className="fixed inset-0 z-50 bg-[#050508]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 selection:bg-pink-500 overflow-hidden">
          <div className="relative w-20 h-20 flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 border-r-purple-500 animate-spin" />
            <div className="absolute inset-1 rounded-full border border-pink-500/20" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 p-0.5 shadow-[0_0_30px_rgba(236,72,153,0.4)] flex items-center justify-center">
              <div className="w-full h-full bg-[#0b0b12] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <Disc className="w-6 h-6 text-pink-400 animate-spin-slow" />
              </div>
            </div>
          </div>
          <p className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-pink-400" /> {loadingSongMsg}
          </p>
        </div>
      )}

      {/* Menú Principal */}
      {gameState === 'menu' && (
        <MainMenu
          beatmaps={beatmaps}
          selectedBeatmap={selectedBeatmap}
          settings={settings}
          onSelectBeatmap={setSelectedBeatmap}
          onStartGame={handleStartGame}
          onUpdateSettings={(newSet) => setSettings(prev => ({ ...prev, ...newSet }))}
          onAddCustomBeatmap={(newMap) => {
            setBeatmaps(prev => [newMap, ...prev]);
            setSelectedBeatmap(newMap);
          }}
        />
      )}

      {/* Pantalla de Juego */}
      {(gameState === 'playing' || gameState === 'paused' || gameState === 'results' || gameState === 'failed') && selectedBeatmap && activeEngine && (
        <div className="relative w-full h-full">
          <CanvasPlayfield
            gameEngine={activeEngine}
            keyState={keyState}
            onUpdateScore={setScoreState}
            onGameEnd={handleGameEnd}
            onTap={handlePlayfieldTap}
            onCursorMove={(x, y) => {
              cursorPosRef.current = { x, y };
            }}
          />

          <HUD
            scoreState={scoreState}
            keyState={keyState}
            beatmap={selectedBeatmap}
            onPause={() => {
              audioEngine.pause();
              setGameState('paused');
            }}
          />

          {/* Menú de Pausa */}
          {gameState === 'paused' && (
            <PauseMenu
              onResume={() => {
                audioEngine.resume();
                setGameState('playing');
              }}
              onRetry={() => {
                audioEngine.stop();
                handleStartGame();
              }}
              onMenu={() => {
                audioEngine.stop();
                setActiveEngine(null);
                gameEngineRef.current = null;
                setGameState('menu');
              }}
            />
          )}

          {/* Pantalla de Resultados Exitosos */}
          {gameState === 'results' && (
            <ResultsScreen
              scoreState={scoreState}
              beatmap={selectedBeatmap}
              onRetry={() => {
                audioEngine.stop();
                handleStartGame();
              }}
              onMenu={() => {
                audioEngine.stop();
                setActiveEngine(null);
                gameEngineRef.current = null;
                setGameState('menu');
              }}
            />
          )}

          {/* Pantalla de Canción Fallida (Game Over / Fail State) */}
          {gameState === 'failed' && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-300">
              <div className="w-full max-w-md bg-neutral-900/95 border-2 border-red-500/50 rounded-3xl p-8 flex flex-col items-center gap-5 text-center shadow-[0_0_60px_rgba(239,68,68,0.3)]">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
                  <Skull className="w-9 h-9 animate-pulse" />
                </div>

                <div>
                  <h2 className="text-3xl font-black text-red-500 tracking-wider uppercase drop-shadow-md">
                    ¡Canción Fallida!
                  </h2>
                  <p className="text-xs font-semibold text-neutral-300 mt-1">
                    Tu barra de vida se agotó por completo
                  </p>
                </div>

                <div className="w-full bg-black/50 border border-neutral-800 rounded-2xl p-4 flex justify-around text-center my-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Puntos</span>
                    <div className="text-lg font-mono font-bold text-white">{scoreState.score.toLocaleString()}</div>
                  </div>
                  <div className="w-[1px] bg-neutral-800" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Combo</span>
                    <div className="text-lg font-mono font-bold text-pink-400">{scoreState.maxCombo}x</div>
                  </div>
                  <div className="w-[1px] bg-neutral-800" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Precisión</span>
                    <div className="text-lg font-mono font-bold text-white">{scoreState.accuracy}%</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    audioEngine.stop();
                    handleStartGame();
                  }}
                  className="w-full py-4 rounded-xl font-black text-sm bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-400/40 shadow-lg shadow-red-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>REINTENTAR (R)</span>
                </button>

                <button
                  onClick={() => {
                    audioEngine.stop();
                    setActiveEngine(null);
                    gameEngineRef.current = null;
                    setGameState('menu');
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Menu className="w-4 h-4" />
                  <span>SELECCIÓN DE CANCIÓN</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
