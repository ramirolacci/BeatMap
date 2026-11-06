import type { Beatmap } from '../types/game';
import { generateBeatmapFromAudioBuffer, type DifficultyLevel } from './audioBeatmapGenerator';
import { generateBuiltInBeatmaps } from './beatmapGenerator';
import { audioEngine } from '../audio/audioEngine';

export interface DefaultSongMeta {
  id: string;
  fileName: string;
  title: string;
  artist: string;
  url: string;
  difficulty: DifficultyLevel;
  bpm: number;
}

export const DEFAULT_SONGS_LIST: DefaultSongMeta[] = [
  {
    id: 'def_rockstar',
    fileName: 'DUKI - Rockstar.mp3',
    title: 'Rockstar',
    artist: 'DUKI',
    url: '/songs/DUKI - Rockstar.mp3',
    difficulty: 'Normal', // Nivel balanceado y ganable
    bpm: 145
  },
  {
    id: 'def_monaco',
    fileName: 'Bad Bunny - Monaco.mp3',
    title: 'Monaco',
    artist: 'Bad Bunny',
    url: '/songs/Bad Bunny - Monaco.mp3',
    difficulty: 'Normal', // Nivel balanceado y ganable
    bpm: 140
  },
  {
    id: 'def_recess',
    fileName: 'Skrillex & Kill The Noise - Recess.mp3',
    title: 'Recess',
    artist: 'Skrillex & Kill The Noise',
    url: '/songs/Skrillex & Kill The Noise - Recess.mp3',
    difficulty: 'Hard',
    bpm: 155
  },
  {
    id: 'def_sicko',
    fileName: 'Travis Scott - SICKO MODE ft. Drake.mp3',
    title: 'SICKO MODE',
    artist: 'Travis Scott ft. Drake',
    url: '/songs/Travis Scott - SICKO MODE ft. Drake.mp3',
    difficulty: 'Expert',
    bpm: 155
  }
];

// Devuelve de forma instantánea todos los beatmaps disponibles
export function getInitialBeatmapList(): Beatmap[] {
  // 1. Mapas sintéticos nativos con progresión de dificultad: Fácil, Normal, Difícil, Experto
  const builtInMaps = generateBuiltInBeatmaps();

  // 2. Mapas para las canciones MP3 precargadas
  const mp3Placeholders: Beatmap[] = DEFAULT_SONGS_LIST.map((song) => {
    const isEasy = song.difficulty === 'Easy';
    const isNormal = song.difficulty === 'Normal';
    const isHard = song.difficulty === 'Hard';

    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      creator: 'BeatMap Engine',
      version: isEasy ? 'Fácil' : isNormal ? 'Normal' : isHard ? 'Difícil' : 'Experto',
      bpm: song.bpm,
      ar: isEasy ? 6.2 : isNormal ? 7.4 : isHard ? 8.5 : 9.3,
      cs: isEasy ? 3.4 : isNormal ? 3.8 : 4.0,
      od: isEasy ? 5.2 : isNormal ? 6.6 : isHard ? 7.8 : 8.6,
      hpDrain: isEasy ? 3.0 : isNormal ? 4.2 : isHard ? 5.5 : 6.5,
      audioUrl: song.url,
      hitObjects: [] // Se generan bajo demanda cuando el usuario las selecciona o inicia
    };
  });

  return [...builtInMaps, ...mp3Placeholders];
}

// Carga y procesa bajo demanda una canción MP3 si aún no tiene hitObjects
export async function ensureBeatmapLoaded(
  beatmap: Beatmap,
  onProgress?: (msg: string) => void
): Promise<Beatmap> {
  // Si ya tiene objetos y buffer (o es sintetizada), está lista
  if (beatmap.hitObjects && beatmap.hitObjects.length > 0 && (beatmap.audioBuffer || beatmap.synthTheme)) {
    return beatmap;
  }

  if (beatmap.audioUrl) {
    if (onProgress) {
      onProgress(`Cargando y analizando pista de audio: ${beatmap.title}...`);
    }

    try {
      const buffer = await audioEngine.loadAudioFromUrl(beatmap.audioUrl);
      const v = beatmap.version.toLowerCase();
      const diff: DifficultyLevel = 
        v.includes('fácil') || v.includes('facil') || v.includes('easy') ? 'Easy' :
        v.includes('normal') ? 'Normal' :
        v.includes('experto') || v.includes('expert') ? 'Expert' : 'Hard';

      const generated = generateBeatmapFromAudioBuffer(
        buffer,
        beatmap.title,
        diff,
        beatmap.bpm
      );

      beatmap.hitObjects = generated.hitObjects;
      beatmap.audioBuffer = buffer;
      beatmap.bpm = generated.bpm;
      beatmap.ar = generated.ar;
      beatmap.cs = generated.cs;
      beatmap.od = generated.od;
      beatmap.hpDrain = generated.hpDrain;
    } catch (err) {
      console.error(`Error al cargar pista de audio ${beatmap.title}:`, err);
    }
  }

  return beatmap;
}
