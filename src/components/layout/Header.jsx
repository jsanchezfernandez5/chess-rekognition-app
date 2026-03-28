import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

/**
 * Componente de Cabecera Global.
 * Centraliza el Logo y la acción de Cerrar Sesión.
 */
export default function Header() {
    const { logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <header className="w-full h-32 px-8 md:px-16 flex items-center justify-between bg-white z-10 shrink-0">
            <div className="pt-6 pl-4">
                <Link to="/dashboard" className="transition-opacity hover:opacity-80">
                    <img src="/logo.svg" alt="Chess Rekognition" className="w-[260px] h-auto" />
                </Link>
            </div>
            
            <button 
                onClick={handleLogout}
                className="flex flex-col items-center gap-1 group text-cr-muted hover:text-rose-500 transition-colors cursor-pointer shrink-0 mt-6"
                title="Salir de la aplicación"
            >
                <div className="p-3 rounded-2xl bg-cr-bg group-hover:bg-rose-50 transition-colors shadow-sm">
                    <LogOut size={24} />
                </div>
                <span className="text-[10px] uppercase font-black tracking-widest mt-1">Salir</span>
            </button>
        </header>
    )
}
