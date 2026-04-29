import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, Eye, Activity } from 'lucide-react'

export default function RetransmisionPublicaPage() {
    const { token } = useParams()
    const [status, setStatus] = useState('connecting') // connecting, connected, error, waiting
    const [boardData, setBoardData] = useState(null)
    const [errorMsg, setErrorMsg] = useState('')
    const wsRef = useRef(null)

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
                        // Si el host envía todo el objeto directamente
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

        checkStatus()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    return (
        <div className="min-h-screen flex flex-col bg-cr-bg">
            {/* Header Público Simple */}
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
                    <Link to="/" className="text-xs font-black uppercase tracking-widest text-cr-primary hover:text-cr-primary-hover transition-colors">
                        Ir a la App
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 mt-8">
                <div className="w-full max-w-5xl">
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
                        <div className="bg-white rounded-3xl border border-cr-border/40 shadow-sm p-6 md:p-10">
                            <div className="text-center mb-10">
                                <h1 className="font-display text-3xl font-black text-cr-text tracking-tight mb-2">
                                    Partida en Vivo
                                </h1>
                                <p className="text-cr-muted font-medium flex items-center justify-center">
                                    <Eye size={18} className="mr-2" />
                                    Espectador
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Vista 2D Sintética */}
                                <div className="flex flex-col items-center">
                                    <h3 className="font-bold text-cr-text uppercase tracking-widest text-sm mb-4">
                                        Tablero Virtual
                                    </h3>
                                    <div className="w-full aspect-square bg-cr-bg rounded-2xl overflow-hidden border-2 border-cr-border flex items-center justify-center p-2 shadow-inner">
                                        {boardData.rectified_2d ? (
                                            <img src={boardData.rectified_2d} alt="Tablero Virtual" className="w-full h-full object-contain rounded-xl" />
                                        ) : (
                                            <span className="text-cr-muted font-medium">Sin datos 2D</span>
                                        )}
                                    </div>
                                </div>

                                {/* Vista Real Rectificada */}
                                <div className="flex flex-col items-center">
                                    <h3 className="font-bold text-cr-text uppercase tracking-widest text-sm mb-4">
                                        Cámara en Vivo
                                    </h3>
                                    <div className="w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-lg border-4 border-gray-800">
                                        {boardData.rectified_real ? (
                                            <img src={boardData.rectified_real} alt="Cámara" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-cr-muted font-medium flex items-center justify-center h-full">Cargando video...</span>
                                        )}
                                    </div>
                                    <div className="w-full mt-6 bg-cr-bg p-4 rounded-xl flex justify-between items-center border border-cr-border/40">
                                        <span className="text-cr-muted text-xs font-bold uppercase tracking-widest">
                                            Ocupación Detectada
                                        </span>
                                        <span className="font-black text-cr-text">
                                            {boardData.occupied_count} / {boardData.num_squares}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
