import { useState, useEffect, useCallback } from 'react'
import { sanitizeShortInput, sanitizeLongInput } from '../lib/security'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import '../Components/Style/Lista.css'

const COLOR_PALETTE = ['#7c3aed', '#dc2626', '#2563eb', '#059669', '#ea580c', '#71717a', '#be185d', '#0d9488']
const LIST_TYPES = [
	{ value: 'tareas', label: 'Tareas (marcar hechas)' },
	{ value: 'items', label: 'Ítems (solo lista)' },
]

function mapRowToList(row) {
	return {
		id: row.id,
		name: row.name || '',
		color: row.color || COLOR_PALETTE[0],
		type: row.type === 'items' ? 'items' : 'tareas',
		items: (row.list_items || []).map((i) => ({ id: i.id, text: i.text || '', done: !!i.done })),
	}
}

function PageLista() {
	const { user } = useAuth()
	const [lists, setLists] = useState([])
	const [selectedListId, setSelectedListId] = useState(null)
	const [featuredId, setFeaturedId] = useState(null)
	const [loading, setLoading] = useState(true)
	const [showNewListForm, setShowNewListForm] = useState(false)
	const [newListName, setNewListName] = useState('')
	const [newListColor, setNewListColor] = useState(COLOR_PALETTE[0])
	const [newListType, setNewListType] = useState('tareas')
	const [newItemText, setNewItemText] = useState('')

	const fetchLists = useCallback(async () => {
		if (!user?.id) return
		const { data: listsData, error } = await supabase
			.from('lists')
			.select('*, list_items(id, text, done, position)')
			.eq('user_id', user.id)
			.order('created_at', { ascending: true })
		if (error) {
			console.error('Error cargando listas:', error)
			setLists([])
		} else {
			const withItems = (listsData || []).map((l) => ({
				...mapRowToList(l),
				items: (l.list_items || []).sort((a, b) => (a.position || 0) - (b.position || 0)).map((i) => ({ id: i.id, text: i.text || '', done: !!i.done })),
			}))
			setLists(withItems)
		}
		const { data: profile } = await supabase.from('profiles').select('featured_list_id').eq('id', user.id).maybeSingle()
		setFeaturedId(profile?.featured_list_id || null)
		setLoading(false)
	}, [user?.id])

	useEffect(() => {
		fetchLists()
	}, [fetchLists])

	const selectedList = lists.find((l) => l.id === selectedListId)

	async function handleAddList() {
		const name = sanitizeShortInput(newListName)
		if (!name || !user?.id) return
		const { data, error } = await supabase
			.from('lists')
			.insert({ user_id: user.id, name, color: newListColor, type: newListType })
			.select('id, name, color, type')
			.single()
		if (error) {
			console.error('Error creando lista:', error)
			return
		}
		setLists((prev) => [...prev, { ...data, items: [] }])
		setSelectedListId(data.id)
		setNewListName('')
		setNewListColor(COLOR_PALETTE[0])
		setNewListType('tareas')
		setShowNewListForm(false)
	}

	async function handleAddItem() {
		const text = sanitizeLongInput(newItemText)
		if (!selectedListId || !text || !user?.id) return
		const { data, error } = await supabase
			.from('list_items')
			.insert({ list_id: selectedListId, text, done: false })
			.select('id, text, done')
			.single()
		if (error) {
			console.error('Error agregando ítem:', error)
			return
		}
		setLists((prev) =>
			prev.map((l) =>
				l.id === selectedListId ? { ...l, items: [...(l.items || []), { id: data.id, text: data.text, done: data.done }] } : l
			)
		)
		setNewItemText('')
	}

	async function handleToggleDone(listId, itemId) {
		const list = lists.find((l) => l.id === listId)
		const item = list?.items?.find((i) => i.id === itemId)
		if (!item) return
		const newDone = !item.done
		const { error } = await supabase.from('list_items').update({ done: newDone }).eq('id', itemId)
		if (error) {
			console.error('Error actualizando ítem:', error)
			return
		}
		setLists((prev) =>
			prev.map((l) =>
				l.id === listId
					? { ...l, items: (l.items || []).map((i) => (i.id === itemId ? { ...i, done: newDone } : i)) }
					: l
			)
		)
	}

	async function handleDeleteItem(listId, itemId) {
		const { error } = await supabase.from('list_items').delete().eq('id', itemId)
		if (error) {
			console.error('Error eliminando ítem:', error)
			return
		}
		setLists((prev) =>
			prev.map((l) =>
				l.id === listId ? { ...l, items: (l.items || []).filter((i) => i.id !== itemId) } : l
			)
		)
	}

	async function handleDeleteList(listId) {
		if (!window.confirm('¿Eliminar esta lista y todos sus ítems?')) return
		const { error } = await supabase.from('lists').delete().eq('id', listId)
		if (error) {
			console.error('Error eliminando lista:', error)
			return
		}
		setLists((prev) => prev.filter((l) => l.id !== listId))
		if (selectedListId === listId) setSelectedListId(null)
		if (featuredId === listId) {
			setFeaturedId(null)
			await supabase.from('profiles').upsert({ id: user.id, featured_list_id: null }, { onConflict: 'id' })
		}
	}

	async function handleSetFeatured(listId) {
		setFeaturedId(listId)
		await supabase.from('profiles').upsert({ id: user.id, featured_list_id: listId }, { onConflict: 'id' })
	}

	async function handleUnsetFeatured() {
		setFeaturedId(null)
		await supabase.from('profiles').upsert({ id: user.id, featured_list_id: null }, { onConflict: 'id' })
	}

	if (loading && lists.length === 0) {
		return <div className="lista-page"><p className="lista-empty-detail">Cargando listas…</p></div>
	}

	return (
		<div className="lista-page">
			<aside className="lista-column">
				<h2 className="lista-column-title">Listas</h2>
				<button
					type="button"
					className="lista-btn-new"
					onClick={() => setShowNewListForm((s) => !s)}
				>
					Nueva lista
				</button>
				{showNewListForm && (
					<div className="lista-new-form">
						<input
							type="text"
							className="lista-input"
							placeholder="Nombre de la lista"
							value={newListName}
							onChange={(e) => setNewListName(e.target.value)}
							autoFocus
						/>
						<div className="lista-type-picker">
							<span className="lista-type-label">Tipo de lista</span>
							{LIST_TYPES.map((t) => (
								<label key={t.value} className="lista-type-option">
									<input
										type="radio"
										name="listType"
										value={t.value}
										checked={newListType === t.value}
										onChange={() => setNewListType(t.value)}
									/>
									<span>{t.label}</span>
								</label>
							))}
						</div>
						<div className="lista-color-picker">
							{COLOR_PALETTE.map((c) => (
								<button
									key={c}
									type="button"
									className="lista-color-btn"
									style={{ background: c }}
									title={c}
									onClick={() => setNewListColor(c)}
									aria-pressed={newListColor === c}
								/>
							))}
						</div>
						<div className="lista-new-form-actions">
							<button type="button" className="lista-btn-cancel" onClick={() => setShowNewListForm(false)}>
								Cancelar
							</button>
							<button
								type="button"
								className="lista-btn-save"
								onClick={handleAddList}
								disabled={!newListName.trim()}
							>
								Guardar
							</button>
						</div>
					</div>
				)}
				<ul className="lista-names">
					{lists.map((list) => (
						<li key={list.id}>
							<button
								type="button"
								className={`lista-name-btn ${selectedListId === list.id ? 'active' : ''}`}
								onClick={() => setSelectedListId(list.id)}
							>
								<span className="lista-name-color" style={{ background: list.color || COLOR_PALETTE[0] }} />
								<span className="lista-name-text">{list.name}</span>
							</button>
						</li>
					))}
				</ul>
			</aside>
			<section className="lista-detail">
				{!selectedList ? (
					<p className="lista-empty-detail">Selecciona una lista</p>
				) : (
					<>
						<div className="lista-detail-header" style={{ borderLeftColor: selectedList.color }}>
							<div className="lista-detail-title-wrap">
								<h3 className="lista-detail-title">{selectedList.name}</h3>
								<span className="lista-detail-type">
									{selectedList.type === 'items' ? 'Ítems' : 'Tareas'}
								</span>
							</div>
							<div className="lista-detail-actions">
								{featuredId === selectedList.id ? (
									<button
										type="button"
										className="lista-btn-unfeature"
										onClick={handleUnsetFeatured}
									>
										Quitar de inicio
									</button>
								) : (
									<button
										type="button"
										className="lista-btn-feature"
										onClick={() => handleSetFeatured(selectedList.id)}
									>
										Destacar en inicio
									</button>
								)}
								<button
									type="button"
									className="lista-btn-delete-list"
									onClick={() => handleDeleteList(selectedList.id)}
								>
									Eliminar lista
								</button>
							</div>
						</div>
						<div className="lista-add-item-row">
							<input
								type="text"
								className="lista-input"
								placeholder="Nuevo ítem"
								value={newItemText}
								onChange={(e) => setNewItemText(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
							/>
							<button
								type="button"
								className="lista-btn-add-item"
								onClick={handleAddItem}
								disabled={!newItemText.trim()}
							>
								Agregar
							</button>
						</div>
						<ul className="lista-items">
							{(selectedList.items || []).map((item) => (
								<li key={item.id} className="lista-item">
									{selectedList.type === 'tareas' ? (
										<label className="lista-item-label">
											<input
												type="checkbox"
												checked={!!item.done}
												onChange={() => handleToggleDone(selectedList.id, item.id)}
												className="lista-item-checkbox"
											/>
											<span className={item.done ? 'lista-item-text done' : 'lista-item-text'}>
												{item.text}
											</span>
										</label>
									) : (
										<div className="lista-item-label">
											<span className="lista-item-text">{item.text}</span>
										</div>
									)}
									<button
										type="button"
										className="lista-btn-delete-item"
										onClick={() => handleDeleteItem(selectedList.id, item.id)}
										title="Eliminar"
									>
										×
									</button>
								</li>
							))}
						</ul>
						{(selectedList.items || []).length === 0 && (
							<p className="lista-no-items">No hay ítems. Agrega uno arriba.</p>
						)}
					</>
				)}
			</section>
		</div>
	)
}

export default PageLista
