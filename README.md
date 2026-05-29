# Chess Rekognition — Frontend (`app`)

Aplicación Web de Chess Rekognition construida con **React 19**, **Vite 7** y **Tailwind CSS 4**.  
Desplegada en producción en **Vercel**: [chess-rekognition-app.vercel.app](https://chess-rekognition-app.vercel.app/)

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19, React DOM 19 |
| Routing | React Router DOM 7 (protegido por auth guards) |
| Estilos | Tailwind CSS 4 (vía `@theme` en `index.css`), Framer Motion 12 |
| Iconos | Lucide React 0.577 |
| Ajedrez | chess.js 1.4 (motor lógico), react-chessboard 5.10 (tablero visual) |
| Build | Vite 7 + `@vitejs/plugin-react` + `@tailwindcss/vite` |
| Lint | ESLint 9 con plugins React Hooks y React Refresh |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en `localhost:5173` con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualización del build de producción |
| `npm run lint` | Análisis ESLint del código |

## Variables de entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `VITE_API_URL` | `https://chess-rekognition-api-production.up.railway.app` | URL base de la API |

## Estructura

```
app/
├── public/
│   ├── fonts/              # Figurine (fuente de ajedrez) FIG-TB-1
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── components/
│   │   ├── chess/          # ChessBoard (interactivo), ChessViewer (reproductor PGN)
│   │   ├── layout/         # AppLayout, AuthLayout, Header
│   │   └── ui/             # Button, InputText, InputPassword, InputEmail,
│   │                         InputSelect, InputDate, Textarea, Modal, TypewriterText
│   ├── context/
│   │   └── AuthContext.jsx # Sesión JWT, login/register/logout, authFetch con auto-refresh
│   ├── hooks/
│   │   └── useAuth.js      # Hook de acceso al contexto de autenticación
│   ├── pages/
│   │   ├── auth/           # LoginPage, RegisterPage
│   │   ├── dashboard/      # DashboardPage
│   │   ├── games/          # IntroducirPartidaPage, ListadoPartidasPage,
│   │   │                     RetransmisionPage, StockfishPage
│   │   └── public/         # RetransmisionPublicaPage, NotFoundPage
│   ├── router/
│   │   └── AppRouter.jsx   # Árbol de rutas con guards público/privado
│   ├── utils/
│   │   └── pgnUtils.js     # generateFullPgn, parsePgn, downloadPgn
│   ├── App.jsx
│   ├── index.css           # Tema Tailwind v4 (@theme), font-face, estilos base
│   └── main.jsx            # Entry point (createRoot)
├── .env
├── eslint.config.js
├── index.html
├── jsconfig.json           # Alias @ → src/
├── vercel.json             # Rewrites SPA para Vercel
├── vite.config.js
└── package.json
```

## Enrutamiento

| Ruta | Página | Acceso |
|------|--------|--------|
| `/login` | LoginPage | Público (redirige a dashboard si autenticado) |
| `/register` | RegisterPage | Público (redirige a dashboard si autenticado) |
| `/dashboard` | DashboardPage | Privado |
| `/games/input` | IntroducirPartidaPage | Privado |
| `/games` | ListadoPartidasPage | Privado |
| `/games/live` | RetransmisionPage | Privado |
| `/stockfish` | StockfishPage | Privado |
| `/retransmision/:token` | RetransmisionPublicaPage | Público total |
| `*` | NotFoundPage | Público total |

## Páginas

- **LoginPage** — formulario de inicio de sesión con credenciales de demostración
- **RegisterPage** — registro de nuevo usuario (nombre, apellidos, username, email, password)
- **DashboardPage** — menú principal con accesos a las funcionalidades
- **IntroducirPartidaPage** — entrada manual de partidas con tablero interactivo, formulario de metadatos y guardado vía API
- **ListadoPartidasPage** — listado de partidas del usuario con visor PGN, reproducción y descarga
- **RetransmisionPage** — retransmisión en vivo: captura de cámara, reconocimiento por visión, WebSocket host, tablero mínimo, modal de compartir
- **StockfishPage** — juego contra Stockfish: configuración de color y nivel ELO (1350–3100), board interactivo, abandono/tablas, descarga PGN
- **RetransmisionPublicaPage** — visor público de retransmisión vía WebSocket usando token de la URL
- **NotFoundPage** — página 404 con redirección contextual

## Flujo de autenticación

- Sesión gestionada por `AuthContext` (Context API)
- Tokens JWT almacenados en `localStorage` como `cr_token` (access, 30 min) y `cr_refresh_token` (refresh, 7 días)
- `authFetch` envuelve `fetch` añadiendo automáticamente el Bearer token y refrescándolo si el servidor responde 401
- Rehidratación de sesión al recargar la página

## Convenciones

- Tipo de partida: `PI` (manual), `PR` (retransmisión)
- Clases de clasificación: `empty`, `w_P`, `b_N`, etc.
- Tablero rectificado siempre a 400×400 px (50×50 por casilla)

## Despliegue

El proyecto se despliega en **Vercel**. Incluye `vercel.json` con reglas de rewrite para SPA:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

La variable `VITE_API_URL` debe configurarse como variable de entorno en Vercel apuntando a la API de producción en Railway.
