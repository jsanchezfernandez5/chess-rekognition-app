import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import AuthLayout from '@/components/layout/AuthLayout'
import Button from '@/components/ui/Button'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
    const { t } = useTranslation()
    const { isAuthenticated } = useAuth()

    return (
        <AuthLayout>
            <div className="text-center py-4">
                {/* Cabecera visual del error */}
                <h1 className="text-7xl font-black text-cr-primary mb-2 drop-shadow-sm">404</h1>
                <h2 className="text-xl font-bold text-cr-text mb-4">{t('notFound.title')}</h2>

                <p className="text-cr-muted text-sm mb-10 leading-relaxed">
                    {t('notFound.description')}
                </p>

                {/* Acciones para el usuario */}
                <div className="flex flex-col gap-3">
                    <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                        <Button size="lg" className="flex items-center justify-center gap-2">
                            <Home size={18} />
                            {t('notFound.back')}{isAuthenticated ? t('notFound.dashboard') : t('notFound.home')}
                        </Button>
                    </Link>
                </div>
            </div>
        </AuthLayout>
    )
}
