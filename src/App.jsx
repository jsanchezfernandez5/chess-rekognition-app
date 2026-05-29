import { AuthProvider } from './context/AuthContext'
import AppRouter from './router/AppRouter'

/* Componente raíz de la aplicación, envuelve el enrutador con el proveedor de autenticación. */
export default function App() {
    return (
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    )
}