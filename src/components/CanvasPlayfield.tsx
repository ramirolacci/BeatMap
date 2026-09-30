import React, { useRef, useEffect } from 'react';
import type { HitObject, ActiveJudgement, SliderObject, KeyState } from '../types/game';

interface CanvasPlayfieldProps {
  visibleObjects: HitObject[];
  activeJudgements: ActiveJudgement[];
  currentTimeMs: number;
  preemptMs: number;
  circleRadius: number;
  cursorX: number;
  cursorY: number;
  keyState: KeyState;
  onTap: (x: number, y: number) => void;
  onPointerMove: (x: number, y: number) => void;
}

export const CanvasPlayfield: React.FC<CanvasPlayfieldProps> = ({
  visibleObjects,
  activeJudgements,
  currentTimeMs,
  preemptMs,
  circleRadius,
  cursorX,
  cursorY,
  keyState,
  onTap,
  onPointerMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorHistoryRef = useRef<Array<{ x: number; y: number; alpha: number }>>([]);

  const getPlayfieldCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { px: 256, py: 192 };
    const rect = canvas.getBoundingClientRect();
    const px = Math.max(0, Math.min(512, ((e.clientX - rect.left) / rect.width) * 512));
    const py = Math.max(0, Math.min(384, ((e.clientY - rect.top) / rect.height) * 384));
    return { px, py };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { px, py } = getPlayfieldCoords(e);
    onPointerMove(px, py);
    onTap(px, py);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { px, py } = getPlayfieldCoords(e);
    onPointerMove(px, py);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render scale matching crisp high-DPI displays
    const width = 512;
    const height = 384;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Follow Points between consecutive upcoming notes
    drawFollowPoints(ctx, visibleObjects, currentTimeMs, preemptMs, circleRadius);

    // 2. Draw Hit Objects (Sliders first, then Hit Circles)
    const sortedObjects = [...visibleObjects].sort((a, b) => b.time - a.time);

    for (const obj of sortedObjects) {
      if (obj.type === 'slider') {
        drawSlider(ctx, obj as SliderObject, currentTimeMs, preemptMs, circleRadius);
      } else {
        drawHitCircle(ctx, obj, currentTimeMs, preemptMs, circleRadius);
      }
    }

    // 3. Draw Judgement Effects (300, 100, 50, Miss)
    drawJudgements(ctx, activeJudgements, currentTimeMs);

    // 4. Draw Cursor & Cursor Trail
    drawCursor(ctx, cursorX, cursorY, keyState, cursorHistoryRef);

  }, [visibleObjects, activeJudgements, currentTimeMs, preemptMs, circleRadius, cursorX, cursorY, keyState]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="w-full h-full max-w-[1280px] max-h-[720px] aspect-[16/9] object-contain cursor-none touch-none"
      />
    </div>
  );
};

