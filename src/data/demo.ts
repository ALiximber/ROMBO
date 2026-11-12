import type { Bounds, Challenge, Difficulty, ImagePosition } from '../types';
// All coordinates are synthetic, around an arbitrary origin; never real Mapillary coverage.
export const DEMO_BOUNDS: Bounds = [-0.003, -0.002, 0.003, 0.002];
export function demoChallenges(difficulty: Difficulty): Challenge[] {
  return ['El parque y la avenida','El cruce de la plaza','La calle de los árboles'].map((name, i) => ({
    id: `demo-${i + 1}`, name, imageId: `synthetic-${i}-0`, zone: 'Distrito imaginario', bounds: DEMO_BOUNDS,
    difficulty, set: 'practice', hints: difficulty === 'advanced' ? [] : ['Ubica el parque y la avenida horizontal en el plano. La escena representa su borde sur.'],
    explanation: 'En este escenario sintético, la calle bordea el lado sur del parque. La plaza y los árboles sirven como referencias para relacionar las dos vistas.',
    reviewed: true, reviewedAt: '2026-11-12T00:00:00Z', criteria: 'Escenario didáctico sintético; dificultad solo ilustrativa.', pairKey: '', scaleMeters: 200, demo: true,
  }));
}
export function demoImage(challenge: Challenge, step: number): ImagePosition {
  const round = Number(challenge.id.split('-')[1]) - 1;
  return { id: `synthetic-${round}-${step}`, point: { lat: -0.00035, lng: -0.00125 + step * 0.0006 + round * 0.00035 } };
}
