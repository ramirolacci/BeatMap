import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, Beatmap, GameSettings, ScoreState, ActiveJudgement, HitObject, KeyState } from './types/game';
import { GameEngine } from './engine/gameEngine';
import { audioEngine } from './audio/audioEngine';

import { MainMenu } from './components/MainMenu';
import { CanvasPlayfield } from './components/CanvasPlayfield';
import { HUD } from './components/HUD';
import { PauseMenu } from './components/PauseMenu';
import { ResultsScreen } from './components/ResultsScreen';

export function App() {
  const [beatmaps, setBeatmaps] = useState<Beatmap[]>([]);
  const [selectedBeatmap, setSelectedBeatmap] = useState<Beatmap | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');

  const [settings, setSettings] = useState<GameSettings>({
    masterVolume: 0.8,
    musicVolume: 0.7,
    hitsoundVolume: 0.8,
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
      {(gameState === 'playing' || gameState === 'paused') && selectedBeatmap && (
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
        </div>
      )}

      {/* Pantalla de Resultados */}
      {gameState === 'results' && selectedBeatmap && (
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
  );
}

export default App;
