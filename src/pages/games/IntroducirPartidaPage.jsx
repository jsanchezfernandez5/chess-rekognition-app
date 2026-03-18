import { useNavigate, Link } from 'react-router-dom'
import {
    RotateCcw,
    Undo2,
    Save,
    Eraser,
    LogOut,
    Loader2
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import ChessBoard from '@/components/chess/ChessBoard'
import InputText from '@/components/ui/InputText'
import InputDate from '@/components/ui/InputDate'
import InputSelect from '@/components/ui/InputSelect'
import Textarea from '@/components/ui/Textarea'

/**
 * Página para la introducción manual de partidas de ajedrez.
 * Permite reproducir una partida en un tablero interactivo, capturar el PGN 
 * y completar los metadatos necesarios (Evento, Jugadores, etc.) para guardarla.
 */
export default function IntroducirPartidaPage() {
    const { logout, authFetch } = useAuth()
    const navigate = useNavigate()
    const boardRef = useRef(null)
    const [activeTab, setActiveTab] = useState('board') // 'board' o 'form'

    // ── ESTADO DEL JUEGO ──
    const [pgn, setPgn] = useState('')
    const [moveHistory, setMoveHistory] = useState([])
    const [boardOrientation, setBoardOrientation] = useState('white')

    // ── ESTADO DEL FORMULARIO ──
    const [formData, setFormData] = useState({
        evento: '',
        blancas: '',
        negras: '',
        fecha: new Date().toISOString().split('T')[0],
        resultado: '*',
        ronda: '',
        tablero: '',
        lugar: '',
        observaciones: ''
    })

    // Errores de validación
    const [errors, setErrors] = useState({})
    const [isSaving, setIsSaving] = useState(false)

    /**
     * Captura los cambios del tablero y actualiza el PGN y el historial locales.
     */
    const handleBoardChange = useCallback((status) => {
        console.log('[PAGE] Recibido cambio de tablero:', status.pgn)
        setPgn(status.pgn)
        setMoveHistory(status.history)
    }, [])

    /**
     * Deshace la última jugada realizada.
     */
    function undoMove() {
        boardRef.current?.undo()
    }

    /**
     * Cambia la orientación del tablero (Girar).
     */
    function toggleOrientation() {
        setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')
    }

    /**
     * Limpia todo el tablero y el formulario.
     */
    function resetBoard() {
        if (window.confirm('¿Estás seguro de que quieres borrar la partida actual?')) {
            boardRef.current?.reset()
        }
    }

    /**
     * Maneja los cambios en los inputs del formulario.
     */
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Limpiar error al escribir
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    /**
     * Valida y guarda la partida en la base de datos.
     */
    const handleSave = async (e) => {
        e.preventDefault()

        // 1. Validación de campos obligatorios
        const newErrors = {}
        if (!formData.evento) newErrors.evento = 'El evento es obligatorio'
        if (!formData.blancas) newErrors.blancas = 'El jugador de blancas es obligatorio'
        if (!formData.negras) newErrors.negras = 'El jugador de negras es obligatorio'
        if (!formData.fecha) newErrors.fecha = 'La fecha es obligatoria'
        if (!formData.resultado || formData.resultado === '*') newErrors.resultado = 'Debes seleccionar un resultado válido'
        if (!pgn || pgn.trim() === '' || pgn.trim() === '*') newErrors.pgn = 'Debes introducir al menos una jugada'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            setActiveTab('form') // Aseguramos que el usuario vea los errores
            return
        }

        setIsSaving(true)

        try {
            // 2. Preparar el payload según PartidaCreate (schemas/partidas.py)
            const payload = {
                evento: formData.evento,
                blancas: formData.blancas,
                negras: formData.negras,
                fecha: formData.fecha,
                resultado: formData.resultado,
                pgn: pgn,
                tipo_partida: 'PI', // Partida Introducida
                ronda: formData.ronda ? parseInt(formData.ronda) : null,
                tablero: formData.tablero ? parseInt(formData.tablero) : null,
                lugar: formData.lugar || null,
                observaciones: formData.observaciones || null
            }

            // 3. Llamada al servicio API (usamos '/' al final para evitar redirects de CORS)
            const res = await authFetch('/partidas/', {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.detail || 'Error al guardar la partida')
            }

            // 4. Éxito
            alert('Partida guardada correctamente')
            navigate('/dashboard')

        } catch (error) {
            console.error('Error saving game:', error)
            alert(error.message || 'Error al conectar con el servidor')
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">

            {/* ── HEADER SUPERIOR (LOGOTIPO Y SALIR) ── */}
            <header className="w-full h-32 px-8 md:px-16 flex items-center justify-between bg-white z-10 transition-all">
                <div className="pt-6 pl-4">
                    <Link to="/dashboard" className="transition-opacity hover:opacity-80">
                        <img src="/logo.svg" alt="Chess Rekognition" className="w-[260px] h-auto" />
                    </Link>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 group text-cr-muted hover:text-rose-500 transition-colors cursor-pointer shrink-0 mt-6"
                    title="Cerrar sesión"
                >
                    <div className="p-3 rounded-2xl bg-cr-bg group-hover:bg-rose-50 transition-colors shadow-sm">
                        <LogOut size={24} />
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest mt-1">Salir</span>
                </button>
            </header>

            <div className="flex-1 flex flex-col md:flex-row relative mt-8">

                {/* ── PANEL IZQUIERDO: TABLERO Y PGN ── */}
                <div className={`w-full md:w-1/2 flex flex-col p-6 md:p-10 lg:p-12 border-r border-cr-border/40 ${activeTab !== 'board' ? 'hidden md:flex' : 'flex'}`}>

                    <div className="mb-10 text-center">
                        <h1 className="font-display text-2xl font-black text-cr-text tracking-tight">
                            Introducir partidas
                        </h1>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center max-w-[500px] mx-auto w-full">
                        <ChessBoard
                            actionRef={boardRef}
                            onChange={handleBoardChange}
                            boardOrientation={boardOrientation}
                        />

                        {/* Controles del Tablero */}
                        <div className="grid grid-cols-2 gap-4 w-full mt-6">
                            <Button
                                variant="primary"
                                onClick={toggleOrientation}
                                className="h-12 text-sm font-bold uppercase tracking-widest"
                            >
                                <RotateCcw size={18} className="mr-2" />
                                Girar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={undoMove}
                                disabled={moveHistory.length === 0}
                                className="h-12 text-sm font-bold uppercase tracking-widest disabled:opacity-30"
                            >
                                <Undo2 size={18} className="mr-2" />
                                Deshacer
                            </Button>
                        </div>

                        {/* Visor PGN (Textarea) */}
                        <div className="w-full mt-10 mb-16 md:mb-0">
                            <label className="block text-[11px] uppercase font-black text-cr-muted mb-2 tracking-widest pl-1">
                                Notación PGN
                            </label>
                            <div className="relative group">
                                <textarea
                                    readOnly
                                    value={pgn}
                                    style={{ fontFamily: '"Figurine", serif' }}
                                    className="w-full h-40 p-5 bg-cr-bg border-2 border-transparent focus:border-cr-primary/20 rounded-2xl resize-none text-lg font-medium leading-relaxed text-cr-text transition-all outline-hidden shadow-xs"
                                />
                                {errors.pgn && (
                                    <p className="mt-2 text-[11px] text-rose-400 font-bold uppercase tracking-wider pl-1">
                                        {errors.pgn}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── PANEL DERECHO: FORMULARIO DE DATOS ── */}
                <div className={`w-full md:w-1/2 flex flex-col bg-white p-6 md:p-10 lg:p-12 overflow-y-auto ${activeTab !== 'form' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="max-w-[500px] mx-auto w-full mb-20 md:mb-0">

                        <div className="mb-10 text-center">
                            <h2 className="font-display text-2xl font-black text-cr-text tracking-tight">
                                Datos de la Partida
                            </h2>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            <InputText
                                id="evento"
                                name="evento"
                                label="Evento *"
                                placeholder="Ej: Torneo de Primavera 2026"
                                value={formData.evento}
                                onChange={handleInputChange}
                                error={errors.evento}
                                disabled={isSaving}
                                className="md:col-span-2"
                            />

                            <InputText
                                id="blancas"
                                name="blancas"
                                label="Blancas *"
                                placeholder="Nombre jugador"
                                value={formData.blancas}
                                onChange={handleInputChange}
                                error={errors.blancas}
                                disabled={isSaving}
                            />

                            <InputText
                                id="negras"
                                name="negras"
                                label="Negras *"
                                placeholder="Nombre jugador"
                                value={formData.negras}
                                onChange={handleInputChange}
                                error={errors.negras}
                                disabled={isSaving}
                            />

                            <InputDate
                                id="fecha"
                                name="fecha"
                                label="Fecha *"
                                value={formData.fecha}
                                onChange={handleInputChange}
                                error={errors.fecha}
                                disabled={isSaving}
                            />

                            <InputSelect
                                id="resultado"
                                name="resultado"
                                label="Resultado *"
                                value={formData.resultado}
                                onChange={handleInputChange}
                                error={errors.resultado}
                                disabled={isSaving}
                                options={[
                                    { value: '*', label: 'Introduce resultado (*)' },
                                    { value: '1-0', label: '1-0 (Ganan blancas)' },
                                    { value: '0-1', label: '0-1 (Ganan negras)' },
                                    { value: '1/2-1/2', label: '1/2-1/2 (Tablas)' }
                                ]}
                            />

                            <InputText
                                id="ronda"
                                name="ronda"
                                label="Ronda"
                                placeholder="Ej: 3"
                                value={formData.ronda}
                                onChange={handleInputChange}
                                disabled={isSaving}
                            />

                            <InputText
                                id="tablero"
                                name="tablero"
                                label="Tablero"
                                placeholder="Ej: 15"
                                value={formData.tablero}
                                onChange={handleInputChange}
                                disabled={isSaving}
                            />

                            <InputText
                                id="lugar"
                                name="lugar"
                                label="Lugar"
                                placeholder="Ciudad, Club..."
                                value={formData.lugar}
                                onChange={handleInputChange}
                                disabled={isSaving}
                                className="md:col-span-2"
                            />

                            <Textarea
                                id="observaciones"
                                name="observaciones"
                                label="Observaciones"
                                placeholder="Notas adicionales..."
                                value={formData.observaciones}
                                onChange={handleInputChange}
                                disabled={isSaving}
                                className="md:col-span-2"
                            />

                            {/* Botón Guardar */}
                            <div className="md:col-span-2 pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full h-14 text-base font-black uppercase tracking-[0.2em] shadow-xl shadow-cr-primary/20 hover:shadow-cr-primary/40 transition-shadow disabled:opacity-70"
                                >
                                    {isSaving ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={20} className="mr-3" />
                                            Guardar Partida
                                        </>
                                    )}
                                </Button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>

            {/* ── NAVEGACIÓN TABS (SÓLO MÓVIL) ── */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-cr-border flex items-stretch z-50">
                <button
                    onClick={() => setActiveTab('board')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'board' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'board' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Visor PGN</span>
                </button>
                <button
                    onClick={() => setActiveTab('form')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'form' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'form' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Datos Partida</span>
                </button>
            </div>
        </div>
    )
}
