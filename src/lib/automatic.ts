import type { Challenge, Difficulty, Point } from '../types';
import { BUILTIN_ZONES, MAP_SIZES, zoneBounds, type BuiltinZone } from '../data/zones';
import { candidatePoint, MapillaryServiceError, searchImages, type Candidate } from './mapillary';
import { haversine, inBounds } from './geo';

export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface Options {
  difficulty: Difficulty; count?: number; excludedImageIds?: string[]; recentImageIds?: string[];
  signal?: AbortSignal; onProgress?: (text: string) => void;
}
interface Dependencies { search?: typeof searchImages; random?: () => number; zones?: readonly BuiltinZone[] }
interface Entry { challenge: Challenge; point: Point }

/** Resolve only a bounded set of image METADATA for the requested session. No image download or tile prefetch. */
export async function prepareAutomaticSession(options: Options, dependencies: Dependencies = {}): Promise<{ challenges: Challenge[]; reserves: Challenge[] }> {
  const { difficulty, count = 3, onProgress } = options;
  const search = dependencies.search || searchImages, random = dependencies.random || Math.random;
  const zones = shuffled(dependencies.zones || BUILTIN_ZONES, random);
  const excluded = new Set(options.excludedImageIds || []), recent = new Set(options.recentImageIds || []);
  const pool: Entry[] = [], selected: Entry[] = [], seen = new Set<string>();
  const deadline = AbortSignal.timeout(45000);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  const canAdd = (entry: Entry, list: Entry[]) => !excluded.has(entry.challenge.imageId) && !list.some(e => e.challenge.imageId === entry.challenge.imageId || haversine(e.point, entry.point) < 80);
  let connectionFailures = 0;

  for (const zone of zones) {
    if (selected.length >= count) break;
    if (signal.aborted) break;
    onProgress?.(`Buscando lugares disponibles… ${selected.length} de ${count} rondas preparadas`);
    const bounds = zoneBounds(zone, difficulty);
    const eligible = (items: Candidate[]) => items.filter(c => !excluded.has(c.id) && inBounds(candidatePoint(c), bounds));
    let found: Candidate[];
    try {
      found = eligible(await search(bounds, true, signal));
      if (!found.length) found = eligible(await search(bounds, false, signal));
    } catch (error) {
      if (options.signal?.aborted) throw options.signal.reason;
      if (deadline.aborted) break;
      if (error instanceof MapillaryServiceError && (error.kind === 'auth' || error.kind === 'rate-limit')) throw error;
      connectionFailures++; if (connectionFailures >= 2) break;
      continue;
    }
    const checkedAt = new Date().toISOString();
    // Prefer unseen panoramas and sequence metadata; neither is a claim of visual difficulty or connected coverage.
    const candidates = shuffled(found, random).sort((a,b) => Number(recent.has(a.id)) - Number(recent.has(b.id)) || Number(!!b.is_pano) - Number(!!a.is_pano) || Number(!!b.sequence) - Number(!!a.sequence));
    const local: Entry[] = [];
    for (const candidate of candidates) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      const challenge: Challenge = {
        id: `auto-${zone.id}-${difficulty}-${candidate.id}`, imageId: candidate.id, name: `Explora ${zone.name}`, zone: zone.name, bounds,
        difficulty, set: 'practice', hints: [], explanation: '', reviewed: false, reviewedAt: '', pairKey: '',
        criteria: `Selección automática. Mapa de aproximadamente ${MAP_SIZES[difficulty].sideMeters} m por lado; complejidad visual no revisada.`,
        scaleMeters: MAP_SIZES[difficulty].scaleMeters, selection: 'automatic', zoneId: zone.id,
        sequenceId: typeof candidate.sequence === 'string' ? candidate.sequence : undefined, availabilityCheckedAt: checkedAt,
      };
      local.push({ challenge, point: candidatePoint(candidate) });
    }
    pool.push(...local);
    const first = local.find(e => canAdd(e, selected)); if (first) selected.push(first);
  }
  if (options.signal?.aborted) throw options.signal.reason;
  // If coverage is limited to fewer zones, allow distinct locations >= 80 m apart in a working zone.
  for (const entry of pool) { if (selected.length >= count) break; if (canAdd(entry, selected)) selected.push(entry); }
  if (selected.length < count) throw new Error(connectionFailures || deadline.aborted
    ? 'No pudimos preparar la sesión por un problema de conexión. Vuelve a intentar en unos momentos o prueba la demostración.'
    : 'No hay suficientes imágenes disponibles en las zonas incluidas en este momento. Vuelve a intentar o prueba la demostración.');
  const reserves: Entry[] = [];
  for (const entry of pool) { if (reserves.length === 6) break; if (canAdd(entry, [...selected, ...reserves])) reserves.push(entry); }
  onProgress?.('¡Listo! Abriendo tu primera ronda…');
  return { challenges: selected.map(e => e.challenge), reserves: reserves.map(e => e.challenge) };
}
