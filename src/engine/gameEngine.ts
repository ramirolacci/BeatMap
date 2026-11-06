import type { Beatmap, GameSettings, HitObject, JudgementType, ScoreState, ActiveJudgement, SliderObject, HitExplosion } from '../types/game';
import { audioEngine } from '../audio/audioEngine';

export class GameEngine {
  private beatmap: Beatmap;
  private currentTimeMs: number = 0;

  private activeObjects: HitObject[] = [];
  private processedObjectIds: Set<string> = new Set();
  
  // Slider tracking: almacena sliders actualmente activos y su estado de seguimiento
  private activeSliders: Map<string, {
    object: SliderObject;
    headHit: boolean;
    isTracking: boolean;
    broken: boolean;
    completed: boolean;
  }> = new Map();

  private activeJudgements: ActiveJudgement[] = [];
  private activeExplosions: HitExplosion[] = [];

  private scoreState: ScoreState = {
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
  };

  // Virtual playfield space: 512 x 384 (estándar osu!)
  public readonly playfieldWidth = 512;
  public readonly playfieldHeight = 384;

  constructor(beatmap: Beatmap, settings: GameSettings) {
    this.beatmap = beatmap;
    this.activeObjects = [...beatmap.hitObjects].sort((a, b) => a.time - b.time);
    audioEngine.setAudioOffset(settings.audioOffset || 0);
  }

  public getPreemptMs(): number {
    const ar = this.beatmap.ar;
    if (ar < 5) return 1200 + (600 * (5 - ar)) / 5;
    return 1200 - (750 * (ar - 5)) / 5;
  }

  public getCircleRadius(): number {
    const cs = this.beatmap.cs;
    return Math.max(20, 54.4 - 4.48 * cs);
  }

  // Ventanas de tiempo precisas basadas en el estándar de juegos de ritmo
  public getTimingWindows(): { w300: number; w100: number; w50: number } {
    const od = Math.min(10, Math.max(0, this.beatmap.od));
    return {
      w300: Math.max(25, Math.round(80 - 6 * od)),  // ~32ms a OD 8
      w100: Math.max(50, Math.round(140 - 8 * od)), // ~76ms a OD 8
      w50: Math.max(80, Math.round(200 - 10 * od))  // ~120ms a OD 8
    };
  }

