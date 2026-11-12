import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle, Navigation, RotateCcw } from 'lucide-react';
import type { Viewer, NavigationEdge, Image as MImage } from 'mapillary-js';
import type { Challenge, ImagePosition } from '../types';
import { PositionTracker } from '../lib/tracker';
import { TOKEN, serviceError } from '../lib/mapillary';
import { inBounds } from '../lib/geo';
import { demoImage } from '../data/demo';
import { StreetScene } from './Illustrations';
interface Props { challenge: Challenge; tracker: PositionTracker; onChange: () => void; preview?: boolean; onError?: (message: string) => void }
export function StreetViewer({ challenge, tracker, onChange, preview, onError }: Props) {
  const host = useRef<HTMLDivElement>(null), viewer = useRef<Viewer | null>(null);
  const callbacks = useRef({ onChange, onError }); callbacks.current = { onChange, onError };
  const [edges, setEdges] = useState<NavigationEdge[]>([]), [error, setError] = useState(''), [retry, setRetry] = useState(0), [step, setStep] = useState(0);
  const [busy, setBusy] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), generation = useRef(0);
  const notify = () => { callbacks.current.onChange(); setBusy(!tracker.ready); };
  const adopt = (im: MImage): ImagePosition => {
    const position = { id: im.id, point: { lat: im.lngLat.lat, lng: im.lngLat.lng } };
    if (!Number.isFinite(position.point.lat) || !Number.isFinite(position.point.lng) || !inBounds(position.point, challenge.bounds)) throw new Error('outside');
    return position;
  };
  useEffect(() => {
    let disposed = false, instance: Viewer | null = null;
    generation.current++;
    tracker.begin(); setError(''); setBusy(true);
    if (challenge.demo) { tracker.image(demoImage(challenge, 0)); tracker.settle(); setStep(0); notify(); return () => { if (timer.current) clearTimeout(timer.current); }; }
    async function initialize() {
      try {
        if (!TOKEN) throw new Error('token');
        const { Viewer: MapillaryViewer, TransitionMode } = await import('mapillary-js');
        await import('mapillary-js/dist/mapillary.css');
        if (disposed) return;
        instance = new MapillaryViewer({ container: host.current!, accessToken: TOKEN, transitionMode: TransitionMode.Instantaneous,
          component: { cover: false, attribution: true, bearing: true, spatial: false, direction: false, sequence: false, keyboard: false, cache: false, marker: false, popup: false } });
        viewer.current = instance;
        instance.resize();
        let sequenceEdges: NavigationEdge[] = [], spatialEdges: NavigationEdge[] = [];
        const updateEdges = () => setEdges([...new Map([...sequenceEdges, ...spatialEdges].map(e => [e.target, e])).values()]);
        instance.on('image', e => { if (disposed) return; try { tracker.image(adopt(e.image)); } catch { tracker.fail(); setError('Has llegado fuera de la zona del reto. Reinicia la vista para responder dentro de los límites.'); } notify(); });
        instance.on('dataloading', e => { if (disposed) return; tracker.loading(e.loading); notify(); });
        instance.on('sequenceedges', e => { if (!disposed) { sequenceEdges = e.status.edges; updateEdges(); } });
        instance.on('spatialedges', e => { if (!disposed) { spatialEdges = e.status.edges; updateEdges(); } });
        const image = await Promise.race([instance.moveTo(challenge.imageId), new Promise<never>((_, reject) => { timer.current = setTimeout(() => reject(new Error('timeout')), 25000); })]);
        if (disposed) return;
        if (timer.current) clearTimeout(timer.current);
        instance.resize();
        tracker.image(adopt(image)); tracker.settle(); notify();
      } catch { if (!disposed) { tracker.fail(); const message = serviceError(); setError(message); callbacks.current.onError?.(message); notify(); } }
    }
    void initialize();
    const observer = new ResizeObserver(() => { instance?.resize(); }); if (host.current) observer.observe(host.current);
    return () => { disposed = true; generation.current++; observer.disconnect(); if (timer.current) clearTimeout(timer.current); instance?.remove(); viewer.current = null; };
  }, [challenge, tracker, retry]);
  async function move(target: string) {
    if (!viewer.current || !tracker.ready) return;
    const activeGeneration = generation.current;
    tracker.begin(); setEdges([]); notify();
    try {
      const image = await Promise.race([viewer.current.moveTo(target), new Promise<never>((_, reject) => { timer.current = setTimeout(() => reject(new Error('timeout')), 25000); })]);
      if (activeGeneration !== generation.current) return;
      if (timer.current) clearTimeout(timer.current);
      tracker.image(adopt(image)); tracker.settle(); setError(''); notify();
    } catch { if (activeGeneration !== generation.current) return; tracker.fail(); const message = 'No se pudo llegar a esa imagen, o queda fuera de la zona. Reinicia la vista o cambia de reto; este fallo no se registra como error del jugador.'; setError(message); callbacks.current.onError?.(message); notify(); }
  }
  function moveDemo(next: number) {
    if (!tracker.ready) return; tracker.begin(); notify();
    timer.current = setTimeout(() => { setStep(next); tracker.image(demoImage(challenge, next)); tracker.settle(); notify(); }, 550);
  }
  return <div className="street-viewer">
    {challenge.demo ? <StreetScene step={step}/> : <div className="mapillary-host" ref={host}/>}
    <span className="viewer-label"><span className="live-dot"/>{challenge.demo ? 'ESCENARIO SINTÉTICO' : preview ? 'VISTA PREVIA · MAPILLARY' : 'EXPLORA TU ENTORNO'}</span>
    {busy && !error && <div className="viewer-loading" role="status"><LoaderCircle className="spin"/> Cargando imagen…</div>}
    {error && <div className="viewer-error" role="alert"><p>{error}</p><button className="button secondary" onClick={() => { tracker.loading(false); setRetry(r => r + 1); }}><RotateCcw size={16}/> Reiniciar vista</button></div>}
    {!error && <div className="street-navigation">
      {challenge.demo ? <><button aria-label="Imagen anterior" disabled={busy || step === 0 || tracker.locked} onClick={() => moveDemo(step - 1)}><ArrowLeft size={20}/></button><span>{step + 1} / 4 vistas</span><button aria-label="Siguiente imagen" disabled={busy || step === 3 || tracker.locked} onClick={() => moveDemo(step + 1)}><ArrowRight size={20}/></button></> : edges.length ? edges.map((edge, i) => <button key={edge.target} disabled={busy || tracker.locked} onClick={() => void move(edge.target)} title="Ir a una imagen conectada"><Navigation size={16}/><span>Conexión {i + 1}</span></button>) : !busy && <span>Sin conexiones disponibles. Puedes responder desde aquí.</span>}
    </div>}
    {challenge.demo && <div className="synthetic-credit">Ilustración de demostración · No representa una calle real</div>}
  </div>;
}
