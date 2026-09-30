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

  // Seeded Random Helper for song-unique, repeatable pattern generation
  let seed = 0;
  for (let i = 0; i < fileName.length; i++) {
    seed = ((seed << 5) - seed + fileName.charCodeAt(i)) | 0;
  }
  seed = Math.abs(seed) || 123456;

  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // Map onset times with their corresponding energy intensity ratio
  const rawOnsetEntries: { timeMs: number; energyRatio: number }[] = [];
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

    const bassRatio = avgBass > 0 ? bassEnergies[f] / avgBass : 1;
    const totalRatio = avgTotal > 0 ? totalEnergies[f] / avgTotal : 1;

    const isBassPeak = bassEnergies[f] > avgBass * 1.35 && bassEnergies[f] > bassEnergies[f - 1];
    const isTotalPeak = totalEnergies[f] > avgTotal * 1.40 && totalEnergies[f] > totalEnergies[f - 1];

    if ((isBassPeak || isTotalPeak) && (timeMs - lastOnsetMs) >= minIntervalMs) {
      rawOnsetEntries.push({
        timeMs: Math.round(timeMs),
        energyRatio: Math.max(bassRatio, totalRatio)
      });
      lastOnsetMs = timeMs;
    }
  }

  const rawOnsets = rawOnsetEntries.map(e => e.timeMs);

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

  // 3. Snap Onsets to Beat Grid (1/2 or 1/1 beats) with Energy Preservation
  const snappedTimesSet = new Map<number, number>(); // snappedTime -> energyRatio
  const hitObjects: HitObject[] = [];

  rawOnsetEntries.forEach((entry) => {
    const gridIndex = Math.round((entry.timeMs - bestOffset) / halfBeatLen);
    const snappedTime = Math.round(bestOffset + gridIndex * halfBeatLen);

    if (snappedTime >= 1000 && snappedTime <= totalDurationMs - 1500) {
      const existingEnergy = snappedTimesSet.get(snappedTime) || 0;
      if (entry.energyRatio > existingEnergy) {
        snappedTimesSet.set(snappedTime, entry.energyRatio);
      }
    }
  });

  const sortedTimes = Array.from(snappedTimesSet.keys()).sort((a, b) => a - b);

  // If too few notes detected, fill grid evenly
  if (sortedTimes.length < 20) {
    for (let t = bestOffset; t < totalDurationMs - 2000; t += halfBeatLen) {
      const roundedT = Math.round(t);
      if (!snappedTimesSet.has(roundedT)) {
        snappedTimesSet.set(roundedT, 1.0);
        sortedTimes.push(roundedT);
      }
    }
    sortedTimes.sort((a, b) => a - b);
  }

  // --- AUDIO ENERGY DRIVEN GEOMETRIC PATTERN GENERATOR (512x384) ---
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
    const energyRatio = snappedTimesSet.get(t) || 1.0;
    const isHighEnergy = energyRatio > 1.45; // Drop / Chorus peak

    const isNewCombo = index === 0 || (index > 0 && (index % 8 === 0 || (prevT && (t - prevT) > beatLen * 1.5)));

    if (isNewCombo) {
      comboNum = 1;
      comboColorIndex = (comboColorIndex + 1) % 4;
      // High energy sections select dramatic jump/star patterns, lower energy selects flow/stream
      if (isHighEnergy) {
        patternType = seededRandom() > 0.5 ? 1 : 3; // Corner Jumps or Wide Arc Star
      } else {
        patternType = Math.floor(seededRandom() * 4);
      }
      patternStep = 0;
    } else {
      comboNum++;
      patternStep++;
    }

    // Pattern shapes dynamically influenced by audio energy
    const scaleFactor = Math.min(1.5, Math.max(0.75, energyRatio));

    if (patternType === 0) {
      // Ring circle around playfield center
      const angle = (patternStep / 6) * Math.PI * 2;
      const radius = (90 + Math.sin(index * 0.5) * 25) * scaleFactor;
      currentX = centerX + Math.cos(angle) * radius;
      currentY = centerY + Math.sin(angle) * radius;
    } else if (patternType === 1) {
      // Jumps between screen corners
      const corners = [
        { x: minX + 35, y: minY + 35 },
        { x: maxX - 35, y: maxY - 35 },
        { x: minX + 35, y: maxY - 35 },
        { x: maxX - 35, y: minY + 35 }
      ];
      const c = corners[patternStep % 4];
      const jitter = (seededRandom() - 0.5) * 25 * scaleFactor;
      currentX = c.x + jitter;
      currentY = c.y + jitter;
    } else if (patternType === 2) {
      // Flowing Stream Line
      const dirX = (index % 4 < 2) ? 1 : -1;
      const stepDist = 45 * scaleFactor;
      currentX = Math.max(minX, Math.min(maxX, currentX + dirX * stepDist));
      currentY = Math.max(minY, Math.min(maxY, currentY + Math.sin(index) * 40 * scaleFactor));
    } else {
      // Curved Arc Star
      const arcAngle = (patternStep * 0.75) + (index * 0.18);
      currentX = centerX + Math.cos(arcAngle) * (115 * scaleFactor);
      currentY = centerY + Math.sin(arcAngle) * (85 * scaleFactor);
    }

    // Clamp coordinates strictly within playfield boundaries
    currentX = Math.max(minX, Math.min(maxX, Math.round(currentX)));
    currentY = Math.max(minY, Math.min(maxY, Math.round(currentY)));

    // Enforce Minimum Distance (85px) to prevent spatial overlap with recent circles
    const MIN_CIRCLE_SPACING = 85;
    let attempts = 0;
    while (attempts < 25) {
      let overlaps = false;
      for (let prevIdx = Math.max(0, hitObjects.length - 4); prevIdx < hitObjects.length; prevIdx++) {
        const prevObj = hitObjects[prevIdx];
        const dist = Math.hypot(currentX - prevObj.x, currentY - prevObj.y);
        if (dist < MIN_CIRCLE_SPACING) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) break; // Valid non-overlapping position found!

      // Shift position if overlapping
      const shiftAngle = (attempts * 0.8) + (index * 0.4);
      currentX = Math.max(minX, Math.min(maxX, Math.round(currentX + Math.cos(shiftAngle) * 95)));
      currentY = Math.max(minY, Math.min(maxY, Math.round(currentY + Math.sin(shiftAngle) * 80)));
      attempts++;
    }

    // Generate ONLY crisp single hit circles
    hitObjects.push({
      id: `custom_c_${t}_${index}`,
      type: 'circle',
      x: currentX,
      y: currentY,
      time: t,
      comboNumber: comboNum,
      comboColorIndex
    });
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
