import type { Beatmap, HitObject } from '../types/game';

/**
 * Generates rhythmic pattern beatmaps synchronized with built-in procedural audio tracks.
 * Features a balanced difficulty progression: Fácil -> Normal -> Difícil -> Experto.
 * All note timings are strictly beat-aligned (sample-accurate phase sync).
 */
export function generateBuiltInBeatmaps(): Beatmap[] {
  return [
    createChillHorizonMap(), // FÁCIL (Para principiantes y juego relajado)
    createRetroPulseMap(),   // NORMAL (Dificultad equilibrada y musical)
    createCyberOverdriveMap(), // DIFÍCIL (Para jugadores intermedios/avanzados)
    createSpeedDemonMap()    // EXPERTO (Desafío rítmico de alta velocidad)
  ];
}

/**
 * DIFICULTAD FÁCIL: "Chill Horizon"
 * Diseñada para que cualquier jugador pueda ganar y divertirse.
 * BPM relajado (100 BPM), círculos grandes (CS 3.4), tiempo de reacción generoso (AR 6.0)
 * y ventanas de acierto amplias (OD 5.0).
 */
function createChillHorizonMap(): Beatmap {
  const bpm = 100;
  const msPerBeat = (60 / bpm) * 1000; // 600 ms
  const hitObjects: HitObject[] = [];

  // Inicio rítmico exacto en el compás 4 (2400 ms)
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

  // Parte 1: Círculos suaves y bien espaciados (1 nota cada 2 tiempos o cada compás)
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
    time += msPerBeat * 2; // Espacio de 1200ms entre notas: ultra amigable
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
    hitObjects
  };
}

/**
 * DIFICULTAD NORMAL: "Retro Pulse"
 * Equilibrada, divertida y con buen groove synthwave.
 */
function createRetroPulseMap(): Beatmap {
  const bpm = 120;
  const msPerBeat = (60 / bpm) * 1000; // 500 ms
  const hitObjects: HitObject[] = [];

  // Inicio en compás 4 (2000 ms)
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

  // Sección 1: Cuadrado rítmico alternado
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

  // Sección 2: Sliders y saltos medios
  for (let bar = 0; bar < 4; bar++) {
    const sx = 120 + (bar % 2) * 250;
    const sy = 120 + Math.floor(bar / 2) * 80;
    addSlider(sx, sy, sx + 80, sy + 40, time, msPerBeat, true);
    time += msPerBeat * 1.5;

    addCircle(centerX, centerY, time);
    time += msPerBeat;
  }

  // Sección 3: Cadencia en estrella
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
    hitObjects
  };
}

/**
 * DIFICULTAD DIFÍCIL: "Cyber Overdrive"
 * Para jugadores intermedios que buscan un desafío rítmico dinámico.
 */
function createCyberOverdriveMap(): Beatmap {
  const bpm = 128;
  const msPerBeat = (60 / bpm) * 1000; // 468.75 ms
  const msPerEighth = msPerBeat / 2;
  const hitObjects: HitObject[] = [];

  // Inicio exactamente en el compás 4: 4 * 468.75 = 1875 ms
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
      id: `cyber_c_${t}`,
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
      id: `cyber_s_${t}`,
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

  // Anillo de notas en beat
  for (let i = 0; i < 24; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 105;
    addCircle(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, time, i % 4 === 0);
    time += msPerBeat;
  }

  // Sliders con jumps
  for (let bar = 0; bar < 6; bar++) {
    const sx = 100 + (bar % 2) * 300;
    const sy = 110 + Math.floor(bar / 2) * 60;
    addSlider(sx, sy, sx + 80, sy + 50, time, msPerBeat, true);
    time += msPerBeat * 1.5;

    addCircle(centerX - 70, centerY, time);
    time += msPerEighth * 2;

    addCircle(centerX + 70, centerY, time);
    time += msPerBeat;
  }

  // Triángulos rítmicos finales
  const tri = [
    { x: 160, y: 110 },
    { x: 352, y: 110 },
    { x: 256, y: 280 }
  ];
  for (let tStep = 0; tStep < 18; tStep++) {
    const pt = tri[tStep % 3];
    addCircle(pt.x, pt.y, time, tStep % 3 === 0);
    time += msPerEighth;
  }

  return {
    id: 'cyber_overdrive',
    title: 'Cyber Overdrive',
    artist: 'Antigravity Soundworks',
    creator: 'BeatMap Engine',
    version: 'Difícil',
    bpm: 128,
    ar: 8.5,
    cs: 4.0,
    od: 7.8,
    hpDrain: 5.5,
    synthTheme: 'cyberpunk',
    hitObjects
  };
}

/**
 * DIFICULTAD EXPERTO: "Speed Demon"
 * Para veteranos que buscan velocidad extrema (160 BPM, AR 9.4, OD 8.8).
 */
function createSpeedDemonMap(): Beatmap {
  const bpm = 160;
  const msPerBeat = (60 / bpm) * 1000; // 375 ms
  const msPerEighth = msPerBeat / 2;
  const hitObjects: HitObject[] = [];

  // Inicio exacto en compás 4: 4 * 375 = 1500 ms
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
      id: `sd_c_${t}`,
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
      id: `sd_s_${t}`,
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

  // Saltos en estrella
  for (let s = 0; s < 15; s++) {
    const starAngle = (s * 4 * Math.PI) / 5;
    const r = 115;
    const x = centerX + Math.cos(starAngle) * r;
    const y = centerY + Math.sin(starAngle) * r;
    if (s % 5 === 0) {
      addSlider(x, y, x + 50, y + 30, time, msPerBeat, true);
    } else {
      addCircle(x, y, time, s % 5 === 1);
    }
    time += msPerBeat * 0.75;
  }

  // Linear streams rápidos
  for (let stream = 0; stream < 4; stream++) {
    const dir = stream % 2 === 0 ? 1 : -1;
    let sx = centerX - 120 * dir;
    let sy = 130 + stream * 30;

    for (let note = 0; note < 8; note++) {
      addCircle(sx, sy, time, note === 0);
      sx += 28 * dir;
      sy += 6;
      time += msPerEighth;
    }
    time += msPerBeat;
  }

  return {
    id: 'speed_demon',
    title: 'Speed Demon',
    artist: 'Overclocked',
    creator: 'BeatMap Engine',
    version: 'Experto',
    bpm: 160,
    ar: 9.4,
    cs: 4.2,
    od: 8.8,
    hpDrain: 6.5,
    synthTheme: 'fast-techno',
    hitObjects
  };
}
