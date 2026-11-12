import { ArrowRight, Globe2, MapPin } from 'lucide-react';
import { BUILTIN_ZONES } from '../data/zones';
export function Zones({ onPlay }: { onPlay: () => void }) {
  return <main className="page zones-page"><div className="page-heading"><div><span className="eyebrow">TU PRÓXIMA PARADA YA ESTÁ PREPARADA</span><h1>Cinco zonas. Nuevas perspectivas.</h1><p>Nosotros elegimos los lugares. Tú solo exploras y encuentras tu posición.</p></div><Globe2 className="heading-icon" size={36}/></div>
    <div className="zones-grid">{BUILTIN_ZONES.map((zone, i) => <article className={`zone-card zone-color-${i}`} key={zone.id}><div className="zone-card-art" aria-hidden="true"><span className="zone-streets"/><MapPin size={40}/><span className="zone-number">0{i + 1}</span></div><div className="zone-card-copy"><span className="eyebrow">{zone.country}</span><h2>{zone.name}</h2><p>Incluida en la selección automática de partidas.</p></div></article>)}</div>
    <section className="bottom-banner"><div><Globe2 size={28}/><div><h3>Una sesión diferente cada vez.</h3><p>Seleccionamos tres posiciones disponibles al iniciar. Si una zona no tiene imágenes, buscamos en las demás.</p></div></div><button className="button primary" onClick={onPlay}>Jugar ahora<ArrowRight size={18}/></button></section><p className="research-note">Las imágenes reales dependen de la cobertura disponible de Mapillary. La demostración utiliza un escenario sintético separado.</p>
  </main>;
}
