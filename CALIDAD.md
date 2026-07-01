# CALIDAD.md — Magic Clicker

> Nota para el equipo: este documento tiene el esqueleto y el razonamiento técnico
> completo, pero las secciones marcadas con **[COMPLETAR EN EQUIPO]** necesitan
> la reflexión propia de ustedes para poder defenderlas en persona. No lo
> entreguen sin revisar y personalizar esas partes.

## 1. Estrategia general

Magic Clicker tiene dos partes con riesgos distintos: un **backend** (Express +
Supabase) que maneja autenticación y la economía del juego (clicks, gacha), y
un **frontend** (Astro, HTML/JS vanilla) que renderiza la UI y habla con ese
backend por fetch.

El enfoque que elegimos fue **separar la lógica de negocio de la
infraestructura** antes de testear. Por ejemplo, la función que decide qué
magia te toca en el gacha (`elegirPorRareza` / `elegirDropPorProbabilidad`)
vivía mezclada adentro del handler de Express, acoplada a Supabase y al
`Math.random()` global. La extrajimos a `Backend/src/lib/gacha.js` como
funciones puras (reciben datos, devuelven datos, sin I/O), y lo mismo hicimos
en el frontend con `src/utils/game.js` (multiplicador total, si se puede
invocar, si el usuario está logueado).

¿Por qué este enfoque y no otro? Porque testear a través de Supabase real (o
mockeándolo pesadamente) es lento, frágil, y no prueba la lógica que
realmente nos importa: la probabilidad del gacha, el cálculo del
multiplicador. Separando lo puro de lo que tiene efectos secundarios, los
tests unitarios corren en milisegundos, sin red, sin base de datos, y sin
falsos negativos por timeouts.

Para lo que sí depende de la interfaz completa (login, ver el clicker,
invocar), usamos un test E2E con el navegador real, pero **mockeando las
respuestas del backend** en vez de depender de Supabase estar arriba durante
el CI. Esto nos da un pipeline determinístico: no depende de que haya datos
de prueba cargados en una base real, ni de la disponibilidad de un servicio
externo durante cada corrida de GitHub Actions.

## 2. Herramientas seleccionadas

| Necesidad         | Elegimos            | Por qué                                                                                                   |
|--------------------|----------------------|-------------------------------------------------------------------------------------------------------------|
| Tests unitarios     | **Vitest**           | Config mínima, corre nativo con ESM (el proyecto usa `"type": "module"` en ambos `package.json`), rápido, y comparte sintaxis (`describe`/`it`/`expect`) con Jest si alguna vez migramos. |
| Tests E2E           | **Playwright**       | Levanta el `preview` de Astro solo (`webServer` en la config), soporta interceptar requests de red (`page.route`) para mockear el backend sin tocar Supabase, y corre bien en CI headless. |
| Lint / typecheck    | **`astro check`**    | El proyecto no usa un framework de componentes (React/Vue), así que un ESLint genérico agregaba poco valor frente al chequeo nativo de Astro, que valida tipos y errores de sintaxis en los `.astro`, `.ts` y `.astro.config`. |
| CI/CD               | **GitHub Actions**   | Ya está integrado al repo, tiene soporte directo para levantar Node, cachear `npm`, y correr Playwright con navegadores. |
| Deploy              | **Vercel**           | Es donde ya estaba desplegado el proyecto desde el TP2 (`https://tp2-front-psi.vercel.app/`), soporta deploy por CLI/Action desde Actions. |

**Alternativas que evaluamos y descartamos:**
- **Jest** en vez de Vitest: descartado porque requiere más configuración
  extra para ESM puro, y Vitest ya viene pensado para proyectos con Vite
  (que Astro usa por debajo).
- **Cypress** en vez de Playwright: descartado por ser más pesado de correr
  en CI (browser embebido propio) y porque Playwright tiene mejor soporte
  nativo para levantar el servidor de preview automáticamente.

## 3. Tests desarrollados

### Unitarios — Backend (`Backend/tests/gacha.test.js`)
- `elegirDropPorProbabilidad`: valida que un `rand` bajo caiga en la rareza
  "común" (60% de probabilidad), que un valor intermedio caiga en "rara", y
  que valores cercanos a 1 caigan en "legendaria" — es decir, que los rangos
  acumulados de probabilidad estén bien calculados.
- `elegirPorRareza`: valida que devuelva `null` si no hay catálogo
  disponible (caso borde real: usuario que ya tiene todas las magias), y que
  la magia elegida siempre pertenezca al catálogo recibido (no puede
  "inventar" una magia inexistente).
- `calcularMultiplicadorTotal`: valida que un usuario sin magias tenga
  multiplicador 1x (caso base del juego), que multiplique correctamente
  varias magias entre sí, y que un valor corrupto (`multiplicador: 'NaN'`)
  no rompa el cálculo silenciosamente.

