import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, Activity, Share2, Download } from 'lucide-react'
import Button from '@/components/ui/Button'

// Componente que muestra una retransmisión pública de una partida de ajedrez.
// Requiere un token para acceder a la retransmisión.
export default function RetransmisionPublicaPage() {
    const { token } = useParams()
    const [status, setStatus] = useState('connecting') // connecting, connected, error, waiting
    const [boardData, setBoardData] = useState(null)
    const [errorMsg, setErrorMsg] = useState('')
    const wsRef = useRef(null)

    // Hook que se ejecuta cuando el componente se monta o cuando cambia el token.
    // Verifica si la retransmisión existe y se conecta al WebSocket.
    useEffect(() => {
        // Primero verificamos si la retransmisión existe vía HTTP
        const checkStatus = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/retransmision/status/${token}`)
                const data = await res.json()
                if (data.success && data.data.active) {
                    connectWebSocket()
                } else {
                    setStatus('error')
                    setErrorMsg('La retransmisión no existe o ya ha finalizado.')
                }
            } catch {
                setStatus('error')
                setErrorMsg('Error al conectar con el servidor.')
            }
        }

        // Conecta al WebSocket para recibir las actualizaciones de la retransmisión.
        const connectWebSocket = () => {
            const wsUrl = `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/retransmision/ws/viewer/${token}`
            wsRef.current = new WebSocket(wsUrl)

            wsRef.current.onopen = () => {
                setStatus('waiting') // Connected, waiting for data
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data)
                    if (payload.type === 'BOARD_STATE') {
                        setStatus('connected')
                        setBoardData(payload.data)
                    } else {
                        setStatus('connected')
                        setBoardData(payload)
                    }
                } catch (e) {
                    console.error("Error parseando mensaje WS:", e)
                }
            }

            wsRef.current.onerror = () => {
                setStatus('error')
                setErrorMsg('Se perdió la conexión con la retransmisión.')
            }

            wsRef.current.onclose = () => {
                if (status !== 'error') {
                    setStatus('error')
                    setErrorMsg('La retransmisión ha finalizado.')
                }
            }
        }

        // Inicia la conexión cuando el componente se monta.
        checkStatus()

        // Cierra la conexión cuando el componente se desmonta.
        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    // Función para compartir el enlace de la retransmisión.
    const shareLink = async () => {
        const link = window.location.href
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Retransmisión de Ajedrez',
                    text: 'Sigue la partida en directo',
                    url: link
                })
            } catch (err) {
                console.log("Error compartiendo", err)
            }
        } else {
            navigator.clipboard.writeText(link)
            alert('Enlace copiado al portapapeles.')
        }
    }

    // Renderiza la página de retransmisión pública.
    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Header Público */}
            <header className="h-20 bg-white border-b border-cr-border flex items-center justify-between px-6 md:px-10 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cr-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
                        C
                    </div>
                    <span className="font-display font-black text-xl text-cr-text tracking-tight hidden md:inline-block">
                        Chess Rekognition
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {status === 'connected' && (
                        <div className="flex items-center text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                            En Vivo
                        </div>
                    )}
                    <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-cr-primary hover:text-cr-primary-hover transition-colors">
                        Ir a la App
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center w-full">
                {status === 'connecting' && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={48} className="animate-spin text-cr-primary mb-6" />
                        <h2 className="font-display text-2xl font-black text-cr-text tracking-tight">
                            Conectando a la retransmisión...
                        </h2>
                    </div>
                )}

                {status === 'waiting' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
                            <Activity size={32} />
                        </div>
                        <h2 className="font-display text-2xl font-black text-cr-text tracking-tight mb-2">
                            Esperando la partida
                        </h2>
                        <p className="text-cr-muted font-medium">
                            El anfitrión está conectado pero aún no ha transmitido el tablero.
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="font-display text-2xl font-black text-cr-text tracking-tight mb-2">
                            Retransmisión no disponible
                        </h2>
                        <p className="text-cr-muted font-medium mb-8">
                            {errorMsg}
                        </p>
                        <Link to="/" className="h-12 px-6 bg-cr-primary text-white text-sm font-black uppercase tracking-widest flex items-center justify-center rounded-xl shadow-md hover:bg-cr-primary-hover transition-colors">
                            Volver al Inicio
                        </Link>
                    </div>
                )}

                {status === 'connected' && boardData && (
                    <div className="flex-1 flex flex-col md:flex-row w-full mt-8 pb-16 md:pb-0 max-w-[1800px] mx-auto px-0 md:px-12 lg:px-24 xl:px-32">

                        {/* LEFT COLUMN: Datos, Tablero, PGN */}
                        <div className="w-full md:w-1/3 lg:w-1/4 p-6 md:p-10 lg:p-12 bg-white border-r border-cr-border/40 overflow-y-auto">
                            <div className="max-w-md mx-auto w-full flex flex-col items-center md:items-start text-center md:text-left h-full">
                                <div className="mb-6 w-full text-center">
                                    <h3 className="text-[11px] uppercase font-black tracking-widest text-cr-muted mb-2">Datos de la Retransmisión</h3>
                                    <div className="text-cr-primary font-medium text-sm">
                                        <p>Blancas: {boardData.metadata?.blancas || 'Desconocido'}</p>
                                        <p>Negras: {boardData.metadata?.negras || 'Desconocido'}</p>
                                        <p>Resultado: {boardData.metadata?.resultado || 'En juego...'}</p>
                                    </div>
                                </div>

                                <div className="w-full max-w-[260px] mx-auto aspect-square bg-cr-bg rounded-2xl border border-cr-border p-2 mb-6 shadow-inner">
                                    {boardData.rectified_2d ? (
                                        <img src={boardData.rectified_2d} alt="Tablero Virtual" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-cr-muted text-xs">Sin datos 2D</div>
                                    )}
                                </div>

                                <div className="w-full mb-6 relative">
                                    <label className="block text-[10px] uppercase font-black text-cr-muted mb-2 tracking-widest text-left">
                                        Notación PGN
                                    </label>
                                    <textarea
                                        readOnly
                                        value={boardData.metadata?.pgn || "Esperando notación..."}
                                        style={{ fontFamily: '"Figurine", serif' }}
                                        className="w-full h-[140px] p-4 bg-cr-bg border-2 border-transparent focus:border-cr-primary/20 rounded-2xl resize-none text-sm font-medium leading-relaxed text-cr-text transition-all outline-hidden shadow-xs"
                                    />
                                    <button className="absolute right-3 top-8 text-cr-text hover:text-cr-primary">
                                        <Download size={18} />
                                    </button>
                                </div>

                                <Button variant="outline" className="w-full font-black uppercase tracking-widest h-14 shrink-0" onClick={shareLink}>
                                    <Share2 size={18} className="mr-3" />
                                    Compartir Retransmisión
                                </Button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Video de la Cámara */}
                        <div className="w-full md:w-2/3 lg:w-3/4 p-6 md:p-10 lg:p-12 bg-white flex flex-col overflow-hidden">
                            <div className="w-full aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-xl border-4 border-gray-800 relative flex items-center justify-center">
                                {boardData.rectified_real || boardData.debug_image ? (
                                    <img src={boardData.rectified_real || boardData.debug_image} alt="Cámara" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-white/50 font-medium">Esperando imagen de la cámara...</span>
                                )}
                                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg border border-white/10">
                                    Ocupación: {boardData.occupied_count} / {boardData.num_squares}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    )
}
