import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import './Style/Home.css'

const WEEKDAY_LABELS = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D']
const MONTH_NAMES = [
	'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
	'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function toDateKey(d) {
	const y = d.getFullYear()
	const m = d.getMonth() + 1
	const day = d.getDate()
	return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Builds a grid for one month: array of rows, each row has 7 cells (dateKey or null). Monday = 0. */
function buildMonthGrid(year, month) {
	const first = new Date(year, month, 1)
	const firstWeekday = (first.getDay() + 6) % 7
	const lastDay = new Date(year, month + 1, 0).getDate()

	const rows = []
	let row = []
	for (let i = 0; i < firstWeekday; i++) row.push(null)
	for (let day = 1; day <= lastDay; day++) {
		row.push(toDateKey(new Date(year, month, day)))
		if (row.length === 7) {
			rows.push(row)
			row = []
		}
	}
	if (row.length) {
		while (row.length < 7) row.push(null)
		rows.push(row)
	}
	return rows
}

export default function Home() {
	const { user } = useAuth()
	const now = new Date()
	const [viewYear, setViewYear] = useState(now.getFullYear())
	const [viewMonth, setViewMonth] = useState(now.getMonth())
	const [eventsByDate, setEventsByDate] = useState(() => new Set())
	const [featuredList, setFeaturedList] = useState(null)
	const [featuredItems, setFeaturedItems] = useState([])
	const [loading, setLoading] = useState(true)

	const todayKey = toDateKey(new Date())

	useEffect(() => {
		if (!user?.id) return
		let cancelled = false

		async function load() {
			const year = new Date().getFullYear()
			const [eventsRes, profileRes] = await Promise.all([
				supabase
					.from('agenda_events')
					.select('date')
					.eq('user_id', user.id)
					.gte('date', `${year}-01-01`)
					.lte('date', `${year}-12-31`),
				supabase.from('profiles').select('featured_list_id').eq('id', user.id).maybeSingle(),
			])

			if (cancelled) return
			const set = new Set()
			;(eventsRes.data || []).forEach((row) => row.date && set.add(row.date))
			setEventsByDate(set)

			const featuredId = profileRes.data?.featured_list_id
			if (!featuredId) {
				setFeaturedList(null)
				setFeaturedItems([])
				setLoading(false)
				return
			}

			const { data: listRow } = await supabase
				.from('lists')
				.select('id, name, color, type')
				.eq('id', featuredId)
				.eq('user_id', user.id)
				.maybeSingle()
			if (cancelled) return
			if (!listRow) {
				setFeaturedList(null)
				setFeaturedItems([])
			} else {
				setFeaturedList(listRow)
				const { data: items } = await supabase
					.from('list_items')
					.select('id, text, done')
					.eq('list_id', featuredId)
					.order('position')
					.limit(5)
				if (!cancelled) setFeaturedItems(items || [])
			}
			setLoading(false)
		}
		load()
		return () => { cancelled = true }
	}, [user?.id])

	const monthGrid = useMemo(
		() => buildMonthGrid(viewYear, viewMonth),
		[viewYear, viewMonth]
	)

	function prevMonth() {
		if (viewMonth === 0) {
			setViewMonth(11)
			setViewYear((y) => y - 1)
		} else {
			setViewMonth((m) => m - 1)
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			setViewMonth(0)
			setViewYear((y) => y + 1)
		} else {
			setViewMonth((m) => m + 1)
		}
	}

	return (
		<div className="Home">
			<h1 className="Home-title">Inicio</h1>
			<p className="Home-subtitle">Elige una sección para empezar</p>

			<div className="Home-calendar-wrap">
				<div className="Home-calendar-header">
					<button
						type="button"
						className="Home-calendar-nav"
						onClick={prevMonth}
						aria-label="Mes anterior"
					>
						‹
					</button>
					<span className="Home-calendar-title">
						{MONTH_NAMES[viewMonth]} {viewYear}
					</span>
					<button
						type="button"
						className="Home-calendar-nav"
						onClick={nextMonth}
						aria-label="Mes siguiente"
					>
						›
					</button>
				</div>
				<table className="Home-calendar" role="grid" aria-label={`Calendario ${MONTH_NAMES[viewMonth]} ${viewYear}`}>
					<thead>
						<tr>
							{WEEKDAY_LABELS.map((l) => (
								<th key={l} className="Home-calendar-th">
									{l}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{monthGrid.map((row, wi) => (
							<tr key={wi}>
								{row.map((dateKey, dow) => {
									if (!dateKey) {
										return <td key={dow} className="Home-calendar-td" />
									}
									const isToday = dateKey === todayKey
									const hasEvents = eventsByDate.has(dateKey)
									return (
										<td key={dow} className="Home-calendar-td">
											<span
												className={`Home-calendar-dot ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`}
												title={dateKey}
												aria-label={dateKey}
											/>
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{loading ? (
				<p className="Home-featured-empty">Cargando…</p>
			) : featuredList ? (
				<section className="Home-featured" aria-label="Lista destacada">
					<div className="Home-featured-header" style={{ borderLeftColor: featuredList.color || '#71717a' }}>
						<span className="Home-featured-name">{featuredList.name}</span>
					</div>
					{featuredItems.length > 0 && (
						<ul className="Home-featured-items">
							{featuredItems.map((item) => (
								<li key={item.id} className="Home-featured-item">
									{featuredList.type === 'tareas' && (
										<span className="Home-featured-check" aria-hidden>
											{item.done ? '✓' : '○'}
										</span>
									)}
									<span className={item.done ? 'Home-featured-item-text done' : 'Home-featured-item-text'}>
										{item.text}
									</span>
								</li>
							))}
						</ul>
					)}
					<Link to="/lista" className="Home-featured-link">
						Ver en Lista
					</Link>
				</section>
			) : (
				<p className="Home-featured-empty">Destaca una lista desde Lista para verla aquí.</p>
			)}
		</div>
	)
}
