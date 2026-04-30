import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/layout/AuthLayout'
import InputText from '@/components/ui/InputText'
import InputPassword from '@/components/ui/InputPassword'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

// Página de inicio de sesión de la aplicación.
export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    // Estado que almacena el usuario y contraseña del formulario
    const [form, setForm] = useState({ username: 'chess_test01', password: 'chess_test01' })

    // Estado para capturar y mostrar mensajes de error
    const [error, setError] = useState('')

    // Estado para gestionar el indicador de carga del botón
    const [loading, setLoading] = useState(false)

    // Actualiza el estado del formulario con el nuevo valor del input y limpia los errores visuales mostrados.
    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }))
        setError('')
    }

    // Maneja el envío del formulario de inicio de sesión.
    // Realiza validaciones básicas e intenta inciar sesión a través del hook useAuth().
    async function handleSubmit(e) {
        e.preventDefault()

        // Validación básica: asegura que ambos campos contengan texto
        if (!form.username || !form.password) {
            setError('Completa todos los campos.')
            return
        }

        // Intentamos iniciar sesión con las credenciales
        setLoading(true)
        try {
            await login(form)

            // Si todo va bien, redirige al usuario al dashboard principal
            navigate('/dashboard')
        } catch (err) {
            // Capturamos cualquier error y le mostramos al usuario el mensaje correspondiente
            setError(err.message)
        } finally {
            // Habilitamos los controles nuevamente al finalizar el proceso
            setLoading(false)
        }
    }

    // Renderizado del formulario de inicio de sesión
    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <InputText
                    id="username"
                    name="username"
                    label="Usuario *"
                    placeholder="chess_test01"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                    disabled={loading}
                />

                <InputPassword
                    id="password"
                    name="password"
                    label="Contraseña *"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                />

                {/* Bloque visual de error (si existe) */}
                {error && (
                    <p className="text-[12px] text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <Button type="submit" size="lg" loading={loading} className="mt-1">
                    Aceptar
                </Button>
            </form>

            {/* Enlace al registro */}
            <p className="text-sm text-center text-cr-muted mt-5">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-cr-primary font-medium hover:underline">
                    Regístrate
                </Link>
            </p>
        </AuthLayout>
    )
}
