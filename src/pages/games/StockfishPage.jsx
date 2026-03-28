import { useState, useEffect, useCallback, useRef } from 'react'
import { 
    Flag, 
    Download, 
    ChevronDown,
    Swords,
    HelpCircle,
    AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import ChessBoard from '@/components/chess/ChessBoard'
import Modal from '@/components/ui/Modal'
import Header from '@/components/layout/Header'

/**
 * Componentes de UI extraídos fuera para evitar remontajes innecesarios
 */

const ConfigForm = ({ playerColor, setPlayerColor, elo, setElo, handleStartGame, eloLevels }) => (
    <div className="w-full max-w-[500px] mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10 text-center">
            <h1 className="font-display text-2xl font-black text-cr-text tracking-tight">
                Configura el nivel
            </h1>
        </div>

        <div className="space-y-6">
            <div className="space-y-2">
                <label className="block text-[11px] uppercase font-black text-cr-muted mb-2 tracking-widest pl-1">
                    Elige tu color
                </label>
                <div className="relative group">
                    <select 
                        value={playerColor}
                        onChange={(e) => setPlayerColor(e.target.value)}
                        className="w-full h-14 appearance-none bg-cr-bg border-2 border-transparent focus:border-cr-primary/20 rounded-2xl px-6 text-base font-bold text-cr-text transition-all outline-hidden cursor-pointer"
                    >
                        <option value="w">Jugar con Blancas</option>
                        <option value="b">Jugar con Negras</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-cr-muted pointer-events-none group-hover:text-cr-primary transition-colors" size={18} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-[11px] uppercase font-black text-cr-muted mb-2 tracking-widest pl-1">
                    Nivel de ELO
                </label>
                <div className="relative group">
                    <select 
                        value={elo}
                        onChange={(e) => setElo(Number(e.target.value))}
                        className="w-full h-14 appearance-none bg-cr-bg border-2 border-transparent focus:border-cr-primary/20 rounded-2xl px-6 text-base font-bold text-cr-text transition-all outline-hidden cursor-pointer"
                    >
                        {eloLevels.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-cr-muted pointer-events-none group-hover:text-cr-primary transition-colors" size={18} />
                </div>
            </div>
        </div>

        <Button
            onClick={handleStartGame}
            variant="primary"
            className="w-full h-14 text-base font-black uppercase tracking-[0.2em] shadow-xl shadow-cr-primary/20 hover:shadow-cr-primary/40 transition-shadow mt-4"
        >
            <Swords size={20} className="mr-3" />
            Jugar contra StockFish
        </Button>
    </div>
)

const GameArea = ({ 
    status, 
    isGameOver, 
    isEngineThinking, 
    statusText, 
    indicatorColor, 
    elo, 
    playerColor, 
    boardRef, 
    handleBoardChange, 
    gameKey, 
    handleAbandonar, 
    handleDownloadPGN, 
    moveHistory 
}) => {
    return (
        <div className="w-full max-w-[500px] mx-auto flex flex-col gap-6 items-center animate-in fade-in slide-in-from-right-4 duration-500 pb-20 md:pb-0">
            <div className="w-full flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${indicatorColor}`} />
                    <span className="text-[11px] font-black text-cr-muted uppercase tracking-widest">
                        {statusText}
                    </span>
                </div>
                <div className="text-[10px] font-black text-cr-primary bg-cr-primary-light px-3 py-1 rounded-lg uppercase tracking-widest">
                    Nivel ELO: {elo}
                </div>
            </div>

            <div className={`w-full transition-all duration-500 ${isEngineThinking ? 'opacity-50 grayscale-[0.3]' : 'opacity-100'}`}>
                <ChessBoard 
                    key={gameKey}
                    actionRef={boardRef}
                    onChange={handleBoardChange}
                    boardOrientation={playerColor === 'b' ? 'black' : 'white'}
                />
            </div>

            <div className="min-h-[50px] flex items-center justify-center w-full mt-2">
                {status === 'playing' && !isGameOver && (
                    <Button 
                        onClick={handleAbandonar}
                        variant="primary"
                        className="h-14 uppercase font-black tracking-[0.2em] text-xs flex items-center justify-center gap-3 px-10 shadow-xl shadow-cr-primary/20"
                    >
                        <Flag size={18} />
                        Abandonar partida
                    </Button>
                )}
            </div>

            <div className="w-full space-y-3 mt-4">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[12px] uppercase font-black text-cr-muted tracking-widest pl-2">Notación PGN</label>
                    <button 
                        className="p-2 text-cr-text hover:text-cr-primary transition-all cursor-pointer"
                        title="Descargar PGN"
                        onClick={() => handleDownloadPGN()}
                    >
                        <Download size={30} />
                    </button>
                </div>
                <div 
                    className="w-full h-40 p-6 bg-cr-bg rounded-[30px] shadow-inner overflow-y-auto"
                >
                    <div className="flex flex-wrap gap-x-4 gap-y-4" style={{ fontFamily: '"Figurine", serif', fontSize: '1.4rem' }}>
                        {moveHistory.length > 0 ? moveHistory.map((m, i) => (
                            <div 
                                key={i} 
                                className="flex items-baseline gap-1"
                            >
                                {i % 2 === 0 && (
                                    <span className="font-sans text-[0.85rem] text-cr-muted font-bold -mr-0.5">
                                        {Math.floor(i/2) + 1}.
                                    </span>
                                )}
                                <span className="text-cr-text">{m.san}</span>
                            </div>
                        )) : (
                            <span className="font-sans text-sm text-cr-muted italic">La partida aún no ha comenzado...</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Página principal de Stockfish
 */
export default function StockfishPage() {
    const { user, authFetch } = useAuth()
    const boardRef = useRef(null)

    // Nombre completo del usuario para los metadatos del PGN
    const userFullName = user ? `${user.nombre || user.username} ${user.apellidos || ''}`.trim() : 'Jugador'

    // --- ESTADO DEL JUEGO ---
    const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    const [currentTurn, setCurrentTurn] = useState('w')
    const [isGameOver, setIsGameOver] = useState(false)
    const [pgn, setPgn] = useState('')
    const [moveHistory, setMoveHistory] = useState([])
    const [gameKey, setGameKey] = useState(0)
    const [gameResult, setGameResult] = useState('*')
    const [status, setStatus] = useState('config') // 'config' | 'playing'
    const [playerColor, setPlayerColor] = useState('w') // 'w' | 'b'
    const [elo, setElo] = useState(1800)
    const [isEngineThinking, setIsEngineThinking] = useState(false)
    const [view, setView] = useState('config') // Para móvil: 'config' | 'play'

    // --- ESTADO DEL MODAL ---
    const [modal, setModal] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: null, 
        onClose: null,
        cancelLabel: 'No, gracias',
        confirmLabel: 'Confirmar',
        type: 'confirm' // 'confirm' | 'info'
    })

    const hideModal = () => setModal(prev => ({ ...prev, isOpen: false }))

    const engineTimerRef = useRef(null)

    // --- OPCIONES DE CONFIGURACIÓN ---
    const ELO_LEVELS = [
        { label: 'Principiante (1350)', value: 1350 },
        { label: 'Jugador ocasional (1500)', value: 1500 },
        { label: 'Jugador de club (1800)', value: 1800 },
        { label: 'Jugador avanzado (2100)', value: 2100 },
        { label: 'Maestro (2400)', value: 2400 },
        { label: 'Gran Maestro (2800)', value: 2800 },
        { label: 'Super GM (3100)', value: 3100 },
    ]

    const handleBoardChange = useCallback((snapshot) => {
        setCurrentFen(snapshot.fen)
        setCurrentTurn(snapshot.turn)
        setIsGameOver(snapshot.isGameOver)
        setGameResult(snapshot.gameResult)
        setPgn(snapshot.pgn)
        setMoveHistory(snapshot.history)
    }, [])

    const getEngineMove = useCallback(async (fen) => {
        setIsEngineThinking(true)
        try {
            const res = await authFetch('/engine/move', {
                method: 'POST',
                body: JSON.stringify({ fen, elo, depth: 15 })
            })
            
            if (res.ok) {
                const data = await res.json()
                let attempts = 0
                const tryMove = () => {
                    if (boardRef.current) {
                        boardRef.current.move(data.best_move)
                    } else if (attempts < 10) {
                        attempts++
                        setTimeout(tryMove, 50)
                    }
                }
                tryMove()
            }
        } catch (error) {
            console.error("Error al obtener jugada del motor:", error)
        } finally {
            setIsEngineThinking(false)
        }
    }, [elo, authFetch])

    // Detectar turno del motor
    useEffect(() => {
        if (status === 'playing' && currentTurn !== playerColor && !isGameOver) {
            engineTimerRef.current = setTimeout(() => {
                getEngineMove(currentFen)
            }, 600)
        }
        return () => clearTimeout(engineTimerRef.current)
    }, [currentFen, currentTurn, isGameOver, playerColor, status, getEngineMove])

    const handleStartGame = () => {
        setStatus('playing')
        setView('play')
        setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        setCurrentTurn('w')
        setIsGameOver(false)
        setGameResult('*')
        setPgn('')
        setMoveHistory([])
        setGameKey(k => k + 1)
    }

    // Proceso de abandono con modales
    const handleAbandonar = () => {
        setModal({
            isOpen: true,
            title: 'Abandonar partida',
            message: '¿Estás seguro de que quieres darte por vencido y finalizar este duelo?',
            type: 'confirm',
            confirmLabel: 'Sí, abandonar',
            cancelLabel: 'No, esperar',
            onConfirm: () => {
                const resultAtAbandon = playerColor === 'w' ? '0-1' : '1-0'
                if (moveHistory.length > 0) {
                    setModal({
                        isOpen: true,
                        title: 'Partida finalizada',
                        message: 'Has abandonado el duelo. ¿Deseas descargar el PGN antes de salir?',
                        type: 'confirm',
                        confirmLabel: 'Descargar PGN',
                        cancelLabel: 'No, gracias',
                        onConfirm: () => {
                            handleDownloadPGN(resultAtAbandon)
                            confirmAbandon()
                        },
                        onClose: confirmAbandon
                    })
                } else {
                    confirmAbandon()
                }
            }
        })
    }

    const confirmAbandon = () => {
        setStatus('config')
        setView('config')
        setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        setCurrentTurn('w')
        setIsGameOver(false)
        setGameResult('*')
        setPgn('')
        setMoveHistory([])
        setGameKey(k => k + 1)
        hideModal()
    }

    // Cálculos para GameArea
    const isPlayerTurn = status === 'playing' && currentTurn === playerColor
    const indicatorColor = status !== 'playing' ? 'bg-cr-border' : (!isPlayerTurn && !isGameOver ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500')
    
    let statusText = 'Esperando duelo...'
    if (status === 'playing') {
        if (isGameOver) statusText = 'Partida Finalizada'
        else if (isPlayerTurn) statusText = 'Tu turno'
        else statusText = 'Stockfish pensando...'
    }

    const handleDownloadPGN = (currentResult = null) => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '.')
        const result = currentResult || gameResult
        const engineName = `Stockfish v17.1 (ELO ${elo})`
        
        const fullPgn = [
            `[Event "Duelo de Entrenamiento"]`,
            `[Site "Chess Rekognition"]`,
            `[Date "${today}"]`,
            `[White "${playerColor === 'w' ? userFullName : engineName}"]`,
            `[Black "${playerColor === 'b' ? userFullName : engineName}"]`,
            `[Result "${result}"]`,
            '',
            pgn
        ].join('\n')

        const element = document.createElement("a");
        const file = new Blob([fullPgn], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `stockfish_vs_${userFullName.replace(/\s+/g, '_')}_${elo}.pgn`;
        document.body.appendChild(element);
        element.click();
        hideModal()
    }

    return (
        <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
            <Header />

            <div className="flex-1 flex flex-col md:flex-row relative mt-8">
                
                <div className={`w-full md:w-1/2 flex flex-col p-6 md:p-10 lg:p-12 border-r border-cr-border/40 ${view !== 'config' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex-1 flex items-start justify-center w-full pt-10">
                        <ConfigForm 
                            playerColor={playerColor}
                            setPlayerColor={setPlayerColor}
                            elo={elo}
                            setElo={setElo}
                            handleStartGame={handleStartGame}
                            eloLevels={ELO_LEVELS}
                        />
                    </div>
                </div>

                <div className={`w-full md:w-1/2 flex flex-col bg-white p-6 md:p-10 lg:p-12 overflow-y-auto ${view !== 'play' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex-1 flex items-center justify-center w-full">
                        <GameArea 
                            status={status}
                            isGameOver={isGameOver}
                            isEngineThinking={isEngineThinking}
                            statusText={statusText}
                            indicatorColor={indicatorColor}
                            elo={elo}
                            playerColor={playerColor}
                            boardRef={boardRef}
                            handleBoardChange={handleBoardChange}
                            gameKey={gameKey}
                            handleAbandonar={handleAbandonar}
                            handleDownloadPGN={handleDownloadPGN}
                            moveHistory={moveHistory}
                        />
                    </div>
                </div>

                <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-cr-border flex items-stretch z-50">
                    <button onClick={() => setView('config')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${view === 'config' ? 'text-cr-primary' : 'text-cr-muted'}`}>
                        <div className={`w-8 h-1 rounded-full mb-1 transition-all ${view === 'config' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                        <span className="text-[10px] uppercase font-black tracking-widest">Ajustes</span>
                    </button>
                    <button onClick={() => setView('play')} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${view === 'play' ? 'text-cr-primary' : 'text-cr-muted'}`}>
                        <div className={`w-8 h-1 rounded-full mb-1 transition-all ${view === 'play' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                        <span className="text-[10px] uppercase font-black tracking-widest">Tablero</span>
                    </button>
                </div>
            </div>

            {/* Modal de Diálogo Reutilizable */}
            <Modal
                isOpen={modal.isOpen}
                onClose={modal.onClose || hideModal}
                title={modal.title}
            >
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 p-4 bg-cr-bg rounded-3xl text-cr-primary">
                        {modal.type === 'confirm' ? <HelpCircle size={48} /> : <AlertCircle size={48} />}
                    </div>
                    <p className="text-cr-text font-medium text-lg leading-relaxed mb-10">
                        {modal.message}
                    </p>
                    <div className="flex w-full gap-4">
                        <Button 
                            variant="primary" 
                            className="bg-cr-bg hover:bg-cr-border/40 text-cr-muted border-0 shadow-none flex-1 font-bold text-sm"
                            onClick={modal.onClose || hideModal}
                        >
                            {modal.cancelLabel}
                        </Button>
                        <Button 
                            variant="primary" 
                            className="flex-1 shadow-lg shadow-cr-primary/20 font-bold text-sm"
                            onClick={modal.onConfirm}
                        >
                            {modal.confirmLabel}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
