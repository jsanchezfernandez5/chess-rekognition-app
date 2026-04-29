import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AuthLayout from '@/components/layout/AuthLayout'
import Button from '@/components/ui/Button'
import { Home } from 'lucide-react'

/**
 * Página de error 404 (No Encontrado).
 * Se muestra cuando el usuario intenta acceder a una ruta que no existe.
 * Detecta si el usuario tiene una sesión activa para ofrecer el destino
 * más apropiado (Dashboard o Login).
 * 
 * @returns {JSX.Element} Vista de error 404.
 */
export default function NotFoundPage() {
    const { isAuthenticated } = useAuth()

    return (
        <AuthLayout>
            <div className="text-center py-4">
                {/* Cabecera visual del error */}
                <h1 className="text-7xl font-black text-cr-primary mb-2 drop-shadow-sm">404</h1>
                <h2 className="text-xl font-bold text-cr-text mb-4">Página no encontrada</h2>

                <p className="text-cr-muted text-sm mb-10 leading-relaxed">
                    Ruta no encontrada. La dirección puede ser incorrecta o el contenido ha sido eliminado.
                </p>

                {/* Acciones para el usuario */}
                <div className="flex flex-col gap-3">
                    <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                        <Button size="lg" className="flex items-center justify-center gap-2">
                            <Home size={18} />
                            Volver al {isAuthenticated ? "Dashboard" : "Inicio"}
                        </Button>
                    </Link>
                </div>
            </div>
        </AuthLayout>
    )
}
