/**
 * Utilidades de seguridad alineadas con OWASP y buenas prácticas.
 * - Validación y saneamiento de entradas
 * - Mensajes de error seguros (evitar fuga de información)
 */

const EMAIL_MAX_LENGTH = 254
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
const TEXT_MAX_LENGTH = 2000
const SHORT_TEXT_MAX_LENGTH = 500

// RFC 5322 simplificado: algo@dominio.tld
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Valida formato y longitud de email (OWASP A07 - Authentication).
 */
export function isValidEmail(email) {
	if (typeof email !== 'string') return false
	const trimmed = email.trim()
	if (trimmed.length === 0 || trimmed.length > EMAIL_MAX_LENGTH) return false
	return EMAIL_REGEX.test(trimmed)
}

/**
 * Valida contraseña: longitud y opcionalmente complejidad (OWASP A07).
 */
export function validatePassword(password) {
	if (typeof password !== 'string') return { ok: false, message: 'Contraseña no válida' }
	if (password.length < PASSWORD_MIN_LENGTH) {
		return { ok: false, message: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` }
	}
	if (password.length > PASSWORD_MAX_LENGTH) {
		return { ok: false, message: `Máximo ${PASSWORD_MAX_LENGTH} caracteres` }
	}
	return { ok: true }
}

/**
 * Sanea una cadena para mostrar o guardar: recorta longitud y elimina caracteres de control (XSS/injection).
 */
export function sanitizeString(str, maxLength = TEXT_MAX_LENGTH) {
	if (str == null) return ''
	const s = String(str)
		.trim()
		.replace(/\0/g, '') // null bytes
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
	return s.slice(0, maxLength)
}

/**
 * Para campos cortos (nombre de lista, título de evento).
 */
export function sanitizeShortInput(str) {
	return sanitizeString(str, SHORT_TEXT_MAX_LENGTH)
}

/**
 * Para campos de texto largo (descripción, ítem de lista).
 */
export function sanitizeLongInput(str) {
	return sanitizeString(str, TEXT_MAX_LENGTH)
}

/**
 * Devuelve un mensaje seguro para el usuario sin exponer detalles internos (OWASP A04/A09).
 */
export function safeAuthErrorMessage(error) {
	if (!error || typeof error.message !== 'string') return 'Error al iniciar sesión. Intenta de nuevo.'
	const msg = error.message.toLowerCase()
	// Mensajes genéricos para errores conocidos de Supabase
	if (msg.includes('invalid login') || msg.includes('invalid_credentials')) return 'Correo o contraseña incorrectos.'
	if (msg.includes('email not confirmed')) return 'Confirma tu correo antes de entrar.'
	if (msg.includes('too many requests')) return 'Demasiados intentos. Espera un momento.'
	if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
		return 'No hay conexión con el servidor. Revisa la URL de Supabase y tu red.'
	}
	if (msg.includes('invalid api key') || msg.includes('jwt')) {
		return 'Clave de Supabase incorrecta. Revisa VITE_SUPABASE_ANON_KEY en .env.'
	}
	return 'Error al iniciar sesión. Intenta de nuevo.'
}

export const SECURITY = {
	EMAIL_MAX_LENGTH,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	TEXT_MAX_LENGTH,
	SHORT_TEXT_MAX_LENGTH,
}
