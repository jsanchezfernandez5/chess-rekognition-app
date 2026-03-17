import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Edit3, Bot, Video, VideoOff, ClipboardList, LogOut, Menu } from 'lucide-react'

/**
 * Configuración de la navegación principal.
 * Define los enlaces que aparecerán en el menú lateral (Sidebar/Drawer).
 */
const NAV = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/games/input', icon: <Edit3 size={20} />, label: 'Introducir partidas' },
    { path: '/stockfish', icon: <Bot size={20} />, label: 'Juega vs StockFish' },
    { path: '/games/live', icon: <Video size={20} />, label: 'Partida retransmitida' },
    { path: '/games', icon: <ClipboardList size={20} />, label: 'Listado de partidas' },
]

/**
 * Componente de Diseño Principal (Layout).
 * Proporciona el marco estructural de la aplicación una vez autenticado,
 * incluyendo el Header superior, el menú lateral (Sidebar) responsivo 
 * y el contenedor donde se renderizan las páginas hijas.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Contenido de la página actual.
 * @returns {JSX.Element} Estructura base con navegación.
 */
export default function AppLayout({ children }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const { pathname } = useLocation()

    /**
     * Gestiona el cierre de sesión del usuario.
     * Limpia el estado global y redirige a la pantalla de acceso.
     */
    function handleLogout() {
        logout()
        navigate('/login')
    }

    // Estado para controlar la apertura/cierre del menú lateral en móviles
    const [sidebarOpen, setSidebarOpen] = useState(false)

    /**
     * Genera las iniciales a partir del nombre del usuario.
     * Utilizado para el Avatar circular.
     * 
     * @param {string} name - Nombre o username del usuario.
     * @returns {string} Iniciales en mayúsculas (máximo 2 caracteres).
     */
    const getInitials = (name) => {
        if (!name) return '?'
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return parts[0][0].toUpperCase()
    }

    return (
        <div className="flex min-h-screen bg-[#F0F2F5]">

            {/* ── Barra Superior (Header) ── */}
            <header className="fixed top-0 left-0 right-0 h-16 md:h-20 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 md:px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    {/* Botón Hamburger para abrir el Sidebar */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Abrir menú"
                    >
                        <Menu size={24} />
                    </button>

                    <img src="/logo.svg" alt="Chess Rekognition" className="h-10 md:h-14 w-auto shrink-0" />
                </div>

                {/* Círculo de Usuario (Avatar) */}
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-cr-primary flex items-center justify-center text-white text-sm md:text-base font-bold shadow-sm shrink-0">
                    {getInitials(user?.nombre || user?.username)}
                </div>
            </header>

            {/* ── Capa de Fondo (Overlay) para cerrar el menú ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Menú Lateral (Drawer/Aside) ── */}
            <aside
                className={`fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                    }`}
            >
                {/* Cabecera del menú lateral con el logotipo */}
                <div className="h-16 md:h-20 flex items-center px-4 md:px-6 border-b border-gray-100 shrink-0">
                    <img src="/logo.svg" alt="Chess Rekognition" className="h-10 md:h-14 w-auto shrink-0" />
                </div>

                {/* Listado dinámico de enlaces */}
                <nav className="flex flex-col gap-1 flex-1 py-4 px-3 overflow-y-auto">
                    {NAV.map(item => {
                        const active = pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)} // Cierra el menú al navegar
                                className={[
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                                    active
                                        ? 'bg-cr-primary/10 text-cr-primary font-medium'
                                        : 'text-cr-muted hover:bg-black/5 hover:text-cr-text',
                                ].join(' ')}
                            >
                                <span className="flex items-center justify-center w-5">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Sección inferior: Perfil de usuario y botón de cerrar sesión */}
                <div className="border-t border-gray-100 pt-4 px-3 pb-6">
                    <div className="flex items-center gap-3 px-2 mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-cr-primary flex items-center justify-center text-white text-base font-bold shrink-0">
                            {getInitials(user?.nombre || user?.username)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user?.nombre || user?.username}</p>
                            <p className="text-xs text-gray-500">Jugador</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-cr-muted hover:text-rose-400 hover:bg-rose-400/8 transition-all duration-150"
                    >
                        <span className="flex items-center justify-center w-5">
                            <LogOut size={20} />
                        </span>
                        <span className="font-medium">Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            {/* ── Espacio para el Contenido de la Página ── */}
            <main className="flex-1 min-h-screen pt-24 md:pt-28 pb-8 px-4 w-full max-w-7xl mx-auto">
                {children}
            </main>

        </div>
    )
}
