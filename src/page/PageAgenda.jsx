import { useState, useEffect, useCallback } from 'react'
import { useCalendarioLogic } from '../hooks/Calendario.js'
import Calendario from '../Components/Calendario.jsx'
import Agenda from '../Components/agenda.jsx'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

function toDateKey(d) {
	const y = d.getFullYear()
	const m = d.getMonth() + 1
	const day = d.getDate()
	return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function PageAgenda() {
	const { user } = useAuth()
	const {
		FechaMes,
		prevMonth,
		nextMonth,
		offset,
		dayInMonth,
		todayNumber,
		isCurrentMonth,
		onSelectDay,
		isSelectedDay,
		selectedDate,
	} = useCalendarioLogic()

	const [events, setEvents] = useState([])
	const [loading, setLoading] = useState(true)

	const fetchEvents = useCallback(async () => {
		if (!user?.id) return
		setLoading(true)
		const year = new Date().getFullYear()
		const { data, error } = await supabase
			.from('agenda_events')
			.select('id, date, title, time, description')
			.eq('user_id', user.id)
			.gte('date', `${year}-01-01`)
			.lte('date', `${year}-12-31`)
			.order('date', { ascending: true })
		if (error) {
			console.error('Error cargando eventos:', error)
			setEvents([])
		} else {
			setEvents((data || []).map((row) => ({
				id: row.id,
				date: row.date,
				title: row.title || '',
				time: row.time || '',
				description: row.description || '',
			})))
		}
		setLoading(false)
	}, [user?.id])

	useEffect(() => {
		fetchEvents()
	}, [fetchEvents])

	const dateKey = toDateKey(selectedDate)
	const eventsForDay = events.filter((e) => e.date === dateKey)

	async function onAddEvent(payload) {
		if (!user?.id) return
		const { data, error } = await supabase
			.from('agenda_events')
			.insert({
				user_id: user.id,
				date: dateKey,
				title: payload.title,
				time: payload.time || null,
				description: payload.description || '',
			})
			.select('id, date, title, time, description')
			.single()
		if (error) {
			console.error('Error creando evento:', error)
			return
		}
		setEvents((prev) => [
			...prev,
			{
				id: data.id,
				date: data.date,
				title: data.title || '',
				time: data.time || '',
				description: data.description || '',
			},
		])
	}

	async function onDeleteEvent(id) {
		const { error } = await supabase.from('agenda_events').delete().eq('id', id)
		if (error) {
			console.error('Error eliminando evento:', error)
			return
		}
		setEvents((prev) => prev.filter((e) => e.id !== id))
	}

	if (loading && events.length === 0) {
		return <div className="page-agenda"><p>Cargando agenda…</p></div>
	}

	return (
		<div className="page-agenda">
			<Calendario
				FechaMes={FechaMes}
				prevMonth={prevMonth}
				nextMonth={nextMonth}
				offset={offset}
				dayInMonth={dayInMonth}
				todayNumber={todayNumber}
				isCurrentMonth={isCurrentMonth}
				onSelectDay={onSelectDay}
				isSelectedDay={isSelectedDay}
			/>
			<Agenda
				fecha={selectedDate}
				events={eventsForDay}
				onAddEvent={onAddEvent}
				onDeleteEvent={onDeleteEvent}
			/>
		</div>
	)
}
export default PageAgenda
