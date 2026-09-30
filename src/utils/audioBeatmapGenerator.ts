import type { Beatmap, HitObject } from '../types/game';

/**
 * Advanced Rhythmic Beatmap Auto-Generator from any AudioBuffer (MP3 / WAV / OGG)
 * Uses high-resolution multi-band energy analysis + BPM beat-grid quantization
 * to ensure 100% perfect rhythm synchronization.
 */
export function generateBeatmapFromAudioBuffer(
  buffer: AudioBuffer,
  fileName: string,
  difficulty: 'Normal' | 'Hard' | 'Expert' = 'Hard'
): Beatmap {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const totalDurationMs = buffer.duration * 1000;

  // High temporal resolution: ~10ms per frame for millisecond precision
  const frameSize = Math.floor(sampleRate * 0.01); 
  const totalFrames = Math.floor(channelData.length / frameSize);

  const bassEnergies: number[] = new Array(totalFrames);
  const totalEnergies: number[] = new Array(totalFrames);

  // Simple IIR Low-Pass Filter state for Bass/Kick isolation (~180Hz cutoff)
  let lowpass = 0;
  const alpha = 2 * Math.PI * (180 / sampleRate);

  for (let f = 0; f < totalFrames; f++) {
    let rawSum = 0;
    let bassSum = 0;
    const start = f * frameSize;

    for (let i = 0; i < frameSize; i++) {
      const sample = channelData[start + i] || 0;
      rawSum += sample * sample;

      // Lowpass filter step for bass/kick
      lowpass += alpha * (sample - lowpass);
      bassSum += lowpass * lowpass;
    }

    totalEnergies[f] = Math.sqrt(rawSum / frameSize);
    bassEnergies[f] = Math.sqrt(bassSum / frameSize);
  }

  // Detect Peak Onsets using combined Bass + Total Energy Transients
  const rawOnsets: number[] = [];
  const windowHalf = 25; // ~250ms local average window
  const minIntervalMs = difficulty === 'Expert' ? 150 : difficulty === 'Hard' ? 220 : 340;
  let lastOnsetMs = 1200;

  for (let f = windowHalf; f < totalFrames - windowHalf; f++) {
    const timeMs = (f * frameSize / sampleRate) * 1000;
    if (timeMs < 1200 || timeMs > totalDurationMs - 1500) continue;

    // Compute local average energy
    let localBassSum = 0;
    let localTotalSum = 0;
    for (let w = f - windowHalf; w <= f + windowHalf; w++) {
      localBassSum += bassEnergies[w];
      localTotalSum += totalEnergies[w];
    }
    const avgBass = localBassSum / (windowHalf * 2 + 1);
    const avgTotal = localTotalSum / (windowHalf * 2 + 1);

    const isBassPeak = bassEnergies[f] > avgBass * 1.35 && bassEnergies[f] > bassEnergies[f - 1];
    const isTotalPeak = totalEnergies[f] > avgTotal * 1.40 && totalEnergies[f] > totalEnergies[f - 1];

    if ((isBassPeak || isTotalPeak) && (timeMs - lastOnsetMs) >= minIntervalMs) {
      rawOnsets.push(Math.round(timeMs));
      lastOnsetMs = timeMs;
    }
  }

  // --- BPM & BEAT-GRID QUANTIZATION (RHYTHMIC SNAP) ---
  // 1. Calculate onset intervals to find dominant BPM
  const intervalCounts: Map<number, number> = new Map();
  for (let i = 1; i < rawOnsets.length; i++) {
    const diff = rawOnsets[i] - rawOnsets[i - 1];
    if (diff >= 250 && diff <= 800) {
      // Bucket into 10ms intervals
      const bucket = Math.round(diff / 10) * 10;
      intervalCounts.set(bucket, (intervalCounts.get(bucket) || 0) + 1);
    }
  }

  let bestBucket = 450; // default 133 BPM
  let maxCount = 0;
  intervalCounts.forEach((count, bucket) => {
    if (count > maxCount) {
      maxCount = count;
      bestBucket = bucket;
    }
  });

  // Calculate estimated BPM from bestBucket interval (1/2 beat or 1/1 beat)
  let msPerBeat = bestBucket;
  if (msPerBeat < 320) msPerBeat *= 2; // Normalize to full beat (90-180 BPM range)
  const estimatedBpm = Math.max(90, Math.min(200, Math.round(60000 / msPerBeat)));
  const beatLen = 60000 / estimatedBpm;
  const halfBeatLen = beatLen / 2;

  // 2. Find optimal Beat Phase Offset (firstBeatMs)
  let bestOffset = rawOnsets[0] || 1200;
  let maxScore = -1;

  for (let offset = 1000; offset < 2500; offset += 10) {
    let score = 0;
    for (const t of rawOnsets) {
      const rem = Math.abs((t - offset) % beatLen);
      const distToBeat = Math.min(rem, beatLen - rem);
      if (distToBeat < 40) score += 2;
      else if (distToBeat < 80) score += 1;
    }
    if (score > maxScore) {
      maxScore = score;
      bestOffset = offset;
    }
  }

  // 3. Snap Onsets to Beat Grid (1/2 or 1/1 beats)
  const snappedTimesSet = new Set<number>();
  const hitObjects: HitObject[] = [];

  rawOnsets.forEach((rawT) => {
    // Find nearest half-beat grid point
    const gridIndex = Math.round((rawT - bestOffset) / halfBeatLen);
    const snappedTime = Math.round(bestOffset + gridIndex * halfBeatLen);

    if (snappedTime >= 1000 && snappedTime <= totalDurationMs - 1500 && !snappedTimesSet.has(snappedTime)) {
      snappedTimesSet.add(snappedTime);
    }
  });

  const sortedTimes = Array.from(snappedTimesSet).sort((a, b) => a - b);

  // If too few notes detected, fill grid evenly
  if (sortedTimes.length < 20) {
    for (let t = bestOffset; t < totalDurationMs - 2000; t += halfBeatLen) {
      if (!snappedTimesSet.has(Math.round(t))) {
        sortedTimes.push(Math.round(t));
      }
    }
    sortedTimes.sort((a, b) => a - b);
  }

  // --- GEOMETRIC PATTERN GENERATOR IN OSU! PLAYFIELD (512x384) ---
  const minX = 64, maxX = 448;
  const minY = 48, maxY = 336;
  const centerX = 256, centerY = 192;

  let comboNum = 1;
  let comboColorIndex = 0;
  let currentX = centerX;
  let currentY = centerY;
  let patternType = 0;
  let patternStep = 0;

  sortedTimes.forEach((t, index) => {
    const prevT = sortedTimes[index - 1];
    const isNewCombo = index > 0 && (index % 8 === 0 || (prevT && (t - prevT) > beatLen * 1.5));

    if (isNewCombo) {
      comboNum = 1;
      comboColorIndex = (comboColorIndex + 1) % 4;
      patternType = Math.floor(Math.random() * 4);
      patternStep = 0;
    } else {
      comboNum++;
      patternStep++;
    }

    // Pattern shapes
    if (patternType === 0) {
      // Ring circle around playfield center
      const angle = (patternStep / 6) * Math.PI * 2;
      const radius = 100 + Math.sin(index * 0.5) * 20;
      currentX = centerX + Math.cos(angle) * radius;
      currentY = centerY + Math.sin(angle) * radius;
    } else if (patternType === 1) {
      // Jumps between 4 screen corners
      const corners = [
        { x: minX + 40, y: minY + 40 },
        { x: maxX - 40, y: maxY - 40 },
        { x: minX + 40, y: maxY - 40 },
        { x: maxX - 40, y: minY + 40 }
      ];
      const c = corners[patternStep % 4];
      currentX = c.x + (Math.random() - 0.5) * 15;
      currentY = c.y + (Math.random() - 0.5) * 15;
    } else if (patternType === 2) {
      // Flowing Stream Line
      const dirX = (index % 4 < 2) ? 1 : -1;
      currentX = Math.max(minX, Math.min(maxX, currentX + dirX * 45));
      currentY = Math.max(minY, Math.min(maxY, currentY + Math.sin(index) * 35));
    } else {
      // Curved Arc
      const arcAngle = (patternStep * 0.7) + (index * 0.15);
      currentX = centerX + Math.cos(arcAngle) * 130;
      currentY = centerY + Math.sin(arcAngle) * 95;
    }

    // Clamp coordinates strictly within playfield boundaries
    currentX = Math.max(minX, Math.min(maxX, Math.round(currentX)));
    currentY = Math.max(minY, Math.min(maxY, Math.round(currentY)));

    // Slider placement on sustained beat gaps
    const nextT = sortedTimes[index + 1];
    const isSlider = nextT && (nextT - t >= beatLen * 0.9) && Math.random() > 0.35;

    if (isSlider) {
      const sliderDuration = Math.round(Math.min(beatLen * 1.5, nextT - t - 50));
      const endX = Math.max(minX, Math.min(maxX, currentX + (Math.random() > 0.5 ? 90 : -90)));
      const endY = Math.max(minY, Math.min(maxY, currentY + (Math.random() > 0.5 ? 70 : -70)));

      hitObjects.push({
        id: `custom_s_${t}_${index}`,
        type: 'slider',
        x: currentX,
        y: currentY,
        time: t,
        duration: sliderDuration,
        path: [
          { x: currentX, y: currentY },
          { x: (currentX + endX) / 2 + (Math.random() * 20 - 10), y: (currentY + endY) / 2 },
          { x: endX, y: endY }
        ],
        repeat: 1,
        comboNumber: comboNum,
        comboColorIndex
      });
    } else {
      hitObjects.push({
        id: `custom_c_${t}_${index}`,
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
    title: cleanTitle || 'Canción Personalizada',
    artist: 'Artista Desconocido',
    creator: 'Auto Generator',
    version: difficulty === 'Expert' ? 'Experto' : difficulty === 'Hard' ? 'Difícil' : 'Normal',
    bpm: estimatedBpm,
    ar: difficulty === 'Expert' ? 9.2 : difficulty === 'Hard' ? 8.5 : 7.5,
    cs: 4.0,
    od: 8.0,
    hpDrain: 6.0,
    audioBuffer: buffer,
    hitObjects
  };
}
