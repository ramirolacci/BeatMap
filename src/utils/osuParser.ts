import type { Beatmap, HitObject, SliderPoint } from '../types/game';

/**
 * Parses raw .osu file content into Beatmap object structure
 * Supports Hit Circles and Sliders with curve points
 */
export function parseOsuFile(content: string): Beatmap {
  const lines = content.split(/\r?\n/);
  
  let title = 'Unknown Title';
  let artist = 'Unknown Artist';
  let creator = 'Unknown Creator';
  let version = 'Normal';
  let bpm = 120;
  let ar = 8;
  let cs = 4;
  let od = 8;
  let hpDrain = 5;
  let sliderMultiplier = 1.4;

  let currentSection = '';
  const hitObjects: HitObject[] = [];

  let comboNumber = 1;
  let comboColorIndex = 0;
  let baseBeatLength = 500; // 120 BPM default (ms per beat)

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('//')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.substring(1, line.length - 1);
      continue;
    }

    if (currentSection === 'Metadata') {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key === 'Title') title = value;
        if (key === 'Artist') artist = value;
        if (key === 'Creator') creator = value;
        if (key === 'Version') version = value;
      }
    } else if (currentSection === 'Difficulty') {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parseFloat(parts[1].trim());
        if (key === 'HPDrainRate') hpDrain = val;
        if (key === 'CircleSize') cs = val;
        if (key === 'OverallDifficulty') od = val;
        if (key === 'ApproachRate') ar = val;
        if (key === 'SliderMultiplier') sliderMultiplier = val;
      }
    } else if (currentSection === 'TimingPoints') {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const beatLength = parseFloat(parts[1]);
        if (beatLength > 0) {
          baseBeatLength = beatLength;
          bpm = Math.round(60000 / beatLength);
        }
      }
    } else if (currentSection === 'HitObjects') {
      const parts = line.split(',');
      if (parts.length >= 5) {
        const x = Math.max(20, Math.min(492, parseFloat(parts[0])));
        const y = Math.max(20, Math.min(364, parseFloat(parts[1])));
        const time = Math.round(parseFloat(parts[2]));
        const typeBitmask = parseInt(parts[3], 10);

        const isNewCombo = hitObjects.length === 0 || (typeBitmask & 4) !== 0;
        if (isNewCombo) {
          comboNumber = 1;
          comboColorIndex = (comboColorIndex + 1) % 4;
        } else {
          comboNumber++;
        }

        const isSlider = (typeBitmask & 2) !== 0 && parts.length >= 8;

        if (isSlider) {
          // Parse slider points (e.g. B|300:200|350:220)
          const curveData = parts[5];
          const repeat = Math.max(1, parseInt(parts[6], 10) || 1);
          const pixelLength = parseFloat(parts[7]) || 100;

          // Duración calculada en ms a partir de longitud y velocidad de slider
          const pixelsPerBeat = sliderMultiplier * 100;
          const beats = (pixelLength * repeat) / pixelsPerBeat;
          const duration = Math.max(150, Math.round(beats * baseBeatLength));

          const sliderPoints: SliderPoint[] = [{ x, y }];
          const rawTokens = curveData.split('|');
          for (let t = 1; t < rawTokens.length; t++) {
            const sub = rawTokens[t].split(':');
            if (sub.length === 2) {
              const px = Math.max(20, Math.min(492, parseFloat(sub[0])));
              const py = Math.max(20, Math.min(364, parseFloat(sub[1])));
              if (!isNaN(px) && !isNaN(py)) {
                sliderPoints.push({ x: px, y: py });
              }
            }
          }

          // Si solo tenía 1 punto extra, asegurar 2 o 3 para trazado suave
          if (sliderPoints.length < 2) {
            sliderPoints.push({ x: x + 60, y: y + 30 });
          }

          hitObjects.push({
            id: `osu_s_${time}_${x}_${y}`,
            type: 'slider',
            x,
            y,
            time,
            duration,
            path: sliderPoints,
            repeat,
            comboNumber,
            comboColorIndex
          });
        } else {
          // Normal Hit Circle
          hitObjects.push({
            id: `osu_c_${time}_${x}_${y}`,
            type: 'circle',
            x,
            y,
            time,
            comboNumber,
            comboColorIndex
          });
        }
      }
    }
  }

  return {
    id: `custom_${Date.now()}`,
    title,
    artist,
    creator,
    version,
    bpm,
    ar,
    cs,
    od,
    hpDrain,
    hitObjects
  };
}
