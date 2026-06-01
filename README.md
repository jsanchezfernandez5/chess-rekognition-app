# Chess Rekognition — Frontend (`app`)

Aplicación Web de Chess Rekognition construida con **React 19**, **Vite 7** y **Tailwind CSS 4**.  
Desplegada en producción en **Vercel**: [chess-rekognition-app.vercel.app](https://chess-rekognition-app.vercel.app/)

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19, React DOM 19 |
| Routing | React Router DOM 7 |
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
│   ├── fonts/              # Figurine (fuente de ajedrez) para el PGN
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── components/
│   │   ├── chess/          # ChessBoard (interactivo), ChessViewer (reproductor PGN)
│   │   ├── layout/         # AppLayout, AuthLayout, Header
│   │   └── ui/             # Button, InputText, InputPassword, InputEmail, InputSelect, InputDate, Textarea, Modal, TypewriterText
│   ├── context/
│   │   └── AuthContext.jsx # Sesión JWT, login/register/logout, authFetch con auto-refresh
│   ├── hooks/
│   │   └── useAuth.js      # Hook de acceso al contexto de autenticación
│   ├── pages/
│   │   ├── auth/           # LoginPage, RegisterPage
│   │   ├── dashboard/      # DashboardPage
│   │   ├── games/          # IntroducirPartidaPage, ListadoPartidasPage, RetransmisionPage, StockfishPage
│   │   └── public/         # RetransmisionPublicaPage, NotFoundPage
│   ├── router/
│   │   └── AppRouter.jsx   # Árbol de rutas Privado/Público
│   ├── utils/
│   │   └── pgnUtils.js     # generateFullPgn, parsePgn, downloadPgn
│   ├── App.jsx
│   ├── index.css           # Tema Tailwind v4 (@theme), font-face, estilos base
│   └── main.jsx            # Entry point (createRoot)
├── .env
├── eslint.config.js
├── index.html
├── jsconfig.json           
├── vercel.json             # Vercel
├── vite.config.js
└── package.json
```

## Enrutamiento

| Ruta | Página | Acceso |
|------|--------|--------|
| `/login` | LoginPage | Público |
| `/register` | RegisterPage | Público |
| `/dashboard` | DashboardPage | Privado |
| `/games/input` | IntroducirPartidaPage | Privado |
| `/games` | ListadoPartidasPage | Privado |
| `/games/live` | RetransmisionPage | Privado |
| `/stockfish` | StockfishPage | Privado |
| `/retransmision/:token` | RetransmisionPublicaPage | Público |
| `*` | NotFoundPage | Público |

## Páginas

- **LoginPage**: Formulario de inicio de sesión.
- **RegisterPage**: Registro de nuevo usuario y envío de email de confirmación con Resend.
- **DashboardPage**: Menú principal con accesos a las funcionalidades.
- **IntroducirPartidaPage**: Entrada manual de partidas con tablero interactivo.
- **ListadoPartidasPage**: Listado de partidas del usuario con visor PGN y descarga.
- **StockfishPage**: Jugar contra Stockfish con configuración de color y nivel ELO (1350–3100).
- **RetransmisionPage**: Retransmisión en vivo: captura de cámara, reconocimiento por visión IA, WebSocket host, tablero en consola y compartir retransmisión al público.
- **RetransmisionPublicaPage**: Visor público de retransmisión vía WebSocket usando token de la URL.
- **NotFoundPage**: Página 404.

## Flujo de autenticación

- Sesión gestionada por `AuthContext` (Context API)
- Tokens JWT almacenados en `localStorage` como `cr_token` (access, 30 min) y `cr_refresh_token` (refresh, 7 días)
- `authFetch` envuelve `fetch` añadiendo automáticamente el Bearer token y refrescándolo si el servidor responde 401

## Convenciones

- Tipos de partida: `PI` (manual), `PR` (retransmisión)

## Notas sobre uso de Inteligencia Artificial usada en la implementación:

> Uso de Gemeni para Tailwind respecto al diseño de las páginas y ayuda en el desarrollo en las páginas de RetransmisionPage y RetransmisionPublicaPage.

## Despliegue

El proyecto se despliega en **Vercel**. Incluye `vercel.json` con reglas de rewrite para SPA:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

La variable `VITE_API_URL` debe configurarse como variable de entorno en Vercel apuntando a la API de producción en Railway.
