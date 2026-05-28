import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, ChevronLeft, LayoutDashboard, ExternalLink } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function RetransmisionPublicaPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    
    // --- Estado de la partida ---
    const [currentFen, setCurrentFen] = useState('start')
    const [pgn, setPgn] = useState('')
    const [lastMove, setLastMove] = useState(null)
    const [moveType, setMoveType] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    
    // --- WebSocket ---
    const wsRef = useRef(null)

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/retransmision/ws/viewer/${token}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            setIsConnected(true)
            console.log("Conectado a la retransmisión")
        }

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            
            if (data.fen) setCurrentFen(data.fen)
            if (data.pgn) setPgn(data.pgn)
            if (data.last_move) setLastMove(data.last_move)
            
            // Mostrar badge si es una jugada especial
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

    // Helper para formatear PGN
    const parsePgn = (pgnString) => {
        if (!pgnString) return []
        // Extraer solo los movimientos (quitar cabeceras [])
        const rawMoves = pgnString.replace(/\[.*?\]/g, '').trim()
        // Dividir por números de jugada 1. e4 e5 -> ["e4 e5", "Nf3 Nc6"...]
        const moves = rawMoves.split(/\d+\.\s+/).filter(Boolean)
        return moves.map(m => m.trim())
    }

    const getMoveLabel = (type) => {
        const labels = {
            'castling_short': 'O-O · Enroque corto',
            'castling_long': 'O-O-O · Enroque largo',
            'en_passant': '⬡ Captura al paso',
            'promotion': '♛ Coronación'
        }
        return labels[type] || type
    }

    return (
        <div className="min-h-screen bg-cr-bg py-12 px-4">
            <div className="max-w-2xl mx-auto">
                
                {/* Cabecera */}
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display text-cr-primary font-bold">♟ Partida en directo</h1>
                        <p className="text-cr-muted text-sm mt-1">Siguiendo la acción en tiempo real</p>
                    </div>
                    
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border bg-cr-surface shadow-sm ${
                        isConnected ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-500'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-xs font-bold uppercase tracking-widest">
                            {isConnected ? 'En directo' : 'Desconectado'}
                        </span>
                    </div>
                </header>

                <main className="space-y-6">
                    
                    {/* Banner de Finalización */}
                    <AnimatePresence>
                        {isFinished && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="bg-cr-primary text-white p-6 rounded-2xl shadow-lg border border-white/10 flex flex-col items-center text-center gap-4"
                            >
                                <LayoutDashboard className="w-12 h-12 opacity-50" />
                                <div>
                                    <h3 className="text-xl font-bold">La retransmisión ha finalizado</h3>
                                    <p className="text-blue-100/70 text-sm">El anfitrión ha cerrado la sesión de juego.</p>
                                </div>
                                <Button onClick={() => navigate('/')} variant="secondary" className="mt-2">
                                    <ChevronLeft size={18} /> Volver al inicio
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tablero Principal */}
                    <div className="relative bg-cr-surface p-6 rounded-3xl border border-cr-border shadow-xl">
                        <div className="aspect-square w-full max-w-[500px] mx-auto">
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

                        {/* Badge de Jugada Especial */}
                        <AnimatePresence>
                            {moveType && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-cr-primary text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-white font-bold text-xs whitespace-nowrap"
                                >
                                    {getMoveLabel(moveType)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Historial de Jugadas */}
                    <div className="bg-cr-surface rounded-2xl border border-cr-border shadow-md overflow-hidden">
                        <div className="p-4 border-b border-cr-border bg-cr-surface2 flex items-center gap-2">
                            <Radio size={16} className="text-cr-primary animate-pulse" />
                            <span className="font-bold text-xs uppercase tracking-widest text-cr-text">Retransmisión PGN</span>
                        </div>
                        <div className="p-8 font-figurine text-2xl leading-relaxed text-cr-text min-h-[120px]">
                            {pgn ? (
                                <div className="flex flex-wrap gap-x-8 gap-y-3">
                                    {parsePgn(pgn).map((movePair, i) => (
                                        <div key={i} className={`flex items-center gap-2 ${i === parsePgn(pgn).length - 1 ? 'text-cr-primary' : ''}`}>
                                            <span className="text-cr-muted text-sm italic">{i + 1}.</span>
                                            <span>{movePair}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-4 text-cr-muted">
                                    <div className="w-12 h-1 bg-cr-border rounded-full mb-3" />
                                    <p className="text-sm font-sans italic">Esperando el primer movimiento...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Info */}
                    <footer className="pt-8 text-center">
                        <p className="text-[10px] text-cr-muted uppercase tracking-[0.2em]">Powered by Chess Rekognition Engine v1.0</p>
                    </footer>
                </main>
            </div>
        </div>
    )
}
