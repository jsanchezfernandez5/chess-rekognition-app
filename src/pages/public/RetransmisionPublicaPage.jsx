/**
 * Página pública de espectador para seguir una retransmisión de ajedrez en tiempo real.
 *
 * Flujo principal:
 *   1. Al montar el componente, abre una conexión WebSocket a /retransmision/ws/viewer/{token}.
 *   2. Recibe actualizaciones del tablero (FEN, PGN, último movimiento, metadatos) en tiempo real.
 *   3. El espectador puede navegar por el historial de jugadas sin perder la sincronización con el directo.
 *   4. Si el host cierra la retransmisión (código 1000), muestra el banner de "retransmisión finalizada".
 *   5. Si hay desconexión inesperada, reconecta automáticamente cada 3s.
 *
 * Estructura de dos columnas (desktop) / una columna (móvil):
 *   - Columna izquierda: datos de la partida, tablero interactivo, navegación por historial, PGN y compartir.
 *   - Columna derecha:   imagen de fondo + texto animado TypewriterText (solo desktop).
 *
 * No requiere autenticación: cualquier espectador con el token puede acceder.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Play, Download, Share2, Copy, Check, LayoutGrid, VideoOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { parsePgn } from '@/utils/pgnUtils'
import TypewriterText from '@/components/ui/TypewriterText'

export default function RetransmisionPublicaPage() {
    const { token } = useParams()
    const navigate = useNavigate()

    // -------------------------------------------------------
    // STATE — datos recibidos en tiempo real por WebSocket
    // -------------------------------------------------------
    const [liveFen, setLiveFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
    const [livePgn, setLivePgn] = useState('')
    const [liveLastMove, setLiveLastMove] = useState(null)
    const [moveType, setMoveType] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isFinished, setIsFinished] = useState(false)

    // Metadatos de la partida recibidos por WebSocket
    const [evento, setEvento] = useState('')
    const [blancas, setBlancas] = useState('')
    const [negras, setNegras] = useState('')
    const [resultado, setResultado] = useState('*')

    // -------------------------------------------------------
    // STATE navegación por el historial de jugadas
    // -------------------------------------------------------
    const [viewingMoveIndex, setViewingMoveIndex] = useState(-1)
    const [showShareModal, setShowShareModal] = useState(false)
    const [copied, setCopied] = useState(false)

    // IMPORTANTE: boardKey se incrementa cada vez que cambia displayFen para forzar el re-render del Chessboard.
    const [boardKey, setBoardKey] = useState(0)

    // Referencia al WebSocket activo (no provoca re-render al cambiar)
    const wsRef = useRef(null)

    // useEffect principal — gestiona toda la lógica del WebSocket
    useEffect(() => {
        let active = true
        let socket = null
        let reconnectTimeout = null
        let pingInterval = null

        const connect = () => {
            if (!active) return

            const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}`
            const protocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
            const host = apiUrl.replace(/^https?:\/\//, '')
            const wsUrl = `${protocol}//${host}/retransmision/ws/viewer/${token}`

            socket = new WebSocket(wsUrl)
            wsRef.current = socket

            socket.onopen = () => {
                if (!active) return
                setIsConnected(true)
                pingInterval = setInterval(() => {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send("ping")
                    }
                }, 30000)
            }

            socket.onmessage = (event) => {
                if (!active) return
                if (event.data === "pong" || event.data === "ping") return

                try {
                    const data = JSON.parse(event.data)

                    if (data.fen) setLiveFen(data.fen)
                    if (data.pgn) setLivePgn(data.pgn)
                    if (data.last_move) setLiveLastMove(data.last_move)
                    if (data.evento !== undefined) setEvento(data.evento || '')
                    if (data.blancas !== undefined) setBlancas(data.blancas || '')
                    if (data.negras !== undefined) setNegras(data.negras || '')
                    if (data.resultado !== undefined) setResultado(data.resultado || '*')

                    if (data.move_type && !['normal', 'capture'].includes(data.move_type)) {
                        setMoveType(data.move_type)
                        setTimeout(() => {
                            if (active) setMoveType(null)
                        }, 3000)
                    }
                } catch (e) {
                    console.error("Error parseando mensaje WebSocket:", e)
                }
            }

            socket.onclose = (event) => {
                if (pingInterval) {
                    clearInterval(pingInterval)
                    pingInterval = null
                }
                if (!active) return
                setIsConnected(false)

                if (event.code === 1000) {
                    setIsFinished(true)
                } else {
                    reconnectTimeout = setTimeout(connect, 3000)
                }
            }

            socket.onerror = () => {
                if (socket) socket.close()
            }
        }

        connect()

        return () => {
            active = false
            if (socket) socket.close()
            if (reconnectTimeout) clearTimeout(reconnectTimeout)
            if (pingInterval) clearInterval(pingInterval)
        }
    }, [token])

    // -------------------------------------------------------
    // Reconstruye el historial completo de posiciones desde el PGN. 
    // useMemo evita recalcularlo en cada render; solo se recalcula cuando cambia livePgn.
    // history[0]        = posición inicial (antes del primer movimiento)
    // history[i]        = posición tras el movimiento i-1
    // history[length-1] = posición actual (igual que liveFen)
    // -------------------------------------------------------
    const history = useMemo(() => {
        if (!livePgn) return []
        const tempChess = new Chess()
        try {
            tempChess.loadPgn(livePgn)
            const moves = tempChess.history({ verbose: true })
            const playChess = new Chess()
            const newHistory = [{ fen: playChess.fen(), lastMove: null }]
            for (const move of moves) {
                playChess.move(move)
                newHistory.push({
                    fen: playChess.fen(),
                    lastMove: { from: move.from, to: move.to }
                })
            }
            return newHistory
        } catch (err) {
            console.error(err)
            return []
        }
    }, [livePgn])

    // displayFen/displayLastMove — posición a mostrar en el tablero según el modo (directo o revisión)
    const displayFen = viewingMoveIndex === -1
        ? liveFen
        : (history[viewingMoveIndex]?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')

    const displayLastMove = viewingMoveIndex === -1
        ? liveLastMove
        : (history[viewingMoveIndex]?.lastMove || null)

    // Fuerza el re-render del componente Chessboard cuando cambia la posición
    useEffect(() => {
        setBoardKey(k => k + 1)
    }, [displayFen])

    // getMoveLabel — convierte el tipo de movimiento a su notación y descripción legible
    const getMoveLabel = (type) => {
        const labels = {
            'castling_short': 'O-O | Enroque corto',
            'castling_long': 'O-O-O | Enroque largo',
            'en_passant': 'Captura al paso',
            'promotion': 'Coronación'
        }
        return labels[type] || type
    }

    // Navegación paso a paso del historial de movimientos
    const handlePrev = () => {
        if (history.length <= 1) return
        if (viewingMoveIndex === -1) {
            setViewingMoveIndex(history.length - 2)
        } else {
            setViewingMoveIndex(Math.max(0, viewingMoveIndex - 1))
        }
    }

    // Navegación paso a paso del historial de movimientos
    const handleNext = () => {
        if (viewingMoveIndex === -1) return
        const nextIndex = viewingMoveIndex + 1
        if (nextIndex >= history.length - 1) {
            setViewingMoveIndex(-1)
        } else {
            setViewingMoveIndex(nextIndex)
        }
    }

    // Descarga el PGN con los metadatos actualizados
    const downloadPgn = () => {
        if (!livePgn) return
        let pgn = livePgn
        if (evento) pgn = pgn.replace(/\[Event ".*?"\]/, `[Event "${evento}"]`)
        if (blancas) pgn = pgn.replace(/\[White ".*?"\]/, `[White "${blancas}"]`)
        if (negras) pgn = pgn.replace(/\[Black ".*?"\]/, `[Black "${negras}"]`)
        if (resultado && resultado !== '*') pgn = pgn.replace(/\[Result ".*?"\]/, `[Result "${resultado}"]`)
        const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const whitePlayer = blancas.replace(/\s+/g, '_') || 'Blancas'
        const blackPlayer = negras.replace(/\s+/g, '_') || 'Negras'
        const eventName = evento.replace(/\s+/g, '_') || 'Retransmision'
        link.download = `${eventName}_${whitePlayer}_vs_${blackPlayer}.pgn`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    // Copia la URL actual al portapapeles y muestra feedback visual durante 2s
    const copyUrl = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Convierte el PGN a un array de movimientos
    const pgnMoves = parsePgn(livePgn)

    // -------------------------------------------------------
    // renderLeftColumn — panel izquierdo compartido entre desktop y móvil
    // Contiene: metadatos, tablero, controles de navegación, PGN y acciones
    // -------------------------------------------------------
    const renderLeftColumn = () => {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-cr-muted">Datos de la Retransmisión</span>
                    <div className="flex flex-col gap-1 text-sm font-bold text-cr-primary">
                        <div>
                            <span className="text-cr-muted font-normal mr-1">Blancas:</span>
                            {blancas || 'Cargando...'}
                        </div>
                        <div>
                            <span className="text-cr-muted font-normal mr-1">Negras:</span>
                            {negras || 'Cargando...'}
                        </div>
                        <div>
                            <span className="text-cr-muted font-normal mr-1">Resultado:</span>
                            {resultado === '*' ? 'En juego...' : resultado}
                        </div>
                    </div>
                </div>

                <div className="relative bg-cr-surface p-4 rounded-2xl border border-cr-border shadow-sm aspect-square w-full max-w-[400px] mx-auto overflow-hidden">
                    <Chessboard key={boardKey}
                        options={{
                            position: displayFen,
                            allowDragging: false,
                            squareStyles: {
                                ...(displayLastMove && {
                                    [displayLastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                                    [displayLastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
                                })
                            }
                        }}
                    />
                    <AnimatePresence>
                        {moveType && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-cr-primary text-white px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 border border-white/15 z-20"
                            >
                                <span>♟</span>
                                {getMoveLabel(moveType).toUpperCase()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center justify-center gap-6 px-2 py-3 bg-cr-surface2 border border-cr-border rounded-xl max-w-[400px] mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={history.length <= 1}
                            className="p-2 text-cr-muted hover:text-cr-primary hover:bg-cr-primary-light disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors cursor-pointer"
                            title="Jugada anterior"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewingMoveIndex(-1)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${viewingMoveIndex === -1
                                ? 'text-cr-primary bg-cr-primary-light animate-pulse font-bold'
                                : 'text-cr-muted hover:text-cr-primary hover:bg-cr-primary-light'
                                }`}
                            title="Volver al directo"
                        >
                            <Play size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={viewingMoveIndex === -1}
                            className="p-2 text-cr-muted hover:text-cr-primary hover:bg-cr-primary-light disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors cursor-pointer"
                            title="Siguiente jugada"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={downloadPgn}
                        disabled={!livePgn}
                        className="p-2 text-cr-muted hover:text-cr-primary hover:bg-cr-primary-light disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors cursor-pointer"
                        title="Descargar PGN"
                    >
                        <Download size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">Notación PGN</label>
                    <div className="w-full h-32 p-4 bg-cr-surface2 border border-cr-border rounded-2xl overflow-y-auto">
                        {livePgn ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {pgnMoves.map((move, i) => {
                                    const isHighlighted = viewingMoveIndex === -1
                                        ? i === pgnMoves.length - 1
                                        : i === viewingMoveIndex
                                    const moveNumber = Math.floor(i / 2) + 1
                                    const isWhite = i % 2 === 0
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setViewingMoveIndex(i)}
                                            className={`px-1.5 py-0.5 rounded transition-colors text-lg font-figurine cursor-pointer hover:bg-cr-primary-light hover:text-cr-primary ${isHighlighted ? 'bg-cr-primary-light text-cr-primary font-bold' : 'text-cr-text'
                                                }`}
                                        >
                                            {isWhite && (
                                                <span className="text-cr-muted mr-1 text-xs font-sans italic">{moveNumber}.</span>
                                            )}
                                            {move}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <span className="text-xs text-cr-muted italic">Esperando jugadas...</span>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    {/* DE MOMENTO NO HAY QRCODE - IMPLEMENTAR EN POSTERIORES FUNCIONALIDADES... */}
                    <div className="flex items-center justify-center p-3 bg-cr-surface2 border border-cr-border rounded-xl text-cr-muted">
                        <LayoutGrid size={20} />
                    </div>
                    <Button
                        onClick={() => setShowShareModal(true)}
                        variant="primary"
                        className="flex-1 h-12 text-xs font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
                    >
                        <Share2 size={16} />
                        Compartir Retransmisión
                    </Button>
                </div>
            </div>
        )
    }

    // -------------------------------------------------------
    // JSX PRINCIPAL
    // Header: logo + indicador de conexión (verde pulsante = en directo)
    // Desktop (md+): grid de 2 columnas — tablero + panel decorativo con TypewriterText
    // Móvil:         columna única con solo el panel izquierdo
    // -------------------------------------------------------
    return (
        <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
            <header className="w-full h-24 px-8 md:px-16 flex items-center justify-between bg-white border-b border-cr-border/40 shrink-0">
                <div className="pl-4">
                    <img src="/logo.svg" alt="Chess Rekognition" className="w-48 h-auto" />
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest text-cr-text">
                        {isConnected ? 'En directo' : 'Desconectado'}
                    </span>
                </div>
            </header>

            <div className="hidden md:grid grid-cols-2 gap-12 px-8 md:px-12 lg:px-16 pb-12 mt-8 flex-1">
                <div className="flex flex-col gap-6 border-r border-cr-border/40 pr-10">
                    <h2 className="font-display text-xl font-black text-cr-text tracking-tight">
                        {evento || 'Retransmisión en Directo'}
                    </h2>
                    {isFinished && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex flex-col items-center text-center gap-3">
                            <VideoOff className="w-8 h-8 text-rose-500" />
                            <div>
                                <h3 className="text-sm font-bold text-rose-800">La retransmisión ha finalizado</h3>
                                <p className="text-rose-600 text-xs mt-0.5">El anfitrión ha terminado la sesión o se ha desconectado.</p>
                            </div>
                            <Button onClick={() => navigate('/')} variant="secondary" className="text-xs py-2 px-4">
                                Volver al inicio
                            </Button>
                        </div>
                    )}
                    {renderLeftColumn()}
                </div>

                <div className="relative flex flex-col justify-center items-center bg-cr-bg overflow-hidden border border-cr-border rounded-2xl p-8 min-h-[400px]">
                    <img
                        src="/images/tablero_fondo.jpg"
                        alt="Chess match"
                        className="absolute inset-0 object-cover w-full h-full opacity-90 mix-blend-multiply"
                    />

                    <div className="relative z-10 flex flex-col items-center justify-center text-center px-8">
                        <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-md">
                            Chess Rekognition
                        </h2>
                        <div className="text-white/90 text-md md:text-lg font-medium tracking-wide drop-shadow text-center min-h-8">
                            <TypewriterText />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 md:hidden flex flex-col p-6 pb-12 mt-4 gap-6">
                <h2 className="font-display text-lg font-black text-cr-text tracking-tight">
                    {evento || 'Retransmisión en Directo'}
                </h2>
                {isFinished && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex flex-col items-center text-center gap-3">
                        <VideoOff className="w-8 h-8 text-rose-500" />
                        <div>
                            <h3 className="text-sm font-bold text-rose-800">La retransmisión ha finalizado</h3>
                            <p className="text-rose-600 text-xs mt-0.5">El anfitrión ha terminado la sesión o se ha desconectado.</p>
                        </div>
                        <Button onClick={() => navigate('/')} variant="secondary" className="text-xs py-2 px-4">
                            Volver al inicio
                        </Button>
                    </div>
                )}
                {renderLeftColumn()}
            </div>

            {/* Modal para compartir el enlace con otros espectadores */}
            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Compartir Retransmisión">
                <div className="p-6">
                    <p className="text-cr-muted text-sm mb-4">Envía este enlace a otros espectadores para que sigan la partida en vivo:</p>
                    <div className="flex gap-2 p-3 bg-cr-surface2 rounded-lg border border-cr-border">
                        <input
                            type="text"
                            readOnly
                            value={window.location.href}
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
