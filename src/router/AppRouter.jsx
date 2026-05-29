/**
 * AppRouter.jsx
 * 
 * Define las rutas de la aplicación utilizando React Router. 
 * Incluye rutas públicas (login, registro) y privadas (dashboard, gestión de partidas). 
 * También maneja rutas para retransmisiones públicas y una página 404 para rutas no encontradas.
 * 
 * Rutas definidas:
 * - /login: Página de inicio de sesión (pública)
 * - /register: Página de registro (pública)
 * - /dashboard: Panel principal del usuario (privada)
 * - /games/input: Formulario para introducir una nueva partida (privada)
 * - /games: Listado de partidas del usuario (privada)
 * - /games/live: Retransmisión en vivo de partidas (privada)
 * - /stockfish: Análisis con Stockfish (privada)
 * - /retransmision/:token: Retransmisión pública de una partida mediante token (pública)
 * - /*: Página 404 para rutas no encontradas
 * 
 * El componente raíz de la aplicación (App.jsx) envuelve este enrutador con el proveedor de autenticación para 
 * que el estado de autenticación esté disponible en toda la aplicación.
 */
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import IntroducirPartidaPage from '@/pages/games/IntroducirPartidaPage'
import ListadoPartidasPage from '@/pages/games/ListadoPartidasPage'
import StockfishPage from '@/pages/games/StockfishPage'
import RetransmisionPage from '@/pages/games/RetransmisionPage'
import RetransmisionPublicaPage from '@/pages/public/RetransmisionPublicaPage'
import NotFoundPage from '@/pages/public/NotFoundPage'

/** Componente de carga que muestra un spinner mientras se verifica el estado de autenticación. */
function Loader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-cr-bg">
            <span className="w-8 h-8 border-2 border-cr-primary border-t-transparent rounded-full animate-spin" />
        </div>
    )
}

/** Componente de ruta privada que redirige a login si el usuario no está autenticado. */
function PrivateRoute() {
    const { isAuthenticated, loading } = useAuth()
    if (loading) return <Loader />
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

/** Componente de ruta pública que redirige a dashboard si el usuario ya está autenticado. */
function PublicRoute() {
    const { isAuthenticated, loading } = useAuth()
    if (loading) return <Loader />
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

/** Componente principal del enrutador de la aplicación, define todas las rutas y su acceso. */
export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />

                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>

                <Route element={<PrivateRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/games/input" element={<IntroducirPartidaPage />} />
                    <Route path="/games" element={<ListadoPartidasPage />} />
                    <Route path="/games/live" element={<RetransmisionPage />} />
                    <Route path="/stockfish" element={<StockfishPage />} />
                </Route>

                <Route path="/retransmision/:token" element={<RetransmisionPublicaPage />} />

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    )
}
