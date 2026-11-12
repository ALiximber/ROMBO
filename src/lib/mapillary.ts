import type { Bounds, Point } from '../types';
export const TOKEN = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN?.trim() || '';
export interface Candidate { id: string; geometry: { coordinates: [number, number] }; computed_geometry?: { coordinates: [number, number] }; is_pano?: boolean; sequence?: string; captured_at?: number }
export class MapillaryServiceError extends Error {
  constructor(public readonly kind: 'auth' | 'rate-limit' | 'network' | 'unavailable' | 'response', message: string) { super(message); this.name = 'MapillaryServiceError'; }
}
export const candidatePoint = (c: Candidate): Point => { const [lng, lat] = (c.computed_geometry || c.geometry).coordinates; return { lat, lng }; };
export function serviceError(status?: number): string {
  if (status === 401 || status === 403) return 'El token no es válido o no tiene acceso. Revisa el token de cliente en .env y reinicia el servidor.';
  if (status === 429) return 'Se alcanzó el límite de Mapillary. Espera unos minutos antes de volver a intentar.';
  if (status === 404 || status === 400) return 'La imagen o la consulta no está disponible. Revisa la zona o utiliza otro reto.';
  return 'No se pudo cargar Mapillary. Comprueba la conexión, el token y la disponibilidad de la imagen. Puedes reintentar o elegir otro reto.';
}
export async function searchImages(bounds: Bounds, panoOnly: boolean, signal?: AbortSignal): Promise<Candidate[]> {
  if (!TOKEN) throw new MapillaryServiceError('auth', 'Configura VITE_MAPILLARY_ACCESS_TOKEN en .env y reinicia el servidor.');
  const url = new URL('https://graph.mapillary.com/images');
  url.searchParams.set('fields', 'id,geometry,computed_geometry,is_pano,sequence,captured_at');
  url.searchParams.set('bbox', bounds.join(',')); url.searchParams.set('limit', '30');
  if (panoOnly) url.searchParams.set('is_pano', 'true');
  let response: Response;
  try { response = await fetch(url, { headers: { Authorization: `OAuth ${TOKEN}` }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(20000) }); }
  catch { if (signal?.aborted) throw signal.reason; throw new MapillaryServiceError('network', 'La búsqueda no respondió. Revisa la conexión y vuelve a intentar.'); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.error?.code;
    const status = code === 190 ? 401 : [4, 17, 32, 613].includes(code) ? 429 : response.status;
    throw new MapillaryServiceError([401,403].includes(status) ? 'auth' : status === 429 ? 'rate-limit' : status >= 500 ? 'network' : 'unavailable', serviceError(status));
  }
  const result = await response.json().catch(() => null);
  if (!Array.isArray(result?.data)) throw new MapillaryServiceError('response', 'Mapillary devolvió una respuesta no válida.');
  return (result.data as Candidate[]).filter(c => /^\d+$/.test(c?.id) && (c.computed_geometry || c.geometry)?.coordinates?.length === 2 && (c.computed_geometry || c.geometry).coordinates.every(Number.isFinite)).sort((a, b) => Number(!!b.is_pano) - Number(!!a.is_pano) || Number(!!b.sequence) - Number(!!a.sequence));
}
