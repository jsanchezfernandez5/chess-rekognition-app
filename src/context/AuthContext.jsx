import { createContext, useState, useEffect, useCallback, useRef } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

// URL base de la API. Toma el valor de las variables de entorno o usa la de producción por defecto.
const API = import.meta.env.VITE_API_URL || 'https://chess-rekognition-api-production.up.railway.app'

/**
 * Proveedor de Autenticación Principal.
 * Gestiona el estado global del usuario, su token de acceso y proporciona
 * métodos unificados para realizar login, registro y peticiones autorizadas.
 */
export function AuthProvider({ children }) {
    // Estado para almacenar la información del usuario autenticado
    const [user, setUser] = useState(null)

    // Estados para los tokens (acceso y refresco), inicializados desde localStorage
    const [token, setToken] = useState(() => localStorage.getItem('cr_token'))
    const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('cr_refresh_token'))

    // Refs para evitar cierres léxicos obsoletos en authFetch y permitir que sea estable
    const tokenRef = useRef(token)
    const refreshTokenRef = useRef(refreshToken)

    // Sincronización de refs con estados
    useEffect(() => {
        tokenRef.current = token
    }, [token])

    useEffect(() => {
        refreshTokenRef.current = refreshToken
    }, [refreshToken])

    // Estado que indica si la validación inicial de sesión está en progreso
    const [loading, setLoading] = useState(true)

    // Método para cerrar sesión de manera definitiva, borrando todos los datos del cliente local.
    const logout = useCallback(() => {
        localStorage.removeItem('cr_token')
        localStorage.removeItem('cr_refresh_token')
        setToken(null)
        setRefreshToken(null)
        setUser(null)
    }, [])

    // Efecto de inicialización:
    // Verifica si existe un token guardado e intenta rehidratar la sesión
    // obteniendo los datos actualizados del usuario desde la API.
    useEffect(() => {
        if (!token) {
            // Si no hay token, terminamos la carga en el siguiente ciclo de eventos
            const t = setTimeout(() => setLoading(false), 0)
            return () => clearTimeout(t)
        }

        // Petición al backend para validar el token y obtener los datos de la sesión actual
        fetch(`${API}/auth/whoami`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => {
                if (!r.ok) throw new Error()
                return r.json()
            })
            .then(data => setUser(data))
            .catch(async (err) => {
                console.warn("Sesión expirada o no válida, intentando refresh:", err)
                try {
                    // Intentamos renovar la sesión si el access_token ha expirado
                    const refreshRes = await fetch(`${API}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: refreshToken }),
                    })

                    if (refreshRes.ok) {
                        const { access_token, refresh_token } = await refreshRes.json()

                        // Sincronizamos almacenamiento, estados y refs con los nuevos tokens
                        localStorage.setItem('cr_token', access_token)
                        localStorage.setItem('cr_refresh_token', refresh_token)
                        setToken(access_token)
                        setRefreshToken(refresh_token)
                        tokenRef.current = access_token
                        refreshTokenRef.current = refresh_token

                        // Reintentamos hidratar el usuario con el nuevo token
                        const me = await fetch(`${API}/auth/whoami`, {
                            headers: { Authorization: `Bearer ${access_token}` },
                        }).then(r => r.json())

                        setUser(me)
                    } else {
                        logout()
                    }
                } catch (err) {
                    console.error("Fallo definitivo al refrescar token:", err)
                    logout()
                }
            })
            .finally(() => setLoading(false))

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logout]) // Se ejecuta únicamente al montar la aplicación

    // Método para iniciar sesión en el sistema.
    const login = useCallback(async ({ username, password }) => {
        try {
            // Realiza petición a la API para iniciar sesión
            const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            // Manejo de errores de la API
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                const rawDetail = errorData.detail
                let message = 'Credenciales incorrectas'

                if (rawDetail === 'Not Found' || res.status === 404) {
                    message = 'Servicio no encontrado. Verifica la conexión.'
                } else if (typeof rawDetail === 'string') {
                    message = rawDetail
                } else if (Array.isArray(rawDetail)) {
                    message = 'Datos inválidos: ' + rawDetail.map(e => `${e.loc?.at(-1)}: ${e.msg}`).join(', ')
                }

                throw new Error(message)
            }

            // Si el acceso fue exitoso, extraemos y guardamos los tokens
            const { access_token, refresh_token } = await res.json()
            localStorage.setItem('cr_token', access_token)
            localStorage.setItem('cr_refresh_token', refresh_token)
            setToken(access_token)
            setRefreshToken(refresh_token)

            // Obtenemos inmediatamente el perfil del usuario para actualizar la interfaz
            const me = await fetch(`${API}/auth/whoami`, {
                headers: { Authorization: `Bearer ${access_token}` },
            }).then(r => r.json())

            setUser(me)
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Servidor fuera de línea, intenta de nuevo más tarde.')
            }
            throw error
        }
    }, [])

    // Método para registrar de un nuevo usuario en la base de datos.
    const register = useCallback(async (body) => {
        try {
            // Adaptamos el campo 'email' procedente del front a 'mail' requerido por el back
            const payload = { ...body, mail: body.email }
            delete payload.email

            // Petición a la API para registrar un nuevo usuario
            const res = await fetch(`${API}/usuarios/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                const rawDetail = errorData.detail
                let message = 'Error en el registro'

                if (rawDetail === 'Not Found' || res.status === 404) {
                    message = 'Ruta de registro no encontrada en el servidor'
                } else if (res.status === 409) {
                    message = 'El usuario o el email ya están en uso'
                } else if (typeof rawDetail === 'string') {
                    message = rawDetail
                } else if (Array.isArray(rawDetail)) {
                    message = 'Validación fallida: ' + rawDetail.map(e => `${e.loc?.at(-1)}: ${e.msg}`).join(', ')
                }

                throw new Error(message)
            }
            return await res.json()
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Servidor fuera de línea, intenta de nuevo más tarde.')
            }
            throw error
        }
    }, [])


    // Envoltorio (Wrapper) universal de Fetch preparado para enviar
    // automáticamente el Bearer token almacenado del usuario a endpoints privados.
    // También maneja la expiración global del token.
    const authFetch = useCallback(async (path, opts = {}) => {
        const commonHeaders = {
            'Content-Type': 'application/json',
            ...opts.headers,
        }

        let res = await fetch(`${API}${path}`, {
            ...opts,
            headers: {
                ...commonHeaders,
                Authorization: `Bearer ${tokenRef.current}`,
            },
        })

        // Si la API contesta 401, intentamos reintento automático con el refresh token
        if (res.status === 401) {
            try {
                // Intentamos renovar el access_token llamando al endpoint de refresh
                const refreshRes = await fetch(`${API}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshTokenRef.current }),
                })

                if (refreshRes.ok) {
                    const { access_token } = await refreshRes.json()

                    // Actualizamos localStorage, estado y el ref para el reintento inmediato
                    localStorage.setItem('cr_token', access_token)
                    setToken(access_token)
                    tokenRef.current = access_token

                    // Reintentamos la petición original una sola vez con el nuevo token
                    res = await fetch(`${API}${path}`, {
                        ...opts,
                        headers: {
                            ...commonHeaders,
                            Authorization: `Bearer ${access_token}`,
                        },
                    })
                }
            } catch (err) {
                console.error("Errores de red durante el refresh en authFetch:", err)
            }

            // Si la renovación falló o el reintento también devolvió 401
            if (res.status === 401) {
                logout()
                throw new Error('Sesión expirada')
            }
        }

        return res
    }, [logout])

    // Retornamos el contexto proporcionando todos los estados y métodos envueltos
    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated: !!user,
            login,
            logout,
            register,
            authFetch
        }}>
            {children}
        </AuthContext.Provider>
    )
}
