import type { Beatmap, GameSettings, HitObject, JudgementType, ScoreState, ActiveJudgement } from '../types/game';
import { audioEngine } from '../audio/audioEngine';

export class GameEngine {
  private beatmap: Beatmap;
  private currentTimeMs: number = 0;

  private activeObjects: HitObject[] = [];
  private processedObjectIds: Set<string> = new Set();
  private sliderHitIds: Set<string> = new Set();
  
  private activeJudgements: ActiveJudgement[] = [];

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

  // Virtual playfield space: 512 x 384
  public readonly playfieldWidth = 512;
  public readonly playfieldHeight = 384;

  constructor(beatmap: Beatmap, _settings: GameSettings) {
    this.beatmap = beatmap;
    this.activeObjects = [...beatmap.hitObjects].sort((a, b) => a.time - b.time);
  }

  public getPreemptMs(): number {
    const ar = this.beatmap.ar;
    if (ar < 5) return 1200 + (600 * (5 - ar)) / 5;
    return 1200 - (750 * (ar - 5)) / 5;
  }

  public getCircleRadius(): number {
    const cs = this.beatmap.cs;
    return 54.4 - 4.48 * cs;
  }

  public getTimingWindows(): { w300: number; w100: number; w50: number } {
    const od = this.beatmap.od;
    return {
      w300: Math.max(70, 100 - 4 * od),  // ~70ms para 300
      w100: Math.max(130, 170 - 6 * od), // ~130ms para 100
      w50: Math.max(200, 240 - 8 * od)   // ~200ms para 50 (muy perdonador)
    };
  }

  public update(timeMs: number): {
    scoreState: ScoreState;
    activeJudgements: ActiveJudgement[];
    visibleObjects: HitObject[];
    isFinished: boolean;
  } {
    this.currentTimeMs = timeMs;
    const preempt = this.getPreemptMs();
    const { w50 } = this.getTimingWindows();

    // 1. Find currently visible objects
    const visibleObjects = this.activeObjects.filter(
      obj => !this.processedObjectIds.has(obj.id) &&
             timeMs >= obj.time - preempt &&
             timeMs <= obj.time + (obj.type === 'slider' ? obj.duration : 0) + w50 + 100
    );

    // 2. Check for completed or missed objects
    for (const obj of visibleObjects) {
      if (this.processedObjectIds.has(obj.id)) continue;
      
      const sliderDuration = obj.type === 'slider' ? obj.duration : 0;
      const expireTime = obj.time + sliderDuration + w50;

      if (timeMs > expireTime) {
        if (obj.type === 'slider' && this.sliderHitIds.has(obj.id)) {
          // El slider se golpeó con éxito y terminó su recorrido
          this.processedObjectIds.add(obj.id);
        } else {
          // Nota o slider no golpeado a tiempo
          this.registerJudgement(0, 0, obj.x, obj.y);
          this.processedObjectIds.add(obj.id);
        }
      }
    }

    // 3. Drenaje suave de HP
    this.scoreState.hp = Math.max(0, this.scoreState.hp - 0.005);

    // 4. Clean expired floating judgements (after 800ms)
    this.activeJudgements = this.activeJudgements.filter(j => timeMs - j.spawnTime < 800);

    // 5. Check if map finished
    const allProcessed = this.processedObjectIds.size >= this.activeObjects.length;
    const isFinished = allProcessed && audioEngine.isEnded();

    return {
      scoreState: { ...this.scoreState },
      activeJudgements: [...this.activeJudgements],
      visibleObjects,
      isFinished
    };
  }

