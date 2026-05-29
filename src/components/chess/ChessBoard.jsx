/**
 * Componente de tablero de ajedrez interactivo que utiliza la librería react-chessboard para renderizar el tablero y chess.js para manejar la lógica del juego.
 * Permite a los usuarios arrastrar y soltar piezas para realizar movimientos, con soporte para promociones de peones mediante un modal.
 * El componente también expone métodos para deshacer movimientos, reiniciar el juego o realizar movimientos programáticamente a través de una referencia.
 * 
 * Props:
 * - initialFen: Cadena FEN para establecer la posición inicial del tablero (por defecto 'start' para la posición inicial estándar).
 * - boardOrientation: Orientación del tablero ('white' o 'black').
 * - onChange: Función callback que se llama cada vez que el estado del juego cambia, recibiendo un objeto con información del juego.
 * - actionRef: Referencia externa para exponer métodos de control del juego (undo, reset, move).
 * 
 * El componente maneja internamente el estado del juego utilizando chess.js, y actualiza el estado del tablero cada vez que se realiza un movimiento válido.
 * Para los movimientos de promoción, muestra un modal para que el usuario seleccione la pieza a la que desea promover su peón.
 * Cada vez que el juego cambia, se llama al callback onChange con la información actualizada del juego, incluyendo FEN, PGN, historial de movimientos, turno actual y estado de juego.
 * 
 */

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

    const [fen, setFen] = useState(() => new Chess(initialFen === 'start' ? undefined : initialFen).fen())

    const [showPromotionModal, setShowPromotionModal] = useState(false)
    const [movePendingPromotion, setMovePendingPromotion] = useState(null)

    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    // Función para notificar cambios en el juego, se llama después de cada movimiento válido.
    const notifyChange = useCallback(() => {
        setTimeout(() => {
            if (onChangeRef.current) {
                const rawPgn = game.current.pgn()
                const cleanPgn = rawPgn.replace(/\[.*?\]/g, '').trim()

                onChangeRef.current({
                    fen: game.current.fen(),
                    pgn: cleanPgn,
                    history: game.current.history({ verbose: true }),
                    game: game.current,
                    turn: game.current.turn(),
                    isGameOver: game.current.isGameOver(),
                    gameResult: game.current.isGameOver()
                        ? (game.current.isDraw() ? '1/2-1/2' : (game.current.turn() === 'w' ? '0-1' : '1-0'))
                        : '*'
                })
            }
        }, 0)
    }, [])

    // Función que se llama al soltar una pieza en el tablero, maneja la lógica de movimiento y promoción.
    function onDrop({ piece, sourceSquare, targetSquare }) {
        const pieceType = typeof piece === 'string' ? piece : piece?.pieceType ?? ''

        if (!sourceSquare || !targetSquare) return false

        try {
            const isPawn = pieceType && pieceType[1] === 'P'
            const isLastRank = targetSquare[1] === '8' || targetSquare[1] === '1'

            if (isPawn && isLastRank) {
                const moves = game.current.moves({ square: sourceSquare, verbose: true })
                if (moves.some(m => m.to === targetSquare)) {
                    setMovePendingPromotion({ from: sourceSquare, to: targetSquare })
                    setShowPromotionModal(true)
                    return false
                }
            }

            const move = game.current.move({ from: sourceSquare, to: targetSquare })

            if (move === null) return false

            setFen(game.current.fen())
            notifyChange()
            return true
        } catch {
            return false
        }
    }

    // Función para manejar la promoción de peones, se llama al seleccionar una pieza en el modal de promoción.
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
            undo: () => {
                game.current.undo()
                setFen(game.current.fen())
                notifyChange()
            },
            reset: () => {
                game.current.reset()
                setFen(game.current.fen())
                notifyChange()
            },
            move: (m) => {
                const res = game.current.move(m)
                if (res) {
                    setFen(game.current.fen())
                    notifyChange()
                }
                return res
            }
        }
    }, [actionRef, notifyChange])

    return (        
        <div className="w-full flex justify-center items-center">
            {/* Tablero de ajedrez. */}
            <div className="w-full aspect-square max-w-125 shadow-2xl rounded-2xl bg-white p-4">
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

            {/* Modal para la promoción de peones */}
            <Modal
                isOpen={showPromotionModal}
                onClose={() => { setShowPromotionModal(false); setMovePendingPromotion(null) }}
                title="¿Qué pieza prefieres?"
                maxWidth="max-w-xs"
            >
                <div className="grid grid-cols-2 gap-3 p-2">
                    {[
                        { type: 'q', label: 'Dama', icon: '♕' },
                        { type: 'r', label: 'Torre', icon: '♖' },
                        { type: 'b', label: 'Alfil', icon: '♗' },
                        { type: 'n', label: 'Caballo', icon: '♘' }
                    ]
                    .map((p) => (
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
