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
    // Referencia al motor de juego (chess.js) para que no se pierda entre renders
    const game = useRef(new Chess(initialFen === 'start' ? undefined : initialFen))

    // Estado que mantiene el FEN (estado actual) del tablero
    const [fen, setFen] = useState(() => new Chess(initialFen === 'start' ? undefined : initialFen).fen())

    // Control del modal para cuando un peón llega al final
    const [showPromotionModal, setShowPromotionModal] = useState(false)
    const [movePendingPromotion, setMovePendingPromotion] = useState(null)

    // Guardamos el callback de cambio en una ref para evitar re-renders innecesarios
    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    // Función para avisar al componente padre que algo ha cambiado en la partida
    const notifyChange = useCallback(() => {
        // Usamos un pequeño delay para que React no se queje de cambios de estado durante el render
        setTimeout(() => {
            if (onChangeRef.current) {
                // Sacamos el PGN "limpio", eliminando TODOS los bloques entre corchetes
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

    // Esta función se dispara cuando soltamos una pieza en una casilla
    function onDrop({ piece, sourceSquare, targetSquare }) {
        // Normalizamos el tipo de pieza (react-chessboard a veces manda un objeto)
        const pieceType = typeof piece === 'string' ? piece : piece?.pieceType ?? ''

        if (!sourceSquare || !targetSquare) return false

        try {
            // ¿Es un peón intentando coronar?
            const isPawn = pieceType && pieceType[1] === 'P'
            const isLastRank = targetSquare[1] === '8' || targetSquare[1] === '1'

            if (isPawn && isLastRank) {
                // Verificamos si el movimiento es legal antes de abrir el modal
                const moves = game.current.moves({ square: sourceSquare, verbose: true })
                if (moves.some(m => m.to === targetSquare)) {
                    setMovePendingPromotion({ from: sourceSquare, to: targetSquare })
                    setShowPromotionModal(true)
                    return false // Bloqueamos el movimiento visual hasta que elija pieza
                }
            }

            // Movimiento normal de toda la vida
            const move = game.current.move({ from: sourceSquare, to: targetSquare })

            if (move === null) return false // Movimiento ilegal

            setFen(game.current.fen())
            notifyChange()
            return true
        } catch {
            return false
        }
    }

    // Se ejecuta cuando el usuario elige la pieza (Dama, Torre...) en el modal
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

    // Exponemos funciones de control (deshacer, reset, mover) al exterior
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
            {/* Contenedor del tablero con sombra y bordes redondeados */}
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

            {/* Modal de selección de pieza al coronar */}
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
