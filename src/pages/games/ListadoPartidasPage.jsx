import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    LogOut,
    Loader2,
    Inbox
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ChessViewer from '@/components/chess/ChessViewer'
import Header from '@/components/layout/Header'

/**
 * Listado de Partidas - ARMONIZADO TOTALMENTE con IntroducirPartidaPage.
 */
export default function ListadoPartidasPage() {
    const { logout, authFetch } = useAuth()
    const navigate = useNavigate()

    const [partidas, setPartidas] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedIdx, setSelectedIdx] = useState(0)
    const [activeTab, setActiveTab] = useState('list')

    // Cargar historial
    useEffect(() => {
        const fetchPartidas = async () => {
            try {
                setLoading(true)
                const res = await authFetch('/partidas/')
                if (res.ok) {
                    const data = await res.json()
                    setPartidas(data)
                    if (data.length > 0) setSelectedIdx(0)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchPartidas()
    }, [])


    const selectPartida = (idx) => {
        setSelectedIdx(idx)
        // En móvil/tablet, saltar al visor tras seleccionar
        if (window.innerWidth < 768) {
            setActiveTab('viewer')
        }
    }

    const partidaSeleccionada = partidas[selectedIdx] || null

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 size={32} className="animate-spin text-cr-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />

            {/* CONTENIDO */}
            <div className="flex-1 flex flex-col md:flex-row relative mt-8">

                {/* COLUMNA IZQUIERDA: LISTADO */}
                <div className={`w-full md:w-1/2 flex flex-col p-6 md:p-10 lg:p-12 border-r border-cr-border/40 ${activeTab !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="mb-10 text-center">
                        <h1 className="font-display text-2xl font-black text-cr-text tracking-tight">
                            Listado de partidas
                        </h1>
                    </div>

                    <div className="flex-1 max-w-[500px] mx-auto w-full space-y-5 pb-20 md:pb-0">
                        {partidas.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <Inbox className="mx-auto mb-4" size={48} />
                                <p className="font-bold">Historial vacío</p>
                            </div>
                        ) : (
                            partidas.map((p, i) => (
                                <button
                                    key={p.id_partida}
                                    onClick={() => selectPartida(i)}
                                    style={{ borderRadius: '35px' }}
                                    className={`w-full text-left p-6 border-4 flex items-center gap-6 transition-all group overflow-hidden ${i === selectedIdx ? 'border-cr-primary bg-white shadow-xl shadow-cr-primary/10' : 'border-cr-border/40 bg-white hover:border-cr-primary/20'}`}
                                >
                                    {/* CÍRCULO - Diseño del sketch con borde grueso */}
                                    <div className={`w-16 h-16 flex-none rounded-full border-4 flex items-center justify-center font-black text-xl transition-all ${i === selectedIdx ? 'bg-cr-primary text-white border-cr-primary' : 'bg-white text-cr-muted border-cr-border group-hover:bg-cr-bg'}`}>
                                        {p.tipo_partida || 'PI'}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-cr-muted opacity-50 mb-1">
                                            {p.tipo_partida === 'PR' ? 'Partida Retransmitida' : 'Partida Introducida'}
                                        </p>
                                        <h3 className="font-bold text-cr-text text-lg leading-none truncate mb-2">
                                            {p.blancas} vs {p.negras}
                                        </h3>
                                        <div className="text-[12px] font-bold text-cr-muted opacity-80">
                                            {p.resultado} | {new Date(p.fecha).toLocaleDateString('es-ES')}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: VISOR */}
                <div className={`w-full md:w-1/2 flex flex-col p-6 md:p-10 lg:p-12 bg-white ${activeTab !== 'viewer' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex-1 max-w-[500px] mx-auto w-full">
                        {/* DATOS DE LA PARTIDA - Entre el título y el visor */}
                        {partidaSeleccionada && (
                            <div className="mb-8 text-center bg-cr-bg/50 p-6 rounded-[30px] border border-cr-border/40">
                                <p className="text-[10px] uppercase font-black tracking-widest text-cr-muted mb-2 opacity-60">
                                    {partidaSeleccionada.evento || 'Partida de Ajedrez'}
                                </p>
                                <div className="flex items-center justify-center gap-4 text-cr-text">
                                    <span className="font-display text-xl font-bold">{partidaSeleccionada.blancas}</span>
                                    <span className="bg-cr-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black">VS</span>
                                    <span className="font-display text-xl font-bold">{partidaSeleccionada.negras}</span>
                                </div>
                                <div className="mt-2 text-sm font-bold text-cr-primary uppercase tracking-widest">
                                    Resultado: {partidaSeleccionada.resultado}
                                </div>
                                <div className="mt-1 text-[11px] text-cr-muted font-bold opacity-70">
                                    {new Date(partidaSeleccionada.fecha).toLocaleDateString('es-ES')} {partidaSeleccionada.lugar ? `· ${partidaSeleccionada.lugar}` : ''}
                                </div>
                            </div>
                        )}
                        <ChessViewer partida={partidaSeleccionada} />
                    </div>
                </div>
            </div>

            {/* TABS MÓVIL */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-cr-border flex items-stretch z-50">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeTab === 'list' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'list' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Listado</span>
                </button>
                <button
                    onClick={() => setActiveTab('viewer')}
                    className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeTab === 'viewer' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'viewer' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Visor</span>
                </button>
            </div>

        </div>
    )
}