  public update(
    timeMs: number,
    cursorX: number = 256,
    cursorY: number = 192,
    isKeyDown: boolean = false
  ): {
    scoreState: ScoreState;
    activeJudgements: ActiveJudgement[];
    activeExplosions: HitExplosion[];
    visibleObjects: HitObject[];
    isFinished: boolean;
    isFailed: boolean;
  } {
    this.currentTimeMs = timeMs;
    const preempt = this.getPreemptMs();
    const { w50 } = this.getTimingWindows();
    const radius = this.getCircleRadius();

    // 1. Encontrar objetos visibles en la ventana temporal actual
    const visibleObjects = this.activeObjects.filter(
      obj => !this.processedObjectIds.has(obj.id) &&
             timeMs >= obj.time - preempt &&
             timeMs <= obj.time + (obj.type === 'slider' ? obj.duration : 0) + w50 + 100
    );

    // 2. Procesar sliders activos (Slider Tracking en tiempo real)
    for (const [id, state] of this.activeSliders.entries()) {
      const slider = state.object;
      const sliderEnd = slider.time + slider.duration;

      if (timeMs >= slider.time && timeMs <= sliderEnd) {
        // Calcular la posición actual de la bola del slider
        const progress = Math.max(0, Math.min(1, (timeMs - slider.time) / slider.duration));
        const ballPos = this.getSliderBallPosition(slider, progress);
        const dist = Math.hypot(cursorX - ballPos.x, cursorY - ballPos.y);
        const trackingRadius = radius * 2.3;

        if (isKeyDown && dist <= trackingRadius) {
          state.isTracking = true;
        } else {
          state.isTracking = false;
          // Si el jugador soltó o se alejó durante el recorrido, se marca rotura de slider
          if (!state.broken) {
            state.broken = true;
          }
        }
      } else if (timeMs > sliderEnd && !state.completed) {
        // El slider terminó su recorrido completo
        state.completed = true;
        this.processedObjectIds.add(id);

        if (state.headHit && !state.broken) {
          // Completado perfecto
          this.scoreState.hp = Math.min(100, this.scoreState.hp + 4.5);
          this.scoreState.score += 300 * Math.max(1, this.scoreState.combo);
        } else if (state.headHit && state.broken) {
          // Completado pero con pérdida de tracking
          this.scoreState.combo = Math.max(1, Math.floor(this.scoreState.combo * 0.7));
          this.scoreState.hp = Math.min(100, this.scoreState.hp + 1.5);
        }

        this.activeSliders.delete(id);
      }
    }

    // 3. Comprobar objetos expirados (Miss por no golpear la nota a tiempo)
    for (const obj of visibleObjects) {
      if (this.processedObjectIds.has(obj.id)) continue;
      
      // Si es un slider que ya está siendo rastreado en activeSliders, no expira la cabeza
      if (obj.type === 'slider' && this.activeSliders.has(obj.id)) continue;

      const expireTime = obj.time + w50;

      if (timeMs > expireTime) {
        // Nota no golpeada a tiempo dentro de la ventana w50
        audioEngine.playComboBreak();
        this.registerJudgement(0, w50, obj.x, obj.y);
        this.processedObjectIds.add(obj.id);
        if (obj.type === 'slider') {
          this.activeSliders.delete(obj.id);
        }
      }
    }

    // 4. Drenaje suave de HP según dificultad
    this.scoreState.hp = Math.max(0, this.scoreState.hp - 0.0035 * (this.beatmap.hpDrain || 5));

    // 5. Limpieza de juicios flotantes expirados (600ms de vida)
    this.activeJudgements = this.activeJudgements.filter(j => timeMs - j.spawnTime < 600);

    // 6. Limpieza de efectos de explosión de impactos (250ms de vida)
    this.activeExplosions = this.activeExplosions.filter(e => timeMs - e.spawnTime < 250);

    // 7. Verificar si el mapa ha concluido o si falló
    const isFailed = this.scoreState.hp <= 0;
    const allProcessed = this.processedObjectIds.size >= this.activeObjects.length;
    const isFinished = !isFailed && allProcessed && (audioEngine.isEnded() || timeMs > (this.activeObjects[this.activeObjects.length - 1]?.time || 0) + 1200);

    return {
      scoreState: { ...this.scoreState },
      activeJudgements: [...this.activeJudgements],
      activeExplosions: [...this.activeExplosions],
      visibleObjects,
      isFinished,
      isFailed
    };
  }

  // Manejar toque/clic del usuario con validación inmediata desde que la nota es visible
  public handleTap(playfieldX: number, playfieldY: number): boolean {
    const { w300, w100, w50 } = this.getTimingWindows();
    const baseRadius = this.getCircleRadius();
    const hitRadius = baseRadius * 1.6; // Radio ergonómico de toque
    const preempt = this.getPreemptMs();

    // Candidatos elegibles: cualquier nota visible en pantalla (desde que aparece hasta que expira)
    const candidates = this.activeObjects
      .filter(obj => {
        if (this.processedObjectIds.has(obj.id)) return false;
        // En sliders solo permitimos golpear la cabeza si aún no se golpeó
        if (obj.type === 'slider' && this.activeSliders.has(obj.id)) return false;
        
        // VÁLIDO: Desde que el círculo aparece en pantalla hasta antes de que desaparezca
        const isVisible = this.currentTimeMs >= (obj.time - preempt);
        const notExpired = this.currentTimeMs <= (obj.time + w50 + 80);
        return isVisible && notExpired;
      })
      .sort((a, b) => a.time - b.time);

    // Encontrar la nota activa más cercana en tiempo dentro del radio del cursor
    const candidate = candidates.find(obj => {
      const dist = Math.hypot(playfieldX - obj.x, playfieldY - obj.y);
      return dist <= hitRadius;
    });

    if (candidate) {
      const offset = this.currentTimeMs - candidate.time;
      const absOffset = Math.abs(offset);

      // Evaluación de puntuación: siempre otorga acierto válido si la nota está visible
      let type: JudgementType = 300;
      if (absOffset <= Math.max(w300, 75)) {
        type = 300; // Golpe perfecto al momento del cierre
      } else if (absOffset <= Math.max(w100, 160)) {
        type = 100; // Golpe anticipado moderado
      } else {
        type = 50;  // Golpe temprano en cuanto apareció el círculo
      }

      audioEngine.playHitsound();

      // Agregar explosión visual de impacto inmediata
      this.activeExplosions.push({
        id: `exp_${Date.now()}_${Math.random()}`,
        x: candidate.x,
        y: candidate.y,
        radius: baseRadius,
        color: type === 300 ? '#38bdf8' : type === 100 ? '#4ade80' : '#facc15',
        spawnTime: this.currentTimeMs
      });

      if (candidate.type === 'slider') {
        // Iniciar slider tracking con cabeza acertada
        this.activeSliders.set(candidate.id, {
          object: candidate as SliderObject,
          headHit: true,
          isTracking: true,
          broken: false,
          completed: false
        });
        this.registerJudgement(type, offset, candidate.x, candidate.y);
      } else {
        this.processedObjectIds.add(candidate.id);
        this.registerJudgement(type, offset, candidate.x, candidate.y);
      }

      return true;
    }

    return false;
  }

