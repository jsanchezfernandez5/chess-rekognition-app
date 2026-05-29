/**
 * Componente de diseño para las páginas de autenticación (login, registro).
 */
import TypewriterText from '@/components/ui/TypewriterText'

export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen flex items-stretch bg-white">

            {/* Parte Izquierda: Panel Formulario */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-16 lg:px-24 bg-white relative z-10 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)]">
                <div className="w-full max-w-90">
                    {/* Logo (Visible siempre en mobile y en desktop) */}
                    <div className="flex justify-center mb-10 md:mb-14">
                        <img src="/logo.svg" alt="Chess Rekognition" className="w-[260px] h-auto shrink-0 mb-4" />
                    </div>

                    <div className="w-full">
                        {children}
                    </div>
                </div>
            </div>

            {/* Parte Derecha: Imagen/Decoración — visible solo en desktop */}
            <div className="hidden md:flex relative w-1/2 flex-col justify-center items-center bg-cr-bg overflow-hidden border-l border-cr-border/60">

                {/* Imagen de fondo */}
                <img
                    src="./images/tablero_fondo.jpg"
                    alt="Chess match"
                    className="absolute inset-0 object-cover w-full h-full opacity-90 mix-blend-multiply"
                />

                {/* Texto y Typewriter Centrado Directamente en el overlay */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center px-8">
                    <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-5 drop-shadow-md">
                        Chess Rekognition
                    </h2>
                    <div className="text-white/90 text-lg md:text-xl font-medium tracking-wide drop-shadow text-center min-h-8">
                        <TypewriterText />
                    </div>
                </div>

            </div>

        </div>
    )
}
