import React, { useRef, useEffect } from 'react';
import type { HitObject, ActiveJudgement, SliderObject, KeyState, ScoreState, HitExplosion } from '../types/game';
import { GameEngine } from '../engine/gameEngine';
import { audioEngine } from '../audio/audioEngine';

interface CanvasPlayfieldProps {
  gameEngine: GameEngine;
  keyState: KeyState;
  onUpdateScore: (score: ScoreState) => void;
  onGameEnd: (isFailed?: boolean) => void;
  onTap: (x: number, y: number) => void;
  onCursorMove?: (x: number, y: number) => void;
}

export const CanvasPlayfield: React.FC<CanvasPlayfieldProps> = ({
  gameEngine,
  keyState,
  onUpdateScore,
  onGameEnd,
  onTap,
  onCursorMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorHistoryRef = useRef<Array<{ x: number; y: number; alpha: number }>>([]);
  const localCursorRef = useRef<{ x: number; y: number }>({ x: 256, y: 192 });
  const animFrameIdRef = useRef<number | null>(null);
  const lastScoreUpdateRef = useRef<number>(0);

  // Escuchar eventos de puntero (ratón y toque) y mantener coordenadas sincronizadas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPlayfieldCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(rect.width / 512, rect.height / 384);
      const offsetX = (rect.width - 512 * scale) / 2;
      const offsetY = (rect.height - 384 * scale) / 2;

      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const px = Math.max(0, Math.min(512, (mouseX - offsetX) / scale));
      const py = Math.max(0, Math.min(384, (mouseY - offsetY) / scale));
      return { px, py };
    };

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      const { px, py } = getPlayfieldCoords(e.clientX, e.clientY);
      localCursorRef.current = { x: px, y: py };
      if (onCursorMove) {
        onCursorMove(px, py);
      }
    };

    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      e.preventDefault();
      const { px, py } = getPlayfieldCoords(e.clientX, e.clientY);
      localCursorRef.current = { x: px, y: py };
      if (onCursorMove) {
        onCursorMove(px, py);
      }
      onTap(px, py);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onTap, onCursorMove]);

  // Manejar resolución High-DPI del Canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bucle de renderizado de alta velocidad (120+ FPS) desacoplado de React
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const renderLoop = () => {
      if (!isRunning) return;

      const time = audioEngine.getCurrentTimeMs();
      const cursor = localCursorRef.current;
      const isKeyDown = keyState.k1 || keyState.k2 || keyState.m1 || keyState.m2;

      // 1. Actualizar motor del juego con coordenadas de cursor en tiempo real
      const frameResult = gameEngine.update(time, cursor.x, cursor.y, isKeyDown);

      // Throttling del HUD a ~30Hz para mantener la UI suave
      const now = performance.now();
      if (now - lastScoreUpdateRef.current > 32) {
        lastScoreUpdateRef.current = now;
        onUpdateScore(frameResult.scoreState);
      }

      // Comprobar fallo por HP <= 0
      if (frameResult.isFailed) {
        audioEngine.playFailSound();
        onGameEnd(true);
        return;
      }

      // Comprobar victoria / fin de canción
      if (frameResult.isFinished) {
        onGameEnd(false);
        return;
      }

      // 2. Renderizar cuadro en Canvas 2D
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth || 1024;
      const cssHeight = canvas.clientHeight || 768;

      ctx.save();
      // Reset transform y escalar para High-DPI
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fondo oscuro
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // Transformación virtual 512x384 (centrado con letterboxing)
      const scale = Math.min(cssWidth / 512, cssHeight / 384);
      const offsetX = (cssWidth - 512 * scale) / 2;
      const offsetY = (cssHeight - 384 * scale) / 2;

      const preempt = gameEngine.getPreemptMs();
      const radius = gameEngine.getCircleRadius();

      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // A. Puntos guía entre notas consecutivas (Follow Points)
      drawFollowPoints(ctx, frameResult.visibleObjects, time, preempt, radius);

      // B. Hit Objects (sliders y círculos ordenados por tiempo inverso)
      const sortedObjects = [...frameResult.visibleObjects].sort((a, b) => b.time - a.time);
      for (const obj of sortedObjects) {
        if (obj.type === 'slider') {
          drawSlider(ctx, obj as SliderObject, time, preempt, radius, gameEngine);
        } else {
          drawHitCircle(ctx, obj, time, preempt, radius);
        }
      }

      // C. Ondas expansivas de impacto (Hit Explosions)
      drawHitExplosions(ctx, frameResult.activeExplosions, time);

      // D. Juicios flotantes (300, 100, 50, Miss)
      drawJudgements(ctx, frameResult.activeJudgements, time);

      // E. Cursor dinámico con estela de partículas
      drawCursor(ctx, cursor.x, cursor.y, keyState, cursorHistoryRef);

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [gameEngine, keyState, onUpdateScore, onGameEnd]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none cursor-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-none touch-none"
      />
    </div>
  );
};