// Draw follow points (glowing pink dots between object i and object i+1)
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

    if (next.comboNumber === 1) continue; // New combo break

    const timeDiff = next.time - timeMs;
    if (timeDiff > preemptMs || timeMs > next.time) continue;

    const opacity = Math.min(1, Math.max(0, 1 - (timeDiff - 100) / (preemptMs * 0.8)));

    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius * 2.5) continue;

    const dots = Math.floor(dist / 22);
    ctx.save();
    for (let d = 1; d < dots; d++) {
      const t = d / dots;
      const px = curr.x + dx * t;
      const py = curr.y + dy * t;

      ctx.fillStyle = `rgba(225, 120, 200, ${opacity * 0.6})`;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      // Outer glow
      ctx.fillStyle = `rgba(240, 160, 220, ${opacity * 0.25})`;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Draw standard hit circle & approach circle (Matching screenshots 1, 2, 3)
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

  // Alpha fade in during early preempt
  const fadeInProgress = Math.min(1, Math.max(0, (preemptMs - timeDiff) / (preemptMs * 0.4)));
  ctx.globalAlpha = fadeInProgress;

  // 1. Dark translucent inner body
  ctx.fillStyle = 'rgba(15, 15, 18, 0.85)';
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Thick crisp white outer ring stroke
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // 3. Inner accent ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, radius - 4, 0, Math.PI * 2);
  ctx.stroke();

  // 4. White Number digit in center
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(obj.comboNumber.toString(), obj.x, obj.y + 1);

  // 5. Shrinking Approach Circle
  if (timeDiff >= 0) {
    const scale = 1 + (timeDiff / preemptMs) * 2.2; // 3.2x size down to 1x size
    const approachRadius = radius * scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, approachRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw Slider with track, head, ball, follow circle (Matching screenshot 3)
function drawSlider(
  ctx: CanvasRenderingContext2D,
  slider: SliderObject,
  timeMs: number,
  preemptMs: number,
  radius: number
) {
  const timeDiff = slider.time - timeMs;
  if (timeDiff > preemptMs) return;

  const path = slider.path;
  if (!path || path.length < 2) return;

  ctx.save();
  const fadeInProgress = Math.min(1, Math.max(0, (preemptMs - timeDiff) / (preemptMs * 0.4)));
  ctx.globalAlpha = fadeInProgress;

  // 1. Draw capsule slider track
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Track outer white border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = radius * 2 + 4;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();

  // Track inner dark fill
  ctx.strokeStyle = 'rgba(20, 20, 24, 0.88)';
  ctx.lineWidth = radius * 2;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();

  // 2. Draw slider head circle (Hit Circle at start)
  drawHitCircle(ctx, slider, timeMs, preemptMs, radius);

  // 3. Draw Slider Ball & Follow Circle if slider is active
  if (timeMs >= slider.time && timeMs <= slider.time + slider.duration) {
    const progress = (timeMs - slider.time) / slider.duration;
    
    // Linear position along path
    const startPt = path[0];
    const endPt = path[path.length - 1];
    const ballX = startPt.x + (endPt.x - startPt.x) * progress;
    const ballY = startPt.y + (endPt.y - startPt.y) * progress;

    // Glowing white ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Outer follow circle ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ballX, ballY, radius * 1.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw Judgement Hits (300, 100, 50, Miss)
function drawJudgements(
  ctx: CanvasRenderingContext2D,
  judgements: ActiveJudgement[],
  currentTimeMs: number
) {
  for (const j of judgements) {
    const age = currentTimeMs - j.spawnTime;
    const opacity = Math.max(0, 1 - age / 600);
    const scale = 1 + (age / 600) * 0.3;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (j.type === 300) {
      // 300 is subtle blue ring pop
      ctx.strokeStyle = `rgba(130, 210, 255, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(j.x, j.y, 20 * scale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (j.type === 100) {
      ctx.fillStyle = '#4ade80'; // Green 100
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('100', j.x, j.y - age * 0.05);
    } else if (j.type === 50) {
      ctx.fillStyle = '#facc15'; // Yellow 50
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('50', j.x, j.y - age * 0.05);
    } else {
      ctx.fillStyle = '#ef4444'; // Red Miss X
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✕', j.x, j.y);
    }

    ctx.restore();
  }
}

// Draw smooth cursor with trail
function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  keyState: KeyState,
  historyRef: React.MutableRefObject<Array<{ x: number; y: number; alpha: number }>>
) {
  // Push cursor history point
  historyRef.current.push({ x, y, alpha: 1 });
  if (historyRef.current.length > 15) {
    historyRef.current.shift();
  }

  // Draw trail
  ctx.save();
  for (let i = 0; i < historyRef.current.length; i++) {
    const pt = historyRef.current[i];
    pt.alpha *= 0.85; // decay
    const size = (i / historyRef.current.length) * 7;

    ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha * 0.4})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw main white cursor circle
  const isKeyPressed = keyState.k1 || keyState.k2 || keyState.m1 || keyState.m2;
  const cursorRadius = isKeyPressed ? 11 : 9;

  // Outer glow ring
  ctx.fillStyle = isKeyPressed ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(x, y, cursorRadius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Solid center dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, cursorRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
