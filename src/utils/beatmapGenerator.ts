import type { Beatmap, HitObject } from '../types/game';

/**
 * Generates rhythmic pattern beatmaps synchronized with the built-in procedural audio tracks
 */
export function generateBuiltInBeatmaps(): Beatmap[] {
  return [
    createCyberOverdriveMap(),
    createNeonPulseMap(),
    createSpeedDemonMap()
  ];
}

function createCyberOverdriveMap(): Beatmap {
  const bpm = 128;
  const msPerBeat = (60 / bpm) * 1000;
  const msPerEighth = msPerBeat / 2;
  const hitObjects: HitObject[] = [];

  let time = 2000; // start at 2s
  let comboNum = 1;
  let colorIdx = 0;

  // Center playfield area: 512 x 384 with padding [80..432, 60..324]
  const centerX = 256;
  const centerY = 192;

  // Patterns generator helper
  const addCircle = (x: number, y: number, t: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `c_${t}_${Math.round(x)}_${Math.round(y)}`,
      type: 'circle',
      x,
      y,
      time: Math.round(t),
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  const addSlider = (x: number, y: number, endX: number, endY: number, t: number, duration: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `s_${t}_${Math.round(x)}_${Math.round(y)}`,
      type: 'slider',
      x,
      y,
      time: Math.round(t),
      duration,
      path: [
        { x, y },
        { x: (x + endX) / 2 + (Math.random() * 40 - 20), y: (y + endY) / 2 + (Math.random() * 40 - 20) },
        { x: endX, y: endY }
      ],
      repeat: 1,
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  // Intro stream & jumps (0 - 20s)
  // Section 1: Ring circle pattern
  const numRingNotes = 8;
  for (let i = 0; i < 32; i++) {
    const angle = (i / numRingNotes) * Math.PI * 2;
    const r = 110;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    addCircle(x, y, time, i % 4 === 0);
    time += msPerBeat;
  }

  // Section 2: Jumps and Sliders (20 - 45s)
  for (let bar = 0; bar < 8; bar++) {
    // 1 slider + 2 jump circles
    const sx = 100 + (bar % 2) * 300;
    const sy = 100 + Math.floor(bar / 2) * 50;
    addSlider(sx, sy, sx + 80, sy + 60, time, msPerBeat, true);
    time += msPerBeat * 1.5;

    addCircle(centerX - 80, centerY, time);
    time += msPerEighth * 2;

    addCircle(centerX + 80, centerY, time);
    time += msPerEighth * 2;

    addCircle(centerX, centerY - 80, time);
    time += msPerBeat;
  }

  // Section 3: High Density Triangles Stream (45 - 60s)
  const trianglePoints = [
    { x: 150, y: 100 },
    { x: 362, y: 100 },
    { x: 256, y: 290 }
  ];
  for (let tStep = 0; tStep < 24; tStep++) {
    const pt = trianglePoints[tStep % 3];
    const jitterX = (Math.random() - 0.5) * 20;
    const jitterY = (Math.random() - 0.5) * 20;
    addCircle(pt.x + jitterX, pt.y + jitterY, time, tStep % 3 === 0);
    time += msPerEighth;
  }

  return {
    id: 'cyber_overdrive',
    title: 'Cyber Overdrive',
    artist: 'Antigravity Soundworks',
    creator: 'Yugen Skin Team',
    version: 'Difícil',
    bpm: 128,
    ar: 8.5,
    cs: 4.0,
    od: 8.0,
    hpDrain: 5.5,
    synthTheme: 'synthwave',
    hitObjects
  };
}

function createNeonPulseMap(): Beatmap {
  const bpm = 150;
  const msPerBeat = (60 / bpm) * 1000;
  const msPerEighth = msPerBeat / 2;
  const hitObjects: HitObject[] = [];

  let time = 1500;
  let comboNum = 1;
  let colorIdx = 0;

  const addCircle = (x: number, y: number, t: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `np_c_${t}`,
      type: 'circle',
      x,
      y,
      time: Math.round(t),
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  const addSlider = (x: number, y: number, endX: number, endY: number, t: number, duration: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `np_s_${t}`,
      type: 'slider',
      x,
      y,
      time: Math.round(t),
      duration,
      path: [{ x, y }, { x: endX, y: endY }],
      repeat: 1,
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  // Complex 150 BPM stream pattern
  for (let loop = 0; loop < 12; loop++) {
    const startX = 120 + (loop % 3) * 130;
    const startY = 100 + Math.floor(loop / 3) * 70;

    addSlider(startX, startY, startX + 70, startY + 40, time, msPerBeat, true);
    time += msPerBeat * 1.25;

    // Burst stream 5 notes
    for (let s = 0; s < 5; s++) {
      const sx = startX + 70 + s * 25;
      const sy = startY + 40 + Math.sin(s) * 20;
      addCircle(sx, sy, time);
      time += msPerEighth;
    }

    time += msPerBeat * 0.5;
  }

  // Cross screen jumps
  const points = [
    { x: 80, y: 80 }, { x: 432, y: 304 },
    { x: 432, y: 80 }, { x: 80, y: 304 },
    { x: 256, y: 80 }, { x: 256, y: 304 }
  ];
  for (let i = 0; i < 30; i++) {
    const p = points[i % points.length];
    addCircle(p.x, p.y, time, i % 6 === 0);
    time += msPerBeat * 0.75;
  }

  return {
    id: 'neon_pulse',
    title: 'Neon Pulse (Fast Stream)',
    artist: 'HyperDrive',
    creator: 'Maki',
    version: 'Insano',
    bpm: 150,
    ar: 9.2,
    cs: 4.2,
    od: 8.5,
    hpDrain: 6.0,
    synthTheme: 'cyberpunk',
    hitObjects
  };
}

function createSpeedDemonMap(): Beatmap {
  const bpm = 175;
  const msPerBeat = (60 / bpm) * 1000;
  const msPerEighth = msPerBeat / 2;
  const hitObjects: HitObject[] = [];

  let time = 1000;
  let comboNum = 1;
  let colorIdx = 0;

  const addCircle = (x: number, y: number, t: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `sd_c_${t}_${x}_${y}`,
      type: 'circle',
      x,
      y,
      time: Math.round(t),
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  const addSlider = (x: number, y: number, endX: number, endY: number, t: number, duration: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `sd_s_${t}`,
      type: 'slider',
      x,
      y,
      time: Math.round(t),
      duration,
      path: [{ x, y }, { x: endX, y: endY }],
      repeat: 1,
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  // Fast 175 BPM deathstreams & star jumps
  const cx = 256;
  const cy = 192;
  
  for (let s = 0; s < 16; s++) {
    // Star jump pattern
    const starAngle = (s * 4 * Math.PI) / 5;
    const r = 120;
    const x = cx + Math.cos(starAngle) * r;
    const y = cy + Math.sin(starAngle) * r;
    if (s % 4 === 0) {
      addSlider(x, y, x + 60, y + 40, time, msPerBeat, true);
    } else {
      addCircle(x, y, time, s % 5 === 0);
    }
    time += msPerBeat * 0.75;
  }

  // Linear streams
  for (let stream = 0; stream < 6; stream++) {
    const dir = stream % 2 === 0 ? 1 : -1;
    let sx = cx - 140 * dir;
    let sy = 120 + stream * 30;

    for (let note = 0; note < 9; note++) {
      addCircle(sx, sy, time, note === 0);
      sx += 30 * dir;
      sy += 8;
      time += msPerEighth;
    }
    time += msPerBeat;
  }

  return {
    id: 'speed_demon',
    title: 'Speed Demon (Extreme)',
    artist: 'Overclocked',
    creator: 'Vanish',
    version: 'Experto',
    bpm: 175,
    ar: 9.6,
    cs: 4.4,
    od: 9.0,
    hpDrain: 7.0,
    synthTheme: 'fast-techno',
    hitObjects
  };
}
