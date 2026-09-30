import type { Beatmap, HitObject } from '../types/game';

/**
 * Intelligent Beatmap Auto-Generator from any AudioBuffer (MP3 / WAV / OGG)
 * Analyzes audio energy peaks and frequency onsets to generate osu! style rhythm maps.
 */
export function generateBeatmapFromAudioBuffer(
  buffer: AudioBuffer,
  fileName: string,
  difficulty: 'Normal' | 'Hard' | 'Expert' = 'Hard'
): Beatmap {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const totalDurationMs = buffer.duration * 1000;

  // Window size (~40ms per frame)
  const frameSize = Math.floor(sampleRate * 0.04);
  const totalFrames = Math.floor(channelData.length / frameSize);
  const energies: number[] = new Array(totalFrames);

  // Compute energy for each frame
  for (let f = 0; f < totalFrames; f++) {
    let sum = 0;
    const start = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const val = channelData[start + i];
      sum += val * val;
    }
    energies[f] = Math.sqrt(sum / frameSize);
  }

  // Moving average energy (1.5 sec window)
  const windowHalf = Math.floor((1.5 * sampleRate) / (2 * frameSize));
  const onsets: number[] = [];

  // Minimum interval between hit objects based on difficulty
  const minIntervalMs = difficulty === 'Expert' ? 140 : difficulty === 'Hard' ? 220 : 340;

  let lastOnsetMs = 1200; // Start at ~1.2s to give lead-in time

  for (let f = windowHalf; f < totalFrames - windowHalf; f++) {
    const timeMs = (f * frameSize / sampleRate) * 1000;
    if (timeMs < 1200 || timeMs > totalDurationMs - 1500) continue;

    // Local average energy
    let localSum = 0;
    for (let w = f - windowHalf; w <= f + windowHalf; w++) {
      localSum += energies[w];
    }
    const localAvg = localSum / (windowHalf * 2 + 1);

    // Peak threshold: frame energy > 1.35 * local average
    const currentEnergy = energies[f];
    const prevEnergy = energies[f - 1] || 0;

    if (currentEnergy > localAvg * 1.35 && currentEnergy > prevEnergy && (timeMs - lastOnsetMs) >= minIntervalMs) {
      onsets.push(Math.round(timeMs));
      lastOnsetMs = timeMs;
    }
  }

  // Fallback: If song is very quiet or few peaks detected, generate steady rhythm
  if (onsets.length < 15) {
    const fallbackInterval = difficulty === 'Expert' ? 300 : 450;
    for (let t = 1500; t < totalDurationMs - 2000; t += fallbackInterval) {
      onsets.push(t);
    }
  }

  // Estimate BPM from median onset diffs
  const intervals: number[] = [];
  for (let i = 1; i < Math.min(50, onsets.length); i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)] || 400;
  const estimatedBpm = Math.round(Math.min(220, Math.max(90, 60000 / medianInterval)));

  // Generate hit objects across osu! playfield bounds (X: 64..448, Y: 48..336)
  const hitObjects: HitObject[] = [];
  const minX = 64, maxX = 448;
  const minY = 48, maxY = 336;
  const centerX = 256, centerY = 192;

  let comboNum = 1;
  let comboColorIndex = 0;

  // Geometry patterns state
  let currentX = centerX;
  let currentY = centerY;
  let patternType = 0; // 0: circular ring, 1: jumps, 2: stream line, 3: arc
  let patternStep = 0;

  onsets.forEach((t, index) => {
    const isNewCombo = index > 0 && (index % 8 === 0 || (t - onsets[index - 1]) > 800);

    if (isNewCombo) {
      comboNum = 1;
      comboColorIndex = (comboColorIndex + 1) % 4;
      patternType = Math.floor(Math.random() * 4);
      patternStep = 0;
    } else {
      comboNum++;
      patternStep++;
    }

    // Position calculation based on pattern
    if (patternType === 0) {
      // Ring circle
      const radius = 100 + Math.sin(index) * 20;
      const angle = (patternStep / 6) * Math.PI * 2;
      currentX = centerX + Math.cos(angle) * radius;
      currentY = centerY + Math.sin(angle) * radius;
    } else if (patternType === 1) {
      // Jumps across corners
      const corners = [
        { x: minX + 30, y: minY + 30 },
        { x: maxX - 30, y: maxY - 30 },
        { x: minX + 30, y: maxY - 30 },
        { x: maxX - 30, y: minY + 30 }
      ];
      const c = corners[patternStep % 4];
      currentX = c.x + (Math.random() - 0.5) * 20;
      currentY = c.y + (Math.random() - 0.5) * 20;
    } else if (patternType === 2) {
      // Stream line
      const dirX = (index % 2 === 0) ? 1 : -1;
      currentX = Math.max(minX, Math.min(maxX, currentX + dirX * 35));
      currentY = Math.max(minY, Math.min(maxY, currentY + ((index % 3) - 1) * 25));
    } else {
      // Arc / Triangle
      const arcAngle = (patternStep * 0.8) + (index * 0.2);
      currentX = centerX + Math.cos(arcAngle) * 120;
      currentY = centerY + Math.sin(arcAngle) * 90;
    }

    // Clamp coordinates strictly within playfield
    currentX = Math.max(minX, Math.min(maxX, Math.round(currentX)));
    currentY = Math.max(minY, Math.min(maxY, Math.round(currentY)));

    // Occasional slider creation for longer beats
    const nextT = onsets[index + 1];
    const isSlider = nextT && (nextT - t > 500) && Math.random() > 0.4;

    if (isSlider) {
      const sliderDuration = Math.min(600, Math.round((nextT - t) * 0.6));
      const endX = Math.max(minX, Math.min(maxX, currentX + (Math.random() > 0.5 ? 80 : -80)));
      const endY = Math.max(minY, Math.min(maxY, currentY + (Math.random() > 0.5 ? 60 : -60)));

      hitObjects.push({
        id: `custom_s_${t}_${index}`,
        type: 'slider',
        x: currentX,
        y: currentY,
        time: t,
        duration: sliderDuration,
        path: [
          { x: currentX, y: currentY },
          { x: (currentX + endX) / 2 + (Math.random() * 30 - 15), y: (currentY + endY) / 2 },
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

  // Clean title from filename
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
