import type { Catalog, RoundRecord } from '../types';
const PREFIX = 'rumbo.v1.';
export function readLocal<T>(key: string, fallback: T): T {
  try { const text = localStorage.getItem(PREFIX + key); return text ? JSON.parse(text) as T : fallback; }
  catch { return fallback; }
}
export function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
  catch { throw new Error('No se pudo guardar en este navegador. Revisa el espacio o los permisos de almacenamiento. Exporta tus resultados antes de salir.'); }
}
export function records(demo: boolean): RoundRecord[] { return readLocal(demo ? 'demo.records' : 'study.records', []); }
export function saveRecord(record: RoundRecord) {
  const key = record.source + '.records';
  const all = records(record.source === 'demo').filter(r => r.roundId !== record.roundId);
  writeLocal(key, [...all, record]);
}
export const loadCatalog = (): Catalog => readLocal('catalog', { version: 1, challenges: [] });
export function download(name: string, text: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: unknown): string {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Prevent spreadsheet formula execution in user-controlled text as well as RFC4180 quoting.
  if (/^[\s]*[=+@-]/.test(text) && typeof value !== 'number') text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function recordsCsv(rows: RoundRecord[]): string {
  const keys: (keyof RoundRecord)[] = ['version','alias','sessionId','roundId','roundNumber','date','source','selection','mode','difficulty','difficultyReviewed','challengeId','zone','mapBounds','imageId','actual','guess','errorMeters','elapsedSeconds','score','scaleMeters','hintsUsed','imageChanges','familiarity','status','pairKey'];
  return '\uFEFF' + [keys.map(csvCell).join(','), ...rows.map(row => keys.map(key => csvCell(row[key])).join(','))].join('\r\n');
}
