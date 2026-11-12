# Rumbo · Orientación espacial

Aplicación educativa en español para relacionar una vista de calle con un mapa visto desde arriba. Proyecto de Fundamentos de Investigación, construido con **React, TypeScript, Vite, MapillaryJS y Leaflet**. Sesiones de tres rondas, sin límite de tiempo, con resultados y exportaciones locales.

No es una prueba psicológica validada. No mide inteligencia ni se afirma que su eficacia esté demostrada.

## Ejecutar en esta carpeta

Requiere Node.js 22.12 o posterior compatible con Vite. Se verificó con Node.js 26.13.0 y Microsoft Edge en Windows.

```powershell
npm.cmd install
npm.cmd run dev
```

Abre la dirección que imprime Vite, normalmente `http://127.0.0.1:5173`. En PowerShell se usa `npm.cmd` para evitar el bloqueo de `npm.ps1` por la política de ejecución. En otros entornos puedes usar `npm`.

Sin token puedes completar una **demostración de tres rondas** desde el inicio. Sus vistas, plano, identificadores y coordenadas son sintéticos. Las tres dificultades solo ilustran la interfaz en la demo; no están calibradas como estímulos de investigación.

## Token de cliente de Mapillary

1. Obtén un **client access token destinado al navegador** registrando tu aplicación en el [portal oficial de Mapillary](https://www.mapillary.com/dashboard/developers).
2. Copia `.env.example` como `.env` en la raíz del proyecto.
3. Edita el archivo localmente:

```dotenv
VITE_MAPILLARY_ACCESS_TOKEN=TU_TOKEN_DE_CLIENTE
```

4. Detén y reinicia Vite. Si vas a distribuir `dist`, vuelve a compilar después de cambiar el token.

**No compartas tu token en una conversación.** `.env` y sus variantes están en `.gitignore`. No se incluyen credenciales en este repositorio.

Las variables `VITE_*` se incorporan al JavaScript y **quedan visibles en el cliente**. No deben contener secretos, contraseñas ni tokens privados/de usuario. El token público de cliente es inspeccionable en las herramientas del navegador. La aplicación no lo guarda en los resultados ni lo imprime en mensajes o registros propios. Las búsquedas usan el encabezado `Authorization`, no una URL con el token. [Documentación oficial de variables de Vite](https://vite.dev/guide/env-and-mode).

## Preparar ubicaciones reales

El catálogo inicial está vacío de forma intencional. **No se inventan IDs, coordenadas de retos reales ni cobertura.** `public/catalog.empty.json` es un contenedor válido vacío.

En **Catálogo de retos**:

1. Escribe una zona y sus límites verificados, en orden **oeste, sur, este, norte**, con grados decimales WGS84 separados por comas. No se admiten zonas que crucen el antimeridiano. Para la búsqueda, divide áreas mayores de 0.01 grados cuadrados en consultas pequeñas.
2. Busca imágenes. Se solicitan hasta 30 metadatos por acción; por defecto se filtran panoramas 360°. Si no hay resultados, desmarca ese filtro o cambia la zona. Se priorizan panoramas y resultados con secuencia; una secuencia no demuestra por sí sola que existan conexiones navegables.
3. Selecciona una imagen y previsualízala con MapillaryJS. Recorre sus conexiones. Verifica cobertura, visibilidad, límites y referencias. Al guardar se utiliza la **imagen actual de la vista previa**, no necesariamente la primera seleccionada.
4. Completa el nombre, dificultad, conjunto, escala de puntos, criterios observados y, si procede, pistas y explicación. Marca la revisión solo después de comprobarlos. No escribas afirmaciones visuales que no hayas verificado.
5. Guarda el reto. Puedes editarlo y volver a verificarlo desde la lista, o eliminarlo. Exporta el catálogo JSON para respaldarlo o compartirlo. Importar agrega retos; rechaza IDs o imágenes repetidos, límites inválidos, demos y retos sin revisión declarada. La validación estructural no sustituye la revisión humana ni verifica por sí sola la cobertura.

No uses la pantalla de preparación durante una evaluación: muestra información del catálogo. Esta aplicación local no incorpora roles ni autenticación de investigador.

### Estructura del catálogo

```text
{ version: 1, challenges: Challenge[] }
```

Cada reto tiene `id`, `name`, `imageId`, `zone`, `bounds`, `difficulty`, `set`, `hints`, `explanation`, `reviewed`, `reviewedAt`, `criteria`, `pairKey` y `scaleMeters`. Consulta el contrato en `src/types.ts`. El conjunto es `practice`, `pre` o `post`. La dificultad es `initial`, `intermediate` o `advanced`. Exporta un reto preparado desde la interfaz para obtener un ejemplo con datos realmente verificados.

### Dificultad y conjuntos comparables

| Dificultad | Criterio a revisar | Ayudas en práctica |
| --- | --- | --- |
| Inicial | Zona pequeña, referencias distintivas, relaciones calle–mapa claras | Pistas revisadas opcionales |
| Intermedia | Zona más amplia, más relaciones y menos referencias evidentes | Solo las pistas limitadas que prepare el investigador |
| Avanzada | Entorno espacial más complejo: cruces, curvas o similitud entre calles verificados | Sin pistas |

El tamaño por sí solo no asigna dificultad. Registra tu justificación en `criteria`. Los umbrales y la cantidad de pistas de cada catálogo deben acordarse antes de aplicar el estudio; la app no asigna una etiqueta a una ubicación aleatoria.

Para habilitar las evaluaciones, prepara **al menos tres parejas** para la misma dificultad, con una imagen diferente en cada conjunto. Usa la misma `pairKey` en cada pareja (p. ej., `par-01`) y la misma escala de puntos. La app comprueba número de retos, unicidad de parejas, dificultad y relación de diagonales de zona entre 0.8 y 1.25. Ordena por clave y utiliza las primeras tres parejas, de modo que ambas evaluaciones tienen un orden determinista.

La comparabilidad espacial/visual necesita tu revisión: confirma referencias, complejidad, calidad, cobertura y ausencia de recorridos solapados entre conjuntos. Mantén instrucciones, dispositivo y condiciones equivalentes. Las dos evaluaciones desactivan las pistas. En práctica se seleccionan tres retos distintos del conjunto; continuar crea otra sesión y puede repetir lugares, por lo que conviene registrar/examinar exposición previa.

## Qué ocurre en una ronda

- El mapa parte de los límites predefinidos del reto y no sigue al visor ni señala la posición real.
- El jugador explora las conexiones que proporciona MapillaryJS y coloca una respuesta con clic/toque. Como alternativa de teclado, puede desplazar el mapa con flechas y usar **Marcar centro**.
- `StreetViewer` escucha los eventos documentados **`image`** y **`dataloading`**. Toma `image.lngLat`, que devuelve la posición calculada cuando existe, o la posición EXIF.
- `PositionTracker` impone un bloqueo **sincrónico** antes de cada `moveTo`. Solo permite confirmar después de resolver la navegación y terminar la carga. No depende de que React haya actualizado el botón. Una respuesta confirmada queda congelada y rechaza un segundo envío.
- Se usa `TransitionMode.Instantaneous` para evitar estados visuales interpolados. Las conexiones se reciben por `sequenceedges` y `spatialedges`; los botones propios controlan la navegación. `direction`, `sequence` y `keyboard` nativos están desactivados para que no exista otra vía de navegación fuera del bloqueo.
- `spatial`, `marker` y `popup` se desactivan; `attribution` permanece activo. No se muestra un mapa de localización de Mapillary ni coordenadas en la partida. La brújula y la interacción de mirada permanecen disponibles. Las atribuciones y enlaces oficiales se conservan.
- Al confirmar, se comparan la respuesta y la **imagen actual**, se muestran ambos puntos unidos, error en metros, tiempo y puntos secundarios. Una posición fuera de los límites bloquea la respuesta y permite reiniciar.
- El cronómetro comienza con la primera imagen lista y después incluye el tiempo de exploración y las cargas posteriores. No termina la ronda automáticamente. Los cambios cuentan IDs de imagen distintos, sin contar eventos duplicados ni la carga inicial.

El estado de visor y marcador se conserva al alternar **Explorar / Mapa** en móvil. Se reajustan ambos componentes cuando cambia su tamaño.

**Limitación inherente:** una aplicación ejecutada en el navegador no puede impedir totalmente la inspección de coordenadas, las peticiones del SDK, los datos locales o los enlaces de atribución. No es un sistema antitrampas. [Opciones de componentes](https://mapillary.github.io/mapillary-js/api/interfaces/viewer.ComponentOptions/), [eventos de carga](https://mapillary.github.io/mapillary-js/api/interfaces/viewer.ViewerDataLoadingEvent/), [posición de Image](https://mapillary.github.io/mapillary-js/api/classes/viewer.Image/).

## Distancia y puntuación

Distancia geográfica Haversine sobre una esfera con radio medio **6 371 008.8 m**. Mide separación directa, no distancia caminable. El error se almacena sin redondear; la interfaz lo redondea a metros.

```text
puntos = redondear(1000 × exp(−error_en_metros / escala_en_metros))
```

La escala es configurable por reto (`scaleMeters`, 200 m en la demo). Coincidencia exacta: 1000 puntos; error igual a la escala: 368 puntos. Ni rapidez ni pistas cambian los puntos. **No se comparan directamente puntos entre zonas o dificultades diferentes.** La medida principal es el error en metros, interpretado junto al contexto.

El resumen presenta error medio de rondas completadas, tiempo y puntos. El historial no calcula una mejora ni un nivel de inteligencia. Si analizas exportaciones, usa diferencias descriptivas, revisa abandonos/familiaridad/exposición y datos faltantes; una diferencia por sí sola no demuestra un efecto causal de esta aplicación.

## Historial, almacenamiento y exportaciones

Todo el registro del proyecto queda en `localStorage` del navegador y origen actuales. No hay backend ni sincronización. Usa alias seudónimos; evita nombres completos y datos personales innecesarios. Las peticiones a Mapillary y OpenStreetMap sí transmiten los datos de conexión habituales a esos proveedores; no se envían alias ni resultados a ellos. Google Fonts proporciona las tipografías, con fuentes del sistema como alternativa.

Claves principales:

- `rumbo.v1.alias`: último alias.
- `rumbo.v1.catalog`: catálogo real configurado.
- `rumbo.v1.study.records`: registros de lugares reales.
- `rumbo.v1.demo.records`: registros sintéticos separados.
- `rumbo.v1.activeRound`: borrador de la ronda activa; se actualiza cada cinco segundos y ante cambios relevantes. Si se recarga o cierra, se recupera como abandonada, sin puntos, al siguiente inicio. Un cierre abrupto puede perder los últimos segundos.

Se registra: alias; IDs de sesión/ronda/reto; número de ronda; fecha ISO; origen; modo y dificultad; zona; imagen y coordenadas actuales; respuesta; error; duración; puntos y escala; pistas usadas; cambios de imagen; familiaridad (`yes`, `no`, `unsure`); estado (`completed`, `abandoned`); clave de pareja. En rondas abandonadas, imagen/posición son las últimas conocidas, no una confirmación. Error y puntos permanecen nulos.

**Mi historial** permite filtrar por alias y elegir **Datos del estudio / Demostración**. CSV y JSON exportan solo el origen y filtro seleccionados. CSV incluye UTF-8 con BOM, comillas escapadas, campos con saltos de línea y protección frente a fórmulas de hoja de cálculo. Coordenadas y listas se guardan como JSON dentro de su celda CSV.

Los registros se identifican por `roundId` para evitar duplicados al recuperarlos. No hay copia remota. Cambiar de puerto/navegador/dispositivo o borrar sus datos cambia o elimina el almacenamiento. La navegación privada puede impedir persistencia. Si se agota el espacio, se muestra un aviso; en el resultado de ronda se ofrece descargar un respaldo del registro. Exporta regularmente antes de cerrar o borrar datos.

## Fallos y uso de servicios

- Sin token: instrucciones de `.env` y reinicio; demo disponible.
- Búsqueda: mensajes específicos para autorización, límite del servicio, consulta/imagen ausente y red. Se interpretan códigos, nunca se imprime el cuerpo de error remoto o el token.
- Visor: errores de WebGL, red, token, imagen o tiempo de espera (25 segundos) bloquean confirmar y ofrecen reiniciar. El SDK no siempre permite distinguir de forma fiable su causa; el mensaje del visor enumera las comprobaciones pertinentes.
- Si un reto deja de estar disponible, **Usar otro reto** busca uno revisado del mismo modo y dificultad, fuera de los ya usados/fallidos. Mantiene el número de ronda y no genera puntuación ni un error del jugador. Sin reservas, indica que se prepare otra ubicación; se puede salir sin registrar un abandono atribuible al participante. En evaluación, revisar cualquier sustitución antes de comparar conjuntos.
- Una imagen sin salidas permite responder desde ella; la app no promete recorridos continuos. Las conexiones pueden terminar o salir del área y la cobertura puede cambiar.
- Si falla una tesela OSM, se muestra un aviso. Evita responder sobre un mapa incompleto; puedes salir y volver a intentarlo.

No se descargan imágenes masivamente, no se genera un archivo de imágenes y no se precargan mapas para uso sin conexión. `cache:false` desactiva la precarga opcional del visor; las cargas necesarias del SDK se realizan al explorar. Leaflet solicita teselas visibles de `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, conserva las atribuciones y usa el caché HTTP normal. La demo utiliza un SVG local y **no solicita teselas OSM**. No hay Google Maps ni servicios que requieran cuenta de facturación.

Respeta las [condiciones de Mapillary](https://www.mapillary.com/terms), [atribución de OpenStreetMap](https://www.openstreetmap.org/copyright) y [política oficial de teselas](https://operations.osmfoundation.org/policies/tiles/). La disponibilidad es externa; un despliegue de mucho tráfico requiere evaluar un proveedor adecuado. Las condiciones/API de Mapillary pueden requerir iniciar sesión para consultarlas.

## Compilar y probar

```powershell
npm.cmd run build
npm.cmd run preview
npm.cmd test
npm.cmd run test:e2e
```

`dist/` contiene la compilación estática. MapillaryJS se carga dinámicamente al abrir un visor real; su tamaño provoca un aviso de bundle grande de Vite, no un error de compilación.

Las pruebas de navegador usan Microsoft Edge instalado (`channel: 'msedge'` en `playwright.config.ts`). En otro equipo puedes instalar Chromium con `npx playwright install chromium` y quitar esa opción. El servidor de pruebas se inicia automáticamente. Ejecuta las pruebas sin un token real en `.env`; los casos de integración simulan un token exclusivamente dentro del navegador de prueba.

### Verificación realizada

- Compilación de producción y comprobación estricta de TypeScript.
- 25 pruebas unitarias: Haversine, antimeridiano/antípodas, puntos, posición actual, cargas en diferente orden, confirmación única, fallos, validación de catálogo, parejas comparables, CSV, aislamiento y errores de almacenamiento.
- Flujos en navegador: tres rondas de demo, confirmación, posición tras navegar, pistas/familiaridad, resumen, historial, JSON/CSV, abandono móvil, conservación del marcador, ausencia de desbordamiento horizontal e instrucciones sin token.
- Adaptador de Mapillary **simulado**: orden de eventos y `moveTo`, configuración de atribución, búsqueda/preparación/exportación, códigos 401/429, secuencia sin salidas, imagen no disponible y reemplazo sin penalización.
- Inspección visual de inicio, juego y resultado en escritorio y móvil; capturas locales en `.qa/` después de las pruebas.

### Pendiente de verificar con tu token real

**No se probó la integración de Mapillary contra imágenes reales.** Los mocks verifican el comportamiento de la aplicación, no la autenticación, cobertura, permisos, rendimiento ni disponibilidad efectiva del servicio.

Después de configurar el token, comprueba con una zona de tu elección:

1. Autenticación y respuesta actual de Graph API a `bbox`, `fields`, `limit` e `is_pano`.
2. Renderizado WebGL de una imagen y un panorama reales, las atribuciones, conexiones espaciales/de secuencia y carga de una segunda imagen.
3. Que al confirmar después de navegar el ID y coordenadas exportados coinciden con la imagen actual; que confirmar permanece deshabilitado durante la carga.
4. Las teselas reales de OSM, selección de respuesta y resultado con ambos puntos, además del uso desde un teléfono real. Las pruebas automatizadas del adaptador interceptan las teselas para no solicitar mapas sobre coordenadas ficticias.
5. Calidad y dificultad del catálogo, referencias/pistas, límites de recorrido y equivalencia de parejas antes de recopilar datos de investigación.

La documentación de MapillaryJS, Leaflet y Vite se consultó antes de integrar. El portal de Graph API/condiciones devolvió una pantalla de inicio de sesión; el contrato se contrastó con los tipos/código oficiales instalados y el [ejemplo oficial de API de Mapillary](https://github.com/mapillary/api-demo). Referencias adicionales: [Viewer](https://mapillary.github.io/mapillary-js/api/classes/viewer.Viewer/), [Graph API](https://www.mapillary.com/developer/api-documentation/), [Leaflet estable 1.9.4](https://leafletjs.com/reference-1.9.4.html).

## Organización

```text
src/
  App.tsx                 Navegación, inicio y configuración de sesión
  types.ts                Contratos de datos
  components/
    AnswerMap.tsx         Leaflet, respuesta y revelación del resultado
    StreetViewer.tsx      MapillaryJS, conexiones y demo ilustrada
    Game.tsx              Ronda, temporizador, resultado y resumen
    CatalogEditor.tsx     Preparación y gestión de retos
    History.tsx           Historial y exportación
    Illustrations.tsx     Ilustraciones sintéticas, sin imágenes de terceros
  data/demo.ts            Retos y posiciones sintéticos
  lib/                    Geodesia, bloqueo, almacenamiento, API y validación
tests/                    Recorridos Playwright y servicio simulado
public/                   Favicon, plano sintético y catálogo vacío
```

Decisiones: proyecto local sin publicación automática; rutas de pantalla en memoria; sesión nueva al continuar; catálogo revisado en vez de ubicaciones aleatorias no verificadas; sin geolocalización del dispositivo; sin análisis de mejora automatizado; JSON versionado para respaldos y revisión del catálogo.
