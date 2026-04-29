import { useState, useRef, useEffect } from 'react'
import { SwitchCamera, Share2, Activity, Play, StopCircle, RefreshCw, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import InputText from '@/components/ui/InputText'
import InputSelect from '@/components/ui/InputSelect'
import { useAuth } from '@/hooks/useAuth'

export default function RetransmisionPage() {
    const { authFetch } = useAuth()
    const [token, setToken] = useState(null)
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [error, setError] = useState(null)
    const [facingMode, setFacingMode] = useState('environment')
    
    // Control de pestañas para móvil
    const [activeTab, setActiveTab] = useState('config')

    // UI state for the video
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const wsRef = useRef(null)
    const loopRef = useRef(null)

    const [stats, setStats] = useState({ occupied: 0, total: 64, ping: 0 })
    const [debugImage, setDebugImage] = useState(null)

    // Formulario de configuración (Host)
    const [formData, setFormData] = useState({
        evento: '',
        blancas: '',
        negras: '',
        lugar: '',
        ronda: '',
        tablero: '',
        resultado: 'En juego...'
    })

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

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
                setIsCameraActive(true)
            }
        } catch (err) {
            console.error(err)
            setError('No se pudo acceder a la cámara. Revisa los permisos.')
            setIsCameraActive(false)
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

    const startBroadcast = async () => {
        try {
            // Inicializar retransmisión en el backend
            const payload = {
                evento: formData.evento || undefined,
                blancas: formData.blancas || undefined,
                negras: formData.negras || undefined,
                ronda: formData.ronda ? parseInt(formData.ronda) : undefined,
                tablero: formData.tablero ? parseInt(formData.tablero) : undefined,
                lugar: formData.lugar || undefined,
                resultado: formData.resultado || undefined
            }

            const res = await authFetch('/retransmision/host', {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            
            if (!res.ok) throw new Error('Error al registrar la retransmisión')
            
            const data = await res.json()
            const newToken = data.token
            
            setToken(newToken)
            setIsBroadcasting(true)

            // Conectar WebSocket
            const wsUrl = `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/retransmision/ws/host/${newToken}`
            wsRef.current = new WebSocket(wsUrl)

            wsRef.current.onopen = () => {
                console.log("WebSocket Host Conectado")
                loopRef.current = setTimeout(processFrame, 500)
                setActiveTab('vision') // Pasar a la pestaña de visión automáticamente en móviles
            }

            wsRef.current.onerror = () => {
                setError('Error de conexión WebSocket')
                stopBroadcast()
            }
            
            wsRef.current.onclose = () => {
                console.log("WebSocket Host Cerrado")
                setIsBroadcasting(false)
            }
        } catch (err) {
            console.error("Error iniciando retransmisión:", err)
            setError('Fallo al registrar la retransmisión. Revisa tu conexión.')
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

    const stopCameraAndBroadcast = () => {
        stopBroadcast()
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
            videoRef.current.srcObject = null
            setIsCameraActive(false)
        }
    }

    const toggleCameraPower = () => {
        if (isCameraActive) {
            stopCameraAndBroadcast()
        } else {
            startCamera()
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
                    setDebugImage(data.rectified_2d || data.debug_image) // Mostrar 2D rectificado en consola

                    // Enviar estado al WebSocket para los espectadores
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                            type: 'BOARD_STATE',
                            // Inyectar metadatos para el espectador
                            data: {
                                ...data,
                                metadata: formData
                            }
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

    const shareLink = async () => {
        if (!token) return
        const link = `${window.location.origin}/retransmision/${token}`
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Retransmisión de Ajedrez',
                    text: `Sigue la partida en directo entre ${formData.blancas || 'Blancas'} y ${formData.negras || 'Negras'}`,
                    url: link
                })
            } catch (err) {
                console.log("Error compartiendo", err)
            }
        } else {
            navigator.clipboard.writeText(link)
            alert('Enlace público copiado al portapapeles.')
        }
    }

    const getTabClass = (tabName) => activeTab !== tabName ? 'hidden md:flex' : 'flex'

    return (
        <div className="min-h-screen flex flex-col bg-white overflow-hidden">
            <Header />

            <div className="w-full max-w-[1800px] mx-auto pt-8 px-6 md:px-12 lg:px-24 xl:px-32 bg-white">
                <h1 className="font-display text-3xl font-black text-cr-text tracking-tight">
                    Partida retransmitida
                </h1>
            </div>

            <div className="flex-1 flex flex-col md:flex-row relative mt-4 pb-16 md:pb-0 w-full max-w-[1800px] mx-auto px-0 md:px-12 lg:px-24 xl:px-32">
                
                {/* 1. CONFIGURACIÓN */}
                <div className={`w-full md:w-1/3 flex-col p-6 md:p-10 lg:p-12 bg-white border-r border-cr-border/40 overflow-y-auto ${getTabClass('config')}`}>
                    <div className="max-w-md mx-auto w-full">
                        <h2 className="font-display text-2xl font-black text-cr-text tracking-tight mb-8">
                            Configuración
                        </h2>
                        <div className="space-y-4">
                            <InputText id="evento" name="evento" label="Evento *" value={formData.evento} onChange={handleInputChange} disabled={isBroadcasting} />
                            <InputText id="blancas" name="blancas" label="Blancas *" value={formData.blancas} onChange={handleInputChange} disabled={isBroadcasting} />
                            <InputText id="negras" name="negras" label="Negras *" value={formData.negras} onChange={handleInputChange} disabled={isBroadcasting} />
                            <InputText id="lugar" name="lugar" label="Lugar" value={formData.lugar} onChange={handleInputChange} disabled={isBroadcasting} />
                            <div className="flex gap-4">
                                <InputText id="ronda" name="ronda" label="Ronda" value={formData.ronda} onChange={handleInputChange} disabled={isBroadcasting} />
                                <InputText id="tablero" name="tablero" label="Tablero" value={formData.tablero} onChange={handleInputChange} disabled={isBroadcasting} />
                            </div>
                            
                            {!isBroadcasting ? (
                                <Button variant="primary" className="w-full mt-6 h-14 font-black uppercase tracking-widest shadow-lg shadow-cr-primary/20" onClick={startBroadcast}>
                                    Activar Visión IA
                                </Button>
                            ) : (
                                <div className="mt-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold flex items-center justify-center text-sm border border-emerald-100">
                                    <Activity size={18} className="mr-2 animate-pulse" />
                                    Visión IA Activada
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. VISIÓN IA */}
                <div className={`w-full md:w-1/3 flex-col p-6 md:p-10 lg:p-12 bg-white border-r border-cr-border/40 overflow-y-auto ${getTabClass('vision')}`}>
                    <div className="max-w-md mx-auto w-full">
                        <h2 className="font-display text-2xl font-black text-cr-text tracking-tight mb-8">
                            Visión IA
                        </h2>
                        
                        {error && (
                            <div className="w-full bg-rose-50 text-rose-500 p-3 rounded-xl flex items-center mb-4 text-xs font-bold">
                                <AlertCircle className="mr-2" size={16} />
                                {error}
                            </div>
                        )}

                        <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-inner mb-4 border-[3px] border-cr-border">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            
                            {isBroadcasting && (
                                <div className="absolute top-4 right-4 flex items-center bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                                    <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                                    En Vivo
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mb-8">
                            <Button variant="outline" className="flex-1 text-xs font-bold uppercase" onClick={toggleCamera}>
                                <SwitchCamera size={16} className="mr-2" />
                                Cambiar
                            </Button>
                            <Button 
                                variant="outline" 
                                className={`flex-1 text-xs font-bold uppercase ${isCameraActive ? 'text-rose-500 hover:bg-rose-50 border-rose-500/30' : 'text-emerald-500 hover:bg-emerald-50 border-emerald-500/30'}`} 
                                onClick={toggleCameraPower}
                            >
                                {isCameraActive ? (
                                    <><StopCircle size={16} className="mr-2" /> Parar</>
                                ) : (
                                    <><Play size={16} className="mr-2" /> Activar</>
                                )}
                            </Button>
                        </div>

                        <div className="mb-4">
                            <InputSelect 
                                id="resultado" 
                                name="resultado" 
                                label="Resultado" 
                                value={formData.resultado} 
                                onChange={handleInputChange}
                                options={[
                                    { value: 'En juego...', label: 'En juego...' },
                                    { value: '1-0', label: '1-0 (Blancas)' },
                                    { value: '0-1', label: '0-1 (Negras)' },
                                    { value: '1/2-1/2', label: '1/2-1/2 (Tablas)' }
                                ]}
                            />
                        </div>

                        <div className="space-y-3 mt-8">
                            <Button variant="primary" className="w-full font-black uppercase tracking-widest h-14" onClick={shareLink} disabled={!isBroadcasting}>
                                <Share2 size={18} className="mr-3" />
                                Compartir Retransmisión
                            </Button>
                            <Button variant="outline" className="w-full font-black uppercase tracking-widest h-14 text-rose-500 border-rose-200 hover:bg-rose-50" onClick={stopBroadcast} disabled={!isBroadcasting}>
                                Finalizar Retransmisión
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 3. CONSOLA */}
                <div className={`w-full md:w-1/3 flex-col p-6 md:p-10 lg:p-12 bg-white overflow-y-auto ${getTabClass('console')}`}>
                    <div className="max-w-md mx-auto w-full flex flex-col h-full">
                        <h2 className="font-display text-2xl font-black text-cr-text tracking-tight mb-8">
                            Consola
                        </h2>

                        <h3 className="font-bold text-cr-text uppercase tracking-widest text-[11px] mb-3">
                            Tablero rectificado (vista cenital)
                        </h3>
                        
                        <div className="w-full max-w-[260px] mx-auto aspect-square bg-white rounded-2xl overflow-hidden border border-cr-border shadow-sm flex items-center justify-center p-2 mb-6">
                            {debugImage ? (
                                <img src={debugImage} alt="Visión Debug" className="w-full h-full object-contain rounded-xl" />
                            ) : (
                                <div className="flex flex-col items-center text-cr-muted opacity-50">
                                    <RefreshCw size={32} className="mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Esperando datos</span>
                                </div>
                            )}
                        </div>

                        <h3 className="font-bold text-cr-text uppercase tracking-widest text-[11px] mb-3">
                            Registro de actividad
                        </h3>
                        
                        <div className="bg-white border border-cr-border rounded-xl p-4 h-[160px] overflow-y-auto text-xs font-mono w-full">
                            {isBroadcasting ? (
                                <div className="space-y-4">
                                    <div className="text-emerald-600">
                                        <p>[{new Date().toLocaleTimeString()}]</p>
                                        <p>Conexión WS establecida ({stats.ping}ms)</p>
                                        <p>Homografía correcta</p>
                                        <p>Casillas ocupadas: {stats.occupied}/{stats.total}</p>
                                    </div>
                                    <div className="text-cr-muted">
                                        <p>Token de sesión: {token}</p>
                                        <p>Enlace copiable disponible.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-cr-muted italic">
                                    La consola está inactiva.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Menú inferior para móviles */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-cr-border flex items-stretch z-50">
                <button onClick={() => setActiveTab('config')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'config' ? 'text-cr-primary' : 'text-cr-muted'}`}>
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'config' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Config</span>
                </button>
                <button onClick={() => setActiveTab('vision')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'vision' ? 'text-cr-primary' : 'text-cr-muted'}`}>
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'vision' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Visión IA</span>
                </button>
                <button onClick={() => setActiveTab('console')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'console' ? 'text-cr-primary' : 'text-cr-muted'}`}>
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'console' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Consola</span>
                </button>
            </div>
        </div>
    )
}
