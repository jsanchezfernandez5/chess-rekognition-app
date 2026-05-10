import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Camera, 
    Settings, 
    Share2, 
    CheckCircle2, 
    AlertCircle, 
    History,
    Save,
    Copy,
    Check
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export default function RetransmisionPage() {
    const { authFetch } = useAuth()
    const navigate = useNavigate()
    
    // --- Refs de lógica (no provocan re-render) ---
    const game = useRef(new Chess())
    const wsRef = useRef(null)
    const intervalRef = useRef(null)
    const detectingRef = useRef(false)
    const missCountRef = useRef(0)
    const retransmisionIdRef = useRef(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const MISS_THRESHOLD = 3

    // --- Estado UI ---
    const [isCamActive, setIsCamActive] = useState(false)
    const [isCalibrated, setIsCalibrated] = useState(false)
    const [isAutoMode, setIsAutoMode] = useState(false)
    const [status, setStatus] = useState("Inicia la cámara para comenzar")
    const [currentFen, setCurrentFen] = useState(game.current.fen())
    const [lastMove, setLastMove] = useState(null)
    const [pgn, setPgn] = useState("")
    const [retransmisionId, setRetransmisionId] = useState(null)
    const [token, setToken] = useState(null)
    const [showShareModal, setShowShareModal] = useState(false)
    const [copied, setCopied] = useState(false)
    const [logs, setLogs] = useState([])
    const [specialMove, setSpecialMove] = useState(null)

    // --- Inicialización de la retransmisión ---
    useEffect(() => {
        let active = true
        async function init() {
            try {
                const res = await authFetch('/retransmision', {
                    method: 'POST',
                    body: JSON.stringify({
                        blancas: "Jugador Local",
                        negras: "Oponente",
                        evento: "Partida en vivo",
                        tablero: "Mesa 1"
                    })
                })
                const data = await res.json()
                if (active) {
                    setRetransmisionId(data.id)
                    retransmisionIdRef.current = data.id
                    setToken(data.token)
                    initWebSocket(data.token)
                }
            } catch (err) {
                addLog("Error al inicializar retransmisión: " + err.message)
            }
        }
        init()
        return () => { 
            active = false
            cleanup()
        }
    }, [])

    const cleanup = async () => {
        clearInterval(intervalRef.current)
        if (wsRef.current) wsRef.current.close()
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
        }
        // Finalizar en el backend si tenemos el ID
        if (retransmisionIdRef.current) {
            authFetch(`/retransmision/${retransmisionIdRef.current}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_activa: false })
            }).catch(() => {})
        }
    }

    const initWebSocket = (token) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/retransmision/ws/host/${token}`
        const ws = new WebSocket(wsUrl)
        
        ws.onopen = () => addLog("Canal de retransmisión abierto")
        ws.onerror = () => addLog("Error en WebSocket")
        wsRef.current = ws
    }

    // --- Cámara ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 1280, height: 720 }
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setIsCamActive(true)
                setStatus("Tablero no calibrado")
                addLog("Cámara iniciada")
            }
        } catch (err) {
            addLog("Error de cámara: " + err.message)
            setStatus("Error de cámara")
        }
    }

    // --- Calibración ---
    const calibrar = async () => {
        if (!videoRef.current) return
        setStatus("Calibrando...")
        
        const blob = await captureFrame()
        const fd = new FormData()
        fd.append('file', blob)

        try {
            const res = await authFetch('/vision/recognize-board', {
                method: 'POST',
                body: fd,
                headers: {} // Evitar Content-Type JSON
            })
            const data = await res.json()

            if (data.success) {
                setIsCalibrated(true)
                setStatus("Tablero calibrado ✓")
                addLog("Calibración exitosa")
            } else {
                setIsCalibrated(false)
                setStatus("Calibración fallida — ajusta el encuadre")
                addLog("Error calibración: " + data.error)
            }
        } catch (err) {
            addLog("Error de red en calibración")
        }
    }

    // --- Bucle de detección ---
    useEffect(() => {
        if (isAutoMode) {
            setStatus("Escuchando...")
            intervalRef.current = setInterval(detectMove, 500)
        } else {
            clearInterval(intervalRef.current)
            if (isCalibrated) setStatus("Tablero calibrado ✓")
        }
        return () => clearInterval(intervalRef.current)
    }, [isAutoMode, isCalibrated])

    const detectMove = async () => {
        if (detectingRef.current) return
        detectingRef.current = true

        try {
            const blob = await captureFrame()
            const fd = new FormData()
            fd.append('file', blob)
            fd.append('prev_fen', game.current.fen())

            const res = await authFetch('/vision/detect-move', {
                method: 'POST',
                body: fd,
                headers: {}
            })
            const data = await res.json()

            if (!data.success) {
                missCountRef.current++
                if (missCountRef.current >= MISS_THRESHOLD) {
                    setStatus("Mano detectada (esperando...)")
                }
                return
            }

            // Dibujar overlay visual
            drawOverlay(data.board_state)

            if (data.found) {
                missCountRef.current = 0
                const move = data.move
                
                // Aplicar a la lógica local
                game.current.move(move.uci)
                setCurrentFen(data.new_fen)
                setPgn(game.current.pgn())
                setLastMove({ from: move.from, to: move.to })
                setStatus(`Movimiento: ${move.san}`)
                addLog(`${move.san} · ${move.type} · ${(data.confidence_avg * 100).toFixed(0)}%`)

                // Badge especial
                if (["castling_short", "castling_long", "en_passant", "promotion"].includes(move.type)) {
                    setSpecialMove(move.type)
                    setTimeout(() => setSpecialMove(null), 3000)
                }

                // Emitir por WS
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        fen: data.new_fen,
                        pgn: game.current.pgn(),
                        last_move: { from: move.from, to: move.to },
                        move_type: move.type
                    }))
                }
            } else {
                missCountRef.current++
                if (missCountRef.current >= MISS_THRESHOLD) {
                    setStatus("Posición incierta — confirma manualmente")
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            detectingRef.current = false
        }
    }

    const captureFrame = () => {
        return new Promise(resolve => {
            const canvas = document.createElement('canvas')
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
        })
    }

    const drawOverlay = (boardState) => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || !videoRef.current) return

        const w = canvasRef.current.width
        const h = canvasRef.current.height
        ctx.clearRect(0, 0, w, h)

        // Aquí pintaríamos la cuadrícula proyectada si tuviéramos las esquinas en boardState,
        // pero por ahora pintamos etiquetas simbólicas sobre un grid 8x8 relativo al centro
        // para dar feedback visual. (En un sistema real, el backend devolvería las esquinas 
        // detectadas para pintar el polígono exacto).
        // Simplificamos: grid centrado
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
        ctx.lineWidth = 1
        const size = Math.min(w, h) * 0.8
        const x0 = (w - size) / 2
        const y0 = (h - size) / 2
        const cell = size / 8

        for (let i = 0; i <= 8; i++) {
            ctx.beginPath(); ctx.moveTo(x0 + i * cell, y0); ctx.lineTo(x0 + i * cell, y0 + size); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(x0, y0 + i * cell); ctx.lineTo(x0 + size, y0 + i * cell); ctx.stroke()
        }

        // Si hay piezas detectadas, las marcamos
        if (boardState) {
            Object.entries(boardState).forEach(([sq, val]) => {
                if (val.label !== 'empty') {
                    const col = sq.charCodeAt(0) - 97
                    const row = 8 - parseInt(sq[1])
                    const cx = x0 + col * cell + cell / 2
                    const cy = y0 + row * cell + cell / 2
                    
                    ctx.fillStyle = val.label.startsWith('w') ? "rgba(230, 239, 250, 0.8)" : "rgba(32, 78, 173, 0.8)"
                    ctx.beginPath(); ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2); ctx.fill()
                    ctx.fillStyle = val.label.startsWith('w') ? "#204ead" : "#ffffff"
                    ctx.font = "10px sans-serif"
                    ctx.textAlign = "center"
                    ctx.fillText(val.label.split('_')[1], cx, cy + 3)
                }
            })
        }
    }

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [{ time, msg }, ...prev].slice(0, 5))
    }

    const finalizeGame = async () => {
        if (!confirm("¿Deseas finalizar la retransmisión y guardar la partida?")) return
        
        try {
            await authFetch(`/retransmision/${retransmisionId}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_activa: false })
            })
            
            await authFetch('/partidas', {
                method: 'POST',
                body: JSON.stringify({
                    blancas: "Jugador Local",
                    negras: "Oponente",
                    pgn: game.current.pgn(),
                    tipo: "PR"
                })
            })

            addLog("Partida guardada con éxito")
            setTimeout(() => navigate('/games'), 2000)
        } catch (err) {
            addLog("Error al guardar")
        }
    }

    const copyUrl = () => {
        const url = `${window.location.origin}/retransmision/${token}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Helper para PGN
    const parsePgn = (pgnString) => {
        if (!pgnString) return []
        const moves = pgnString.replace(/\[.*?\]/g, '').trim().split(/\d+\.\s+/).filter(Boolean)
        return moves.map(m => m.trim())
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* --- COLUMNA IZQUIERDA: CÁMARA --- */}
                <div className="lg:w-2/3">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-xl border border-cr-border">
                        <video 
                            ref={videoRef}
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover"
                        />
                        <canvas 
                            ref={canvasRef}
                            width={1280}
                            height={720}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        />
                        
                        {/* Overlay de estado */}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md flex items-center gap-1.5 ${
                                isCalibrated ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                                {isCalibrated ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                                {isCalibrated ? "Calibrado" : "Sin calibrar"}
                            </span>
                            {isAutoMode && (
                                <span className="px-3 py-1 bg-cr-primary/40 text-blue-100 rounded-full text-xs font-medium backdrop-blur-md border border-cr-primary/30 animate-pulse flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                    En vivo
                                </span>
                            )}
                        </div>

                        {/* Special Move Badge */}
                        <AnimatePresence>
                            {specialMove && (
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-cr-primary text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 border-2 border-white/20"
                                >
                                    <span className="text-2xl">♟</span>
                                    {specialMove.replace('_', ' ').toUpperCase()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Controles */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 bg-cr-surface p-5 rounded-2xl border border-cr-border shadow-sm">
                        {!isCamActive ? (
                            <Button onClick={startCamera} variant="primary" className="flex items-center gap-2">
                                <Camera size={18} /> Iniciar cámara
                            </Button>
                        ) : (
                            <Button onClick={calibrar} variant="secondary" className="flex items-center gap-2">
                                <Settings size={18} /> Calibrar tablero
                            </Button>
                        )}

                        <div className="h-8 w-px bg-cr-border hidden sm:block" />

                        <div className="flex items-center gap-3 ml-auto">
                            <span className="text-sm font-medium text-cr-muted">Reconocimiento</span>
                            <button 
                                onClick={() => isCalibrated && setIsAutoMode(!isAutoMode)}
                                disabled={!isCalibrated}
                                className={`w-12 h-6 rounded-full transition-colors relative ${
                                    !isCalibrated ? 'bg-gray-200 cursor-not-allowed' : (isAutoMode ? 'bg-cr-primary' : 'bg-gray-300')
                                }`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isAutoMode ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Info Status */}
                    <div className="mt-4 p-4 bg-cr-primary-light rounded-xl border border-cr-primary/10 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isAutoMode ? 'bg-cr-primary animate-pulse' : 'bg-cr-muted'}`} />
                        <span className="text-cr-primary font-medium">{status}</span>
                    </div>
                </div>

                {/* --- COLUMNA DERECHA: TABLERO + CONSOLA --- */}
                <div className="lg:w-1/3 flex flex-col gap-6">
                    
                    {/* Mini tablero de visualización */}
                    <div className="bg-cr-surface p-4 rounded-2xl border border-cr-border shadow-sm overflow-hidden">
                        <div className="aspect-square w-full">
                            <Chessboard 
                                position={currentFen} 
                                arePiecesDraggable={false}
                                customSquareStyles={{
                                    ...(lastMove && {
                                        [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                                        [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
                                    })
                                }}
                            />
                        </div>
                    </div>

                    {/* PGN / Historial */}
                    <div className="bg-cr-surface rounded-2xl border border-cr-border shadow-sm flex flex-col h-64">
                        <div className="p-4 border-b border-cr-border flex items-center gap-2">
                            <History size={16} className="text-cr-primary"/>
                            <span className="font-bold text-sm uppercase tracking-wider">Historial</span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 font-figurine text-lg leading-relaxed bg-cr-surface2">
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                {parsePgn(pgn).map((move, i) => (
                                    <div key={i} className={`px-2 py-1 rounded ${i === parsePgn(pgn).length - 1 ? 'bg-cr-primary-light text-cr-primary' : ''}`}>
                                        <span className="text-cr-muted mr-2">{i + 1}.</span>
                                        {move}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Logs técnicos */}
                    <div className="bg-cr-surface2 p-4 rounded-xl border border-cr-border font-mono text-[10px] h-32 overflow-hidden">
                        {logs.length === 0 && <span className="text-cr-muted">Esperando actividad...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1">
                                <span className="text-cr-muted mr-2">[{log.time}]</span>
                                <span>{log.msg}</span>
                            </div>
                        ))}
                    </div>

                    {/* Acciones finales */}
                    <div className="flex gap-3">
                        <Button onClick={() => setShowShareModal(true)} variant="ghost" className="flex-1 border border-cr-border">
                            <Share2 size={18} /> Compartir
                        </Button>
                        <Button onClick={finalizeGame} variant="primary" className="flex-1">
                            <Save size={18} /> Finalizar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal de Compartir */}
            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Compartir Retransmisión">
                <div className="p-6">
                    <p className="text-cr-muted text-sm mb-4">Envía este enlace a los espectadores para que sigan la partida en vivo:</p>
                    <div className="flex gap-2 p-3 bg-cr-surface2 rounded-lg border border-cr-border">
                        <input 
                            type="text" 
                            readOnly 
                            value={`${window.location.origin}/retransmision/${token}`}
                            className="bg-transparent flex-1 outline-none text-xs text-cr-text font-mono"
                        />
                        <button onClick={copyUrl} className="text-cr-primary hover:text-cr-primary-hover">
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    {copied && <p className="text-green-600 text-[10px] mt-2 font-medium">¡Enlace copiado!</p>}
                </div>
            </Modal>
        </div>
    )
}
