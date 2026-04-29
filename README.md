# Chess Rekognition - Aplicación Web (Frontend)

Este directorio contiene la aplicación frontend del proyecto **Chess Rekognition**. Se ha desarrollado utilizando un stack moderno, priorizando el rendimiento, la facilidad de mantenimiento y un diseño visual coherente.

## Arquitectura del Proyecto

El proyecto está diseñado bajo una arquitectura modular y escalable basada en los principios de separación de responsabilidades:

- **React 19 + Vite:** Vite se utiliza como empaquetador para el desarrollo, y React para la construcción de interfaces.
- **Tailwind CSS v4:** El estilado se ha realizado de forma utilitaria. Se ha implementado el sistema `@theme` introducido en Tailwind CSS v4 para garantizar la coherencia temática. Toda la paleta recae en variables dentro de `src/index.css`.
- **Enrutamiento (React Router v7):** Flujos de navegación completos y protegidos (Auth Guards, Layouts de la aplicación vs Layouts de Sesión).
- **Gestión de Estado (Context API):** La sesión del usuario, incluyendo el control y tokenización asíncrona JWT con validación del servidor y recarga automática, está desacoplada en `src/context/AuthContext.jsx`.
- **Capa de Servicios de Frontend (Hooks y API):** Contamos con Custom Hooks y lógicas como `authFetch` en el Contexto de Autenticación, las cuales desacoplan la comunicación asíncrona mediante un componente *Adapter* en lugar de integrar las llamadas HTTP en los componentes visuales.
- **Componentes UI Aislados (Atomic Design):** Todo en `src/components/ui` es atómico e incrustable horizontalmente (ej. `InputText`, `Button`, `InputPassword`), asegurando la consistencia e independizando cada lógica de representación general.

## Librerías Principales

El frontend utiliza dependencias modernas para proveer funcionalidad con un impacto mínimo en la carga inicial.

### Funcionalidad Base y Estructura
- **[React](https://react.dev/) (`^19.2.0`):** Biblioteca base para renderizado de componentes y manipulación de interfaces.
- **[React Router DOM](https://reactrouter.com/) (`^7.13.1`):** Enrutador declarativo para manejar las rutas y los flujos protegidos del lado cliente.
- **[Vite](https://vitejs.dev/) (`^7.3.1`):** Entorno de construcción de desarrollo rápido basado en módulos ESM.

### Estética y UI
- **[Tailwind CSS](https://tailwindcss.com/) (`^4.2.1`):** Motor principal de utilidades de estilo.
- **[Lucide React](https://lucide.dev/) (`^0.577.0`):** Colección de iconos en formato SVG liviano para estandarizar la iconografía a lo largo del sistema.
- **[Framer Motion](https://www.framer.com/motion/) (`^12.36.0`):** Biblioteca de animaciones reactivas para transiciones de los diferentes componentes visuales.

### Motor de Ajedrez Lógico y Visual
- **[chess.js](https://github.com/jhlywa/chess.js) (`^1.4.0`):** Motor de código abierto que se encarga de validar los movimientos (PGN o FEN) para comprobar la validez de cada jugada.
- **[react-chessboard](https://github.com/react-chessboard/react-chessboard) (`^5.10.0`):** Componente visual interactivo para HTML, que se empareja mediante propiedades al estado de partidas de *chess.js*.

## Estructura de Directorios Clave

```text
app/
├── public/                 # Recursos estáticos servidos (Logo oficial, favicon, SVG...)
├── src/
│   ├── components/         # Componentes transversales
│   │   ├── layout/         # Layouts base (AppLayout.jsx, AuthLayout.jsx)
│   │   └── ui/             # Componentes base atómicos reutilizables e independientes
│   ├── context/            # Contextos de estado globales de provisión (Auth y Tokens)
│   ├── hooks/              # Custom Hooks para encapsular lógicas reactivas
│   ├── pages/              # Páginas vinculadas directamente a la navegación web
│   │   ├── auth/           # Vistas de autenticación (Login, Registro)
│   │   ├── games/          # Vistas privadas (Introducción de partidas, Retransmisión)
│   │   └── public/         # Vistas públicas sin autenticación (Retransmisión Pública, 404)
│   ├── router/             # Centralización del árbol de rutas de la Aplicación
│   ├── App.jsx             # Punto de entrada de React, Router Wrapper
│   ├── index.css           # Cimientos visuales y Variables Globales del @theme v4
│   └── main.jsx            # Boostrap y RenderRoot HTML DOM
├── .env                    # Entorno (URL del backend, etc.)
├── eslint.config.js        # Reglas de linting centralizadas.
└── package.json            # Dependencias.
```

## Buenas Prácticas y UI/UX implementada

1. **Light Corporate Theme:** Esquema centralizado en el logotipo usando color azul corporativo en conjunción con blancos y grises de bajo contraste.
2. **Mobile-First Responsivo:** Las pantallas grandes integran secciones visuales adicionales que se ocultan en formato móvil para minimizar cargas innecesarias y dar formato a los formularios.
3. **Optimización de Fuentes:** Se ha utilizado un "stack" de fuentes del sistema (_System Fonts_: Segoe UI, Roboto, Helvetica, Georgia...) para minimizar el CLS y suprimir los tiempos de latencia DNS.
4. **Separación ORM Front:** Se ha desacoplado el código que maneja estados e interacciones de seguridad a través de peticiones JWT de forma que ofrezca transiciones centralizadas (AuthFetch).
