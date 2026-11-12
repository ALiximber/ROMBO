export type Difficulty = 'initial' | 'intermediate' | 'advanced';
export type Mode = 'practice' | 'pre' | 'post';
export type Familiarity = 'yes' | 'no' | 'unsure';
export type Point = { lat: number; lng: number };
export type Bounds = [number, number, number, number]; // west, south, east, north
export interface Challenge {
  id: string; name: string; imageId: string; zone: string; bounds: Bounds;
  difficulty: Difficulty; set: Mode; hints: string[]; explanation: string;
  reviewed: boolean; reviewedAt: string; criteria: string; pairKey: string;
  scaleMeters: number; demo?: boolean;
}
export interface Catalog { version: 1; challenges: Challenge[] }
export interface ImagePosition { id: string; point: Point }
export interface RoundRecord {
  version: 1; alias: string; sessionId: string; roundId: string; roundNumber: number;
  date: string; mode: Mode; difficulty: Difficulty; challengeId: string; zone: string;
  source: 'demo' | 'study'; imageId: string | null; actual: Point | null;
  guess: Point | null; errorMeters: number | null; elapsedSeconds: number;
  score: number | null; scaleMeters: number; hintsUsed: string[]; imageChanges: number;
  familiarity: Familiarity; status: 'completed' | 'abandoned'; pairKey: string;
}
export interface Session { id: string; alias: string; mode: Mode; difficulty: Difficulty; demo: boolean; challenges: Challenge[] }
export const DIFFICULTIES: Record<Difficulty, string> = { initial: 'Inicial', intermediate: 'Intermedia', advanced: 'Avanzada' };
export const MODES: Record<Mode, string> = { practice: 'Práctica', pre: 'Evaluación inicial', post: 'Evaluación final' };
