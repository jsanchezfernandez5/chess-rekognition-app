import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Copy, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { parsePgn } from '@/utils/pgnUtils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import InputText from '@/components/ui/InputText'
import Header from '@/components/layout/Header'

export default function RetransmisionPage() {
    const { authFetch } = useAuth()
    const navigate = useNavigate()

    const game = useRef(new Chess())
    const wsRef = useRef(null)
    const intervalRef = useRef(null)
    const detectingRef = useRef(false)
    const missCountRef = useRef(0)
    const retransmisionIdRef = useRef(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)

    const MISS_THRESHOLD = 3

    const [isCamActive, setIsCamActive] = useState(false)
    const [isCalibrated, setIsCalibrated] = useState(false)
    const [isAutoMode, setIsAutoMode] = useState(false)
    const [status, setStatus] = useState("Completa el formulario para comenzar")
    const [currentFen, setCurrentFen] = useState(game.current.fen())
    const [lastMove, setLastMove] = useState(null)
    const [pgn, setPgn] = useState("")
    const [retransmisionId, setRetransmisionId] = useState(null)
    const [token, setToken] = useState(null)
    const [showShareModal, setShowShareModal] = useState(false)
    const [copied, setCopied] = useState(false)
    const [logs, setLogs] = useState([])
    const [specialMove, setSpecialMove] = useState(null)

    const [isVisionActive, setIsVisionActive] = useState(false)
    const [activeTab, setActiveTab] = useState('config')
    const [manualPoints, setManualPoints] = useState([])
    const [lastBoardState, setLastBoardState] = useState(null)
    const [rotation, setRotation] = useState(0)
    const [aspectRatio, setAspectRatio] = useState('16/9')
    const [resultado, setResultado] = useState('*')
    const [formData, setFormData] = useState({
        evento: '',
        blancas: '',
        negras: '',
        lugar: '',
        ronda: '',
        tablero: ''
    })
    const [errors, setErrors] = useState({})
    const [videoDevices, setVideoDevices] = useState([])
    const [deviceIndex, setDeviceIndex] = useState(0)

    const cleanup = useCallback(async () => {
        clearInterval(intervalRef.current)
        if (wsRef.current) wsRef.current.close()
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
        }
        if (retransmisionIdRef.current) {
            authFetch(`/retransmision/${retransmisionIdRef.current}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_activa: false })
            }).catch(() => { })
        }
    }, [authFetch])

    const getDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoInputs = devices.filter(d => d.kind === 'videoinput')
            setVideoDevices(videoInputs)
        } catch (err) {
            console.error(err)
        }
    }, [])

    useEffect(() => {
        getDevices()
        return () => {
            cleanup()
        }
    }, [getDevices, cleanup])

    const addLog = useCallback((msg, status = "success", data = null) => {
        const now = new Date()
        const day = String(now.getDate()).padStart(2, '0')
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = now.getFullYear()
        const timeStr = `${day}/${month}/${year} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`

        let homografia = "correcta (64/64 casillas)"
        let piezas = "32/32 piezas"
        let vacias = "32/32 casillas"

        if (data) {
            let boardState = data.board_state
            if (data.squares) {
                boardState = {}
                data.squares.forEach(sq => {
                    boardState[sq.id] = { label: sq.occupied ? 'piece' : 'empty' }
                })
            }
            if (boardState) {
                const total = Object.keys(boardState).length || 64
                const numPieces = Object.values(boardState).filter(v => v.label !== 'empty').length
                const numEmpty = Object.values(boardState).filter(v => v.label === 'empty').length
                homografia = `correcta (${total}/64 casillas)`
                piezas = `${numPieces}/32 piezas`
                vacias = `${numEmpty}/32 casillas`
            }
        }
        if (status === "error") {
            homografia = "incorrecta (0/64 casillas)"
            piezas = "0/32 piezas"
            vacias = "0/32 casillas"
        }
        setLogs(prev => [{ time: timeStr, status, msg, homografia, piezas, vacias }, ...prev].slice(0, 5))
    }, [])

    const initWebSocket = useCallback((token) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://chess-rekognition-api-production.up.railway.app'
        const protocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
        const host = apiUrl.replace(/^https?:\/\//, '')
        const wsUrl = `${protocol}//${host}/retransmision/ws/host/${token}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            addLog("Canal de retransmisión abierto", "info")
            ws.send(JSON.stringify({
                evento: formData.evento,
                blancas: formData.blancas,
                negras: formData.negras,
                resultado: resultado,
                fen: game.current.fen(),
                pgn: game.current.pgn(),
                last_move: lastMove
            }))
        }
        ws.onerror = () => addLog("Error en WebSocket", "error")
        wsRef.current = ws
    }, [addLog, formData.evento, formData.blancas, formData.negras, resultado, lastMove])

    const startCamera = useCallback(async (deviceIdx = deviceIndex) => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
        }
        try {
            const constraints = {
                video: { width: 1280, height: 720 }
            }
            if (videoDevices.length > 0 && videoDevices[deviceIdx]) {
                constraints.video.deviceId = { exact: videoDevices[deviceIdx].deviceId }
            } else {
                constraints.video.facingMode = 'environment'
            }
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setIsCamActive(true)
                setStatus("Tablero no calibrado")
                addLog("Cámara iniciada", "success")
            }
        } catch (err) {
            addLog("Error de cámara: " + err.message, "error")
            setStatus("Error de cámara")
        }
    }, [deviceIndex, videoDevices, addLog])

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
            videoRef.current.srcObject = null
        }
        setIsCamActive(false)
        setIsAutoMode(false)
        setStatus("Cámara desactivada")
        addLog("Cámara desactivada", "info")
    }, [addLog])

    const cambiarCamara = useCallback(async () => {
        if (videoDevices.length <= 1) {
            addLog("No hay otras cámaras disponibles", "error")
            return
        }
        const nextIdx = (deviceIndex + 1) % videoDevices.length
        setDeviceIndex(nextIdx)
        await startCamera(nextIdx)
    }, [deviceIndex, videoDevices, startCamera, addLog])

    const activarVision = useCallback(async (e) => {
        if (e) e.preventDefault()
        const newErrors = {}
        if (!formData.evento) newErrors.evento = 'El nombre del evento es necesario'
        if (!formData.blancas) newErrors.blancas = 'Falta el nombre del jugador de blancas'
        if (!formData.negras) newErrors.negras = 'Falta el nombre del jugador de negras'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }
        setErrors({})
        setStatus("Inicializando...")
        try {
            const res = await authFetch('/retransmision/host', {
                method: 'POST',
                body: JSON.stringify({
                    blancas: formData.blancas,
                    negras: formData.negras,
                    evento: formData.evento,
                    lugar: formData.lugar || null,
                    ronda: formData.ronda ? parseInt(formData.ronda) : null,
                    tablero: formData.tablero ? parseInt(formData.tablero) : null
                })
            })
            if (!res.ok) {
                throw new Error("Error en respuesta del servidor")
            }
            const data = await res.json()
            setRetransmisionId(data.id_retransmision)
            retransmisionIdRef.current = data.id_retransmision
            setToken(data.token)
            initWebSocket(data.token)
            setIsVisionActive(true)
            await startCamera()
            setActiveTab('vision')
            addLog("Visión IA activada", "success")
        } catch (err) {
            addLog("Error al inicializar retransmisión: " + err.message, "error")
            setStatus("Error de inicialización")
        }
    }, [formData, authFetch, startCamera, initWebSocket, addLog])

    const calibrar = useCallback(async () => {
        if (!videoRef.current) return
        setStatus("Calibrando...")
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        const blob = await new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85))
        const fd = new FormData()
        fd.append('file', blob)
        fd.append('rotation', rotation)
        if (manualPoints.length === 4) {
            const coordsStr = manualPoints.map(p => `${p.x},${p.y}`).join(",")
            fd.append('coords', coordsStr)
        }
        try {
            const res = await authFetch('/vision/recognize-board', {
                method: 'POST',
                body: fd,
                headers: {}
            })
            const data = await res.json()
            if (data.success) {
                setIsCalibrated(true)
                setStatus("Tablero calibrado ✓")
                addLog("Calibración exitosa", "success", data)
            } else {
                setIsCalibrated(false)
                setStatus("Calibración fallida — ajusta el encuadre")
                addLog("Error calibración: " + data.error, "error")
            }
        } catch (err) {
            addLog("Error de red en calibración: " + err.message, "error")
        }
    }, [authFetch, addLog, manualPoints, rotation])

    const captureFrame = useCallback(() => {
        return new Promise(resolve => {
            const canvas = document.createElement('canvas')
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
        })
    }, [])

    const handleCanvasClick = (e) => {
        if (!canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height

        setManualPoints(prev => {
            if (prev.length >= 4) {
                return []
            } else {
                return [...prev, { x, y }]
            }
        })
    }

    const drawOverlay = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || !videoRef.current) return
        const w = canvasRef.current.width
        const h = canvasRef.current.height
        ctx.clearRect(0, 0, w, h)
        
        if (lastBoardState) {
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
            Object.entries(lastBoardState).forEach(([sq, val]) => {
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

        if (manualPoints.length > 0) {
            ctx.lineWidth = 2
            ctx.strokeStyle = "#10b981"
            ctx.fillStyle = "#ef4444"

            ctx.beginPath()
            ctx.moveTo(manualPoints[0].x * w, manualPoints[0].y * h)
            for (let i = 1; i < manualPoints.length; i++) {
                ctx.lineTo(manualPoints[i].x * w, manualPoints[i].y * h)
            }
            if (manualPoints.length === 4) {
                ctx.closePath()
            }
            ctx.stroke()

            manualPoints.forEach((pt, index) => {
                const px = pt.x * w
                const py = pt.y * h
                ctx.beginPath()
                ctx.arc(px, py, 6, 0, 2 * Math.PI)
                ctx.fill()
                ctx.fillStyle = "#ffffff"
                ctx.font = "10px sans-serif"
                ctx.textAlign = "center"
                ctx.fillText(String(index + 1), px, py + 3)
            })
        }
    }, [lastBoardState, manualPoints])

    const detectMove = useCallback(async () => {
        if (detectingRef.current) return
        detectingRef.current = true
        try {
            const blob = await captureFrame()
            const fd = new FormData()
            fd.append('file', blob)
            fd.append('prev_fen', game.current.fen())
            fd.append('rotation', rotation)
            if (manualPoints.length === 4) {
                const coordsStr = manualPoints.map(p => `${p.x},${p.y}`).join(",")
                fd.append('coords', coordsStr)
            }
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
            setLastBoardState(data.board_state)
            if (data.found) {
                missCountRef.current = 0
                const move = data.move
                try {
                    game.current.move(move.uci)
                } catch (e) {
                    addLog("Movimiento no válido local: " + e.message, "error")
                    return
                }
                setCurrentFen(data.new_fen)
                setPgn(game.current.pgn())
                setLastMove({ from: move.from, to: move.to })
                setStatus(`Movimiento: ${move.san}`)
                addLog(`${move.san} · ${move.type} · ${(data.confidence_avg * 100).toFixed(0)}%`, "success", data)
                if (["castling_short", "castling_long", "en_passant", "promotion"].includes(move.type)) {
                    setSpecialMove(move.type)
                    setTimeout(() => setSpecialMove(null), 3000)
                }
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        fen: data.new_fen,
                        pgn: game.current.pgn(),
                        last_move: { from: move.from, to: move.to },
                        move_type: move.type,
                        evento: formData.evento,
                        blancas: formData.blancas,
                        negras: formData.negras,
                        resultado: resultado
                    }))
                }
            } else {
                missCountRef.current++
                if (missCountRef.current >= MISS_THRESHOLD) {
                    setStatus("Posición incierta — confirma manualmente")
                }
                addLog("Posición incierta / mano detectada", "error")
            }
        } catch (err) {
            console.error(err)
        } finally {
            detectingRef.current = false
        }
    }, [authFetch, captureFrame, addLog, formData.evento, formData.blancas, formData.negras, resultado, manualPoints, rotation])

    useEffect(() => {
        if (isAutoMode) {
            setStatus("Escuchando...")
            intervalRef.current = setInterval(detectMove, 500)
        } else {
            clearInterval(intervalRef.current)
            if (isCalibrated) setStatus("Tablero calibrado ✓")
        }
        return () => clearInterval(intervalRef.current)
    }, [isAutoMode, isCalibrated, detectMove])

    useEffect(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                evento: formData.evento,
                blancas: formData.blancas,
                negras: formData.negras,
                resultado: resultado,
                fen: game.current.fen(),
                pgn: game.current.pgn(),
                last_move: lastMove
            }))
        }
    }, [resultado, formData.evento, formData.blancas, formData.negras, lastMove])

    // Ajustar el tamaño del canvas y relación de aspecto al cargar metadatos del vídeo
    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl) return

        const handleLoadedMetadata = () => {
            const width = videoEl.videoWidth
            const height = videoEl.videoHeight
            if (width && height) {
                setAspectRatio(`${width} / ${height}`)
                if (canvasRef.current) {
                    canvasRef.current.width = width
                    canvasRef.current.height = height
                }
                drawOverlay()
            }
        }

        videoEl.addEventListener('loadedmetadata', handleLoadedMetadata)
        videoEl.addEventListener('play', handleLoadedMetadata)
        
        if (videoEl.videoWidth) {
            handleLoadedMetadata()
        }

        return () => {
            videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
            videoEl.removeEventListener('play', handleLoadedMetadata)
        }
    }, [isCamActive, drawOverlay])

    // Redibujar el overlay cuando cambien los puntos manuales o el estado del tablero
    useEffect(() => {
        drawOverlay()
    }, [manualPoints, lastBoardState, drawOverlay])

    const finalizeGame = useCallback(async () => {
        if (!confirm("¿Deseas finalizar la retransmisión y guardar la partida?")) return
        try {
            await authFetch(`/retransmision/${retransmisionId}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_activa: false })
            })
            const payload = {
                evento: formData.evento,
                blancas: formData.blancas,
                negras: formData.negras,
                fecha: new Date().toISOString().split('T')[0],
                resultado: resultado,
                pgn: game.current.pgn(),
                tipo_partida: 'PR',
                ronda: formData.ronda ? parseInt(formData.ronda) : null,
                tablero: formData.tablero ? parseInt(formData.tablero) : null,
                lugar: formData.lugar || null,
                observaciones: null
            }
            await authFetch('/partidas', {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            addLog("Partida guardada con éxito", "success")
            setTimeout(() => navigate('/games'), 2000)
        } catch {
            addLog("Error al guardar", "error")
        }
    }, [retransmisionId, formData, resultado, authFetch, addLog, navigate])

    const copyUrl = useCallback(() => {
        const url = `${window.location.origin}/retransmision/${token}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [token])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const renderConfigForm = () => {
        return (
            <form onSubmit={activarVision} className="flex flex-col gap-5 flex-1 justify-between">
                <div className="flex flex-col gap-4">
                    <InputText
                        id="evento"
                        name="evento"
                        label="Evento *"
                        placeholder="Ej. Torneo UOC 2026"
                        value={formData.evento}
                        onChange={handleInputChange}
                        error={errors.evento}
                        disabled={isVisionActive}
                    />
                    <InputText
                        id="blancas"
                        name="blancas"
                        label="Blancas *"
                        placeholder="Nombre completo"
                        value={formData.blancas}
                        onChange={handleInputChange}
                        error={errors.blancas}
                        disabled={isVisionActive}
                    />
                    <InputText
                        id="negras"
                        name="negras"
                        label="Negras *"
                        placeholder="Nombre completo"
                        value={formData.negras}
                        onChange={handleInputChange}
                        error={errors.negras}
                        disabled={isVisionActive}
                    />
                    <InputText
                        id="lugar"
                        name="lugar"
                        label="Lugar"
                        placeholder="Ej. Club de Ajedrez"
                        value={formData.lugar}
                        onChange={handleInputChange}
                        disabled={isVisionActive}
                    />
                    <div className="flex gap-4">
                        <InputText
                            id="ronda"
                            name="ronda"
                            label="Ronda"
                            placeholder="Ej. 1"
                            value={formData.ronda}
                            onChange={handleInputChange}
                            disabled={isVisionActive}
                            className="flex-1"
                        />
                        <InputText
                            id="tablero"
                            name="tablero"
                            label="Tablero"
                            placeholder="Ej. 5"
                            value={formData.tablero}
                            onChange={handleInputChange}
                            disabled={isVisionActive}
                            className="flex-1"
                        />
                    </div>
                </div>
                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={isVisionActive}
                        variant="primary"
                        className="w-full h-12 uppercase tracking-widest text-xs font-black shadow-lg"
                    >
                        {isVisionActive ? "Visión IA Activa" : "Activar Visión IA"}
                    </Button>
                </div>
            </form>
        )
    }

    const renderVisionArea = () => {
        return (
            <div className="flex flex-col gap-6 flex-1">
                <div 
                    className="relative rounded-2xl overflow-hidden bg-black shadow-md border border-cr-border"
                    style={{ aspectRatio }}
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        width={1280}
                        height={720}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair z-10"
                    />
                    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-20">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 ${isCalibrated ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isCalibrated ? 'bg-green-400' : 'bg-red-400'}`} />
                            ESTADO
                        </span>
                        {isAutoMode && (
                            <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-red-500/30 animate-pulse flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                EN VIVO
                            </span>
                        )}
                    </div>
                    <AnimatePresence>
                        {specialMove && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-cr-primary text-white px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 border border-white/15 z-20"
                            >
                                <span>♟</span>
                                {specialMove.replace('_', ' ').toUpperCase()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {status && (
                    <div className="p-3 bg-cr-primary-light rounded-xl border border-cr-primary/10 flex items-center gap-3 text-xs">
                        <div className={`w-2 h-2 rounded-full ${isAutoMode ? 'bg-cr-primary animate-pulse' : 'bg-cr-muted'}`} />
                        <span className="text-cr-primary font-medium">{status}</span>
                    </div>
                )}
                <div className="flex gap-4">
                    <Button
                        onClick={cambiarCamara}
                        disabled={!isVisionActive}
                        variant="secondary"
                        className="flex-1 text-xs py-3 font-bold"
                    >
                        Cambiar cámara
                    </Button>
                    <Button
                        onClick={isCamActive ? stopCamera : () => startCamera()}
                        disabled={!isVisionActive}
                        variant="secondary"
                        className="flex-1 text-xs py-3 font-bold"
                    >
                        {isCamActive ? "Parar Cámara" : "Iniciar Cámara"}
                    </Button>
                </div>
                {isCamActive && (
                    <div className="flex gap-4">
                        <Button
                            onClick={calibrar}
                            variant="primary"
                            className="flex-1 text-xs font-bold py-3"
                        >
                            Calibrar tablero
                        </Button>
                        {manualPoints.length > 0 && (
                            <Button
                                onClick={() => setManualPoints([])}
                                variant="secondary"
                                className="flex-1 text-xs font-bold py-3 border-rose-500/30 text-rose-600 hover:bg-rose-50/50"
                            >
                                Limpiar Esquinas
                            </Button>
                        )}
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">Orientación de la cámara</label>
                    <div className="relative group">
                        <select
                            value={rotation}
                            onChange={(e) => setRotation(parseInt(e.target.value))}
                            disabled={!isVisionActive}
                            className="w-full h-12 appearance-none bg-cr-surface2 border border-cr-primary/15 focus:border-cr-primary rounded-xl px-4 text-sm font-bold text-cr-text transition-all outline-hidden cursor-pointer animate-none"
                        >
                            <option value={0}>Normal (0°)</option>
                            <option value={90}>Lateral Derecha (90° Horario)</option>
                            <option value={270}>Lateral Izquierda (90° Antihorario)</option>
                            <option value={180}>Invertido (180°)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cr-muted pointer-events-none group-hover:text-cr-primary transition-colors">
                            ▼
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-cr-surface2 rounded-xl border border-cr-border">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-cr-text">Detección Automática</span>
                        <span className="text-[10px] text-cr-muted">Buscar movimientos cada 500ms</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => isCalibrated && setIsAutoMode(!isAutoMode)}
                        disabled={!isCalibrated}
                        className={`w-10 h-5 rounded-full transition-colors relative outline-none ${!isCalibrated ? 'bg-gray-200 cursor-not-allowed' : (isAutoMode ? 'bg-cr-primary' : 'bg-gray-300')
                            }`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAutoMode ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">Notación PGN</label>
                    <div className="w-full h-32 p-4 bg-cr-surface2 border border-cr-border rounded-2xl overflow-y-auto">
                        {pgn ? (
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-figurine text-lg leading-relaxed text-cr-text">
                                {parsePgn(pgn).map((move, i) => (
                                    <div key={i} className={`px-1.5 py-0.5 rounded ${i === parsePgn(pgn).length - 1 ? 'bg-cr-primary-light text-cr-primary' : ''}`}>
                                        <span className="text-cr-muted mr-1.5 text-xs font-sans italic">{i + 1}.</span>
                                        {move}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-xs text-cr-muted italic">Esperando jugadas...</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">Resultado</label>
                    <div className="relative group">
                        <select
                            value={resultado}
                            onChange={(e) => setResultado(e.target.value)}
                            disabled={!isVisionActive}
                            className="w-full h-12 appearance-none bg-cr-surface2 border border-cr-primary/15 focus:border-cr-primary rounded-xl px-4 text-sm font-bold text-cr-text transition-all outline-hidden cursor-pointer animate-none"
                        >
                            <option value="*">En juego...</option>
                            <option value="1-0">1-0 (Blancas ganan)</option>
                            <option value="0-1">0-1 (Negras ganan)</option>
                            <option value="1/2-1/2">1/2-1/2 (Tablas)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cr-muted pointer-events-none group-hover:text-cr-primary transition-colors">
                            ▼
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-3 pt-2 mt-auto">
                    <Button
                        onClick={() => setShowShareModal(true)}
                        disabled={!token}
                        variant="primary"
                        className="w-full h-12 text-xs font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
                    >
                        <Share2 size={16} />
                        Compartir Retransmisión
                    </Button>
                    <Button
                        onClick={finalizeGame}
                        disabled={!isVisionActive}
                        variant="primary"
                        className="w-full h-12 text-xs font-black uppercase tracking-widest shadow-md bg-rose-600 hover:bg-rose-700 shadow-rose-600/10 hover:shadow-rose-700/20"
                    >
                        Finalizar Retransmisión
                    </Button>
                </div>
            </div>
        )
    }

    const renderConsoleArea = () => {
        return (
            <div className="flex flex-col gap-6 flex-1">
                <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">Tablero rectificado (vista cenital)</span>
                    <div className="bg-cr-surface p-4 rounded-2xl border border-cr-border shadow-sm aspect-square w-full max-w-[280px] mx-auto overflow-hidden">
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
                <div className="flex flex-col gap-2 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">Registro de actividad</span>
                    <div className="bg-cr-surface2 p-4 rounded-2xl border border-cr-border font-mono text-[11px] h-60 overflow-y-auto space-y-4 flex-1">
                        {logs.length === 0 ? (
                            <span className="text-cr-muted italic">Esperando actividad...</span>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className={`leading-relaxed border-b border-cr-border/40 pb-3 last:border-0 ${log.status === 'success' ? 'text-green-600' : 'text-rose-600'
                                    }`}>
                                    <p className="font-bold">[{log.time}]</p>
                                    <p>Homografía {log.homografia}</p>
                                    <p>Piezas reconocidas ({log.piezas})</p>
                                    <p>Casillas vacías ({log.vacias})</p>
                                    {log.msg && (
                                        <p className="text-[10px] mt-1 font-semibold flex items-center gap-1">
                                            <ChevronRight size={10} />
                                            {log.msg}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
            <Header />
            <div className="hidden md:grid grid-cols-3 gap-12 px-8 md:px-12 lg:px-16 pb-12 mt-8 flex-1">
                <div className="flex flex-col gap-6 border-r border-cr-border/40 pr-10">
                    <h2 className="font-display text-xl font-black text-cr-text tracking-tight">
                        Configuración
                    </h2>
                    {renderConfigForm()}
                </div>
                <div className="flex flex-col gap-6 border-r border-cr-border/40 pr-10">
                    <h2 className="font-display text-xl font-black text-cr-text tracking-tight">
                        Visión IA
                    </h2>
                    {renderVisionArea()}
                </div>
                <div className="flex flex-col gap-6">
                    <h2 className="font-display text-xl font-black text-cr-text tracking-tight">
                        Consola
                    </h2>
                    {renderConsoleArea()}
                </div>
            </div>
            <div className="flex-1 md:hidden flex flex-col p-6 pb-24 mt-4">
                {activeTab === 'config' && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                        <h2 className="font-display text-lg font-black text-cr-text tracking-tight">Configuración</h2>
                        {renderConfigForm()}
                    </div>
                )}
                {activeTab === 'vision' && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                        <h2 className="font-display text-lg font-black text-cr-text tracking-tight">Visión IA</h2>
                        {renderVisionArea()}
                    </div>
                )}
                {activeTab === 'consola' && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                        <h2 className="font-display text-lg font-black text-cr-text tracking-tight">Consola</h2>
                        {renderConsoleArea()}
                    </div>
                )}
            </div>
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-cr-border flex items-stretch z-50">
                <button
                    type="button"
                    onClick={() => setActiveTab('config')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'config' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'config' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Configuración</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('vision')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'vision' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'vision' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Visión IA</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('consola')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'consola' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'consola' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Consola</span>
                </button>
            </div>

            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Compartir Retransmisión">
                <div className="p-6">
                    <p className="text-cr-muted text-sm mb-4">Envía este enlace a los espectadores para que sigan la partida en vivo:</p>
                    <div className="flex gap-2 p-3 bg-cr-surface2 rounded-lg border border-cr-border">
                        <input
                            type="text"
                            readOnly
                            value={token ? `${window.location.origin}/retransmision/${token}` : ''}
                            className="bg-transparent flex-1 outline-none text-xs text-cr-text font-mono"
                        />
                        <button type="button" onClick={copyUrl} className="text-cr-primary hover:text-cr-primary-hover">
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    {copied && <p className="text-green-600 text-[10px] mt-2 font-medium">¡Enlace copiado!</p>}
                </div>
            </Modal>
        </div>
    )
}
