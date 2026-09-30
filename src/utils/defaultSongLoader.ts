import type { Beatmap } from '../types/game';
import { generateBeatmapFromAudioBuffer } from './audioBeatmapGenerator';
import { audioEngine } from '../audio/audioEngine';

export interface DefaultSongMeta {
  fileName: string;
  title: string;
  artist: string;
  url: string;
  difficulty: 'Normal' | 'Hard' | 'Expert';
}

export const DEFAULT_SONGS_LIST: DefaultSongMeta[] = [
  {
    fileName: 'Bad Bunny - Monaco.mp3',
    title: 'Monaco',
    artist: 'Bad Bunny',
    url: '/songs/Bad Bunny - Monaco.mp3',
    difficulty: 'Hard'
  },
  {
    fileName: 'DUKI - Rockstar.mp3',
    title: 'Rockstar',
    artist: 'DUKI',
    url: '/songs/DUKI - Rockstar.mp3',
    difficulty: 'Hard'
  },
  {
    fileName: 'Skrillex & Kill The Noise - Recess.mp3',
    title: 'Recess',
    artist: 'Skrillex & Kill The Noise',
    url: '/songs/Skrillex & Kill The Noise - Recess.mp3',
    difficulty: 'Expert'
  },
  {
    fileName: 'Travis Scott - SICKO MODE ft. Drake.mp3',
    title: 'SICKO MODE',
    artist: 'Travis Scott ft. Drake',
    url: '/songs/Travis Scott - SICKO MODE ft. Drake.mp3',
    difficulty: 'Expert'
  }
];

export async function loadDefaultBeatmaps(
  onProgress?: (msg: string) => void
): Promise<Beatmap[]> {
  const maps: Beatmap[] = [];

  audioEngine.init();

  for (let i = 0; i < DEFAULT_SONGS_LIST.length; i++) {
    const song = DEFAULT_SONGS_LIST[i];
    try {
      if (onProgress) {
        onProgress(`Cargando canción (${i + 1}/${DEFAULT_SONGS_LIST.length}): ${song.title} - ${song.artist}`);
      }

      const buffer = await audioEngine.loadAudioFromUrl(song.url);
      const beatmap = generateBeatmapFromAudioBuffer(buffer, song.fileName, song.difficulty);
      
      beatmap.title = song.title;
      beatmap.artist = song.artist;
      beatmap.audioUrl = song.url;
      beatmap.audioBuffer = buffer;

      maps.push(beatmap);
    } catch (err) {
      console.error(`Error al cargar canción por defecto ${song.title}:`, err);
    }
  }

  return maps;
}
