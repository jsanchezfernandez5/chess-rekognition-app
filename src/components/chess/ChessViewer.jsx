import { useState, useEffect, useRef, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Download
} from 'lucide-react'
import { downloadPgn } from '@/utils/pgnUtils'

/**
 * Visor PGN robusto - Armonizado y compatible con react-chessboard v5.
 * Probando con props planos para evitar el error de 'Piece undefined'.
 */
export default function ChessViewer({ partida }) {
    const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    const [history, setHistory] = useState([])
    const [currentMoveIdx, setCurrentMoveIdx] = useState(-1)
    const [isPlaying, setIsPlaying] = useState(false)

    const playInterval = useRef(null)

    // Resetear al cambiar la partida
    useEffect(() => {
        if (!partida) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHistory([])
            setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
            setCurrentMoveIdx(-1)
            setIsPlaying(false)
            return
        }

        try {
            const game = new Chess()
            const movesOnly = (partida.pgn || '')
                .replace(/\[.*?\]/g, '')
                .replace(/\{.*?\}/g, '')
                .replace(/\(.*?\)/g, '')
                .trim()

            if (game.loadPgn(movesOnly)) {
                setHistory(game.history({ verbose: true }))
            } else {
                // Modo manual
                game.reset()
                const simpleMoves = movesOnly.split(/\s+/).filter(m => !m.match(/^\d+\./) && m.length > 1 && !m.match(/^(1-0|0-1|1\/2-1\/2|\*)$/))
                for (const m of simpleMoves) {
                    try { game.move(m) } catch (err) { console.warn("Movimiento no válido ignorado:", m, err) }
                }
                setHistory(game.history({ verbose: true }))
            }
            setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
            setCurrentMoveIdx(-1)
            setIsPlaying(false)
        } catch (err) {
            console.error('Visor: Error al cargar partida', err)
        }
    }, [partida])

    // Función estable para obtener el FEN
    const syncBoard = useCallback((idx, moves) => {
        const temp = new Chess()
        for (let i = 0; i <= idx; i++) {
            if (moves[i]) temp.move(moves[i].san)
        }
        const newFen = temp.fen()
        setFen(newFen)
        setCurrentMoveIdx(idx)
        return newFen
    }, [])

    const handleNext = useCallback(() => {
        if (currentMoveIdx < history.length - 1) {
            syncBoard(currentMoveIdx + 1, history)
        } else {
            setIsPlaying(false)
        }
    }, [currentMoveIdx, history, syncBoard])

    const handlePrev = useCallback(() => {
        if (currentMoveIdx >= 0) {
            syncBoard(currentMoveIdx - 1, history)
        }
    }, [currentMoveIdx, history, syncBoard])

    // Autoplay
    useEffect(() => {
        if (isPlaying) {
            playInterval.current = setInterval(() => {
                handleNext()
            }, 1000)
        } else {
            if (playInterval.current) clearInterval(playInterval.current)
        }
        return () => { if (playInterval.current) clearInterval(playInterval.current) }
    }, [isPlaying, handleNext])

    if (!partida) return null

    return (
        <div className="w-full flex flex-col items-center">

            <div className="w-full aspect-square max-w-[420px] shadow-2xl rounded-[30px] bg-white p-4 mb-8 border border-cr-border/10">
                <Chessboard
                    options={{
                        position: fen,
                        allowDragging: false,
                        animationDurationInMs: 300,
                    }}
                />
            </div>

            <div className="flex items-center gap-12 mb-10">
                <button
                    onClick={handlePrev}
                    className="p-2 text-cr-text hover:text-cr-primary transition-all disabled:opacity-20 cursor-pointer"
                    disabled={currentMoveIdx === -1}
                >
                    <ChevronLeft size={48} strokeWidth={2.5} />
                </button>

                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center justify-center text-cr-primary transition-transform hover:scale-110 w-16"
                >
                    {isPlaying ? <Pause size={56} fill="currentColor" /> : <Play size={56} fill="currentColor" className="ml-1" />}
                </button>

                <button
                    onClick={handleNext}
                    className="p-2 text-cr-text hover:text-cr-primary transition-all disabled:opacity-20 cursor-pointer"
                    disabled={currentMoveIdx === history.length - 1}
                >
                    <ChevronRight size={48} strokeWidth={2.5} />
                </button>
            </div>

            <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[12px] uppercase font-bold text-cr-muted tracking-widest pl-2">
                        Notación PGN
                    </label>
                    <button
                        onClick={() => downloadPgn(partida)}
                        className="p-2 text-cr-text hover:text-cr-primary transition-colors cursor-pointer"
                    >
                        <Download size={30} />
                    </button>
                </div>

                <div className="w-full h-36 p-6 bg-cr-bg rounded-[30px] shadow-inner overflow-y-auto">
                    <div className="flex flex-wrap gap-x-4 gap-y-4" style={{ fontFamily: '"Figurine", serif', fontSize: '1.4rem' }}>
                        {history.length > 0 ? history.map((m, i) => (
                            <div
                                key={i}
                                className={`flex items-baseline gap-1 cursor-pointer px-1 rounded-sm ${i === currentMoveIdx ? 'text-cr-primary font-bold scale-110' : 'text-cr-text opacity-70'}`}
                                onClick={() => { syncBoard(i, history); setIsPlaying(false); }}
                            >
                                {i % 2 === 0 && (
                                    <span className="font-sans text-[0.85rem] text-cr-muted font-bold -mr-0.5">
                                        {Math.floor(i / 2) + 1}.
                                    </span>
                                )}
                                <span>{m.san}</span>
                            </div>
                        )) : (
                            <span className="font-sans text-sm text-cr-muted italic">Partida sin jugadas</span>
                        )}
                    </div>
                </div>
            </div>

        </div>
    )
}
