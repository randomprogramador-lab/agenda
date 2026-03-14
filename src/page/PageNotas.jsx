import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { sanitizeShortInput, sanitizeLongInput } from '../lib/security'
import '../Components/Style/Lista.css'

function PageNotas() {
	const { user } = useAuth()
	const [notes, setNotes] = useState([])
	const [loading, setLoading] = useState(true)
	const [editingId, setEditingId] = useState(null)
	const [editTitle, setEditTitle] = useState('')
	const [editContent, setEditContent] = useState('')
	const [newTitle, setNewTitle] = useState('')
	const [newContent, setNewContent] = useState('')
	const [showNewForm, setShowNewForm] = useState(false)

	const fetchNotes = useCallback(async () => {
		if (!user?.id) return
		const { data, error } = await supabase
			.from('notes')
			.select('id, title, content, updated_at')
			.eq('user_id', user.id)
			.order('updated_at', { ascending: false })
		if (error) {
			console.error('Error cargando notas:', error)
			setNotes([])
		} else {
			setNotes(data || [])
		}
		setLoading(false)
	}, [user?.id])

	useEffect(() => {
		fetchNotes()
	}, [fetchNotes])

	async function handleSaveNew() {
		const title = sanitizeShortInput(newTitle)
		const content = sanitizeLongInput(newContent)
		if (!user?.id || (!title && !content)) return
		const { data, error } = await supabase
			.from('notes')
			.insert({ user_id: user.id, title: title || 'Sin título', content: content || '' })
			.select('id, title, content, updated_at')
			.single()
		if (error) {
			console.error('Error creando nota:', error)
			return
		}
		setNotes((prev) => [data, ...prev])
		setNewTitle('')
		setNewContent('')
		setShowNewForm(false)
	}

	function openEdit(note) {
		setEditingId(note.id)
		setEditTitle(note.title || '')
		setEditContent(note.content || '')
	}

	async function handleSaveEdit() {
		if (!editingId) return
		const title = sanitizeShortInput(editTitle)
		const content = sanitizeLongInput(editContent)
		const { error } = await supabase
			.from('notes')
			.update({ title: title || 'Sin título', content: content || '' })
			.eq('id', editingId)
		if (error) {
			console.error('Error actualizando nota:', error)
			return
		}
		setNotes((prev) =>
			prev.map((n) =>
				n.id === editingId ? { ...n, title: title || 'Sin título', content: content || '', updated_at: new Date().toISOString() } : n
			)
		)
		setEditingId(null)
		setEditTitle('')
		setEditContent('')
	}

	async function handleDelete(id) {
		if (!window.confirm('¿Eliminar esta nota?')) return
		const { error } = await supabase.from('notes').delete().eq('id', id)
		if (error) {
			console.error('Error eliminando nota:', error)
			return
		}
		setNotes((prev) => prev.filter((n) => n.id !== id))
		if (editingId === id) setEditingId(null)
	}

	if (loading && notes.length === 0) {
		return (
			<div className="lista-page">
				<p className="lista-empty-detail">Cargando notas…</p>
			</div>
		)
	}

	return (
		<div className="lista-page">
			<aside className="lista-column">
				<h2 className="lista-column-title">Notas</h2>
				<button
					type="button"
					className="lista-btn-new"
					onClick={() => setShowNewForm((s) => !s)}
				>
					Nueva nota
				</button>
				{showNewForm && (
					<div className="lista-new-form">
						<input
							type="text"
							className="lista-input"
							placeholder="Título"
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
							autoFocus
						/>
						<textarea
							className="lista-input"
							placeholder="Contenido"
							value={newContent}
							onChange={(e) => setNewContent(e.target.value)}
							rows={3}
							style={{ resize: 'vertical' }}
						/>
						<div className="lista-new-form-actions">
							<button type="button" className="lista-btn-cancel" onClick={() => setShowNewForm(false)}>
								Cancelar
							</button>
							<button
								type="button"
								className="lista-btn-save"
								onClick={handleSaveNew}
								disabled={!newTitle.trim() && !newContent.trim()}
							>
								Guardar
							</button>
						</div>
					</div>
				)}
				<ul className="lista-names">
					{notes.map((note) => (
						<li key={note.id}>
							<button
								type="button"
								className={`lista-name-btn ${editingId === note.id ? 'active' : ''}`}
								onClick={() => openEdit(note)}
							>
								<span className="lista-name-text">{note.title || 'Sin título'}</span>
							</button>
						</li>
					))}
				</ul>
			</aside>
			<section className="lista-detail">
				{!editingId ? (
					<p className="lista-empty-detail">Selecciona una nota o crea una nueva</p>
				) : (
					<>
						<div className="lista-detail-header" style={{ borderLeftColor: '#7c3aed' }}>
							<input
								type="text"
								className="lista-detail-title"
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								placeholder="Título"
								style={{ border: 'none', background: 'transparent', width: '100%' }}
							/>
							<button
								type="button"
								className="lista-btn-delete-list"
								onClick={() => handleDelete(editingId)}
							>
								Eliminar
							</button>
						</div>
						<textarea
							className="lista-input"
							placeholder="Contenido"
							value={editContent}
							onChange={(e) => setEditContent(e.target.value)}
							rows={12}
							style={{ width: '100%', marginTop: 12, resize: 'vertical', boxSizing: 'border-box' }}
						/>
						<button type="button" className="lista-btn-save" onClick={handleSaveEdit} style={{ marginTop: 12 }}>
							Guardar cambios
						</button>
					</>
				)}
			</section>
		</div>
	)
}

export default PageNotas
