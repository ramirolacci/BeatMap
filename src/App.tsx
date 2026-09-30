import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, Beatmap, GameSettings, ScoreState, ActiveJudgement, HitObject, KeyState } from './types/game';
import { GameEngine } from './engine/gameEngine';
import { audioEngine } from './audio/audioEngine';
import { loadDefaultBeatmaps } from './utils/defaultSongLoader';
import { Disc } from 'lucide-react';

import { MainMenu } from './components/MainMenu';
import { CanvasPlayfield } from './components/CanvasPlayfield';
import { HUD } from './components/HUD';
import { PauseMenu } from './components/PauseMenu';
import { ResultsScreen } from './components/ResultsScreen';

export function App() {
  const [beatmaps, setBeatmaps] = useState<Beatmap[]>([]);
  const [selectedBeatmap, setSelectedBeatmap] = useState<Beatmap | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);

  const [gameState, setGameState] = useState<GameState>('menu');

  const [settings, setSettings] = useState<GameSettings>({
    masterVolume: 0.8,
    musicVolume: 0.7,
    hitsoundVolume: 0,
    backgroundDim: 0.8,
    key1: 'z',
    key2: 'x',
    cursorTrail: true,
    showHitErrorBar: true
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

  const [visibleObjects, setVisibleObjects] = useState<HitObject[]>([]);
  const [activeJudgements, setActiveJudgements] = useState<ActiveJudgement[]>([]);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const cursorPosRef = useRef({ x: 256, y: 192 });

  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cargar canciones por defecto automáticamente al iniciar la aplicación
  useEffect(() => {
    let isMounted = true;
    async function initDefaults() {
      try {
        const maps = await loadDefaultBeatmaps();

        if (isMounted) {
          if (maps.length > 0) {
            setBeatmaps(maps);
            setSelectedBeatmap(maps[0]);
          }
          setIsLoadingDefaults(false);
        }
      } catch (err) {
        console.error('Error inicializando canciones por defecto:', err);
        if (isMounted) setIsLoadingDefaults(false);
      }
    }

    initDefaults();
    return () => { isMounted = false; };
  }, []);

  // Actualizar volúmenes de audio cuando cambian los ajustes
  useEffect(() => {
    audioEngine.setVolumes(settings.musicVolume, settings.hitsoundVolume);
  }, [settings.musicVolume, settings.hitsoundVolume]);

  const handleStartGame = async () => {
    if (!selectedBeatmap) return;

    // 1. Preparar pista de audio
    if (selectedBeatmap.audioBuffer) {
      audioEngine.setCustomBuffer(selectedBeatmap.audioBuffer);
    } else if (selectedBeatmap.audioUrl) {
      await audioEngine.loadAudioFromUrl(selectedBeatmap.audioUrl);
    } else if (selectedBeatmap.synthTheme) {
      audioEngine.generateProceduralTrack(selectedBeatmap.synthTheme, 90);
    }

    // 2. Inicializar motor del juego
    const engine = new GameEngine(selectedBeatmap, settings);
    gameEngineRef.current = engine;

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

    setGameState('playing');
    audioEngine.play(0);
  };

  // Bucle principal del juego (60/120 FPS)
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing' || !gameEngineRef.current) return;

    const time = audioEngine.getCurrentTimeMs();
    setCurrentTimeMs(time);

    const result = gameEngineRef.current.update(time);

    setScoreState(result.scoreState);
    setVisibleObjects(result.visibleObjects);
    setActiveJudgements(result.activeJudgements);

    if (result.isFinished || result.scoreState.hp <= 0) {
      audioEngine.pause();
      setGameState('results');
      return;
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      document.body.style.cursor = 'none';
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      document.body.style.cursor = 'default';
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, gameLoop]);

  // Manejadores de teclado (Barra espaciadora y ESC para pausa)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [gameState, settings, keyState]);

  // Manejar clic en pantalla
  const handlePlayfieldTap = (px: number, py: number) => {
    if (gameState !== 'playing' || !gameEngineRef.current) return;
    cursorPosRef.current = { x: px, y: py };
    setKeyState(prev => ({ ...prev, k1: true, k1Count: prev.k1Count + 1 }));
    gameEngineRef.current.handleTap(px, py);
    setTimeout(() => setKeyState(prev => ({ ...prev, k1: false })), 80);
  };

  const handlePointerMove = (px: number, py: number) => {
    cursorPosRef.current = { x: px, y: py };
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Indicador de Carga Inicial Estilizado */}
      {isLoadingDefaults && (
        <div className="fixed inset-0 z-50 bg-[#050508] flex flex-col items-center justify-center p-6 selection:bg-pink-500 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute w-72 h-72 rounded-full bg-pink-600/10 blur-[100px] animate-pulse pointer-events-none" />
          <div className="absolute w-72 h-72 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

          {/* Minimal Stylized Spinner */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Spinning Outer Gradient Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 border-r-purple-500 animate-spin" />
            <div className="absolute inset-1 rounded-full border border-pink-500/20" />

            {/* Inner Vinyl Disc Icon */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 p-0.5 shadow-[0_0_30px_rgba(236,72,153,0.4)] flex items-center justify-center">
              <div className="w-full h-full bg-[#0b0b12] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <Disc className="w-6 h-6 text-pink-400 animate-spin-slow" />
                <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
              </div>
            </div>
          </div>
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
          onAddCustomBeatmap={(newMap) => setBeatmaps(prev => [newMap, ...prev])}
        />
      )}

      {/* Pantalla de Juego */}
      {(gameState === 'playing' || gameState === 'paused' || gameState === 'results') && selectedBeatmap && (
        <div className="relative w-full h-full">
          <CanvasPlayfield
            visibleObjects={visibleObjects}
            activeJudgements={activeJudgements}
            currentTimeMs={currentTimeMs}
            preemptMs={gameEngineRef.current?.getPreemptMs() || 600}
            circleRadius={gameEngineRef.current?.getCircleRadius() || 36}
            cursorX={cursorPosRef.current.x}
            cursorY={cursorPosRef.current.y}
            keyState={keyState}
            onTap={handlePlayfieldTap}
            onPointerMove={handlePointerMove}
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
                setGameState('menu');
              }}
            />
          )}

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
                setGameState('menu');
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
