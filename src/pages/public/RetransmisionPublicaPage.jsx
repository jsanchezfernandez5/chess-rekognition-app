import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    ArrowLeft, 
    ArrowRight, 
    Play, 
    Download, 
    Share2, 
    Copy, 
    Check, 
    LayoutGrid, 
    VideoOff
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { parsePgn } from '@/utils/pgnUtils'

export default function RetransmisionPublicaPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    
    const [liveFen, setLiveFen] = useState('start')
    const [livePgn, setLivePgn] = useState('')
    const [liveLastMove, setLiveLastMove] = useState(null)
    const [moveType, setMoveType] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    
    const [evento, setEvento] = useState('')
    const [blancas, setBlancas] = useState('')
    const [negras, setNegras] = useState('')
    const [resultado, setResultado] = useState('*')
    
    const [viewingMoveIndex, setViewingMoveIndex] = useState(-1)
    const [showShareModal, setShowShareModal] = useState(false)
    const [copied, setCopied] = useState(false)
    
    const wsRef = useRef(null)

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/retransmision/ws/viewer/${token}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            setIsConnected(true)
        }

        ws.onmessage = (event) => {
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
                setTimeout(() => setMoveType(null), 3000)
            }
        }

        ws.onclose = () => {
            setIsConnected(false)
            setIsFinished(true)
        }

        wsRef.current = ws
        return () => ws.close()
    }, [token])

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

    const getMoveLabel = (type) => {
        const labels = {
            'castling_short': 'O-O · Enroque corto',
            'castling_long': 'O-O-O · Enroque largo',
            'en_passant': '⬡ Captura al paso',
            'promotion': '♛ Coronación'
        }
        return labels[type] || type
    }

    const handlePrev = () => {
        if (history.length <= 1) return
        if (viewingMoveIndex === -1) {
            setViewingMoveIndex(history.length - 2)
        } else {
            setViewingMoveIndex(Math.max(0, viewingMoveIndex - 1))
        }
    }

    const handleNext = () => {
        if (viewingMoveIndex === -1) return
        const nextIndex = viewingMoveIndex + 1
        if (nextIndex >= history.length - 1) {
            setViewingMoveIndex(-1)
        } else {
            setViewingMoveIndex(nextIndex)
        }
    }

    const downloadPgn = () => {
        if (!livePgn) return
        const blob = new Blob([livePgn], { type: 'text/plain;charset=utf-8' })
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

    const copyUrl = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const displayFen = viewingMoveIndex === -1 
        ? liveFen 
        : (history[viewingMoveIndex]?.fen || 'start')

    const displayLastMove = viewingMoveIndex === -1 
        ? liveLastMove 
        : (history[viewingMoveIndex]?.lastMove || null)

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
                    <Chessboard 
                        position={displayFen} 
                        arePiecesDraggable={false}
                        customSquareStyles={{
                            ...(displayLastMove && {
                                [displayLastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                                [displayLastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
                            })
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

                <div className="flex items-center justify-between px-2 py-3 bg-cr-surface2 border border-cr-border rounded-xl">
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
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                viewingMoveIndex === -1 
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
                                {parsePgn(livePgn).map((move, i) => {
                                    const isHighlighted = viewingMoveIndex === -1 
                                        ? i === parsePgn(livePgn).length - 1 
                                        : i === viewingMoveIndex
                                    const moveNumber = Math.floor(i / 2) + 1
                                    const isWhite = i % 2 === 0
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setViewingMoveIndex(i)}
                                            className={`px-1.5 py-0.5 rounded transition-colors text-lg font-figurine cursor-pointer hover:bg-cr-primary-light hover:text-cr-primary ${
                                                isHighlighted ? 'bg-cr-primary-light text-cr-primary font-bold' : 'text-cr-text'
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

                <div className="flex flex-col gap-6">
                    <h2 className="font-display text-xl font-black text-cr-text tracking-tight">
                        Cámara de Retransmisión
                    </h2>
                    <div className="relative flex-1 aspect-video md:aspect-auto md:h-[400px] bg-cr-surface2 border border-cr-border rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8">
                        <svg className="absolute inset-0 w-full h-full text-cr-border/40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="2" />
                            <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        
                        <div className="relative z-10 flex flex-col items-center text-center gap-3">
                            <div className="p-4 rounded-full bg-white border border-cr-border text-cr-muted shadow-sm">
                                <VideoOff size={32} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-cr-text">Vídeo Desactivado</h3>
                                <p className="text-xs text-cr-muted mt-1 max-w-[240px]">
                                    El anfitrión no está transmitiendo señal de cámara en directo para esta partida.
                                </p>
                            </div>
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
