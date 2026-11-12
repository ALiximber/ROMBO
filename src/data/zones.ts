import type { Bounds, Difficulty, Point } from '../types';

export interface BuiltinZone { id: string; name: string; country: string; anchor: Point; reference: string }

// Verified geographic anchors, not asserted Mapillary image positions/coverage.
// Search/map envelopes are fixed BEFORE querying imagery. Images are resolved live.
export const BUILTIN_ZONES: readonly BuiltinZone[] = [
  { id: 'cdmx-centro', name: 'Centro de Ciudad de México', country: 'México', anchor: { lat: 19.43278, lng: -99.13306 }, reference: 'https://en.wikipedia.org/wiki/Z%C3%B3calo' },
  { id: 'barcelona-centro', name: 'Centro de Barcelona', country: 'España', anchor: { lat: 41.38667, lng: 2.17 }, reference: 'https://en.wikipedia.org/wiki/Pla%C3%A7a_de_Catalunya' },
  { id: 'copenhague-nyhavn', name: 'Nyhavn y alrededores', country: 'Dinamarca', anchor: { lat: 55.67972, lng: 12.59056 }, reference: 'https://en.wikipedia.org/wiki/Nyhavn' },
  { id: 'paris-bastille', name: 'Bastille y alrededores', country: 'Francia', anchor: { lat: 48.85306, lng: 2.36917 }, reference: 'https://en.wikipedia.org/wiki/Place_de_la_Bastille' },
  { id: 'sf-embarcadero', name: 'Embarcadero, San Francisco', country: 'Estados Unidos', anchor: { lat: 37.7955, lng: -122.3937 }, reference: 'https://en.wikipedia.org/wiki/San_Francisco_Ferry_Building' },
];

// These describe the extent of the answer map, NOT reviewed scene difficulty.
export const MAP_SIZES: Record<Difficulty, { label: string; sideMeters: number; scaleMeters: number }> = {
  initial: { label: 'Compacta', sideMeters: 600, scaleMeters: 200 },
  intermediate: { label: 'Urbana', sideMeters: 1200, scaleMeters: 400 },
  advanced: { label: 'Amplia', sideMeters: 2000, scaleMeters: 650 },
};

export function zoneBounds(zone: BuiltinZone, difficulty: Difficulty): Bounds {
  const halfLat = MAP_SIZES[difficulty].sideMeters / 2 / 111195.08;
  const halfLng = halfLat / Math.cos(zone.anchor.lat * Math.PI / 180);
  return [zone.anchor.lng - halfLng, zone.anchor.lat - halfLat, zone.anchor.lng + halfLng, zone.anchor.lat + halfLat];
}
