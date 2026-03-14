import { createContext, useState, useEffect, useCallback } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

// URL base de la API. Toma el valor de las variables de entorno o usa la de producción por defecto.
const API = import.meta.env.VITE_API_URL || 'https://chess-rekognition-api-production.up.railway.app'

/**
 * Proveedor de Autenticación Principal.
 * Gestiona el estado global del usuario, su token de acceso y proporciona
 * métodos unificados para realizar login, registro y peticiones autorizadas.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos envueltos por este proveedor.
 * @returns {JSX.Element} Contexto de autenticación.
 */
export function AuthProvider({ children }) {
  // Estado para almacenar la información del usuario autenticado
  const [user, setUser] = useState(null)
  
  // Estado para el JWT token, inicializado desde el localStorage
  const [token, setToken] = useState(() => localStorage.getItem('cr_token'))
  
  // Estado que indica si la validación inicial de sesión está en progreso
  const [loading, setLoading] = useState(true)

  /**
   * Efecto de inicialización:
   * Verifica si existe un token guardado e intenta rehidratar la sesión
   * obteniendo los datos actualizados del usuario desde la API.
   */
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
      .catch(() => { 
        // Si el token expira o es inválido, limpiamos la sesión local
        localStorage.removeItem('cr_token')
        setToken(null) 
      })
      .finally(() => setLoading(false))
      
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Se ejecuta únicamente al montar la aplicación

  /**
   * Método para iniciar sesión en el sistema.
   * 
   * @param {Object} credentials - Credenciales de acceso.
   * @param {string} credentials.username - Nombre de usuario.
   * @param {string} credentials.password - Contraseña del usuario.
   * @throws {Error} Si las credenciales son incorrectas o la API falla.
   */
  const login = useCallback(async ({ username, password }) => {
    try {
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
      
      // Si el acceso fue exitoso, extraemos y guardamos el token
      const { access_token } = await res.json()
      localStorage.setItem('cr_token', access_token)
      setToken(access_token)
      
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

  /**
   * Método para registrar de un nuevo usuario en la base de datos.
   * 
   * @param {Object} body - Datos completos del formulario de registro.
   * @returns {Promise<Object>} Promesa con la respuesta de la API.
   * @throws {Error} Si la validación falla el usuario ya existe.
   */
  const register = useCallback(async (body) => {
    try {
      // Adaptamos el campo 'email' procedente del front a 'mail' requerido por el back
      const payload = { ...body, mail: body.email }
      delete payload.email
      
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

  /**
   * Método para cerrar sesión de manera definitiva, borrando todos los 
   * datos del cliente local.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('cr_token')
    setToken(null)
    setUser(null)
  }, [])

  /**
   * Envoltorio (Wrapper) universal de Fetch preparado para enviar
   * automáticamente el Bearer token almacenado del usuario a endpoints privados.
   * También maneja la expiración global del token.
   * 
   * @param {string} path - Ruta de la API externa a consultar.
   * @param {Object} [opts={}] - Opciones adicionales de Fetch (método, headers extra, body, etc).
   * @returns {Promise<Response>} Promesa original de Fetch.
   * @throws {Error} Si el backend responde con un Unauthorized (401).
   */
  const authFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
        Authorization: `Bearer ${token}`,
      },
    })
    
    // Si la API contesta que no estamos autorizados, cerramos la sesión forzosamente
    if (res.status === 401) { 
      logout()
      throw new Error('Sesión expirada') 
    }
    
    return res
  }, [token, logout])

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
