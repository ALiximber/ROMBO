import { test, expect, type Page } from '@playwright/test';
// All service responses in this file are synthetic. No credential or real imagery is used.
async function mockedMapillary(page: Page) {
  await page.route('**/src/lib/mapillary.ts*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/export const TOKEN = [^\n]+/, 'export const TOKEN = "mock-client-not-real";');
    await route.fulfill({response, body});
  });
  await page.route('**/node_modules/.vite/deps/mapillary-js.js*', route => route.fulfill({contentType:'text/javascript',body:`
    export const TransitionMode = { Instantaneous: 1 };
    export class Viewer {
      constructor(options) { this.options=options; this.handlers={}; this.removed=false; window.__viewerOptions=options.component; options.container.textContent='Visor simulado para pruebas'; }
      on(name,handler) { (this.handlers[name] ||= []).push(handler); }
      emit(name,value) { if(!this.removed) for(const h of this.handlers[name]||[]) h(value); }
      async moveTo(id) {
        this.emit('dataloading',{loading:true});
        await new Promise(r=>setTimeout(r,100));
        this.emit('dataloading',{loading:false});
        if(id==='404') throw new Error('Simulated unavailable image');
        await new Promise(r=>setTimeout(r,200));
        const image={id,lngLat:id==='1002'?{lat:.0018,lng:.002}:{lat:.001,lng:.001}};
        this.emit('image',{image});
        this.emit('sequenceedges',{status:{edges:id==='1001'?[{target:'1002',data:{direction:0}}]:[]}});
        this.emit('spatialedges',{status:{edges:[]}});
        await new Promise(r=>setTimeout(r,150));
        return image;
      }
      resize(){} remove(){this.removed=true;}
    }` }));
  // Avoid requesting any actual OSM tiles for invented test coordinates.
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eeeddf"/></svg>'}));
}
const fixture = (id: string) => ({id:'mock-'+id,name:'Fixture sintético '+id,imageId:id,zone:'Zona simulada, solo prueba',bounds:[0,0,.003,.003],difficulty:'initial',set:'practice',hints:['Pista de prueba'],explanation:'Explicación de prueba',reviewed:true,reviewedAt:'2026-11-12T00:00:00Z',criteria:'Fixture sintético del test, no ubicación real.',pairKey:'',scaleMeters:200});
test('adaptador simulado: eventos, bloqueo y posición actual al confirmar', async ({page}) => {
  await mockedMapillary(page); await page.goto('/');
  await page.evaluate(c => localStorage.setItem('rumbo.v1.catalog',JSON.stringify(c)),{version:1,challenges:['1001','1003','1004'].map(fixture)});
  await page.reload(); await page.getByRole('button',{name:'Comenzar',exact:true}).click();
  await page.getByRole('button',{name:'Lugares reales',exact:true}).click();
  // Make practice order deterministic for this fixture only.
  await page.evaluate(()=>{Math.random=()=>.5;});
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.getByRole('button',{name:'Marcar centro'}).click();
  await expect(page.getByRole('button',{name:'Confirmar ubicación'})).toBeEnabled();
  await page.getByRole('button',{name:'Conexión 1',exact:true}).click();
  await expect(page.getByRole('button',{name:'Espera a que cargue la imagen…'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Confirmar ubicación'})).toBeEnabled();
  await expect(page.getByText('Sin conexiones disponibles.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar ubicación'}).click();
  const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('rumbo.v1.study.records')||'[]'));
  expect(rows[0].imageId).toBe('1002'); expect(rows[0].actual).toEqual({lat:.0018,lng:.002}); expect(rows[0].imageChanges).toBe(1);
  const config=await page.evaluate(()=> (window as unknown as {__viewerOptions:unknown}).__viewerOptions);
  expect(config).toMatchObject({attribution:true,spatial:false,sequence:false,direction:false,keyboard:false,cache:false});
});
test('preparación simulada: token inválido, límite, búsqueda, revisión y exportación', async ({page}) => {
  await mockedMapillary(page);
  let status=401;
  await page.route('https://graph.mapillary.com/images?**', route => route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{data:[{id:'1001',geometry:{coordinates:[.001,.001]},is_pano:true,sequence:'synthetic-test-sequence'}]}:{error:{code:status===401?190:4,message:'Untrusted error body must never appear'}})}));
  await page.goto('/'); await page.getByRole('button',{name:'Catálogo de retos',exact:true}).click();
  await page.getByLabel('Nombre de la zona').fill('Zona de prueba sintética');
  await page.getByLabel('Límites del mapa').fill('0,0,0.003,0.003');
  await page.getByRole('button',{name:'Buscar en Mapillary'}).click();
  await expect(page.getByRole('status')).toContainText('token no es válido');
  status=429; await page.getByRole('button',{name:'Buscar en Mapillary'}).click();
  await expect(page.getByRole('status')).toContainText('límite');
  status=200; await page.getByRole('button',{name:'Buscar en Mapillary'}).click();
  await page.getByRole('button',{name:'Imagen 1',exact:false}).click();
  await page.getByLabel('Nombre del reto').fill('Reto sintético de prueba');
  await page.getByLabel('Criterios de dificultad revisados').fill('Revisión simulada; no es una ubicación real.');
  await page.getByRole('button',{name:'Conexión 1',exact:true}).click();
  await expect(page.getByText('Sin conexiones disponibles.',{exact:false})).toBeVisible();
  await page.getByRole('checkbox',{name:'Revisé la imagen actual',exact:false}).check();
  await page.getByRole('button',{name:'Guardar reto revisado'}).click();
  await expect(page.getByRole('status')).toContainText('Reto guardado');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rumbo.v1.catalog')||'{}'));
  expect(saved.challenges[0].imageId).toBe('1002');
  const file=page.waitForEvent('download'); await page.getByRole('button',{name:'Exportar JSON',exact:true}).click(); expect((await file).suggestedFilename()).toBe('rumbo-catalogo.json');
  await expect(page.locator('body')).not.toContainText('Untrusted error body'); await expect(page.locator('body')).not.toContainText('mock-client-not-real');
});
test('imagen no disponible: reemplazo sin registrar error del jugador', async ({page}) => {
  await mockedMapillary(page); await page.goto('/');
  await page.evaluate(c=>localStorage.setItem('rumbo.v1.catalog',JSON.stringify(c)),{version:1,challenges:['404','1001','1003','1004'].map(fixture)});
  await page.reload(); await page.getByRole('button',{name:'Comenzar',exact:true}).click(); await page.getByRole('button',{name:'Lugares reales',exact:true}).click();
  await page.evaluate(()=>{Math.random=()=>.5;}); await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reiniciar vista'})).toBeVisible();
  await page.getByRole('button',{name:'Usar otro reto'}).click();
  await page.getByRole('button',{name:'Marcar centro'}).click();
  await expect(page.getByRole('button',{name:'Confirmar ubicación'})).toBeEnabled();
  expect(await page.evaluate(()=>localStorage.getItem('rumbo.v1.study.records'))).toBeNull();
  await page.getByRole('button',{name:'Confirmar ubicación'}).click();
  const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('rumbo.v1.study.records')||'[]'));
  expect(rows).toHaveLength(1); expect(rows[0].roundNumber).toBe(1); expect(rows[0].challengeId).toBe('mock-1004');
});
