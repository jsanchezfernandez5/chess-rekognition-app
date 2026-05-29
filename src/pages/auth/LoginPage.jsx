import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/layout/AuthLayout'
import InputText from '@/components/ui/InputText'
import InputPassword from '@/components/ui/InputPassword'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

/**
 * Página de inicio de sesión para usuarios.
 */
export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({ username: 'chess_test01', password: 'chess_test01' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Maneja los cambios en los campos del formulario, actualizando el estado y limpiando errores.
    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }))
        setError('')
    }

    // Maneja el envío del formulario, validando campos y llamando al método de login del contexto de autenticación.
    async function handleSubmit(e) {
        e.preventDefault()

        if (!form.username || !form.password) {
            setError('Completa todos los campos.')
            return
        }

        // Inicia el proceso de login, mostrando un estado de carga y manejando errores si ocurren.
        setLoading(true)
        try {
            await login(form)
            navigate('/dashboard')
        } catch (err) { setError(err.message) } finally { setLoading(false) }
    }

    return (
        // El diseño de la página de login se basa en el componente AuthLayout, que centra el formulario y proporciona un estilo consistente.
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

                {error && (
                    <p className="text-[12px] text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <Button type="submit" size="lg" loading={loading} className="mt-1">
                    Aceptar
                </Button>
            </form>

            <p className="text-sm text-center text-cr-muted mt-5">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-cr-primary font-medium hover:underline">
                    Regístrate
                </Link>
            </p>
        </AuthLayout>
    )
}
