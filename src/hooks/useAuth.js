import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'

/**
 * Hook personalizado para acceder al contexto de autenticación.
 * Es la única forma recomendada de consumir los datos de sesión en los componentes,
 * evitando el uso directo de useContext(AuthContext).
 * 
 * @returns {Object} El estado y métodos de autenticación (user, token, login, logout, etc.).
 * @throws {Error} Si el hook se utiliza fuera de un AuthProvider.
 */
export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider')
    }
    return context
}
