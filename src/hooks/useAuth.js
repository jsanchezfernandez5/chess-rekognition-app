import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'

/**
 * Hook personalizado para acceder al contexto global de autenticación.
 * Facilita el acceso a los datos del usuario (user, token) y
 * a los métodos para iniciar/cerrar sesión (login, logout, register).
 * 
 * @returns {Object} Valores y métodos del proveedor de autenticación.
 * @throws {Error} Si el hook se usa fuera de un componente envuelto por <AuthProvider>.
 */
export function useAuth() {
    const ctx = useContext(AuthContext)

    if (!ctx) {
        throw new Error('El hook useAuth debe usarse dentro de un componente Provider (<AuthProvider>)')
    }

    return ctx
}
