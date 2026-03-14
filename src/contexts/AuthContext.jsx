import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

export function useAuth() {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
	return ctx
}

export function AuthProvider({ user, children }) {
	return (
		<AuthContext.Provider value={{ user }}>
			{children}
		</AuthContext.Provider>
	)
}
