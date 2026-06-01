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




