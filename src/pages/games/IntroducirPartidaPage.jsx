import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    RotateCcw,
    Undo2,
    Save,
    LogOut,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import ChessBoard from '@/components/chess/ChessBoard'
import InputText from '@/components/ui/InputText'
import InputDate from '@/components/ui/InputDate'
import InputSelect from '@/components/ui/InputSelect'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import Header from '@/components/layout/Header'

/**
 * Vista para introducir partidas manualmente.
 * Aquí podemos 'jugar' la partida en el tablero y rellenar los datos del torneo.
 */
export default function IntroducirPartidaPage() {
    const { t } = useTranslation()
    const { authFetch } = useAuth()
    const navigate = useNavigate()
    const boardRef = useRef(null)

    // Control de pestañas para la versión móvil (Tablero / Formulario)
    const [activeTab, setActiveTab] = useState('board')

    // --- ESTADO DE LA PARTIDA ---
    const [pgn, setPgn] = useState('')
    const [moveHistory, setMoveHistory] = useState([])
    const [boardOrientation, setBoardOrientation] = useState('white')

    // --- DATOS DEL FORMULARIO ---
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

    // Gestión de errores y estados de carga
    const [errors, setErrors] = useState({})
    const [isSaving, setIsSaving] = useState(false)

    // --- ESTADO DEL MODAL ---
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'success' // 'success' | 'error'
    })

    // Cierre de la Modal
    const hideModal = () => setModal(prev => ({ ...prev, isOpen: false }))

    // Escuchamos los cambios que vienen del componente ChessBoard
    const handleBoardChange = useCallback((status) => {
        setPgn(status.pgn)
        setMoveHistory(status.history)
    }, [])

    // Función para dar marcha atrás a la última jugada
    function undoMove() {
        boardRef.current?.undo()
    }

    // Girar el tablero (útil si juegas con negras)
    function toggleOrientation() {
        setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')
    }

    // Actualizamos los campos del formulario de forma dinámica
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        // Si había un error en este campo, lo quitamos al empezar a escribir
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    // El corazón de la página: guardar la partida en nuestra API
    const handleSave = async (e) => {
        e.preventDefault()

        // Validaciones básicas antes de intentar enviar nada
        const newErrors = {}
        if (!formData.evento) newErrors.evento = t('introducirPartida.validation.evento')
        if (!formData.blancas) newErrors.blancas = t('introducirPartida.validation.blancas')
        if (!formData.negras) newErrors.negras = t('introducirPartida.validation.negras')
        if (!formData.fecha) newErrors.fecha = t('introducirPartida.validation.fecha')
        if (!formData.resultado || formData.resultado === '*') {
            newErrors.resultado = t('introducirPartida.validation.resultado')
        }
        if (!pgn || pgn.trim() === '' || pgn.trim() === '*') {
            newErrors.pgn = t('introducirPartida.validation.pgn')
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            // Si hay errores y estamos en móvil, le llevamos a la pestaña del formulario para que los vea
            setActiveTab('form')
            return
        }

        // Guardamos los datos en la API
        setIsSaving(true)

        try {
            // Preparamos el objeto tal cual lo espera el backend (FastAPI)
            const payload = {
                evento: formData.evento,
                blancas: formData.blancas,
                negras: formData.negras,
                fecha: formData.fecha,
                resultado: formData.resultado,
                pgn: pgn,
                tipo_partida: 'PI', // 'PI' significa Partida Introducida (manual)
                ronda: formData.ronda ? parseInt(formData.ronda) : null,
                tablero: formData.tablero ? parseInt(formData.tablero) : null,
                lugar: formData.lugar || null,
                observaciones: formData.observaciones || null
            }

            // Llamada autenticada a nuestro servicio de partidas
            const res = await authFetch('/partidas/', {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.detail || t('introducirPartida.modal.saveError'))
            }

            // Mostrar modal de éxito
            setModal({
                isOpen: true,
                title: t('introducirPartida.modal.successTitle'),
                message: t('introducirPartida.modal.successMessage'),
                type: 'success',
                onConfirm: () => navigate('/dashboard')
            })

        } catch (error) {
            console.error('Error al guardar:', error)
            setModal({
                isOpen: true,
                title: t('introducirPartida.modal.errorTitle'),
                message: error.message || t('introducirPartida.modal.errorMessage'),
                type: 'error',
                onConfirm: hideModal
            })
        } finally {
            setIsSaving(false)
        }
    }

    // Renderizado de la página de introducción de partidas
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />

            <div className="flex-1 flex flex-col md:flex-row relative mt-8">

                {/* Zona del tablero y visor de jugadas */}
                <div className={`w-full md:w-1/2 flex flex-col p-6 md:p-10 lg:p-12 border-r border-cr-border/40 ${activeTab !== 'board' ? 'hidden md:flex' : 'flex'}`}>

                    <div className="mb-10 text-center">
                        <h1 className="font-display text-2xl font-black text-cr-text tracking-tight">
                            {t('introducirPartida.title')}
                        </h1>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center max-w-[500px] mx-auto w-full">
                        <ChessBoard
                            actionRef={boardRef}
                            onChange={handleBoardChange}
                            boardOrientation={boardOrientation}
                        />

                        {/* Botones de acción rápida sobre el tablero */}
                        <div className="grid grid-cols-2 gap-4 w-full mt-6">
                            <Button
                                variant="primary"
                                onClick={toggleOrientation}
                                className="h-12 text-sm font-bold uppercase tracking-widest"
                            >
                                <RotateCcw size={18} className="mr-2" />
                                {t('introducirPartida.flip')}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={undoMove}
                                disabled={moveHistory.length === 0}
                                className="h-12 text-sm font-bold uppercase tracking-widest disabled:opacity-30"
                            >
                                <Undo2 size={18} className="mr-2" />
                                {t('introducirPartida.undo')}
                            </Button>
                        </div>

                        {/* Visor de la notación en formato FIGURINE */}
                        <div className="w-full mt-10 mb-16 md:mb-0">
                            <label className="block text-[11px] uppercase font-black text-cr-muted mb-2 tracking-widest pl-1">
                                {t('introducirPartida.notation')}
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

                {/* Formulario con los detalles técnicos del evento/partida */}
                <div className={`w-full md:w-1/2 flex flex-col bg-white p-6 md:p-10 lg:p-12 overflow-y-auto ${activeTab !== 'form' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="max-w-[500px] mx-auto w-full mb-20 md:mb-0">

                        <div className="mb-10 text-center">
                            <h2 className="font-display text-2xl font-black text-cr-text tracking-tight">
                                {t('introducirPartida.formTitle')}
                            </h2>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            <InputText
                                id="evento"
                                name="evento"
                                label={t('introducirPartida.eventoLabel')}
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
                                label={t('introducirPartida.blancasLabel')}
                                placeholder="Nombre completo"
                                value={formData.blancas}
                                onChange={handleInputChange}
                                error={errors.blancas}
                                disabled={isSaving}
                            />

                            <InputText
                                id="negras"
                                name="negras"
                                label={t('introducirPartida.negrasLabel')}
                                placeholder="Nombre completo"
                                value={formData.negras}
                                onChange={handleInputChange}
                                error={errors.negras}
                                disabled={isSaving}
                            />

                            <InputDate
                                id="fecha"
                                name="fecha"
                                label={t('introducirPartida.fechaLabel')}
                                value={formData.fecha}
                                onChange={handleInputChange}
                                error={errors.fecha}
                                disabled={isSaving}
                            />

                            <InputSelect
                                id="resultado"
                                name="resultado"
                                label={t('introducirPartida.resultadoLabel')}
                                value={formData.resultado}
                                onChange={handleInputChange}
                                error={errors.resultado}
                                disabled={isSaving}
                                options={[
                                    { value: '*', label: t('introducirPartida.resultadoOptions.placeholder') },
                                    { value: '1-0', label: t('introducirPartida.resultadoOptions.blancas') },
                                    { value: '0-1', label: t('introducirPartida.resultadoOptions.negras') },
                                    { value: '1/2-1/2', label: t('introducirPartida.resultadoOptions.tablas') }
                                ]}
                            />

                            <InputText
                                id="ronda"
                                name="ronda"
                                label={t('introducirPartida.rondaLabel')}
                                placeholder="Ej: 3"
                                value={formData.ronda}
                                onChange={handleInputChange}
                                disabled={isSaving}
                            />

                            <InputText
                                id="tablero"
                                name="tablero"
                                label={t('introducirPartida.tableroLabel')}
                                placeholder="Ej: 15"
                                value={formData.tablero}
                                onChange={handleInputChange}
                                disabled={isSaving}
                            />

                            <InputText
                                id="lugar"
                                name="lugar"
                                label={t('introducirPartida.lugarLabel')}
                                placeholder="Ciudad, Club..."
                                value={formData.lugar}
                                onChange={handleInputChange}
                                disabled={isSaving}
                                className="md:col-span-2"
                            />

                            <Textarea
                                id="observaciones"
                                name="observaciones"
                                label={t('introducirPartida.observacionesLabel')}
                                placeholder="Cualquier nota extra sobre la partida..."
                                value={formData.observaciones}
                                onChange={handleInputChange}
                                disabled={isSaving}
                                className="md:col-span-2"
                            />

                            {/* Botón final para guardar todo */}
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
                                        {t('introducirPartida.save')}
                                        </>
                                    )}
                                </Button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>

            {/* Menú inferior para móviles: alterna entre el tablero y el formulario */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-cr-border flex items-stretch z-50">
                <button
                    onClick={() => setActiveTab('board')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'board' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'board' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">{t('introducirPartida.tabBoard')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('form')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'form' ? 'text-cr-primary' : 'text-cr-muted'}`}
                >
                    <div className={`w-8 h-1 rounded-full mb-1 transition-all ${activeTab === 'form' ? 'bg-cr-primary' : 'bg-transparent'}`} />
                    <span className="text-[10px] uppercase font-black tracking-widest">{t('introducirPartida.tabForm')}</span>
                </button>
            </div>

            {/* Modal de Feedback Reutilizable */}
            <Modal
                isOpen={modal.isOpen}
                onClose={hideModal}
                title={modal.title}
            >
                <div className="flex flex-col items-center text-center">
                    <div className={`mb-6 p-4 rounded-3xl ${modal.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        {modal.type === 'success' ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
                    </div>
                    <p className="text-cr-text font-medium text-lg leading-relaxed mb-10">
                        {modal.message}
                    </p>
                    <Button
                        variant="primary"
                        className={`w-full h-14 text-sm font-black uppercase tracking-widest shadow-lg ${modal.type === 'success' ? 'shadow-emerald-500/20' : 'shadow-rose-500/20'}`}
                        onClick={modal.onConfirm}
                    >
                        {modal.type === 'success' ? t('introducirPartida.modal.continue') : t('introducirPartida.modal.understood')}
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
