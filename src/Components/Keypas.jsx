import { useState, useEffect, useCallback } from 'react'
import { sanitizeShortInput } from '../lib/security'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import './Style/Keypas.css'

const PIN_SALT_KEY = 'keypas-pin-salt'
const PIN_HASH_KEY = 'keypas-pin-hash'
const SYMBOLS = '!@#$%&*()-_=+[]'
const MIN_PIN_LENGTH = 4
const MAX_PIN_LENGTH = 8
const MIN_PWD_LENGTH = 6
const MAX_PWD_LENGTH = 14

function generateSalt() {
	const arr = new Uint8Array(16)
	crypto.getRandomValues(arr)
	return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPin(salt, pin) {
	const data = new TextEncoder().encode(salt + pin)
	const hash = await crypto.subtle.digest('SHA-256', data)
	return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

function mapRowToItem(row) {
	if (!row || typeof row !== 'object') return null
	return {
		id: row.id,
		siteName: sanitizeShortInput(row.site_name ?? ''),
		user: sanitizeShortInput(row.username ?? ''),
		password: row.password ?? '',
	}
}

function generatePassword(length) {
	const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	const lower = 'abcdefghijklmnopqrstuvwxyz'
	const numbers = '0123456789'
	const all = upper + lower + numbers + SYMBOLS
	const pick = (str) => str[Math.floor(Math.random() * str.length)]
	const required = [pick(upper), pick(numbers), pick(SYMBOLS)]
	const rest = Array.from({ length: length - 3 }, () => pick(all))
	const combined = [...required, ...rest]
	for (let i = combined.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[combined[i], combined[j]] = [combined[j], combined[i]]
	}
	return combined.join('')
}

function Keypad({ code, onDigit, onBackspace, disabled }) {
	return (
		<>
			<div className="keypas-display" aria-live="polite">
				{code.length ? code.replace(/./g, '•') : '—'}
			</div>
			<div className="keypas-grid">
				{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
					<button
						key={n}
						type="button"
						className="keypas-btn"
						onClick={() => onDigit(String(n))}
						disabled={disabled}
					>
						{n}
					</button>
				))}
				<span className="keypas-cell" />
				<button type="button" className="keypas-btn" onClick={() => onDigit('0')} disabled={disabled}>
					0
				</button>
				<button
					type="button"
					className="keypas-btn keypas-btn-back"
					onClick={onBackspace}
					aria-label="Borrar"
					disabled={disabled}
				>
					⌫
				</button>
			</div>
		</>
	)
}