  // Handle user keypress / click action
  public handleTap(playfieldX: number, playfieldY: number): boolean {
    const { w50 } = this.getTimingWindows();
    const baseRadius = this.getCircleRadius();
    const radius = baseRadius * 2.2; // Radio de impacto muy amplio y amigable (2.2x)

    const candidate = this.activeObjects.find(obj => {
      if (this.processedObjectIds.has(obj.id)) return false;

      // Para sliders activos durante su recorrido
      if (obj.type === 'slider' && this.currentTimeMs >= obj.time - w50 && this.currentTimeMs <= obj.time + obj.duration + w50) {
        const path = obj.path;
        if (path && path.length > 1) {
          const progress = Math.max(0, Math.min(1, (this.currentTimeMs - obj.time) / obj.duration));
          const startPt = path[0];
          const endPt = path[path.length - 1];
          const ballX = startPt.x + (endPt.x - startPt.x) * progress;
          const ballY = startPt.y + (endPt.y - startPt.y) * progress;

          const distHead = Math.hypot(playfieldX - obj.x, playfieldY - obj.y);
          const distBall = Math.hypot(playfieldX - ballX, playfieldY - ballY);
          return distHead <= radius * 1.5 || distBall <= radius * 1.5;
        }
      }

      const timeDiff = Math.abs(this.currentTimeMs - obj.time);
      if (timeDiff > w50) return false;

      const dx = playfieldX - obj.x;
      const dy = playfieldY - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= radius;
    });

    if (candidate) {
      const offset = this.currentTimeMs - candidate.time;
      this.processHit(candidate, offset, candidate.x, candidate.y);
      return true;
    }

    return false;
  }

  private processHit(obj: HitObject, offset: number, x: number, y: number) {
    audioEngine.playHitsound();

    if (obj.type === 'slider') {
      if (!this.sliderHitIds.has(obj.id)) {
        this.sliderHitIds.add(obj.id);
        const absOffset = Math.abs(offset);
        const { w300, w100, w50 } = this.getTimingWindows();
        const type: JudgementType = absOffset <= w300 ? 300 : absOffset <= w100 ? 100 : absOffset <= w50 ? 50 : 300;
        this.registerJudgement(type, offset, x, y);
      }
      // Los sliders NO se agregan a processedObjectIds aquí para que sigan visibles mientras la bola se desliza
    } else {
      this.processedObjectIds.add(obj.id);
      const absOffset = Math.abs(offset);
      const { w300, w100, w50 } = this.getTimingWindows();

      let type: JudgementType = 0;
      if (absOffset <= w300) {
        type = 300;
      } else if (absOffset <= w100) {
        type = 100;
      } else if (absOffset <= w50) {
        type = 50;
      } else {
        type = 0;
      }

      this.registerJudgement(type, offset, x, y);
    }
  }

  private registerJudgement(type: JudgementType, offset: number, x: number, y: number) {
    // Floating Judgement animation
    this.activeJudgements.push({
      id: `j_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      spawnTime: this.currentTimeMs
    });

    // Score & Combo Update
    if (type > 0) {
      this.scoreState.combo++;
      this.scoreState.maxCombo = Math.max(this.scoreState.maxCombo, this.scoreState.combo);
      
      const comboMultiplier = Math.max(1, this.scoreState.combo);
      this.scoreState.score += type * comboMultiplier;

      if (type === 300) {
        this.scoreState.hits300++;
        this.scoreState.hp = Math.min(100, this.scoreState.hp + 5);
      } else if (type === 100) {
        this.scoreState.hits100++;
        this.scoreState.hp = Math.min(100, this.scoreState.hp + 2);
      } else {
        this.scoreState.hits50++;
      }

      this.scoreState.hitErrors.push({
        offset,
        timestamp: this.currentTimeMs,
        type
      });
    } else {
      // Miss
      this.scoreState.combo = 0;
      this.scoreState.misses++;
      this.scoreState.hp = Math.max(0, this.scoreState.hp - 6);
      
      this.scoreState.hitErrors.push({
        offset: 150, // Late miss marker
        timestamp: this.currentTimeMs,
        type: 0
      });
    }

    // Accuracy Calculation
    const totalHits = this.scoreState.hits300 + this.scoreState.hits100 + this.scoreState.hits50 + this.scoreState.misses;
    if (totalHits > 0) {
      const maxPossible = totalHits * 300;
      const actual = this.scoreState.hits300 * 300 + this.scoreState.hits100 * 100 + this.scoreState.hits50 * 50;
      this.scoreState.accuracy = parseFloat(((actual / maxPossible) * 100).toFixed(2));
    }
  }
}
