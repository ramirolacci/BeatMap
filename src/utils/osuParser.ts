import type { Beatmap, HitObject, SliderPoint } from '../types/game';

/**
 * Parses raw .osu file content into Beatmap object structure
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

  let currentSection = '';
  const hitObjects: HitObject[] = [];

  let comboNumber = 1;
  let comboColorIndex = 0;

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
      }
    } else if (currentSection === 'TimingPoints') {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const beatLength = parseFloat(parts[1]);
        if (beatLength > 0) {
          bpm = Math.round(60000 / beatLength);
        }
      }
    } else if (currentSection === 'HitObjects') {
      const parts = line.split(',');
      if (parts.length >= 5) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        const time = parseFloat(parts[2]);
        const typeBitmask = parseInt(parts[3], 10);

        const isNewCombo = (typeBitmask & 4) !== 0;
        if (isNewCombo) {
          comboNumber = 1;
          comboColorIndex = (comboColorIndex + 1) % 4;
        } else {
          comboNumber++;
        }

        const isSlider = (typeBitmask & 2) !== 0;

        if (isSlider && parts.length >= 8) {
          // Slider parse
          const sliderData = parts[5].split('|');
          const repeat = parseInt(parts[6] || '1', 10);
          const pixelLength = parseFloat(parts[7] || '100');
          
          const pathPoints: SliderPoint[] = [{ x, y }];
          for (let i = 1; i < sliderData.length; i++) {
            const sub = sliderData[i].split(':');
            if (sub.length === 2) {
              pathPoints.push({ x: parseFloat(sub[0]), y: parseFloat(sub[1]) });
            }
          }

          // Approx slider duration (ms) based on pixel length & default slider velocity
          const duration = Math.round((pixelLength / 1.4) * (60000 / (bpm * 100)));

          hitObjects.push({
            id: `slider_${time}_${x}_${y}`,
            type: 'slider',
            x,
            y,
            time,
            duration: Math.max(200, duration),
            comboNumber,
            comboColorIndex,
            path: pathPoints,
            repeat: Math.max(1, repeat)
          });
        } else {
          // Circle parse
          hitObjects.push({
            id: `circle_${time}_${x}_${y}`,
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
