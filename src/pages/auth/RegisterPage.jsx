import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthLayout from '@/components/layout/AuthLayout'
import InputText from '@/components/ui/InputText'
import InputEmail from '@/components/ui/InputEmail'
import InputPassword from '@/components/ui/InputPassword'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
    const { t } = useTranslation()
    const { register } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        nombre: '', apellidos: '', username: '', email: '', password: '',
    })
    const [errors, setErrors] = useState({})
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    // Maneja los cambios en los campos del formulario
    function handleChange(e) {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
        setErrors(errs => ({ ...errs, [name]: '' }))
    }

    // Valida los campos del formulario
    function validate() {
        const next = {}
        if (!form.nombre.trim()) next.nombre = t('auth.register.validation.nombre')
        if (!form.username.trim()) next.username = t('auth.register.validation.username')
        if (!form.email.trim()) next.email = t('auth.register.validation.email')
        if (form.password.length < 8) next.password = t('auth.register.validation.password')
        return next
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        setLoading(true)
        try {
            await register(form)
            setSuccess(t('auth.register.success'))
            setTimeout(() => navigate('/login'), 2500)
        } catch (err) {
            setErrors({ global: err.message })
        } finally {
            setLoading(false)
        }
    }

    // Renderizado del formulario de registro de usuario
    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
                <InputText
                    id="nombre"
                    name="nombre"
                    label={t('auth.register.nombreLabel')}
                    placeholder="José Joaquín"
                    value={form.nombre}
                    onChange={handleChange}
                    error={errors.nombre}
                    disabled={loading}
                />
                <InputText
                    id="apellidos"
                    name="apellidos"
                    label={t('auth.register.apellidosLabel')}
                    placeholder="Sánchez"
                    value={form.apellidos}
                    onChange={handleChange}
                    disabled={loading}
                />

                <InputText
                    id="username"
                    name="username"
                    label={t('auth.register.usernameLabel')}
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
                    label={t('auth.register.emailLabel')}
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    disabled={loading}
                />

                <InputPassword
                    id="password"
                    name="password"
                    label={t('auth.register.passwordLabel')}
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
                    {t('auth.register.submit')}
                </Button>
            </form>

            <p className="text-sm text-center text-cr-muted mt-5">
                {t('auth.register.hasAccount')}{' '}
                <Link to="/login" className="text-cr-primary font-medium hover:underline">
                    {t('auth.register.loginLink')}
                </Link>
            </p>
        </AuthLayout>
    )
}
