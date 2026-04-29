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

function Loader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-cr-bg">
            <span className="w-8 h-8 border-2 border-cr-primary border-t-transparent rounded-full animate-spin" />
        </div>
    )
}

function PrivateRoute() {
    const { isAuthenticated, loading } = useAuth()
    if (loading) return <Loader />
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function PublicRoute() {
    const { isAuthenticated, loading } = useAuth()
    if (loading) return <Loader />
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

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
                    <Route path="/games/retransmision" element={<RetransmisionPage />} />
                    <Route path="/stockfish" element={<StockfishPage />} />

                </Route>

                {/* Rutas Públicas (sin Auth y sin redirección de Auth) */}
                <Route path="/retransmision/:token" element={<RetransmisionPublicaPage />} />

                {/* Ruta para manejar el error 404 */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    )
}
