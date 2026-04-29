// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Componente Modal Genérico y Reutilizable.
 * Utiliza Framer Motion para animaciones y Backdrop Blur para un diseño premium.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.isOpen - Indica si el modal está visible.
 * @param {Function} props.onClose - Función para cerrar el modal.
 * @param {string} props.title - Título opcional del modal.
 * @param {React.ReactNode} props.children - Contenido del modal.
 * @param {string} [props.maxWidth='max-w-md'] - Ancho máximo del modal.
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Contenido del Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className={`relative bg-white rounded-3xl p-6 md:p-8 shadow-2xl w-full ${maxWidth} overflow-hidden`}
                    >
                        {/* Cabecera del Modal */}
                        <div className="flex items-center justify-between mb-6">
                            {title && (
                                <h3 className="font-display text-2xl font-black text-cr-text">
                                    {title}
                                </h3>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-cr-muted hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cuerpo del Modal */}
                        <div className="relative">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