export default function Keypas() {
	const { user } = useAuth()
	const [hasPin, setHasPin] = useState(() => !!localStorage.getItem(PIN_HASH_KEY))
	const [unlocked, setUnlocked] = useState(false)
	const [createStep, setCreateStep] = useState('choose')
	const [pendingPin, setPendingPin] = useState('')
	const [code, setCode] = useState('')
	const [error, setError] = useState('')
	const [passwords, setPasswords] = useState([])
	const [passwordsLoading, setPasswordsLoading] = useState(false)

	const fetchPasswords = useCallback(async () => {
		if (!user?.id) return
		setPasswordsLoading(true)
		const { data, error: err } = await supabase
			.from('keypas_passwords')
			.select('id, site_name, username, password')
			.eq('user_id', user.id)
			.order('created_at', { ascending: true })
		setPasswordsLoading(false)
		if (err) {
			console.error('Error cargando contraseñas:', err)
			setPasswords([])
			return
		}
		setPasswords((data || []).map(mapRowToItem).filter(Boolean))
	}, [user?.id])
	const [visibleIds, setVisibleIds] = useState(() => new Set())
	const [editingId, setEditingId] = useState(null)
	const [editSiteName, setEditSiteName] = useState('')
	const [editUser, setEditUser] = useState('')
	const [editPassword, setEditPassword] = useState('')
	const [genSiteName, setGenSiteName] = useState('')
	const [genUser, setGenUser] = useState('')
	const [showChangePin, setShowChangePin] = useState(false)
	const [changePinStep, setChangePinStep] = useState('current')
	const [changePinNew, setChangePinNew] = useState('')
	const [genLength, setGenLength] = useState(10)
	const [generatedPwd, setGeneratedPwd] = useState('')
	const [isHashing, setIsHashing] = useState(false)

	useEffect(() => {
		if (unlocked && user?.id) fetchPasswords()
	}, [unlocked, user?.id, fetchPasswords])

	function handleDigit(digit) {
		setError('')
		setCode((prev) => (prev.length < MAX_PIN_LENGTH ? prev + digit : prev))
	}

	function handleBackspace() {
		setError('')
		setCode((prev) => prev.slice(0, -1))
	}

	async function handleCreateSubmit() {
		if (createStep === 'choose') {
			if (code.length < MIN_PIN_LENGTH) {
				setError(`Mínimo ${MIN_PIN_LENGTH} dígitos`)
				return
			}
			setPendingPin(code)
			setCode('')
			setCreateStep('confirm')
			return
		}
		if (code !== pendingPin) {
			setError('Las contraseñas no coinciden')
			setCode('')
			return
		}
		setIsHashing(true)
		try {
			const salt = generateSalt()
			const hash = await hashPin(salt, code)
			localStorage.setItem(PIN_SALT_KEY, salt)
			localStorage.setItem(PIN_HASH_KEY, hash)
			setHasPin(true)
			setUnlocked(true)
			setCode('')
			setPendingPin('')
			setCreateStep('choose')
		} finally {
			setIsHashing(false)
		}
	}

	async function handleEnterSubmit() {
		if (code.length < MIN_PIN_LENGTH) {
			setError(`Mínimo ${MIN_PIN_LENGTH} dígitos`)
			return
		}
		setIsHashing(true)
		setError('')
		try {
			const salt = localStorage.getItem(PIN_SALT_KEY) || ''
			const storedHash = localStorage.getItem(PIN_HASH_KEY) || ''
			const hash = await hashPin(salt, code)
			if (hash === storedHash) {
				setUnlocked(true)
				setCode('')
			} else {
				setError('Contraseña incorrecta')
				setCode('')
			}
		} finally {
			setIsHashing(false)
		}
	}

	function toggleVisible(id) {
		setVisibleIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function handleCopy(pwd) {
		navigator.clipboard
			.writeText(pwd)
			.then(() => {
				setError('Copiado')
				setTimeout(() => setError(''), 2000)
			})
			.catch(() => setError('No se pudo copiar'))
	}

	async function handleSaveNew() {
		const siteName = sanitizeShortInput(genSiteName)
		if (!siteName || !generatedPwd || !user?.id) return
		const { data, error: err } = await supabase
			.from('keypas_passwords')
			.insert({
				user_id: user.id,
				site_name: siteName,
				username: sanitizeShortInput(genUser),
				password: generatedPwd,
			})
			.select('id, site_name, username, password')
			.single()
		if (err) {
			console.error('Error guardando contraseña:', err)
			return
		}
		setPasswords((prev) => [...prev, mapRowToItem(data)])
		setGenSiteName('')
		setGenUser('')
		setGeneratedPwd('')
	}

	async function handleUpdateEdit(id, siteName, userName, password) {
		const safeSite = sanitizeShortInput(siteName)
		const safeUser = sanitizeShortInput(userName)
		const { error: err } = await supabase
			.from('keypas_passwords')
			.update({ site_name: safeSite, username: safeUser, password })
			.eq('id', id)
		if (err) {
			console.error('Error actualizando contraseña:', err)
			return
		}
		setPasswords((prev) =>
			prev.map((p) =>
				p.id === id ? { ...p, siteName: safeSite, user: safeUser, password } : p
			)
		)
		setEditingId(null)
		setEditSiteName('')
		setEditUser('')
		setEditPassword('')
	}

	function openEdit(item) {
		setEditingId(item.id)
		setEditSiteName(item.siteName ?? item.name ?? '')
		setEditUser(item.user ?? '')
		setEditPassword(item.password ?? '')
	}

	async function handleDelete(id) {
		if (!window.confirm('¿Eliminar esta contraseña?')) return
		const { error: err } = await supabase.from('keypas_passwords').delete().eq('id', id)
		if (err) {
			console.error('Error eliminando contraseña:', err)
			return
		}
		setPasswords((prev) => prev.filter((p) => p.id !== id))
		setVisibleIds((prev) => { const n = new Set(prev); n.delete(id); return n })
		setEditingId((curr) => (curr === id ? null : curr))
	}

	function handleLogout() {
		setUnlocked(false)
		setError('')
		setShowChangePin(false)
		setChangePinStep('current')
		setCode('')
		setChangePinNew('')
	}

	async function handleChangePinSubmit() {
		if (changePinStep === 'current') {
			if (code.length < MIN_PIN_LENGTH) {
				setError(`Mínimo ${MIN_PIN_LENGTH} dígitos`)
				return
			}
			setIsHashing(true)
			setError('')
			try {
				const salt = localStorage.getItem(PIN_SALT_KEY) || ''
				const storedHash = localStorage.getItem(PIN_HASH_KEY) || ''
				const hash = await hashPin(salt, code)
				if (hash !== storedHash) {
					setError('Contraseña actual incorrecta')
					setCode('')
					return
				}
				setChangePinNew('')
				setCode('')
				setChangePinStep('new')
			} finally {
				setIsHashing(false)
			}
			return
		}
		if (changePinStep === 'new') {
			if (code.length < MIN_PIN_LENGTH) {
				setError(`Mínimo ${MIN_PIN_LENGTH} dígitos`)
				return
			}
			setChangePinNew(code)
			setCode('')
			setChangePinStep('confirm')
			return
		}
		if (changePinStep === 'confirm') {
			if (code !== changePinNew) {
				setError('Las contraseñas no coinciden')
				setCode('')
				return
			}
			setIsHashing(true)
			try {
				const newSalt = generateSalt()
				const newHash = await hashPin(newSalt, code)
				localStorage.setItem(PIN_SALT_KEY, newSalt)
				localStorage.setItem(PIN_HASH_KEY, newHash)
				setShowChangePin(false)
				setChangePinStep('current')
				setCode('')
				setChangePinNew('')
				setError('')
			} finally {
				setIsHashing(false)
			}
		}
	}

	// Pantalla: crear contraseña de seguridad (primera vez)
	if (!hasPin) {
		return (
			<div className="keypas">
				<h2 className="keypas-title">Keypas</h2>
				<p className="keypas-subtitle">Crear contraseña de seguridad</p>
				<p className="keypas-step">
					{createStep === 'choose' ? 'Elija su contraseña' : 'Confirme su contraseña'}
				</p>
				{error && <p className="keypas-error" role="alert">{error}</p>}
				<Keypad code={code} onDigit={handleDigit} onBackspace={handleBackspace} disabled={isHashing} />
				<button
					type="button"
					className="keypas-submit"
					onClick={handleCreateSubmit}
					disabled={code.length < MIN_PIN_LENGTH || isHashing}
				>
					{createStep === 'confirm' ? 'Confirmar' : 'Siguiente'}
				</button>
			</div>
		)
	}

	// Pantalla: ingresar contraseña (ya existe PIN)
	if (!unlocked) {
		return (
			<div className="keypas">
				<h2 className="keypas-title">Keypas</h2>
				<p className="keypas-subtitle">Ingrese su contraseña</p>
				{error && <p className="keypas-error" role="alert">{error}</p>}
				<Keypad code={code} onDigit={handleDigit} onBackspace={handleBackspace} disabled={isHashing} />
				<button
					type="button"
					className="keypas-submit"
					onClick={handleEnterSubmit}
					disabled={code.length < MIN_PIN_LENGTH || isHashing}
				>
					Entrar
				</button>
			</div>
		)
	}

	// Pantalla: cambiar contraseña de seguridad
	if (showChangePin) {
		const changePinLabels = {
			current: 'Ingrese su contraseña actual',
			new: 'Elija la nueva contraseña',
			confirm: 'Confirme la nueva contraseña',
		}
		return (
			<div className="keypas">
				<h2 className="keypas-title">Cambiar contraseña</h2>
				<p className="keypas-step">{changePinLabels[changePinStep]}</p>
				{error && <p className="keypas-error" role="alert">{error}</p>}
				<Keypad code={code} onDigit={handleDigit} onBackspace={handleBackspace} disabled={isHashing} />
				<button
					type="button"
					className="keypas-submit"
					onClick={handleChangePinSubmit}
					disabled={code.length < MIN_PIN_LENGTH || isHashing}
				>
					{changePinStep === 'confirm' ? 'Confirmar' : 'Siguiente'}
				</button>
				<button
					type="button"
					className="keypas-logout"
					style={{ marginTop: 12 }}
					onClick={() => {
						setShowChangePin(false)
						setChangePinStep('current')
						setCode('')
						setChangePinNew('')
						setError('')
					}}
				>
					Cancelar
				</button>
			</div>
		)
	}

	// Pantalla principal: generador + lista + salir
	return (
		<div className="keypas keypas-main">
			<div className="keypas-header">
				<h2 className="keypas-title">Keypas</h2>
				<div className="keypas-header-actions">
					<button type="button" className="keypas-btn-change-pin" onClick={() => setShowChangePin(true)}>
						Cambiar contraseña
					</button>
					<button type="button" className="keypas-logout" onClick={handleLogout}>
						Salir
					</button>
				</div>
			</div>

			<section className="keypas-generator">
				<h3 className="keypas-section-title">Generar contraseña</h3>
				<div className="keypas-gen-row">
					<label className="keypas-label">Longitud (6–14)</label>
					<select
						className="keypas-select"
						value={genLength}
						onChange={(e) => setGenLength(Number(e.target.value))}
					>
						{Array.from({ length: MAX_PWD_LENGTH - MIN_PWD_LENGTH + 1 }, (_, i) => i + MIN_PWD_LENGTH).map(
							(n) => (
								<option key={n} value={n}>
									{n}
								</option>
							)
						)}
					</select>
				</div>
				<div className="keypas-gen-row">
					<label className="keypas-label">Nombre del sitio</label>
					<input
						type="text"
						className="keypas-input"
						placeholder="Ej. Netflix, Gmail"
						value={genSiteName}
						onChange={(e) => setGenSiteName(e.target.value)}
					/>
				</div>
				<div className="keypas-gen-row">
					<label className="keypas-label">Usuario</label>
					<input
						type="text"
						className="keypas-input"
						placeholder="Ej. mi@correo.com"
						value={genUser}
						onChange={(e) => setGenUser(e.target.value)}
					/>
				</div>
				<div className="keypas-gen-actions">
					<button
						type="button"
						className="keypas-btn-gen"
						onClick={() => setGeneratedPwd(generatePassword(genLength))}
					>
						Generar
					</button>
					{generatedPwd && (
						<>
							<span className="keypas-generated-display">{generatedPwd}</span>
							<button
								type="button"
								className="keypas-btn-save"
								onClick={handleSaveNew}
								disabled={!genSiteName.trim()}
							>
								Guardar
							</button>
						</>
					)}
				</div>
			</section>

			<section className="keypas-list-section">
				<h3 className="keypas-section-title">Contraseñas guardadas</h3>
				{error && (
					<p className={`keypas-error ${error === 'Copiado' ? 'keypas-success' : ''}`} role="alert">
						{error}
					</p>
				)}
				{passwords.length === 0 ? (
					<p className="keypas-empty">No hay contraseñas guardadas. Genera una y guárdala.</p>
				) : (
					<ul className="keypas-list">
						{passwords.map((item) => (
							<li key={item.id} className="keypas-list-item">
								{editingId === item.id ? (
									<div className="keypas-edit-form">
										<input
											type="text"
											className="keypas-input"
											value={editSiteName}
											onChange={(e) => setEditSiteName(e.target.value)}
											placeholder="Nombre del sitio"
										/>
										<input
											type="text"
											className="keypas-input"
											value={editUser}
											onChange={(e) => setEditUser(e.target.value)}
											placeholder="Usuario"
										/>
										<div className="keypas-edit-pwd-row">
											<input
												type="text"
												className="keypas-input keypas-input-pwd"
												value={editPassword}
												onChange={(e) => setEditPassword(e.target.value)}
												placeholder="Contraseña"
											/>
											<button
												type="button"
												className="keypas-btn-small"
												onClick={() => setEditPassword(generatePassword(editPassword.length || 10))}
												title="Generar nueva"
											>
												Regenerar
											</button>
										</div>
										<div className="keypas-edit-actions">
											<button
												type="button"
												className="keypas-btn-small primary"
												onClick={() =>
													handleUpdateEdit(item.id, editSiteName, editUser, editPassword)
												}
											>
												Guardar
											</button>
											<button
												type="button"
												className="keypas-btn-small"
												onClick={() => {
													setEditingId(null)
													setEditSiteName('')
													setEditUser('')
													setEditPassword('')
												}}
											>
												Cancelar
											</button>
										</div>
									</div>
								) : (
									<>
										<div className="keypas-item-main">
											<span className="keypas-item-name">{item.siteName || item.name || '—'}</span>
											{item.user ? (
												<span className="keypas-item-user">{item.user}</span>
											) : null}
											<span className="keypas-item-pwd">
												{visibleIds.has(item.id) ? item.password : '•'.repeat((item.password || '').length)}
											</span>
										</div>
										<div className="keypas-item-actions">
											<button
												type="button"
												className="keypas-item-btn"
												onClick={() => toggleVisible(item.id)}
												title="Ver"
											>
												{visibleIds.has(item.id) ? 'Ocultar' : 'Ver'}
											</button>
											<button
												type="button"
												className="keypas-item-btn"
												onClick={() => handleCopy(item.password)}
												title="Copiar contraseña"
											>
												Copiar
											</button>
											{item.user ? (
												<button
													type="button"
													className="keypas-item-btn"
													onClick={() => handleCopy(item.user)}
													title="Copiar usuario"
												>
													Copiar usuario
												</button>
											) : null}
											<button
												type="button"
												className="keypas-item-btn"
												onClick={() => openEdit(item)}
												title="Editar"
											>
												Editar
											</button>
											<button
												type="button"
												className="keypas-item-btn danger"
												onClick={() => handleDelete(item.id)}
												title="Eliminar"
											>
												Eliminar
											</button>
										</div>
									</>
								)}
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	)
}
