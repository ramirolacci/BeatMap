import type { Beatmap, HitObject } from '../types/game';

export type DifficultyLevel = 'Easy' | 'Normal' | 'Hard' | 'Expert';

/**
 * Advanced Rhythmic Beatmap Auto-Generator from any AudioBuffer (MP3 / WAV / OGG)
 * Uses multi-band energy transient analysis + strict musical beat-grid snapping.
 * Perfectly balances note density, spacing and approach rate according to difficulty.
 */
export function generateBeatmapFromAudioBuffer(
  buffer: AudioBuffer,
  fileName: string,
  difficulty: DifficultyLevel = 'Normal',
  targetBpm?: number
): Beatmap {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const totalDurationMs = buffer.duration * 1000;

  // Frame resolution: ~10ms per frame
  const frameSize = Math.floor(sampleRate * 0.01); 
  const totalFrames = Math.floor(channelData.length / frameSize);

  const bassEnergies: number[] = new Array(totalFrames);
  const totalEnergies: number[] = new Array(totalFrames);

  // Lowpass filter state (~160Hz cutoff for kick/bass drum transients)
  let lowpass = 0;
  const alpha = 2 * Math.PI * (160 / sampleRate);

  for (let f = 0; f < totalFrames; f++) {
    let rawSum = 0;
    let bassSum = 0;
    const start = f * frameSize;

    for (let i = 0; i < frameSize; i++) {
      const sample = channelData[start + i] || 0;
      rawSum += sample * sample;

      lowpass += alpha * (sample - lowpass);
      bassSum += lowpass * lowpass;
    }

    totalEnergies[f] = Math.sqrt(rawSum / frameSize);
    bassEnergies[f] = Math.sqrt(bassSum / frameSize);
  }

  // Seeded Random Helper para patrones reproducibles y consistentes
  let seed = 0;
  for (let i = 0; i < fileName.length; i++) {
    seed = ((seed << 5) - seed + fileName.charCodeAt(i)) | 0;
  }
  seed = Math.abs(seed) || 123456;

  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // 1. Detectar Onsets de energía musical
  const rawOnsetEntries: { timeMs: number; energyRatio: number }[] = [];
  const windowHalf = 20; // Ventana de promedio local (~200ms)

  for (let f = windowHalf; f < totalFrames - windowHalf; f++) {
    const timeMs = (f * frameSize / sampleRate) * 1000;
    if (timeMs < 1500 || timeMs > totalDurationMs - 1500) continue;

    let localBassSum = 0;
    let localTotalSum = 0;
    for (let w = f - windowHalf; w <= f + windowHalf; w++) {
      localBassSum += bassEnergies[w];
      localTotalSum += totalEnergies[w];
    }
    const avgBass = localBassSum / (windowHalf * 2 + 1);
    const avgTotal = localTotalSum / (windowHalf * 2 + 1);

    const bassRatio = avgBass > 0.0001 ? bassEnergies[f] / avgBass : 1;
    const totalRatio = avgTotal > 0.0001 ? totalEnergies[f] / avgTotal : 1;

    const isBassPeak = bassEnergies[f] > avgBass * 1.35 && bassEnergies[f] > bassEnergies[f - 1];
    const isTotalPeak = totalEnergies[f] > avgTotal * 1.4 && totalEnergies[f] > totalEnergies[f - 1];

    if (isBassPeak || isTotalPeak) {
      rawOnsetEntries.push({
        timeMs: Math.round(timeMs),
        energyRatio: Math.max(bassRatio, totalRatio)
      });
    }
  }

  const rawOnsets = rawOnsetEntries.map(e => e.timeMs);

  // 2. Determinar o estimar BPM de forma robusta
  let estimatedBpm = targetBpm || 130;
  if (!targetBpm && rawOnsets.length > 10) {
    const intervalCounts: Map<number, number> = new Map();
    for (let i = 1; i < rawOnsets.length; i++) {
      const diff = rawOnsets[i] - rawOnsets[i - 1];
      if (diff >= 250 && diff <= 850) {
        const bucket = Math.round(diff / 10) * 10;
        intervalCounts.set(bucket, (intervalCounts.get(bucket) || 0) + 1);
      }
    }

    let bestBucket = 460;
    let maxCount = 0;
    intervalCounts.forEach((count, bucket) => {
      if (count > maxCount) {
        maxCount = count;
        bestBucket = bucket;
      }
    });

    let msPerBeat = bestBucket;
    while (msPerBeat < 320) msPerBeat *= 2;
    while (msPerBeat > 640) msPerBeat /= 2;
    estimatedBpm = Math.max(90, Math.min(190, Math.round(60000 / msPerBeat)));
  }

  const beatLen = 60000 / estimatedBpm;
  const halfBeatLen = beatLen / 2;

  // 3. Encontrar Fase Óptima del Compás (Alineación con el primer golpe fuerte)
  let bestOffset = rawOnsets[0] || 1500;
  let maxScore = -1;

  for (let offset = 1200; offset < Math.min(3000, totalDurationMs); offset += 15) {
    let score = 0;
    for (const t of rawOnsets.slice(0, 40)) {
      const rem = Math.abs((t - offset) % beatLen);
      const distToBeat = Math.min(rem, beatLen - rem);
      if (distToBeat < 35) score += 3;
      else if (distToBeat < 65) score += 1;
    }
    if (score > maxScore) {
      maxScore = score;
      bestOffset = offset;
    }
  }

  // 4. Parámetros ajustados por Dificultad para una experiencia 100% ganable
  let minIntervalMs: number;
  let allowHalfBeats: boolean;
  let arVal: number;
  let csVal: number;
  let odVal: number;
  let hpDrainVal: number;
  let versionLabel: string;

  if (difficulty === 'Easy') {
    // FÁCIL: ritmo espaciado, círculos gigantes, tiempo de reacción muy amplio
    minIntervalMs = beatLen * 0.95; // 1 nota cada compás o cada 2 beats
    allowHalfBeats = false;
    arVal = 6.2;
    csVal = 3.4;
    odVal = 5.2;
    hpDrainVal = 3.0;
    versionLabel = 'Fácil';
  } else if (difficulty === 'Normal') {
    // NORMAL: ritmo musical balanceado, tiempos marcados
    minIntervalMs = beatLen * 0.55;
    allowHalfBeats = false;
    arVal = 7.4;
    csVal = 3.8;
    odVal = 6.6;
    hpDrainVal = 4.2;
    versionLabel = 'Normal';
  } else if (difficulty === 'Hard') {
    // DIFÍCIL: ritmo dinámico con medios beats
    minIntervalMs = beatLen * 0.38;
    allowHalfBeats = true;
    arVal = 8.5;
    csVal = 4.0;
    odVal = 7.8;
    hpDrainVal = 5.5;
    versionLabel = 'Difícil';
  } else {
    // EXPERTO: alta densidad para pro players
    minIntervalMs = beatLen * 0.24;
    allowHalfBeats = true;
    arVal = 9.3;
    csVal = 4.2;
    odVal = 8.6;
    hpDrainVal = 6.5;
    versionLabel = 'Experto';
  }

  // 5. Grid Snapping Estricto a la música
  const stepResolution = allowHalfBeats ? halfBeatLen : beatLen;
  const snappedTimesSet = new Map<number, number>();

  let lastRegisteredTime = 0;

  rawOnsetEntries.forEach((entry) => {
    const gridIndex = Math.round((entry.timeMs - bestOffset) / stepResolution);
    const snappedTime = Math.round(bestOffset + gridIndex * stepResolution);

    if (snappedTime >= 1200 && snappedTime <= totalDurationMs - 1500) {
      if (snappedTime - lastRegisteredTime >= minIntervalMs) {
        snappedTimesSet.set(snappedTime, entry.energyRatio);
        lastRegisteredTime = snappedTime;
      }
    }
  });

  const sortedTimes = Array.from(snappedTimesSet.keys()).sort((a, b) => a - b);

  // Si la pista tiene tramos silenciosos largos, mantener la continuidad musical en tiempos fuertes
  if (sortedTimes.length < 30) {
    const fallbackStep = difficulty === 'Easy' ? beatLen * 2 : beatLen;
    for (let t = bestOffset; t < totalDurationMs - 2500; t += fallbackStep) {
      const roundedT = Math.round(t);
      if (!snappedTimesSet.has(roundedT)) {
        snappedTimesSet.set(roundedT, 1.0);
        sortedTimes.push(roundedT);
      }
    }
    sortedTimes.sort((a, b) => a - b);
  }

  // 6. Generación Espacial Ergonómica dentro de 512x384
  const minX = 70, maxX = 442;
  const minY = 60, maxY = 324;
  const centerX = 256, centerY = 192;

  const hitObjects: HitObject[] = [];
  let comboNum = 1;
  let comboColorIndex = 0;
  let currentX = centerX;
  let currentY = centerY;
  let patternType = 0;
  let patternStep = 0;

  sortedTimes.forEach((t, index) => {
    const prevT = sortedTimes[index - 1];
    const energyRatio = snappedTimesSet.get(t) || 1.0;
    const isNewCombo = index === 0 || (index > 0 && (index % 8 === 0 || (prevT && (t - prevT) > beatLen * 1.8)));

    if (isNewCombo) {
      comboNum = 1;
      comboColorIndex = (comboColorIndex + 1) % 4;
      patternType = Math.floor(seededRandom() * 4);
      patternStep = 0;
    } else {
      comboNum++;
      patternStep++;
    }

    const scaleFactor = Math.min(1.3, Math.max(0.85, energyRatio));

    if (patternType === 0) {
      // Círculo orbital armónico
      const angle = (patternStep / 6) * Math.PI * 2;
      const radius = 95 * scaleFactor;
      currentX = centerX + Math.cos(angle) * radius;
      currentY = centerY + Math.sin(angle) * radius;
    } else if (patternType === 1) {
      // Cuadrante / Diamante equilibrado
      const pts = [
        { x: minX + 60, y: minY + 50 },
        { x: maxX - 60, y: maxY - 50 },
        { x: minX + 60, y: maxY - 50 },
        { x: maxX - 60, y: minY + 50 }
      ];
      const p = pts[patternStep % 4];
      currentX = p.x;
      currentY = p.y;
    } else if (patternType === 2) {
      // Flujo ondulado suave
      const dirX = (index % 4 < 2) ? 1 : -1;
      const stepDist = 45 * scaleFactor;
      currentX = Math.max(minX, Math.min(maxX, currentX + dirX * stepDist));
      currentY = Math.max(minY, Math.min(maxY, currentY + Math.sin(index * 0.7) * 40 * scaleFactor));
    } else {
      // Curvas concéntricas
      const arcAngle = (patternStep * 0.75) + (index * 0.1);
      currentX = centerX + Math.cos(arcAngle) * (110 * scaleFactor);
      currentY = centerY + Math.sin(arcAngle) * (75 * scaleFactor);
    }

    currentX = Math.max(minX, Math.min(maxX, Math.round(currentX)));
    currentY = Math.max(minY, Math.min(maxY, Math.round(currentY)));

    // Separación para evitar notas encimadas
    const MIN_SPACING = csVal < 3.6 ? 75 : 68;
    for (let attempts = 0; attempts < 12; attempts++) {
      let overlaps = false;
      for (let prevIdx = Math.max(0, hitObjects.length - 3); prevIdx < hitObjects.length; prevIdx++) {
        const prevObj = hitObjects[prevIdx];
        if (Math.hypot(currentX - prevObj.x, currentY - prevObj.y) < MIN_SPACING) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) break;

      const shiftAngle = (attempts * 0.75) + (index * 0.4);
      currentX = Math.max(minX, Math.min(maxX, Math.round(currentX + Math.cos(shiftAngle) * 70)));
      currentY = Math.max(minY, Math.min(maxY, Math.round(currentY + Math.sin(shiftAngle) * 60)));
    }

    // Sliders ocasionales bien distribuidos
    const nextT = sortedTimes[index + 1];
    const canBeSlider = nextT && (nextT - t) >= beatLen * 1.5 && seededRandom() > 0.72;

    if (canBeSlider) {
      const sliderDur = Math.min(beatLen, (nextT - t) * 0.75);
      const angle = seededRandom() * Math.PI * 2;
      const endX = Math.max(minX, Math.min(maxX, Math.round(currentX + Math.cos(angle) * 80)));
      const endY = Math.max(minY, Math.min(maxY, Math.round(currentY + Math.sin(angle) * 60)));

      hitObjects.push({
        id: `c_s_${t}_${index}`,
        type: 'slider',
        x: currentX,
        y: currentY,
        time: t,
        duration: Math.round(sliderDur),
        path: [
          { x: currentX, y: currentY },
          { x: Math.round((currentX + endX) / 2), y: Math.round((currentY + endY) / 2 + 15) },
          { x: endX, y: endY }
        ],
        repeat: 1,
        comboNumber: comboNum,
        comboColorIndex
      });
    } else {
      hitObjects.push({
        id: `c_hit_${t}_${index}`,
        type: 'circle',
        x: currentX,
        y: currentY,
        time: t,
        comboNumber: comboNum,
        comboColorIndex
      });
    }
  });

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  return {
    id: `custom_audio_${Date.now()}`,
    title: cleanTitle || 'Pista de Audio',
    artist: 'Audio Analizado',
    creator: 'BeatMap Engine',
    version: versionLabel,
    bpm: estimatedBpm,
    ar: arVal,
    cs: csVal,
    od: odVal,
    hpDrain: hpDrainVal,
    audioBuffer: buffer,
    hitObjects
  };
}
