import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
	isValidEmail,
	validatePassword,
	safeAuthErrorMessage,
	SECURITY,
} from '../lib/security'
import '../Components/Style/Login.css'

const LOCKOUT_ATTEMPTS = 5
const LOCKOUT_SECONDS = 120

export default function Login({ onLoginSuccess }) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const failedAttempts = useRef(0)
	const lockoutUntil = useRef(0)

	async function handleSubmit(e) {
		e.preventDefault()
		setError(null)

		if (Date.now() < lockoutUntil.current) {
			const sec = Math.ceil((lockoutUntil.current - Date.now()) / 1000)
			setError(`Demasiados intentos. Espera ${sec} s.`)
			return
		}

		const trimmedEmail = email.trim().slice(0, SECURITY.EMAIL_MAX_LENGTH)
		if (!isValidEmail(trimmedEmail)) {
			setError('Introduce un correo válido.')
			return
		}
		const rawPassword = password.trim()
		const pwdCheck = validatePassword(rawPassword)
		if (!pwdCheck.ok) {
			setError(pwdCheck.message)
			return
		}
		const safePassword = rawPassword.slice(0, SECURITY.PASSWORD_MAX_LENGTH)

		setLoading(true)
		try {
			const { data, error: err } = await supabase.auth.signInWithPassword({
				email: trimmedEmail,
				password: safePassword,
			})
			if (err) {
				failedAttempts.current += 1
				if (failedAttempts.current >= LOCKOUT_ATTEMPTS) {
					lockoutUntil.current = Date.now() + LOCKOUT_SECONDS * 1000
					failedAttempts.current = 0
				}
				const friendlyMessage = safeAuthErrorMessage(err)
				// En desarrollo mostrar también el error real de Supabase para diagnosticar
				const devHint = import.meta.env.DEV && err?.message
					? ` [${err.code || 'error'}: ${err.message}]`
					: ''
				setError(friendlyMessage + devHint)
				return
			}
			failedAttempts.current = 0
			// Actualizar sesión de inmediato para no depender solo de onAuthStateChange
			if (data?.session && typeof onLoginSuccess === 'function') {
				onLoginSuccess(data.session)
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="Login">
			<div className="Login-card">
				<h1 className="Login-title">Iniciar sesión</h1>
				<p className="Login-subtitle">Agenda MVP</p>
				<form className="Login-form" onSubmit={handleSubmit}>
					{error && <p className="Login-error" role="alert">{error}</p>}
					<label className="Login-label">
						Correo
						<input
							type="email"
							className="Login-input"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="tu@correo.com"
							required
							autoComplete="email"
							maxLength={SECURITY.EMAIL_MAX_LENGTH}
						/>
					</label>
					<label className="Login-label">
						Contraseña
						<input
							type="password"
							className="Login-input"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							required
							autoComplete="current-password"
							minLength={SECURITY.PASSWORD_MIN_LENGTH}
							maxLength={SECURITY.PASSWORD_MAX_LENGTH}
						/>
					</label>
					<button type="submit" className="Login-btn" disabled={loading}>
						{loading ? 'Entrando…' : 'Entrar'}
					</button>
				</form>
			</div>
		</div>
	)
}