### Unitarios — Frontend (`tests/unit/game.test.js`)
- `getTotalMultiplier`: espejo de la lógica anterior pero del lado del
  cliente (se usa para actualizar el label del multiplicador en tiempo
  real sin esperar al backend).
- `puedeInvocar`: valida el límite exacto (100 clicks alcanza, 99 no) — es
  la condición que habilita o deshabilita el botón de invocar.
- `isLoggedIn`: valida que el chequeo de sesión (usado para redirigir a
  `/login` si el usuario no está autenticado) dependa solo del storage
  inyectado, sin acoplarse al DOM real.

### E2E (`tests/e2e/login.spec.ts`)
- **"muestra errores de validación si el formulario está vacío"**: cubre
  que un usuario sin datos completos nunca llega al backend con un
  formulario vacío — la validación del lado del cliente lo frena antes.
- **"muestra un error del servidor si las credenciales son inválidas"**:
  cubre el camino de error real (401 del backend) y que el mensaje se
  muestre en pantalla, no solo en consola.
- **"login exitoso redirige a /juego y muestra el clicker"**: el flujo
  principal de la aplicación — un usuario ingresa credenciales válidas, es
  redirigido a `/juego`, y ve reflejado su multiplicador según las magias
  que ya tenía guardadas.

## 4. Casos de uso críticos

**[COMPLETAR EN EQUIPO]** — pero como punto de partida, priorizamos:

1. **Login/autenticación**: es el punto de entrada a todo lo demás; si se
   rompe, nadie puede jugar. Por eso tiene el único test E2E completo.
2. **Cálculo del multiplicador**: es la métrica central del juego (define
   cuánto vale cada click); un error acá afecta la progresión de todos los
   usuarios silenciosamente, sin lanzar ningún error visible.
3. **Probabilidades del gacha**: si los rangos de probabilidad estuvieran
   mal calculados, se rompería el balance económico del juego (por ejemplo,
   dar legendarias con más frecuencia de la pensada), y es un bug que no se
   nota a simple vista jugando unas pocas veces — solo con tests que fuercen
   los valores límite de cada rango se puede detectar con confianza.

_(Agregar acá si consideraron algún otro flujo prioritario y por qué, o si
descartaron testear algo a propósito.)_

## 5. Pipeline de CI/CD

El workflow (`.github/workflows/ci.yml`) tiene 5 jobs encadenados con `needs`:

```
lint → unit-tests → build → e2e-tests → deploy
```

- **`lint`**: corre `astro check` primero, porque es el chequeo más rápido
  y barato — no tiene sentido correr tests contra código que ni siquiera
  tipa bien.
- **`unit-tests`**: instala dependencias del frontend y del backend por
  separado (son dos `package.json` independientes) y corre Vitest en
  ambos.
- **`build`**: corre `astro build` y sube el resultado como artifact. Si el
  build falla, el pipeline corta ahí — no tiene sentido invertir tiempo en
  levantar navegadores para E2E sobre un build roto.
- **`e2e-tests`**: instala los navegadores de Playwright (`--with-deps
  chromium`, para minimizar el tiempo de instalación en CI) y corre los
  tests E2E contra el build de producción (`astro preview`), no contra el
  modo dev.
- **`deploy`**: solo corre si **todos** los jobs anteriores (`lint`,
  `unit-tests`, `build`, `e2e-tests`) pasaron, y solo en push directo a
  `main` (no en PRs, para no hacer deploy de código todavía no revisado).
  Usa los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`
  configurados en el repo.

**Decisión de diseño clave**: si el lint falla, ni siquiera se instalan
las dependencias del backend ni se descargan navegadores — cortamos lo antes
posible para no desperdiciar minutos de CI en código que ya sabemos que
tiene un problema básico.

## 6. Limitaciones y deuda técnica

**[COMPLETAR EN EQUIPO]** — puntos de partida honestos:

- El test E2E mockea el backend por completo; no hay ningún test que corra
  contra un backend real (ni siquiera uno local con una base de datos de
  test). Esto significa que un bug en la integración real backend↔Supabase
  no lo detectaría este pipeline.
- La cobertura de tests unitarios se concentra en la lógica del gacha y el
  multiplicador; no hay tests para las rutas de auth (`register`, `login`)
  del backend ni para el manejo de tokens JWT.
- El `authMiddleware` del backend, el manejo de errores de Supabase, y la
  UI de `juego.astro` en sí (renderizado de las cartas de magia, el modal)
  no tienen tests automáticos — se probaron manualmente.
- _(Agregar acá qué sabían que era frágil y decidieron aceptar como riesgo
  consciente por el tiempo del TP.)_

## 7. Opcionales

**[COMPLETAR EN EQUIPO si implementaron alguno]**:
- [ ] Sentry / error monitoring
- [ ] Cobertura >60% con `vitest --coverage`
- [ ] Uso de agente de IA para generar tests (documentar qué generó, qué
      modificaron y por qué)
- [ ] GitHub Projects / kanban