  // Calcula la posición interpolada de la bola del slider a lo largo de su trayectoria
  public getSliderBallPosition(slider: SliderObject, progress: number): { x: number; y: number } {
    const path = slider.path;
    if (!path || path.length === 0) return { x: slider.x, y: slider.y };
    if (path.length === 1) return { x: path[0].x, y: path[0].y };

    if (path.length === 2) {
      return {
        x: path[0].x + (path[1].x - path[0].x) * progress,
        y: path[0].y + (path[1].y - path[0].y) * progress
      };
    }

    // Bezier cuadrática para 3 puntos
    if (path.length === 3) {
      const p0 = path[0], p1 = path[1], p2 = path[2];
      const inv = 1 - progress;
      return {
        x: inv * inv * p0.x + 2 * inv * progress * p1.x + progress * progress * p2.x,
        y: inv * inv * p0.y + 2 * inv * progress * p1.y + progress * progress * p2.y
      };
    }

    // Segmentos múltiples lineales
    const segment = Math.min(path.length - 2, Math.floor(progress * (path.length - 1)));
    const segT = (progress * (path.length - 1)) - segment;
    const pA = path[segment];
    const pB = path[segment + 1];
    return {
      x: pA.x + (pB.x - pA.x) * segT,
      y: pA.y + (pB.y - pA.y) * segT
    };
  }

  public isSliderTracking(sliderId: string): boolean {
    return this.activeSliders.get(sliderId)?.isTracking ?? false;
  }

  private registerJudgement(type: JudgementType, offset: number, x: number, y: number) {
    this.activeJudgements.push({
      id: `j_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      spawnTime: this.currentTimeMs
    });

    if (type > 0) {
      this.scoreState.combo++;
      this.scoreState.maxCombo = Math.max(this.scoreState.maxCombo, this.scoreState.combo);
      
      const comboMultiplier = Math.max(1, this.scoreState.combo);
      this.scoreState.score += type * comboMultiplier;

      if (type === 300) {
        this.scoreState.hits300++;
        this.scoreState.hp = Math.min(100, this.scoreState.hp + 5.5);
      } else if (type === 100) {
        this.scoreState.hits100++;
        this.scoreState.hp = Math.min(100, this.scoreState.hp + 2.5);
      } else {
        this.scoreState.hits50++;
        this.scoreState.hp = Math.min(100, this.scoreState.hp + 0.8);
      }

      this.scoreState.hitErrors.push({
        offset: Math.round(offset),
        timestamp: this.currentTimeMs,
        type
      });
    } else {
      // Miss
      this.scoreState.combo = 0;
      this.scoreState.misses++;
      const missPenalty = Math.max(3.5, (this.beatmap.hpDrain || 5) * 1.05);
      this.scoreState.hp = Math.max(0, this.scoreState.hp - missPenalty);
      
      this.scoreState.hitErrors.push({
        offset: Math.round(offset),
        timestamp: this.currentTimeMs,
        type: 0
      });
    }

    // Cálculo formal de precisión porcentual
    const totalHits = this.scoreState.hits300 + this.scoreState.hits100 + this.scoreState.hits50 + this.scoreState.misses;
    if (totalHits > 0) {
      const maxPossible = totalHits * 300;
      const actual = this.scoreState.hits300 * 300 + this.scoreState.hits100 * 100 + this.scoreState.hits50 * 50;
      this.scoreState.accuracy = parseFloat(((actual / maxPossible) * 100).toFixed(2));
    }
  }
}
