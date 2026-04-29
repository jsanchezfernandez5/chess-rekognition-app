import { useState, useRef, useEffect } from 'react'
import { Video, Copy, StopCircle, RefreshCw, AlertCircle, SwitchCamera } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

export default function RetransmisionPage() {
    const [token, setToken] = useState(null)
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [error, setError] = useState(null)
    const [facingMode, setFacingMode] = useState('environment')
    
    // UI state for the video
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const wsRef = useRef(null)
    const loopRef = useRef(null)

    const [stats, setStats] = useState({ occupied: 0, total: 64, ping: 0 })
    const [debugImage, setDebugImage] = useState(null)

    // Iniciar cámara
    const startCamera = async (mode = facingMode) => {
        try {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(t => t.stop())
            }
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: mode } 
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (err) {
            console.error(err)
            setError('No se pudo acceder a la cámara. Revisa los permisos.')
        }
    }

    const toggleCamera = () => {
        const newMode = facingMode === 'environment' ? 'user' : 'environment'
        setFacingMode(newMode)
        startCamera(newMode)
    }

    useEffect(() => {
        startCamera(facingMode)
        const currentVideo = videoRef.current
        return () => {
            stopBroadcast()
            if (currentVideo && currentVideo.srcObject) {
                currentVideo.srcObject.getTracks().forEach(t => t.stop())
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const startBroadcast = () => {
        // Generar token único para la retransmisión
        const newToken = Math.random().toString(36).substring(2, 10)
        setToken(newToken)
        setIsBroadcasting(true)

        // Conectar WebSocket
        const wsUrl = `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/retransmision/ws/host/${newToken}`
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
            console.log("WebSocket Host Conectado")
            // Iniciar el bucle de captura
            loopRef.current = setTimeout(processFrame, 500) // 2 FPS para no saturar
        }

        wsRef.current.onerror = () => {
            setError('Error de conexión WebSocket')
            stopBroadcast()
        }
        
        wsRef.current.onclose = () => {
            console.log("WebSocket Host Cerrado")
            setIsBroadcasting(false)
        }
    }

    const stopBroadcast = () => {
        setIsBroadcasting(false)
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
        if (loopRef.current) {
            clearTimeout(loopRef.current)
            loopRef.current = null
        }
    }

    const processFrame = async () => {
        if (!isBroadcasting || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState !== 4) {
            loopRef.current = setTimeout(processFrame, 500)
            return
        }

        const start = performance.now()

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)

        canvas.toBlob(async (blob) => {
            if (!blob) return

            const fd = new FormData()
            fd.append('file', blob)

            try {
                // Envía el frame a procesar
                const res = await fetch(`${import.meta.env.VITE_API_URL}/vision/recognize-board`, {
                    method: 'POST',
                    body: fd
                })
                const data = await res.json()

                setStats(prev => ({ ...prev, ping: Math.round(performance.now() - start) }))

                if (data.success) {
                    setStats(prev => ({ ...prev, occupied: data.occupied_count, total: data.num_squares }))
                    setDebugImage(data.debug_image)

                    // Enviar estado al WebSocket para los espectadores
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                            type: 'BOARD_STATE',
                            data: data
                        }))
                    }
                }
            } catch (err) {
                console.error("Error procesando frame:", err)
            } finally {
                if (isBroadcasting) {
                    loopRef.current = setTimeout(processFrame, 500)
                }
            }
        }, 'image/jpeg', 0.8)
    }

    const copyLink = () => {
        if (!token) return
        const link = `${window.location.origin}/retransmision/${token}`
        navigator.clipboard.writeText(link)
        alert('Enlace público copiado al portapapeles.')
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />

            <div className="flex-1 flex flex-col items-center justify-center p-6 mt-8">
                <div className="w-full max-w-4xl flex flex-col items-center bg-white p-6 md:p-10 rounded-3xl border border-cr-border/40 shadow-sm">
                    <div className="text-center mb-8">
                        <h1 className="font-display text-3xl font-black text-cr-text tracking-tight mb-2">
                            Retransmisión en Vivo
                        </h1>
                        <p className="text-cr-muted font-medium">
                            Enfoca el tablero con la cámara y comparte la partida en tiempo real.
                        </p>
                    </div>

                    {error && (
                        <div className="w-full bg-rose-50 text-rose-500 p-4 rounded-xl flex items-center mb-6 text-sm font-bold">
                            <AlertCircle className="mr-3" size={20} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                        {/* Feed de la Cámara */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-md">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-cover"
                                />
                                <canvas ref={canvasRef} className="hidden" />
                                {isBroadcasting && (
                                    <div className="absolute top-4 right-4 flex items-center bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse shadow-md">
                                        <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                                        En Vivo
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex w-full gap-4 mt-6">
                                {!isBroadcasting ? (
                                    <>
                                        <Button 
                                            variant="primary" 
                                            className="flex-1 h-14 font-black uppercase tracking-widest"
                                            onClick={startBroadcast}
                                        >
                                            <Video className="mr-2" size={20} />
                                            Iniciar
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-14 px-4 border-cr-border text-cr-muted hover:text-cr-text hover:bg-cr-bg shrink-0"
                                            onClick={toggleCamera}
                                            title="Cambiar cámara"
                                        >
                                            <SwitchCamera size={20} />
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        variant="outline" 
                                        className="flex-1 h-14 font-black uppercase tracking-widest text-rose-500 border-rose-500 hover:bg-rose-50"
                                        onClick={stopBroadcast}
                                    >
                                        <StopCircle className="mr-2" size={20} />
                                        Detener
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Monitor de Estado */}
                        <div className="flex flex-col">
                            <div className="bg-cr-bg p-6 rounded-2xl border border-cr-border/40 flex-1 flex flex-col">
                                <h3 className="font-bold text-cr-text uppercase tracking-widest text-sm mb-4">
                                    Estado de Emisión
                                </h3>
                                
                                {isBroadcasting ? (
                                    <div className="flex flex-col space-y-4">
                                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-cr-border/20">
                                            <span className="text-cr-muted text-xs font-bold uppercase">Casillas Ocupadas</span>
                                            <span className="font-black text-cr-text text-lg">{stats.occupied} / {stats.total}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-cr-border/20">
                                            <span className="text-cr-muted text-xs font-bold uppercase">Latencia</span>
                                            <span className="font-black text-cr-text text-lg">{stats.ping} ms</span>
                                        </div>
                                        
                                        {debugImage && (
                                            <div className="mt-4 border border-cr-border/40 rounded-xl overflow-hidden shadow-sm">
                                                <img src={debugImage} alt="Visión Debug" className="w-full object-cover" />
                                            </div>
                                        )}

                                        <div className="mt-auto pt-6">
                                            <label className="block text-[11px] uppercase font-black text-cr-muted mb-2 tracking-widest pl-1">
                                                Enlace para espectadores
                                            </label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    readOnly 
                                                    value={`${window.location.origin}/retransmision/${token}`}
                                                    className="flex-1 bg-white border border-cr-border rounded-xl px-4 py-3 text-sm font-medium text-cr-text outline-hidden"
                                                />
                                                <Button variant="primary" onClick={copyLink} className="px-4">
                                                    <Copy size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-cr-muted text-center h-full">
                                        <RefreshCw size={32} className="mb-4 opacity-20" />
                                        <p className="font-medium">Inicia la retransmisión para ver los datos de diagnóstico.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
