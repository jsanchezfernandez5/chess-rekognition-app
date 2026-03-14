import { Link } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { Edit3, Bot, Video, VideoOff, ClipboardList } from 'lucide-react'

/**
 * Lista estática con las acciones rápidas del dashboard.
 * Contiene la información necesaria para renderizar cada tarjeta:
 * ruta destino, icono decorativo, título de la acción y una breve descripción.
 * @type {Array<{path: string, icon: JSX.Element, label: string, desc: string}>}
 */
const ACCIONES = [
  { path: '/games/input', icon: <Edit3 size={24} className="text-indigo-500" />, label: 'Introducir partida', desc: 'Añade una partida manualmente' },
  { path: '/stockfish', icon: <Bot size={24} className="text-rose-500" />, label: 'Jugar vs Stockfish', desc: 'Reta al motor de ajedrez' },
  { path: '/games/live', icon: <Video size={24} className="text-sky-500" />, label: 'Con retransmisión', desc: 'Partida en directo con cámara' },
  { path: '/games/offline', icon: <VideoOff size={24} className="text-slate-500" />, label: 'Sin retransmisión', desc: 'Partida sin cámara' },
  { path: '/games', icon: <ClipboardList size={24} className="text-emerald-500" />, label: 'Ver partidas', desc: 'Historial completo' },
]

/**
 * Página principal del panel de control (Dashboard).
 * Muestra un mensaje de bienvenida personalizado y una cuadrícula
 * con enlaces rápidos a las principales funciones de la aplicación.
 * 
 * @returns {JSX.Element} Vista principal del dashboard.
 */
export default function DashboardPage() {
  // Obtenemos el usuario autenticado desde el contexto global
  const { user } = useAuth()
  
  // Construimos el nombre para mostrar.
  // Intentamos obtener el nombre completo, en su defecto mostramos 'jugador'.
  const nombre = `${user?.nombre} ${user?.apellidos}`.trim() || 'jugador'

  return (
    <AppLayout>
      <div className="px-6 py-8 md:px-10 max-w-4xl mx-auto">

        {/* --- Sección de Saludo --- */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-black text-cr-text">
            Hola, <span className="text-cr-primary capitalize">{nombre}</span>
          </h1>
          <p className="text-cr-muted text-sm mt-1">¿Qué quieres hacer hoy?</p>
        </div>

        {/* --- Sección de Acciones Rápidas --- */}
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted mb-3">
          Acciones rápidas
        </h2>
        
        {/* Usamos grid para que la cuadrícula se adapte a diferentes tamaños de pantalla */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {ACCIONES.map(accion => (
            <Link
              key={accion.path}
              to={accion.path}
              className="flex items-start gap-4 p-4 bg-cr-surface border border-cr-border rounded-xl hover:border-cr-primary/40 hover:bg-cr-surface2 transition-all duration-150 group"
            >
              <div className="shrink-0 mt-0.5">{accion.icon}</div>
              <div>
                <p className="text-sm font-semibold text-cr-text group-hover:text-cr-primary transition-colors">
                  {accion.label}
                </p>
                <p className="text-[11px] text-cr-muted mt-0.5">{accion.desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </AppLayout>
  )
}
