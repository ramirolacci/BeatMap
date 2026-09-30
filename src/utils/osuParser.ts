import type { Beatmap, HitObject } from '../types/game';

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

        const isNewCombo = hitObjects.length === 0 || (typeBitmask & 4) !== 0;
        if (isNewCombo) {
          comboNumber = 1;
          comboColorIndex = (comboColorIndex + 1) % 4;
        } else {
          comboNumber++;
        }

        // Parse object as standard Hit Circle (Sliders converted to normal circles for responsive gameplay)
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
