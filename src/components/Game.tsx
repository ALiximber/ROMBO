import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock3, Flag, Lightbulb, Map, MapPin, Navigation, Route, Target, X } from 'lucide-react';
import type { Challenge, Familiarity, Point, RoundRecord, Session } from '../types';
import { DIFFICULTIES, MODES } from '../types';
import { formatTime, haversine, inBounds, meters, scoreFor } from '../lib/geo';
import { PositionTracker } from '../lib/tracker';
import { download, saveRecord, writeLocal } from '../lib/storage';
import { StreetViewer } from './StreetViewer';
import { AnswerMap } from './AnswerMap';
import { MAP_SIZES } from '../data/zones';
export function Game({ session, index, challenge, onNext, onAbandon, onReplace }: { session: Session; index: number; challenge: Challenge; onNext: (r: RoundRecord) => void; onAbandon: (r: RoundRecord | null) => void; onReplace: () => Promise<boolean> }) {
  const [tracker] = useState(() => new PositionTracker());
  const [, repaint] = useState(0), [guess, setGuess] = useState<Point | null>(null), [seconds, setSeconds] = useState(0);
  const [hints, setHints] = useState<string[]>([]), [familiarity, setFamiliarity] = useState<Familiarity>('unsure');
  const [result, setResult] = useState<RoundRecord | null>(null), [tab, setTab] = useState('explore'), [message, setMessage] = useState(''), [leaving, setLeaving] = useState(false), [serviceFailed, setServiceFailed] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const start = useRef<number | null>(null), roundId = useRef(crypto.randomUUID()); const current = useRef<() => RoundRecord>(() => makeRecord());
  function makeRecord(): RoundRecord { return {
    version: 1, alias: session.alias, sessionId: session.id, roundId: roundId.current, roundNumber: index + 1, date: new Date().toISOString(), mode: session.mode, difficulty: session.difficulty, challengeId: challenge.id, zone: challenge.zone, source: session.demo ? 'demo' : 'study',
    imageId: tracker.current?.id || null, actual: tracker.current?.point || null, guess, errorMeters: null, elapsedSeconds: start.current ? Math.round((Date.now() - start.current) / 1000) : 0, score: null, scaleMeters: challenge.scaleMeters, hintsUsed: hints, imageChanges: tracker.changes, familiarity, status: 'abandoned', pairKey: challenge.pairKey,
    selection: session.demo ? 'demo' : challenge.selection || 'catalog', difficultyReviewed: !session.demo && challenge.reviewed, mapBounds: challenge.bounds,
  }; }
  current.current = makeRecord;
  function update() { if (tracker.ready && start.current === null) start.current = Date.now(); if (tracker.ready) setServiceFailed(false); repaint(n => n + 1); }
  useEffect(() => {
    const interval = setInterval(() => { if (start.current && !tracker.locked) setSeconds(Math.round((Date.now() - start.current) / 1000)); }, 1000);
    return () => clearInterval(interval);
  }, [tracker]);
  useEffect(() => {
    if (result || serviceFailed) return;
    const persistDraft = () => { if (start.current && !tracker.locked && !tracker.failed) { try { writeLocal('activeRound', current.current()); } catch (e) { setMessage((e as Error).message); } } };
    persistDraft(); const interval = setInterval(persistDraft, 5000);
    const beforeUnload = (e: BeforeUnloadEvent) => { persistDraft(); if (start.current && !tracker.locked) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { clearInterval(interval); window.removeEventListener('beforeunload', beforeUnload); };
  }, [result, serviceFailed, tracker, guess, hints, familiarity]);
  function persist(record: RoundRecord) { try { saveRecord(record); writeLocal('activeRound', null); } catch (e) { setMessage((e as Error).message); } }
  function confirm() {
    if (!guess || !tracker.ready) return;
    try {
      if (!inBounds(tracker.current!.point, challenge.bounds)) throw new Error('La vista queda fuera de la zona. Reinicia el visor.');
      const snapshot = tracker.confirm(), distance = haversine(snapshot.point, guess);
      const record: RoundRecord = { ...makeRecord(), imageId: snapshot.id, actual: snapshot.point, guess: { ...guess }, errorMeters: distance, score: scoreFor(distance, challenge.scaleMeters), status: 'completed' };
      persist(record); setResult(record);
    } catch (e) { setMessage((e as Error).message); }
  }
  function abandon() { const record = start.current && !serviceFailed ? makeRecord() : null; if (record) persist(record); else { try { writeLocal('activeRound', null); } catch { /* No completed data to lose. */ } } onAbandon(record); }
  const canHint = session.mode === 'practice' && session.difficulty !== 'advanced' && challenge.hints.length > 0;
  if (result) return <main className="page result-page"><div className="page-heading"><div><span className="eyebrow">RONDA {index + 1} DE 3 · {session.demo ? 'DEMOSTRACIÓN' : MODES[session.mode].toUpperCase()}</span><h1>Cada referencia cuenta.</h1><p>Esta es la distancia entre tu respuesta y la imagen que estabas viendo.</p></div><span className="result-check"><Check size={26}/></span></div>
    <div className="result-grid"><section className="panel result-info"><span className="eyebrow">ERROR DE UBICACIÓN</span><div className="distance">{Math.round(result.errorMeters!).toLocaleString('es-MX')}<span>metros</span></div><div className="result-metrics"><div><Clock3 size={18}/><strong>{formatTime(result.elapsedSeconds)}</strong><small>Tiempo empleado</small></div><div><Flag size={18}/><strong>{result.score} <span>/ 1 000</span></strong><small>Puntos de esta ronda</small></div></div>
      {challenge.explanation && <div className="spatial-note"><Lightbulb size={20}/><div><strong>Conecta las referencias</strong><p>{challenge.explanation}</p></div></div>}
      <p className="field-help">Puntos = redondear(1 000 × e<sup>−error / {challenge.scaleMeters}</sup>). Los puntos entre zonas o dificultades distintas no son directamente comparables.</p>
      <button className="button primary wide" onClick={() => onNext(result)}>{index === 2 ? 'Ver resumen de sesión' : 'Siguiente ronda'}<ArrowRight size={18}/></button>
    </section><section className="panel result-map"><AnswerMap bounds={challenge.bounds} demo={session.demo} guess={result.guess} actual={result.actual} locked/><div className="map-legend"><span><i className="purple-dot"/>Tu respuesta</span><span><i className="green-dot"/>Posición al confirmar</span></div></section></div>
    {message && <div role="alert" className="notice">{message}<button className="button secondary" onClick={() => download('rumbo-ronda-respaldo.json', JSON.stringify(result, null, 2))}>Descargar respaldo</button></div>}
  </main>;
  return <main className="page game-page"><div className="game-top"><div><span className="eyebrow">{session.demo ? 'DEMOSTRACIÓN · DATOS SINTÉTICOS' : MODES[session.mode].toUpperCase()}</span><h1>¿Dónde te encuentras?</h1></div><div className="game-status"><span className="pill">{challenge.selection === 'automatic' ? 'Zona ' + MAP_SIZES[session.difficulty].label.toLowerCase() : DIFFICULTIES[session.difficulty]}</span><span className="timer"><Clock3 size={17}/>{formatTime(seconds)}</span><button className="icon-button" aria-label="Salir de la sesión" onClick={() => setLeaving(true)}><X size={20}/></button></div></div>
    <div className="round-progress"><div>{[0,1,2].map(n => <span key={n} className={n <= index ? 'filled' : ''}/>)}</div><span>Ronda <strong>{index + 1}</strong> de 3</span><span className="zone-label">{challenge.zone}</span></div>
    <div className="mobile-tabs"><button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}><Navigation size={17}/> Explorar</button><button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><Map size={17}/> Mapa{guess && <Check size={14}/>}</button></div>
    <div className={`game-grid tab-${tab}`}><section className="explore-panel"><StreetViewer challenge={challenge} tracker={tracker} onChange={update} onError={() => { setServiceFailed(true); try { writeLocal('activeRound', null); } catch { /* No scored result. */ } }}/><div className="explore-footer"><Navigation size={17}/><span>{session.demo ? 'Cambia entre las vistas sintéticas con las flechas.' : 'Arrastra para mirar alrededor. Usa las conexiones para avanzar.'}</span></div></section>
      <section className="answer-panel"><div className="answer-heading"><MapPin size={19}/><div><h2>Encuentra tu posición</h2><p>Marca en el mapa dónde estás ahora.</p></div></div><AnswerMap bounds={challenge.bounds} demo={session.demo} guess={guess} onGuess={setGuess}/><div className="answer-controls"><p className={guess ? 'guess-status placed' : 'guess-status'}>{guess ? <Check size={16}/> : <MapPin size={16}/>} {guess ? 'Marcador colocado. Puedes ajustarlo.' : 'Haz clic en el mapa para colocar tu marcador.'}</p><button className="button primary wide" disabled={!guess || !tracker.ready} onClick={confirm}>{!tracker.ready ? 'Espera a que cargue la imagen…' : 'Confirmar ubicación'}<ArrowRight size={18}/></button><p className="field-help center">Sin límite de tiempo. Observa a tu ritmo.</p></div></section></div>
    <div className="round-bottom"><section className="hint-section"><div className="button-row"><Lightbulb size={19}/><strong>Un cambio de perspectiva</strong></div>{canHint ? <><p>Los cruces, las curvas y los espacios abiertos pueden orientarte.</p><button className="button secondary small" disabled={hints.length >= challenge.hints.length} onClick={() => setHints([...hints, challenge.hints[hints.length]])}>{hints.length >= challenge.hints.length ? 'Todas las pistas consultadas' : `Ver pista ${hints.length + 1}`}</button>{hints.map(h => <p className="hint-text" key={h}>{h}</p>)}</> : <p>{session.mode !== 'practice' ? 'Esta evaluación se realiza sin pistas adicionales.' : 'Este reto no incluye pistas adicionales.'}</p>}</section><fieldset className="familiarity"><legend>¿Ya conocías este lugar?</legend><p>Tu respuesta ayuda a interpretar el resultado.</p><div className="segmented">{([['yes','Sí'],['no','No'],['unsure','No estoy seguro']] as const).map(([v,l]) => <button key={v} aria-pressed={familiarity === v} className={familiarity === v ? 'active' : ''} onClick={() => setFamiliarity(v)}>{l}</button>)}</div></fieldset></div>
    {(message || serviceFailed) && <div className="notice" role="status"><div>{message || 'La imagen no está disponible. Puedes usar otro reto sin registrar este fallo como error.'}</div>{serviceFailed && <button className="button secondary" disabled={replacing} onClick={async () => { setReplacing(true); setMessage(''); try { if (!await onReplace()) setMessage('No hay otro lugar disponible ahora. Puedes reiniciar la vista o salir sin penalización y volver a intentar.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo encontrar otra ubicación.'); } finally { setReplacing(false); } }}>{replacing ? 'Buscando otro lugar…' : 'Usar otro reto'}</button>}</div>}
    {leaving && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="exit-title" onKeyDown={e => { if (e.key === 'Escape') setLeaving(false); if (e.key === 'Tab') { const buttons = e.currentTarget.querySelectorAll('button'); const first = buttons[0], last = buttons[buttons.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }}><h2 id="exit-title">¿Terminar esta sesión?</h2><p>Las rondas completadas se conservan. La ronda actual se guardará como abandonada, sin puntuación; un fallo de servicio no se atribuye al jugador.</p><div className="button-row"><button autoFocus className="button secondary" onClick={() => setLeaving(false)}>Seguir explorando</button><button className="button primary" onClick={abandon}>Terminar sesión</button></div></section></div>}
  </main>;
}
export function SessionSummary({ rows, demo, onContinue, onHistory }: { rows: RoundRecord[]; demo: boolean; onContinue: () => void; onHistory: () => void }) {
  const completed = rows.filter(r => r.status === 'completed');
  const average = completed.length ? completed.reduce((n, r) => n + r.errorMeters!, 0) / completed.length : null;
  return <main className="page summary-page"><span className="summary-icon"><Route size={32}/></span><span className="eyebrow">{demo ? 'DEMOSTRACIÓN FINALIZADA' : 'TU SESIÓN'}</span><h1>Un recorrido, nuevas perspectivas.</h1><p>{completed.length} de 3 rondas completadas. Tómate un momento para revisar tus resultados.</p>{demo && <span className="pill">Datos sintéticos · Fuera del estudio</span>}<div className="summary-stats"><div><Target/><strong>{average === null ? '—' : meters(average)}</strong><span>Error medio</span></div><div><Clock3/><strong>{formatTime(rows.reduce((n, r) => n + r.elapsedSeconds, 0))}</strong><span>Tiempo total</span></div><div><Flag/><strong>{completed.reduce((n,r) => n + r.score!, 0).toLocaleString('es-MX')}</strong><span>Puntos lúdicos</span></div></div><div className="panel summary-table">{rows.length ? rows.map(r => <div key={r.roundId}><span>Ronda {r.roundNumber}</span><strong>{r.errorMeters === null ? 'Abandonada' : meters(r.errorMeters)}</strong><span>{formatTime(r.elapsedSeconds)}</span><span>{r.score ?? '—'} pts</span></div>) : <p>No se completaron rondas en esta sesión.</p>}</div><div className="button-row centered"><button className="button primary" onClick={onContinue}>Continuar con otra sesión<ArrowRight size={18}/></button><button className="button secondary" onClick={onHistory}>Ver historial y exportar</button></div><p className="research-note">Resultados descriptivos de esta sesión. No representan una medida de inteligencia ni demuestran un efecto de la aplicación.</p></main>;
}
