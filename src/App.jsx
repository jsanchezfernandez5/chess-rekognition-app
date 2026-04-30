import { AuthProvider } from './context/AuthContext'
import AppRouter from './router/AppRouter'

// Componente raíz de la aplicación.
// Envuelve toda la aplicación con AuthProvider para gestionar el estado de autenticación.
export default function App() {
    return (
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    )
}