import { useState, useCallback, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import Modal from '@/components/ui/Modal'

export default function ChessBoard({
    initialFen = 'start',
    boardOrientation = 'white',
    onChange,
    actionRef
}) {
    const game = useRef(new Chess(initialFen === 'start' ? undefined : initialFen))
    const [fen, setFen] = useState(game.current.fen())
    const [showPromotionModal, setShowPromotionModal] = useState(false)
    const [movePendingPromotion, setMovePendingPromotion] = useState(null)

    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    const notifyChange = useCallback(() => {
        // Deferimos la notificación al padre para no interrumpir el ciclo de eventos
        setTimeout(() => {
            if (onChangeRef.current) {
                // Limpiamos los tags de PGN [Event "..."] etc. para dejar solo la notación
                const rawPgn = game.current.pgn()
                const cleanPgn = rawPgn.replace(/\[.*?\]\s*/g, '').trim()

                onChangeRef.current({
                    fen: game.current.fen(),
                    pgn: cleanPgn,
                    history: game.current.history({ verbose: true }),
                    game: game.current
                })
            }
        }, 0)
    }, [])

    // En react-chessboard v5, onPieceDrop recibe UN OBJETO:
    // { piece: string/object, sourceSquare: string, targetSquare: string }
    function onDrop({ piece, sourceSquare, targetSquare }) {
        // En algunas subversiones de v5, piece es un objeto con pieceType
        const pieceType = typeof piece === 'string' ? piece : piece?.pieceType ?? ''

        if (!sourceSquare || !targetSquare) return false

        try {
            // Detectar coronación: pieceType es "wP" o "bP"
            if (pieceType && pieceType[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1')) {
                const moves = game.current.moves({ square: sourceSquare, verbose: true })
                if (moves.some(m => m.to === targetSquare)) {
                    setMovePendingPromotion({ from: sourceSquare, to: targetSquare })
                    setShowPromotionModal(true)
                    return false
                }
            }

            const move = game.current.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q'
            })

            if (move === null) {
                return false
            }

            setFen(game.current.fen())
            notifyChange()
            return true
        } catch (e) {
            return false
        }
    }

    function handlePromotion(pieceType) {
        if (!movePendingPromotion) return
        game.current.move({
            from: movePendingPromotion.from,
            to: movePendingPromotion.to,
            promotion: pieceType
        })
        setFen(game.current.fen())
        notifyChange()
        setMovePendingPromotion(null)
        setShowPromotionModal(false)
    }

    useEffect(() => {
        if (!actionRef) return
        actionRef.current = {
            undo: () => { game.current.undo(); setFen(game.current.fen()); notifyChange() },
            reset: () => { game.current.reset(); setFen(game.current.fen()); notifyChange() }
        }
    }, [actionRef, notifyChange])

    return (
        <div className="w-full flex justify-center items-center">
            <div className="w-full aspect-square max-w-[500px] shadow-2xl rounded-2xl bg-white p-4">
                <Chessboard
                    options={{
                        position: fen,
                        onPieceDrop: onDrop,
                        boardOrientation: boardOrientation,
                        allowDragging: true,
                        animationDurationInMs: 200,
                    }}
                />
            </div>

            <Modal
                isOpen={showPromotionModal}
                onClose={() => { setShowPromotionModal(false); setMovePendingPromotion(null) }}
                title="Elige pieza para coronar"
                maxWidth="max-w-xs"
            >
                <div className="grid grid-cols-2 gap-3 p-2">
                    {[
                        { type: 'q', label: 'Dama', icon: '♕' },
                        { type: 'r', label: 'Torre', icon: '♖' },
                        { type: 'b', label: 'Alfil', icon: '♗' },
                        { type: 'n', label: 'Caballo', icon: '♘' }
                    ].map((p) => (
                        <button
                            key={p.type}
                            onClick={() => handlePromotion(p.type)}
                            className="flex flex-col items-center justify-center p-4 bg-cr-bg hover:bg-cr-primary hover:text-white rounded-2xl transition-all group"
                        >
                            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{p.icon}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest">{p.label}</span>
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    )
}
