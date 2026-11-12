import type { Catalog, Challenge, Difficulty } from '../types';
import { haversine } from './geo';
export function validateCatalog(value: unknown): Catalog {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('challenges' in value) || !Array.isArray(value.challenges)) throw new Error('Se requiere un catálogo versión 1 con una lista challenges.');
  if (value.challenges.length > 500) throw new Error('El catálogo admite hasta 500 retos.');
  const ids = new Set<string>(), images = new Set<string>();
  const challenges = value.challenges.map((c: Challenge) => {
    if (!c || !['id','name','imageId','zone','criteria','reviewedAt','pairKey','explanation'].every(k => typeof c[k as keyof Challenge] === 'string')) throw new Error('Faltan campos de texto en un reto.');
    if (!c.id.trim() || !c.name.trim() || !c.zone.trim() || !/^\d+$/.test(c.imageId) || c.demo) throw new Error('Los retos reales necesitan un ID de imagen numérico y una zona. No se admiten demos.');
    if (ids.has(c.id) || images.has(c.imageId)) throw new Error('Hay retos o imágenes repetidos; los conjuntos deben estar separados.');
    ids.add(c.id); images.add(c.imageId);
    if (!['initial','intermediate','advanced'].includes(c.difficulty) || !['practice','pre','post'].includes(c.set)) throw new Error('Dificultad o conjunto inválido.');
    const b = c.bounds;
    if (!Array.isArray(b) || b.length !== 4 || b.some(n => !Number.isFinite(n)) || b[0] < -180 || b[2] > 180 || b[1] < -85 || b[3] > 85 || b[0] >= b[2] || b[1] >= b[3]) throw new Error('Límites inválidos: usa oeste, sur, este, norte.');
    if (!Number.isFinite(c.scaleMeters) || c.scaleMeters < 10 || c.scaleMeters > 100000) throw new Error('La escala de puntuación debe estar entre 10 y 100 000 m.');
    if (!Array.isArray(c.hints) || c.hints.some(h => typeof h !== 'string') || c.hints.length > 5) throw new Error('Se admiten hasta cinco pistas de texto.');
    if (c.reviewed !== true || !c.criteria.trim() || !Number.isFinite(Date.parse(c.reviewedAt))) throw new Error('Cada reto necesita revisión, fecha y criterios documentados.');
    if (c.set !== 'practice' && !c.pairKey.trim()) throw new Error('Las evaluaciones requieren una clave de pareja comparable.');
    return { ...c, demo: false };
  });
  return { version: 1, challenges };
}
export function evaluationIssues(challenges: Challenge[], difficulty: Difficulty): string[] {
  const pre = challenges.filter(c => c.set === 'pre' && c.difficulty === difficulty);
  const post = challenges.filter(c => c.set === 'post' && c.difficulty === difficulty);
  const errors: string[] = [];
  if (pre.length < 3 || post.length < 3) errors.push('Prepara al menos tres retos distintos en cada evaluación para esta dificultad.');
  if (pre.length !== post.length) errors.push('Ambos conjuntos deben tener el mismo número de retos emparejados.');
  const diagonal = (c: Challenge) => haversine({ lng: c.bounds[0], lat: c.bounds[1] }, { lng: c.bounds[2], lat: c.bounds[3] });
  for (const a of pre) {
    const pairs = post.filter(b => b.pairKey === a.pairKey && b.pairKey);
    if (pairs.length !== 1 || pre.filter(b => b.pairKey === a.pairKey).length !== 1) { errors.push('Cada clave de pareja debe aparecer una vez en cada evaluación.'); break; }
    const b = pairs[0], ratio = diagonal(a) / diagonal(b);
    if (a.scaleMeters !== b.scaleMeters || ratio < 0.8 || ratio > 1.25) { errors.push('Las parejas necesitan la misma escala de puntos y diagonales de zona con diferencia de hasta 25 %.'); break; }
    if (a.imageId === b.imageId) errors.push('Las evaluaciones no pueden compartir imágenes.');
  }
  return errors;
}
