import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import TypewriterText from '@/components/ui/TypewriterText'
import { LogOut, PlusCircle, Swords, Radio, LayoutList } from 'lucide-react'

/**
 * Página principal del dashboard para usuarios autenticados.
 */
export default function DashboardPage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    // Obtenemos el nombre del usuario para mostrarlo en el saludo, con fallback a username o 'jugador'.
    const nombre = user?.nombre || user?.username || 'jugador'

    // Función para manejar el cierre de sesión, llamando al método de logout del contexto de autenticación y redirigiendo a login.
    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    // Definimos las acciones principales del dashboard, cada una con su etiqueta, ruta de destino e ícono correspondiente.
    const ACCIONES = [
        {
            label: 'Introducir partidas',
            path: '/games/input',
            icon: <PlusCircle size={20} />
        },
        {
            label: 'Juega vs StockFish',
            path: '/stockfish',
            icon: <Swords size={20} />
        },
        {
            label: 'Partida retransmitida',
            path: '/games/live',
            icon: <Radio size={20} />
        },
        {
            label: 'Listado de partidas',
            path: '/games',
            icon: <LayoutList size={20} />
        },
    ]

    // Renderizado de la página del dashboard, con un diseño dividido en dos paneles: uno para las acciones y otro para la imagen y el texto de bienvenida.
    return (
        <div className="min-h-screen flex items-stretch bg-white">

            {/* PANEL IZQUIERDO (FORMULARIO / ACCIONES) */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-16 lg:px-24 bg-white relative z-10 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)]">

                <div className="w-full max-w-90">

                    {/* Header: Logo y Salir */}
                    <div className="flex items-center justify-between mb-8 px-2">
                        <Link to="/dashboard" title="Ir al Dashboard" className="shrink-0 transition-opacity hover:opacity-80">
                            <img src="/logo.svg" alt="Chess Rekognition" className="w-65 h-auto" />
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="flex flex-col items-center gap-1 group text-cr-muted hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                            title="Cerrar sesión"
                        >
                            <div className="p-3 rounded-2xl bg-cr-bg group-hover:bg-rose-50 transition-colors shadow-sm">
                                <LogOut size={24} />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-widest mt-1">Salir</span>
                        </button>
                    </div>

                    {/* Saludo */}
                    <div className="text-center mb-12">
                        <h1 className="font-display text-2xl md:text-2xl font-black text-cr-text whitespace-nowrap overflow-hidden text-ellipsis">
                            Hola, <span className="text-cr-primary capitalize">{nombre}</span>
                        </h1>
                    </div>

                    {/* Lista de Botones (Acciones) — Estilo Login/Registro */}
                    <div className="flex flex-col gap-4">
                        {ACCIONES.map((accion, i) => (
                            <Button
                                key={i}
                                onClick={() => navigate(accion.path)}
                                variant="primary"
                                size="lg"
                                className="justify-start px-8 h-16 text-base group shadow-lg hover:shadow-cr-primary/30"
                                title={accion.label}
                            >
                                <span className="shrink-0 mr-5 text-white/90 group-hover:text-white transition-colors">
                                    {accion.icon}
                                </span>
                                {accion.label}
                            </Button>
                        ))}
                    </div>

                </div>
            </div>

            {/* PANEL DERECHO (IMAGEN / TYPEWRITER — IDÉNTICO A LOGIN) */}
            <div className="hidden md:flex relative w-1/2 flex-col justify-center items-center bg-cr-bg overflow-hidden border-l border-cr-border/60">

                {/* Imagen de fondo */}
                <img
                    src="./images/tablero_fondo.jpg"
                    alt="Chess match"
                    className="absolute inset-0 object-cover w-full h-full opacity-90 mix-blend-multiply"
                />

                {/* Texto y Typewriter Centrado Directamente en el overlay */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center px-8">
                    <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-5 drop-shadow-md">
                        Chess Rekognition
                    </h2>
                    <div className="text-white/90 text-lg md:text-xl font-medium tracking-wide drop-shadow text-center min-h-8">
                        <TypewriterText />
                    </div>
                </div>

            </div>

        </div>
    )
}
