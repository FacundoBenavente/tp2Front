Descripción:

Magic Clicker es un juego clicker de temática mágica.

Deploy: https://tp2-front-psi.vercel.app/
Estructura:

- Frontend (raíz del repo): sitio Astro. Páginas del juego en src/pages/juego.astro y src/pages/login.astro.
- Backend: autenticaicón del usuario

Instalación y ejecución:

Frontend (desde la raíz):


npm install
npm run dev       


Backend (desde Backend/):


cd Backend
npm install
npm run dev      

El backend escucha en http://localhost:3000 por defecto.

Variables de entorno (Backend/.env)


SUPABASE_URL=...        # URL del proyecto de Supabase
SUPABASE_ANON_KEY=...   # anon key del proyecto
JWT_SECRET=...          # secreto para firmar los 
PORT=3000              # opcional
```
## Flujo de trabajo (Git)

- **Issues**: toda funcionalidad, mejora o bug se trackea en un issue antes de empezar a trabajar.
- **Branch naming**: `feature/nombre-feature` para funcionalidades nuevas, `fix/nombre-bug` para arreglos. Ejemplo: `feature/gacha-invocar`, `fix/login-validacion-mail`.
- **Pull Requests**: ningún cambio se mergea directo a `main`. Todo PR referencia el issue que resuelve (`closes #12`) y necesita al menos una revisión aprobada del otro integrante antes de mergear.

## Testing

- **Unitarios** (Vitest): `npm run test` en la raíz (frontend) y dentro de `Backend/` para la lógica del gacha.
- **E2E** (Playwright): `npm run test:e2e` — cubre el flujo de login (validaciones, error de credenciales, login exitoso → `/juego`).
- **Lint**: `npm run lint` (usa `astro check` para chequeo de tipos y errores en las páginas `.astro`).

Más detalle de las decisiones de calidad en [`CALIDAD.md`](./CALIDAD.md).

## CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) corre en cada push/PR a `main`:

`lint` → `unit-tests` → `build` → `e2e-tests` → `deploy` (solo en push a `main`, y solo si todos los pasos anteriores pasaron).

**Producción**: https://tp2-front-psi.vercel.app/






