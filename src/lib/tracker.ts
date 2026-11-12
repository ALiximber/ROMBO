import type { ImagePosition } from '../types';
// A synchronous gate shared by the viewer and confirm handler, independent of React renders.
export class PositionTracker {
  current: ImagePosition | null = null;
  pending = true;
  dataLoading = false;
  failed = false;
  locked = false;
  changes = 0;
  begin() { if (!this.locked) { this.pending = true; this.failed = false; } }
  image(image: ImagePosition) {
    if (this.locked) return;
    if (this.current && this.current.id !== image.id) this.changes++;
    this.current = structuredClone(image);
  }
  settle() { this.pending = false; }
  loading(value: boolean) { this.dataLoading = value; }
  fail() { this.failed = true; this.pending = false; }
  get ready() { return !!this.current && !this.pending && !this.dataLoading && !this.failed && !this.locked; }
  confirm(): ImagePosition {
    if (!this.ready) throw new Error('Espera a que termine de cargar la imagen.');
    this.locked = true;
    return structuredClone(this.current!);
  }
}
