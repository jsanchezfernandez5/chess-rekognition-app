import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/layout/AuthLayout'
import InputText from '@/components/ui/InputText'
import InputEmail from '@/components/ui/InputEmail'
import InputPassword from '@/components/ui/InputPassword'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        nombre: '', apellidos: '', username: '', email: '', password: '',
    })
    const [errors, setErrors] = useState({})
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    function handleChange(e) {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
        setErrors(errs => ({ ...errs, [name]: '' }))
    }

    function validate() {
        const next = {}
        if (!form.nombre.trim()) next.nombre = 'El nombre es obligatorio'
        if (!form.username.trim()) next.username = 'El usuario es obligatorio'
        if (!form.email.trim()) next.email = 'El email es obligatorio'
        if (form.password.length < 8) next.password = 'Mínimo 8 caracteres'
        return next
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        setLoading(true)
        try {
            await register(form)
            setSuccess('¡Cuenta creada! Revisa tu correo para confirmarla.')
            setTimeout(() => navigate('/login'), 2500)
        } catch (err) {
            setErrors({ global: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
                <InputText
                    id="nombre"
                    name="nombre"
                    label="Nombre *"
                    placeholder="José Joaquín"
                    value={form.nombre}
                    onChange={handleChange}
                    error={errors.nombre}
                    disabled={loading}
                />
                <InputText
                    id="apellidos"
                    name="apellidos"
                    label="Apellidos"
                    placeholder="Sánchez"
                    value={form.apellidos}
                    onChange={handleChange}
                    disabled={loading}
                />

                <InputText
                    id="username"
                    name="username"
                    label="Usuario *"
                    placeholder="jjsanchez"
                    value={form.username}
                    onChange={handleChange}
                    error={errors.username}
                    autoComplete="username"
                    disabled={loading}
                />

                <InputEmail
                    id="email"
                    name="email"
                    label="Email *"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    disabled={loading}
                />

                <InputPassword
                    id="password"
                    name="password"
                    label="Contraseña *"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    disabled={loading}
                />

                {errors.global && (
                    <p className="text-[12px] text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">
                        {errors.global}
                    </p>
                )}
                {success && (
                    <p className="text-[12px] text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">
                        {success}
                    </p>
                )}

                <Button type="submit" size="lg" loading={loading} className="mt-1">
                    Registrar
                </Button>
            </form>

            <p className="text-sm text-center text-cr-muted mt-5">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-cr-primary font-medium hover:underline">
                    Identifícate
                </Link>
            </p>
        </AuthLayout>
    )
}
