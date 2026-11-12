import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Bounds, Point } from '../types';
import { inBounds } from '../lib/geo';
import { Crosshair, RotateCcw } from 'lucide-react';
interface Props { bounds: Bounds; demo?: boolean; guess: Point | null; actual?: Point | null; onGuess?: (p: Point) => void; locked?: boolean }
export function AnswerMap({ bounds, demo, guess, actual, onGuess, locked }: Props) {
  const host = useRef<HTMLDivElement>(null), mapRef = useRef<L.Map | null>(null), marks = useRef<L.LayerGroup | null>(null);
  const latest = useRef({ onGuess, locked }); latest.current = { onGuess, locked };
  const [tileError, setTileError] = useState(false);
  const fit = () => mapRef.current?.fitBounds([[bounds[1], bounds[0]], [bounds[3], bounds[2]]], { padding: [14, 14] });
  useEffect(() => {
    const box = L.latLngBounds([bounds[1], bounds[0]], [bounds[3], bounds[2]]);
    const map = L.map(host.current!, { maxBounds: box.pad(.2), maxBoundsViscosity: 1, zoomControl: true, zoomSnap: .25, scrollWheelZoom: false, maxZoom: 19, attributionControl: true });
    mapRef.current = map;
    if (demo) {
      L.imageOverlay('/demo-map.svg', box).addTo(map);
      map.attributionControl.addAttribution('Plano sintético · Rumbo');
    } else {
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, keepBuffer: 0, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      tiles.on('tileerror', () => setTileError(true));
    }
    L.rectangle(box, { color: '#7768ce', weight: 1, fill: false, dashArray: '5 5', interactive: false }).addTo(map);
    marks.current = L.layerGroup().addTo(map);
    // A mobile panel may mount with zero width. Fit only on its first visible size,
    // then preserve the player's zoom/pan when switching between panels.
    let fitted = false;
    const resize = () => {
      map.invalidateSize();
      if (!fitted && host.current && host.current.clientWidth > 0 && host.current.clientHeight > 0) {
        map.fitBounds(box, { padding: [14, 14], animate: false });
        map.setMinZoom(Math.max(1, map.getZoom() - 1)); fitted = true;
      }
    };
    resize();
    map.on('click', (event: L.LeafletMouseEvent) => { if (!latest.current.locked && inBounds(event.latlng, bounds)) latest.current.onGuess?.({ lat: event.latlng.lat, lng: event.latlng.lng }); });
    const observer = new ResizeObserver(resize); observer.observe(host.current!);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [bounds, demo]);
  useEffect(() => {
    const group = marks.current; if (!group) return; group.clearLayers();
    if (guess) L.marker([guess.lat, guess.lng], { icon: L.divIcon({ className: 'answer-pin', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] }), keyboard: true, title: 'Tu respuesta' }).addTo(group).bindTooltip('Tu respuesta');
    if (actual) {
      L.circleMarker([actual.lat, actual.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#25896c', fillOpacity: 1 }).addTo(group).bindTooltip('Posición actual al confirmar');
      if (guess) { L.polyline([[guess.lat, guess.lng], [actual.lat, actual.lng]], { color: '#5b4ae5', weight: 3, dashArray: '7 7' }).addTo(group); mapRef.current?.fitBounds([[guess.lat, guess.lng], [actual.lat, actual.lng]], { padding: [60, 60], maxZoom: 17 }); }
    }
  }, [guess, actual]);
  return <div className="answer-map-wrap"><div ref={host} className="answer-map" aria-label="Mapa de respuesta. Usa las flechas para mover el mapa y el botón Marcar centro como alternativa al clic."/>
    <div className="map-actions"><button className="map-tool" onClick={fit} title="Ver toda la zona" aria-label="Ver toda la zona"><RotateCcw size={16}/></button>{!locked && <button className="map-tool" onClick={() => { const p = mapRef.current?.getCenter(); if (p && inBounds(p, bounds)) onGuess?.({ lat: p.lat, lng: p.lng }); }}><Crosshair size={16}/> Marcar centro</button>}</div>
    {tileError && <div role="alert" className="map-warning">No se cargaron algunas teselas. Revisa tu conexión y vuelve a abrir la ronda antes de responder.</div>}
  </div>;
}
