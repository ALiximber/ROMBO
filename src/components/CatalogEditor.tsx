import { useRef, useState } from 'react';
import { Check, Download, Plus, Search, Settings2, Trash2, Upload } from 'lucide-react';
import type { Bounds, Catalog, Challenge, Difficulty, Mode } from '../types';
import { DIFFICULTIES, MODES } from '../types';
import { validateCatalog, evaluationIssues } from '../lib/catalog';
import { download, writeLocal } from '../lib/storage';
import { candidatePoint, searchImages, TOKEN, type Candidate } from '../lib/mapillary';
import { inBounds } from '../lib/geo';
import { PositionTracker } from '../lib/tracker';
import { StreetViewer } from './StreetViewer';
export function TokenNotice() {
  return <div className="notice"><Settings2 size={21}/><div><strong>Conecta tus próximas exploraciones</strong><p>Copia <code>.env.example</code> como <code>.env</code>, agrega tu token de cliente en <code>VITE_MAPILLARY_ACCESS_TOKEN</code> y reinicia el servidor. El token se configura en tu equipo.</p></div></div>;
}
export function CatalogEditor({ catalog, onSave }: { catalog: Catalog; onSave: (c: Catalog) => void }) {
  const [zone, setZone] = useState(''), [bbox, setBbox] = useState(''), [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('initial'), [set, setSet] = useState<Mode>('practice');
  const [criteria, setCriteria] = useState(''), [hints, setHints] = useState(''), [explanation, setExplanation] = useState(''), [pair, setPair] = useState(''), [scale, setScale] = useState(200);
  const [reviewed, setReviewed] = useState(false), [pano, setPano] = useState(true), [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]), [preview, setPreview] = useState<Challenge | null>(null), [tracker, setTracker] = useState(new PositionTracker());
  const [, render] = useState(0); const [message, setMessage] = useState(''); const [editId, setEditId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  function getBounds(): Bounds {
    const b = bbox.split(',').map(n => Number(n.trim()));
    if (b.length !== 4 || b.some(n => !Number.isFinite(n)) || b[0] >= b[2] || b[1] >= b[3] || b[0] < -180 || b[2] > 180 || b[1] < -85 || b[3] > 85) throw new Error('Introduce límites válidos: oeste, sur, este, norte.');
    if ((b[2] - b[0]) * (b[3] - b[1]) > .01) throw new Error('Busca en una zona menor (hasta 0.01 grados cuadrados por consulta). Divide zonas grandes.');
    return b as Bounds;
  }
  async function search() {
    setMessage(''); setPreview(null); setReviewed(false);
    try { const bounds = getBounds(); if (!zone.trim()) throw new Error('Escribe el nombre de la zona.'); setSearching(true); const found = await searchImages(bounds, pano); setCandidates(found); if (!found.length) setMessage('No se encontraron imágenes. Prueba sin el filtro 360° o busca en otra zona.'); }
    catch (e) { setMessage((e as Error).message); } finally { setSearching(false); }
  }
  function makeChallenge(imageId: string): Challenge {
    return { id: editId || crypto.randomUUID(), name: name.trim() || zone.trim(), zone: zone.trim(), imageId, bounds: getBounds(), difficulty, set, hints: hints.split('\n').map(x => x.trim()).filter(Boolean), explanation: explanation.trim(), reviewed, reviewedAt: new Date().toISOString(), criteria: criteria.trim(), pairKey: pair.trim(), scaleMeters: scale };
  }
  function select(candidate: Candidate) {
    try { const c = makeChallenge(candidate.id); if (!inBounds(candidatePoint(candidate), c.bounds)) throw new Error('La posición corregida de esta imagen queda fuera de la zona. Selecciona otra.'); setTracker(new PositionTracker()); setPreview(c); setReviewed(false); setMessage(''); }
    catch (e) { setMessage((e as Error).message); }
  }
  function persist(next: Catalog) { const valid = validateCatalog(next); writeLocal('catalog', valid); onSave(valid); }
  function save() {
    try {
      if (!preview || !tracker.ready || !tracker.current) throw new Error('Previsualiza primero una imagen disponible.');
      if (bbox !== preview.bounds.join(',') && JSON.stringify(getBounds()) !== JSON.stringify(preview.bounds)) throw new Error('La zona cambió. Busca y previsualiza de nuevo.');
      const c = makeChallenge(tracker.current.id);
      persist({ version: 1, challenges: [...catalog.challenges.filter(x => x.id !== editId), c] });
      setMessage('Reto guardado. La imagen actual de la vista previa será el inicio del reto.'); setPreview(null); setEditId(null); setReviewed(false);
    } catch (e) { setMessage((e as Error).message); }
  }
  function edit(c: Challenge) {
    setEditId(c.id); setZone(c.zone); setBbox(c.bounds.join(',')); setName(c.name); setDifficulty(c.difficulty); setSet(c.set); setCriteria(c.criteria); setHints(c.hints.join('\n')); setExplanation(c.explanation); setPair(c.pairKey); setScale(c.scaleMeters); setReviewed(false); setTracker(new PositionTracker()); setPreview(c); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function importFile(file?: File) {
    if (!file) return;
    try { if (file.size > 2_000_000) throw new Error('El archivo supera 2 MB.'); const incoming = validateCatalog(JSON.parse(await file.text()));
      const ids = new Set(catalog.challenges.map(c => c.id)); if (incoming.challenges.some(c => ids.has(c.id))) throw new Error('Hay identificadores ya existentes. La importación agrega retos sin reemplazar los actuales.');
      persist({ version: 1, challenges: [...catalog.challenges, ...incoming.challenges] }); setMessage(`${incoming.challenges.length} retos importados. Revisa su disponibilidad antes del estudio.`);
    } catch (e) { setMessage(e instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : (e as Error).message); }
    if (input.current) input.current.value = '';
  }
  return <main className="page catalog-page"><div className="page-heading"><div><span className="eyebrow">ESPACIO DE PREPARACIÓN</span><h1>Elige dónde explorar.</h1><p>Busca, revisa y prepara un catálogo de lugares reales.</p></div><span className="pill">{catalog.challenges.length} retos preparados</span></div>
    {!TOKEN && <TokenNotice/>}
    <div className="catalog-grid"><section className="panel"><div className="section-heading"><span className="step-number">01</span><h2>Delimita una zona</h2></div>
      <label>Nombre de la zona<input value={zone} onChange={e => setZone(e.target.value)} placeholder="Nombre del barrio o área de estudio"/></label>
      <label>Límites del mapa<input value={bbox} onChange={e => setBbox(e.target.value)} placeholder="oeste, sur, este, norte"/></label><p className="field-help">Coordenadas decimales verificadas por ti. Se conservará este encuadre para todos los jugadores.</p>
      <label className="checkbox"><input type="checkbox" checked={pano} onChange={e => setPano(e.target.checked)}/> Buscar solo panoramas 360°</label>
      <button className="button primary wide" disabled={!TOKEN || searching} onClick={() => void search()}><Search size={18}/>{searching ? 'Buscando imágenes…' : 'Buscar en Mapillary'}</button>
      {!!candidates.length && <div className="candidate-list" aria-label="Imágenes disponibles">{candidates.map((c, i) => <button key={c.id} className={preview?.imageId === c.id ? 'selected' : ''} onClick={() => select(c)}><span>Imagen {i + 1}</span><small>{c.is_pano ? '360°' : 'Perspectiva'} · {c.sequence ? 'Con secuencia' : 'Revisar conexiones'}</small></button>)}</div>}
      <p className="field-help">Hasta 30 resultados por búsqueda. Tener secuencia no garantiza conexiones navegables.</p>
    </section><section className="panel preview-panel"><div className="section-heading"><span className="step-number">02</span><h2>Explora y verifica</h2></div>
      {preview ? <StreetViewer key={preview.id + preview.imageId} challenge={preview} tracker={tracker} preview onChange={() => render(n => n + 1)}/> : <div className="empty-preview"><Search size={36}/><h3>Primero, encuentra un lugar</h3><p>Selecciona una imagen de la búsqueda para revisar la vista y sus conexiones.</p></div>}
      <p className="field-help">Navega por las conexiones y comprueba referencias, límites y complejidad. Guarda la vista que quieras usar como inicio.</p>
    </section></div>
    <section className="panel"><div className="section-heading"><span className="step-number">03</span><h2>{editId ? 'Revisar reto existente' : 'Prepara el reto'}</h2></div>
      <div className="form-grid"><label>Nombre del reto<input value={name} onChange={e => setName(e.target.value)} placeholder="Un nombre para tu catálogo"/></label><label>Dificultad<select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>{Object.entries(DIFFICULTIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>Conjunto<select value={set} onChange={e => setSet(e.target.value as Mode)}>{Object.entries(MODES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>Escala de puntuación (metros)<input type="number" min="10" max="100000" value={scale} onChange={e => setScale(Number(e.target.value))}/></label><label>Clave de pareja para evaluaciones<input value={pair} onChange={e => setPair(e.target.value)} placeholder="Ej. par-01 (misma clave en inicial y final)"/></label><label>Criterios de dificultad revisados<textarea value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="Tamaño de zona, cruces, referencias y complejidad observados"/></label><label>Pistas verificadas (una por línea)<textarea value={hints} onChange={e => setHints(e.target.value)} placeholder="Solo se muestran en práctica inicial e intermedia"/></label><label>Explicación espacial verificada<textarea value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Relación entre cruces, curvas, parques u otras referencias"/></label></div>
      <label className="checkbox"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/> Revisé la imagen actual, sus conexiones, los límites y los criterios. Las pistas describen referencias verificadas.</label>
      <button className="button primary" disabled={!reviewed || !preview || !tracker.ready} onClick={save}><Check size={18}/> Guardar reto revisado</button>
      {editId && <button className="button ghost" onClick={() => { setEditId(null); setPreview(null); }}>Cancelar edición</button>}
    </section>
    {message && <div role="status" className="notice">{message}</div>}
    <section className="panel"><div className="section-heading spread"><h2>Tu catálogo</h2><div className="button-row"><button className="button secondary small" onClick={() => input.current?.click()}><Upload size={16}/> Importar JSON</button><button className="button secondary small" onClick={() => download('rumbo-catalogo.json', JSON.stringify(catalog, null, 2))}><Download size={16}/> Exportar JSON</button><input hidden ref={input} type="file" accept=".json,application/json" onChange={e => void importFile(e.target.files?.[0])}/></div></div>
      {!catalog.challenges.length ? <div className="empty-inline"><Plus size={25}/><p>Aún no hay retos reales. Prepara el primero con tu token.</p></div> : catalog.challenges.map(c => <div className="catalog-row" key={c.id}><div><strong>{c.name}</strong><small>{c.zone} · {DIFFICULTIES[c.difficulty]} · {MODES[c.set]}{c.pairKey && ` · ${c.pairKey}`}</small></div><button className="button ghost small" onClick={() => edit(c)}>Editar y verificar</button><button className="icon-button" aria-label={`Eliminar ${c.name}`} onClick={() => { try { persist({ version: 1, challenges: catalog.challenges.filter(x => x.id !== c.id) }); } catch (e) { setMessage((e as Error).message); } }}><Trash2 size={16}/></button></div>)}
    </section>
    <details className="panel"><summary>Criterios y comparabilidad de las evaluaciones</summary><p>Inicial: zona pequeña y referencias distintivas. Intermedia: zona más amplia y menos ayudas. Avanzada: mayor complejidad espacial y sin pistas. Documenta lo observado; el tamaño por sí solo no determina la dificultad.</p><p>Los conjuntos inicial y final usan imágenes distintas, parejas revisadas, la misma escala de puntos, la misma dificultad y zonas de tamaño comparable. Mantén además equipo, instrucciones y condiciones de aplicación equivalentes.</p>{Object.entries(DIFFICULTIES).map(([d, l]) => <p key={d}><strong>{l}:</strong> {evaluationIssues(catalog.challenges, d as Difficulty).join(' ') || 'Configuración estructural lista; falta comprobar equivalencia pedagógica con tu revisión.'}</p>)}</details>
  </main>;
}
