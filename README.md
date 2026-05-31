# Magic Clicker — Proyecto

Magic Clicker es un juego incremental (clicker) con frontend en Astro y backend en Node/Express (opcional Supabase para persistencia).

Resumen rápido
- Frontend: `src/pages/juego.astro`, `src/pages/login.astro`.
- Backend: `Backend/src/` con endpoints de autenticación y gestión de magias.
- Esquema SQL de magias y rarezas: `Backend/db/schema_magias.sql` (crear tablas `rarezas`, `catalogo_magias`, `magias`).

Instalación y ejecución

1. Instalar dependencias (raíz para frontend):

```bash
npm install
npm run dev
```

2. Backend (carpeta `Backend`):

```bash
cd Backend
npm install
npm run dev
```

Base de datos

En `Backend/db/schema_magias.sql` encontrarás el SQL para crear el catálogo maestro y la tabla de magias de usuarios. Aplica ese archivo en tu base de datos (por ejemplo usando el editor SQL de Supabase) o con `psql`:

```bash
psql $DATABASE_URL -f Backend/db/schema_magias.sql
```

Endpoints importantes (backend)

- `POST /api/auth/register` — crear usuario.
- `POST /api/auth/login` — iniciar sesión (devuelve token).
- `GET  /api/spells/catalog` — obtener catálogo maestro de magias.
- `GET  /api/spells/mine` — obtener magias del usuario (requiere token).
- `POST /api/spells/assign` — asignar una magia del catálogo al usuario (requiere token).
- `POST /api/spells/equip` — equipar/unequipar una magia del usuario (requiere token).
- `POST /api/game/gacha` — tirar gacha (consume clicks y crea magia para usuario).

Notas de implementación

- El catálogo maestro contiene 4 magias (ids 1..4) con rarezas `Comun`, `Raro`, `Epico`, `Legendario`.
- En el frontend actualmente hay persistencia local (`localStorage`) para pruebas; se puede adaptar para usar los endpoints del backend.
- Recomendación: después de aplicar el SQL, probar las rutas `GET /api/spells/catalog` y `POST /api/spells/assign` usando un token válido.

Contribuir

- Si querés que integre el frontend con los endpoints para persistir las magias del usuario en la DB, lo implemento y pruebo.

---
Plantilla original y créditos: esta base empezó desde una plantilla de Astro.