// Dibuja puntos guía punteados entre objetos
function drawFollowPoints(
  ctx: CanvasRenderingContext2D,
  objects: HitObject[],
  timeMs: number,
  preemptMs: number,
  radius: number
) {
  const sorted = [...objects].sort((a, b) => a.time - b.time);
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    if (next.comboNumber === 1) continue;

    const timeDiff = next.time - timeMs;
    if (timeDiff > preemptMs || timeMs > next.time) continue;

    const opacity = Math.min(1, Math.max(0, 1 - (timeDiff - 80) / (preemptMs * 0.85)));
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const dist = Math.hypot(dx, dy);

    if (dist < radius * 2.2) continue;

    const dots = Math.floor(dist / 24);
    ctx.save();
    for (let d = 1; d < dots; d++) {
      const t = d / dots;
      const px = curr.x + dx * t;
      const py = curr.y + dy * t;

      ctx.fillStyle = `rgba(236, 72, 153, ${opacity * 0.75})`;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(244, 114, 182, ${opacity * 0.25})`;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Círculo estándar con anillo de aproximación y numeración
function drawHitCircle(
  ctx: CanvasRenderingContext2D,
  obj: HitObject,
  timeMs: number,
  preemptMs: number,
  radius: number
) {
  const timeDiff = obj.time - timeMs;
  if (timeDiff > preemptMs) return;

  ctx.save();
  const fadeIn = Math.min(1, Math.max(0, (preemptMs - timeDiff) / (preemptMs * 0.4)));
  ctx.globalAlpha = fadeIn;

  // Cuerpo translúcido
  ctx.fillStyle = 'rgba(12, 12, 16, 0.88)';
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Borde blanco exterior
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Anillo de acento interno
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, radius - 4, 0, Math.PI * 2);
  ctx.stroke();

  // Número de combo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(obj.comboNumber.toString(), obj.x, obj.y + 1);

  // Anillo de aproximación que se encoge con precisión matemática
  if (timeDiff >= 0) {
    const scale = 1 + (timeDiff / preemptMs) * 2.2;
    const approachRadius = radius * scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, approachRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Traza una trayectoria suave en el canvas según el número de puntos
function traceSliderPath(ctx: CanvasRenderingContext2D, path: Array<{ x: number; y: number }>) {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  if (path.length === 2) {
    ctx.lineTo(path[1].x, path[1].y);
  } else if (path.length === 3) {
    ctx.quadraticCurveTo(path[1].x, path[1].y, path[2].x, path[2].y);
  } else {
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
  }
}

// Slider interactivo con pista curvada Bézier, cabezas redondeadas y aro de tracking
function drawSlider(
  ctx: CanvasRenderingContext2D,
  slider: SliderObject,
  timeMs: number,
  preemptMs: number,
  radius: number,
  engine: GameEngine
) {
  const timeDiff = slider.time - timeMs;
  if (timeDiff > preemptMs) return;

  const path = slider.path;
  if (!path || path.length < 2) return;

  ctx.save();
  const fadeIn = Math.min(1, Math.max(0, (preemptMs - timeDiff) / (preemptMs * 0.4)));
  ctx.globalAlpha = fadeIn;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Pista exterior blanca (conecta suavemente con curvas Bézier)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = radius * 2 + 4;
  traceSliderPath(ctx, path);
  ctx.stroke();

  // Pista interior oscura
  ctx.strokeStyle = 'rgba(18, 18, 24, 0.92)';
  ctx.lineWidth = radius * 2;
  traceSliderPath(ctx, path);
  ctx.stroke();

  // 2. Círculo final del slider (Slider End Circle)
  const endPoint = path[path.length - 1];
  ctx.fillStyle = 'rgba(12, 12, 16, 0.88)';
  ctx.beginPath();
  ctx.arc(endPoint.x, endPoint.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 3. Cabeza del slider
  drawHitCircle(ctx, slider, timeMs, preemptMs, radius);

  // 4. Bola del slider en movimiento y aro de seguimiento
  if (timeMs >= slider.time && timeMs <= slider.time + slider.duration) {
    const progress = Math.max(0, Math.min(1, (timeMs - slider.time) / slider.duration));
    const ballPos = engine.getSliderBallPosition(slider, progress);
    const isTracking = engine.isSliderTracking(slider.id);

    // Bola luminosa
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballPos.x, ballPos.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Aro de seguimiento (Follow Circle)
    ctx.strokeStyle = isTracking ? 'rgba(56, 189, 248, 0.95)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = isTracking ? 4 : 2;
    ctx.beginPath();
    ctx.arc(ballPos.x, ballPos.y, radius * 1.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Ondas expansivas luminosas al golpear con precisión (Hit Explosions)
function drawHitExplosions(
  ctx: CanvasRenderingContext2D,
  explosions: HitExplosion[],
  currentTimeMs: number
) {
  for (const exp of explosions) {
    const age = currentTimeMs - exp.spawnTime;
    const progress = Math.min(1, age / 250);
    const opacity = 1 - progress;
    const currentRadius = exp.radius * (1 + progress * 0.7);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = exp.color;
    ctx.lineWidth = 3 * (1 - progress);
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Juicios visuales (300, 100, 50, Miss)
function drawJudgements(
  ctx: CanvasRenderingContext2D,
  judgements: ActiveJudgement[],
  currentTimeMs: number
) {
  for (const j of judgements) {
    const age = currentTimeMs - j.spawnTime;
    const opacity = Math.max(0, 1 - age / 550);
    const scale = 1 + (age / 550) * 0.35;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (j.type === 300) {
      ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(j.x, j.y, 22 * scale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (j.type === 100) {
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 18px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('100', j.x, j.y - age * 0.05);
    } else if (j.type === 50) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 15px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('50', j.x, j.y - age * 0.05);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✕', j.x, j.y);
    }

    ctx.restore();
  }
}

// Cursor estilizado y estela
function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  keyState: KeyState,
  historyRef: React.MutableRefObject<Array<{ x: number; y: number; alpha: number }>>
) {
  historyRef.current.push({ x, y, alpha: 1 });
  if (historyRef.current.length > 14) {
    historyRef.current.shift();
  }

  ctx.save();
  for (let i = 0; i < historyRef.current.length; i++) {
    const pt = historyRef.current[i];
    pt.alpha *= 0.86;
    const size = (i / historyRef.current.length) * 6.5;

    ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha * 0.38})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const isPressed = keyState.k1 || keyState.k2 || keyState.m1 || keyState.m2;
  const cursorRadius = isPressed ? 11 : 9;

  ctx.fillStyle = isPressed ? 'rgba(236, 72, 153, 0.45)' : 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.arc(x, y, cursorRadius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, cursorRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
