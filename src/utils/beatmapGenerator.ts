import type { Beatmap, HitObject } from '../types/game';

/**
 * Built-in procedural songs catalog.
 * Designed strictly for FÁCIL (Easy) and NORMAL difficulties
 * so any casual player or beginner can play, win and enjoy the game immediately.
 */
export function generateBuiltInBeatmaps(): Beatmap[] {
  return [
    createChillHorizonMap(), // 🟢 FÁCIL
    createStarlightCafeMap(), // 🟢 FÁCIL
    createRetroPulseMap(),    // 🟡 NORMAL
    createCyberGrooveMap()    // 🟡 NORMAL
  ];
}

/**
 * 🟢 DIFICULTAD FÁCIL (1): "Chill Horizon"
 * 100 BPM, círculos grandes (CS 3.4), tiempo de reacción de más de 1s (AR 6.0),
 * ventanas de impacto muy amigables (OD 5.0) y drenaje de vida mínimo (HP 3.0).
 */
function createChillHorizonMap(): Beatmap {
  const bpm = 100;
  const msPerBeat = (60 / bpm) * 1000; // 600 ms
  const hitObjects: HitObject[] = [];

  let time = 4 * msPerBeat; // 2400 ms
  let comboNum = 1;
  let colorIdx = 0;

  const centerX = 256;
  const centerY = 192;

  const addCircle = (x: number, y: number, t: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `chill_c_${t}`,
      type: 'circle',
      x: Math.round(x),
      y: Math.round(y),
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
      id: `chill_s_${t}`,
      type: 'slider',
      x: Math.round(x),
      y: Math.round(y),
      time: Math.round(t),
      duration,
      path: [
        { x: Math.round(x), y: Math.round(y) },
        { x: Math.round((x + endX) / 2), y: Math.round((y + endY) / 2) },
        { x: Math.round(endX), y: Math.round(endY) }
      ],
      repeat: 1,
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  // Parte 1: Círculos suaves y bien espaciados (1200ms entre notas)
  const introPositions = [
    { x: centerX - 90, y: centerY },
    { x: centerX + 90, y: centerY },
    { x: centerX, y: centerY - 70 },
    { x: centerX, y: centerY + 70 },
    { x: centerX - 80, y: centerY - 60 },
    { x: centerX + 80, y: centerY + 60 },
    { x: centerX + 80, y: centerY - 60 },
    { x: centerX - 80, y: centerY + 60 }
  ];

  for (let i = 0; i < introPositions.length; i++) {
    const p = introPositions[i];
    addCircle(p.x, p.y, time, i % 4 === 0);
    time += msPerBeat * 2; // 1200 ms
  }

  // Parte 2: Sliders lentos y relajantes
  for (let s = 0; s < 4; s++) {
    const sx = 140 + (s % 2) * 230;
    const sy = 130 + Math.floor(s / 2) * 120;
    addSlider(sx, sy, sx + 90, sy + 30, time, msPerBeat * 1.5, true);
    time += msPerBeat * 2.5;

    addCircle(sx + 140, sy + 30, time);
    time += msPerBeat * 2;
  }

  // Parte 3: Órbita circular suave (1 nota por cada beat)
  for (let i = 0; i < 16; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 90;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    addCircle(x, y, time, i % 4 === 0);
    time += msPerBeat;
  }

  return {
    id: 'chill_horizon',
    title: 'Chill Horizon',
    artist: 'Lofi Dreamers',
    creator: 'BeatMap Academy',
    version: 'Fácil',
    bpm: 100,
    ar: 6.0,
    cs: 3.4,
    od: 5.0,
    hpDrain: 3.0,
    synthTheme: 'chillhop',
    coverUrl: '/covers/chill_horizon.jpg',
    hitObjects
  };
}

/**
 * 🟢 DIFICULTAD FÁCIL (2): "Starlight Cafe"
 * 104 BPM, ritmo acogedor con tiempos completos, notas amplias y diseño intuitivo.
 */
function createStarlightCafeMap(): Beatmap {
  const bpm = 104;
  const msPerBeat = (60 / bpm) * 1000; // ~576.9 ms
  const hitObjects: HitObject[] = [];

  let time = 4 * msPerBeat;
  let comboNum = 1;
  let colorIdx = 0;

  const centerX = 256;
  const centerY = 192;

  const addCircle = (x: number, y: number, t: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `star_c_${t}`,
      type: 'circle',
      x: Math.round(x),
      y: Math.round(y),
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
      id: `star_s_${t}`,
      type: 'slider',
      x: Math.round(x),
      y: Math.round(y),
      time: Math.round(t),
      duration,
      path: [
        { x: Math.round(x), y: Math.round(y) },
        { x: Math.round((x + endX) / 2), y: Math.round((y + endY) / 2) },
        { x: Math.round(endX), y: Math.round(endY) }
      ],
      repeat: 1,
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  // Patrón en cruz rítmica suave
  const crossPts = [
    { x: centerX, y: centerY - 80 },
    { x: centerX + 100, y: centerY },
    { x: centerX, y: centerY + 80 },
    { x: centerX - 100, y: centerY }
  ];

  for (let rep = 0; rep < 4; rep++) {
    for (let i = 0; i < crossPts.length; i++) {
      addCircle(crossPts[i].x, crossPts[i].y, time, i === 0);
      time += msPerBeat * 1.5;
    }
  }

  // Sliders horizontales sencillos
  for (let i = 0; i < 4; i++) {
    const yPos = 120 + i * 45;
    const startX = i % 2 === 0 ? 150 : 362;
    const endX = i % 2 === 0 ? 300 : 212;
    addSlider(startX, yPos, endX, yPos, time, msPerBeat, true);
    time += msPerBeat * 2;
  }

  // Final suave
  for (let i = 0; i < 12; i++) {
    const angle = (i / 6) * Math.PI;
    const x = centerX + Math.cos(angle) * 80;
    const y = centerY + Math.sin(angle) * 60;
    addCircle(x, y, time, i % 3 === 0);
    time += msPerBeat;
  }

  return {
    id: 'starlight_cafe',
    title: 'Starlight Cafe',
    artist: 'Cosmic Chill',
    creator: 'BeatMap Academy',
    version: 'Fácil',
    bpm: 104,
    ar: 6.2,
    cs: 3.5,
    od: 5.2,
    hpDrain: 3.0,
    synthTheme: 'chillhop',
    coverUrl: '/covers/chill_horizon.jpg',
    hitObjects
  };
}

/**
 * 🟡 DIFICULTAD NORMAL (1): "Retro Pulse"
 * 120 BPM, ritmo synthwave dinámico y balanceado.
 */
function createRetroPulseMap(): Beatmap {
  const bpm = 120;
  const msPerBeat = (60 / bpm) * 1000; // 500 ms
  const hitObjects: HitObject[] = [];

  let time = 4 * msPerBeat; // 2000 ms
  let comboNum = 1;
  let colorIdx = 0;

  const centerX = 256;
  const centerY = 192;

  const addCircle = (x: number, y: number, t: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `retro_c_${t}`,
      type: 'circle',
      x: Math.round(x),
      y: Math.round(y),
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
      id: `retro_s_${t}`,
      type: 'slider',
      x: Math.round(x),
      y: Math.round(y),
      time: Math.round(t),
      duration,
      path: [
        { x: Math.round(x), y: Math.round(y) },
        { x: Math.round((x + endX) / 2), y: Math.round((y + endY) / 2 + 15) },
        { x: Math.round(endX), y: Math.round(endY) }
      ],
      repeat: 1,
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  // Cuadrado rítmico alternado
  const square = [
    { x: centerX - 100, y: centerY - 80 },
    { x: centerX + 100, y: centerY - 80 },
    { x: centerX + 100, y: centerY + 80 },
    { x: centerX - 100, y: centerY + 80 }
  ];

  for (let rep = 0; rep < 3; rep++) {
    for (let i = 0; i < 4; i++) {
      addCircle(square[i].x, square[i].y, time, i === 0);
      time += msPerBeat;
    }
  }

  // Sliders y saltos medios
  for (let bar = 0; bar < 4; bar++) {
    const sx = 120 + (bar % 2) * 250;
    const sy = 120 + Math.floor(bar / 2) * 80;
    addSlider(sx, sy, sx + 80, sy + 40, time, msPerBeat, true);
    time += msPerBeat * 1.5;

    addCircle(centerX, centerY, time);
    time += msPerBeat;
  }

  // Cadencia en estrella
  for (let i = 0; i < 20; i++) {
    const angle = (i * 0.8) + (i % 2 === 0 ? 0 : Math.PI);
    const r = 85 + (i % 3) * 20;
    addCircle(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, time, i % 5 === 0);
    time += msPerBeat;
  }

  return {
    id: 'retro_pulse',
    title: 'Retro Pulse',
    artist: 'Neon Wave Orchestra',
    creator: 'BeatMap Engine',
    version: 'Normal',
    bpm: 120,
    ar: 7.4,
    cs: 3.8,
    od: 6.5,
    hpDrain: 4.2,
    synthTheme: 'synthwave',
    coverUrl: '/covers/retro_pulse.jpg',
    hitObjects
  };
}

/**
 * 🟡 DIFICULTAD NORMAL (2): "Cyber Groove"
 * 124 BPM, groove electrónico con acentos melódicos moderados.
 */
function createCyberGrooveMap(): Beatmap {
  const bpm = 124;
  const msPerBeat = (60 / bpm) * 1000; // ~483.8 ms
  const hitObjects: HitObject[] = [];

  let time = 4 * msPerBeat;
  let comboNum = 1;
  let colorIdx = 0;

  const centerX = 256;
  const centerY = 192;

  const addCircle = (x: number, y: number, t: number, isNewCombo: boolean = false) => {
    if (isNewCombo) {
      comboNum = 1;
      colorIdx = (colorIdx + 1) % 4;
    } else {
      comboNum++;
    }
    hitObjects.push({
      id: `groove_c_${t}`,
      type: 'circle',
      x: Math.round(x),
      y: Math.round(y),
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
      id: `groove_s_${t}`,
      type: 'slider',
      x: Math.round(x),
      y: Math.round(y),
      time: Math.round(t),
      duration,
      path: [
        { x: Math.round(x), y: Math.round(y) },
        { x: Math.round((x + endX) / 2), y: Math.round((y + endY) / 2 + 12) },
        { x: Math.round(endX), y: Math.round(endY) }
      ],
      repeat: 1,
      comboNumber: comboNum,
      comboColorIndex: colorIdx
    });
  };

  // Onda sinusoidal horizontal
  for (let i = 0; i < 16; i++) {
    const x = 110 + (i % 8) * 42;
    const y = centerY + Math.sin(i * 0.7) * 55;
    addCircle(x, y, time, i % 4 === 0);
    time += msPerBeat;
  }

  // 3 sliders con tiempos intermedios
  for (let s = 0; s < 3; s++) {
    const sx = 140 + s * 80;
    const sy = 120 + (s % 2) * 80;
    addSlider(sx, sy, sx + 60, sy + 30, time, msPerBeat, true);
    time += msPerBeat * 1.5;

    addCircle(sx + 80, sy + 40, time);
    time += msPerBeat;
  }

  // Círculo concéntrico final
  for (let i = 0; i < 12; i++) {
    const angle = (i / 6) * Math.PI * 2;
    addCircle(centerX + Math.cos(angle) * 85, centerY + Math.sin(angle) * 65, time, i % 4 === 0);
    time += msPerBeat;
  }

  return {
    id: 'cyber_groove',
    title: 'Cyber Groove',
    artist: 'Antigravity Soundworks',
    creator: 'BeatMap Engine',
    version: 'Normal',
    bpm: 124,
    ar: 7.6,
    cs: 3.8,
    od: 6.8,
    hpDrain: 4.5,
    synthTheme: 'cyberpunk',
    coverUrl: '/covers/cyber_overdrive.jpg',
    hitObjects
  };
}
