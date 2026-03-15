import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

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
                    {/* Próximas rutas aquí */}
                </Route>

                {/* Ruta para manejar el error 404 */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    )
}
