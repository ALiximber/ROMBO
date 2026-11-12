import { describe, expect, it, vi, afterEach } from 'vitest';
import { haversine, inBounds, scoreFor } from './geo';
import { PositionTracker } from './tracker';
import { csvCell, records, recordsCsv, saveRecord } from './storage';
import { validateCatalog, evaluationIssues } from './catalog';
import { serviceError } from './mapillary';
import { prepareAutomaticSession } from './automatic';
import { BUILTIN_ZONES, zoneBounds } from '../data/zones';
import type { Challenge, RoundRecord } from '../types';
describe('geodesia y puntos', () => {
  it('distancia cero para el mismo punto', () => expect(haversine({lat:19,lng:-99},{lat:19,lng:-99})).toBe(0));
  it('un grado en el ecuador mide aproximadamente 111 195 metros', () => expect(haversine({lat:0,lng:0},{lat:0,lng:1})).toBeCloseTo(111195.08, 1));
  it('cruza el antimeridiano por la distancia corta', () => expect(haversine({lat:0,lng:179.9},{lat:0,lng:-179.9})).toBeCloseTo(22239.016, 1));
  it('tolera puntos antípodas', () => expect(haversine({lat:0,lng:0},{lat:0,lng:180})).toBeCloseTo(20015114.44, 0));
  it('puntos transparentes y decrecientes', () => { expect(scoreFor(0,200)).toBe(1000); expect(scoreFor(200,200)).toBe(368); expect(scoreFor(20000,200)).toBe(0); expect(scoreFor(50,200)).toBeGreaterThan(scoreFor(100,200)); });
  it('rechaza escalas inválidas', () => { expect(() => scoreFor(5,0)).toThrow(); expect(() => scoreFor(-1,200)).toThrow(); expect(() => scoreFor(NaN,200)).toThrow(); });
  it('respeta los límites sin centrar en la respuesta', () => { expect(inBounds({lat:1,lng:1},[0,0,2,2])).toBe(true); expect(inBounds({lat:3,lng:1},[0,0,2,2])).toBe(false); });
});
describe('posición actual al confirmar', () => {
  const first = {id:'primera',point:{lat:0,lng:0}}, second = {id:'actual',point:{lat:.001,lng:.002}};
  it('no confirma sin imagen lista', () => expect(() => new PositionTracker().confirm()).toThrow());
  it('registra la imagen actual y no la inicial', () => { const tracker = new PositionTracker(); tracker.image(first); tracker.settle(); tracker.begin(); tracker.image(second); tracker.settle(); expect(tracker.confirm()).toEqual(second); expect(tracker.changes).toBe(1); });
  it('bloquea durante la petición, aun si dataloading se resuelve antes que moveTo', () => { const t = new PositionTracker(); t.image(first); t.settle(); t.begin(); t.loading(true); t.loading(false); expect(() => t.confirm()).toThrow(); t.image(second); expect(() => t.confirm()).toThrow(); t.settle(); expect(t.confirm().id).toBe('actual'); });
  it('bloquea si siguen cargando datos después de moveTo', () => { const t = new PositionTracker(); t.image(second); t.loading(true); t.settle(); expect(t.ready).toBe(false); t.loading(false); expect(t.ready).toBe(true); });
  it('congela la respuesta y rechaza un segundo envío', () => { const t = new PositionTracker(); t.image(first); t.settle(); const snapshot = t.confirm(); t.image(second); expect(snapshot).toEqual(first); expect(t.current).toEqual(first); expect(() => t.confirm()).toThrow(); });
  it('un fallo no hace evaluable la imagen anterior', () => { const t = new PositionTracker(); t.image(first); t.settle(); t.begin(); t.fail(); expect(() => t.confirm()).toThrow(); });
  it('eventos repetidos no incrementan los cambios', () => { const t = new PositionTracker(); t.image(first); t.image(first); t.image(second); t.image(second); expect(t.changes).toBe(1); });
});
const challenge: Challenge = {id:'a',name:'Revisado',imageId:'123456',zone:'Zona revisada',bounds:[0,0,.002,.002],difficulty:'initial',set:'practice',hints:[],explanation:'',reviewed:true,reviewedAt:'2026-11-12T00:00:00Z',criteria:'Revisión manual del tamaño, referencias y conexiones.',pairKey:'',scaleMeters:200};
describe('catálogo y evaluaciones', () => {
  it('acepta catálogo vacío sin inventar cobertura', () => expect(validateCatalog({version:1,challenges:[]}).challenges).toEqual([]));
  it('no acepta demos como retos reales', () => expect(() => validateCatalog({version:1,challenges:[{...challenge,demo:true}]})).toThrow());
  it('rechaza duplicados, coordenadas inválidas y retos no revisados', () => { for (const c of [{...challenge,reviewed:false},{...challenge,bounds:[0,0,0,0]},{...challenge,imageId:'inventado'}]) expect(() => validateCatalog({version:1,challenges:[c]})).toThrow(); expect(() => validateCatalog({version:1,challenges:[challenge,challenge]})).toThrow(); });
  it('las evaluaciones incompletas quedan bloqueadas', () => expect(evaluationIssues([], 'initial').length).toBeGreaterThan(0));
  it('acepta tres parejas distintas y comparables, rechaza escalas distintas', () => { const pairs: Challenge[] = Array.from({length:3},(_,i) => (['pre','post'] as const).map((set,j) => ({...challenge,id:`${set}-${i}`,imageId:String(100+i*2+j),set,pairKey:`pair-${i}`}))).flat(); expect(evaluationIssues(pairs,'initial')).toEqual([]); pairs[0].scaleMeters=900; expect(evaluationIssues(pairs,'initial').join(' ')).toContain('misma escala'); });
});
describe('exportación y aislamiento de datos', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('escapa comas, comillas y saltos de línea', () => expect(csvCell('Ana, "Norte"\nSur')).toBe('"Ana, ""Norte""\nSur"'));
  it('neutraliza fórmulas de hojas de cálculo sin convertir números', () => { expect(csvCell('=SUM(1,2)')).toBe('"\'=SUM(1,2)"'); expect(csvCell(-99)).toBe('"-99"'); });
  it('incluye cabecera y BOM aunque no haya registros', () => expect(recordsCsv([])).toMatch(/^\uFEFF"version","alias"/));
  it('las demos nunca se guardan en el estudio y el registro es idempotente', () => { const data = new Map<string,string>(); vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)}); const row = {roundId:'demo-round',source:'demo'} as RoundRecord; saveRecord(row); saveRecord(row); expect(records(true)).toHaveLength(1); expect(records(false)).toHaveLength(0); });
  it('informa del almacenamiento lleno', () => { vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw new Error('quota');}}); expect(() => saveRecord({roundId:'x',source:'demo'} as RoundRecord)).toThrow('No se pudo guardar'); });
});
describe('mensajes seguros de servicio', () => {
  it('distingue autorización, límite y ausencia', () => { expect(serviceError(401)).toContain('token'); expect(serviceError(429)).toContain('límite'); expect(serviceError(404)).toContain('no está disponible'); expect(serviceError()).toContain('conexión'); });
});
describe('selección automática de zonas', () => {
  it('calcula límites válidos alrededor del ancla de cada zona incluida', () => {
    for (const z of BUILTIN_ZONES) {
      const b = zoneBounds(z, 'initial');
      expect(inBounds(z.anchor, b)).toBe(true);
      expect(b[0]).toBeLessThan(b[2]);
      expect(b[1]).toBeLessThan(b[3]);
    }
  });
  it('selecciona 3 retos separados >= 80 m y guarda reservas sin repetir imágenes excluidas', async () => {
    const search = vi.fn(async (bounds) => [0, 1, 2, 3].map(i => ({
      id: String(1000 + i),
      geometry: { coordinates: [bounds[0] + 0.001 * (i + 1), (bounds[1] + bounds[3]) / 2] as [number, number] },
      is_pano: true,
      sequence: 'seq-' + i,
    })));
    const res = await prepareAutomaticSession({ difficulty: 'initial', excludedImageIds: ['1000'] }, { search, zones: [BUILTIN_ZONES[0]], random: () => 0.5 });
    expect(res.challenges).toHaveLength(3);
    expect(res.challenges.every(c => c.imageId !== '1000' && c.selection === 'automatic')).toBe(true);
  });
});
