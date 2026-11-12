import type { Bounds, Point } from '../types';
export function haversine(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
export function scoreFor(errorMeters: number, scaleMeters: number): number {
  if (!Number.isFinite(errorMeters) || errorMeters < 0 || !Number.isFinite(scaleMeters) || scaleMeters <= 0) throw new Error('Distancia o escala inválida.');
  return Math.round(1000 * Math.exp(-errorMeters / scaleMeters));
}
export const inBounds = (p: Point, b: Bounds) => p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3];
export const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
export const meters = (value: number) => `${Math.round(value).toLocaleString('es-MX')} m`;
