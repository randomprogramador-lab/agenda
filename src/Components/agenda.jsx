import { useState } from 'react'
import { sanitizeShortInput, sanitizeLongInput } from '../lib/security'
import './Style/agenda.css'

function formatFecha(date) {
	return date.toLocaleDateString('es-CL', {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export default function Agenda({ fecha, events = [], onAddEvent, onDeleteEvent }) {
	const date = fecha ? new Date(fecha) : new Date();
	const Fechabonita = formatFecha(date);
	const isHoy =
		date.getDate() === new Date().getDate() &&
		date.getMonth() === new Date().getMonth() &&
		date.getFullYear() === new Date().getFullYear();

	const [showForm, setShowForm] = useState(false);
	const [title, setTitle] = useState('');
	const [time, setTime] = useState('');
	const [description, setDescription] = useState('');

	function handleSubmit(e) {
		e.preventDefault();
		const safeTitle = sanitizeShortInput(title);
		if (!safeTitle) return;
		onAddEvent?.({
			title: safeTitle,
			time: sanitizeShortInput(time).slice(0, 20),
			description: sanitizeLongInput(description),
		});
		setTitle('');
		setTime('');
		setDescription('');
		setShowForm(false);
	}

	function handleCancel() {
		setShowForm(false);
		setTitle('');
		setTime('');
		setDescription('');
	}

	return (
		<div className='agenda'>
			<div className='agenda-title'>
				<h4>{Fechabonita}</h4>
				<button type="button" className='add-button' onClick={() => setShowForm((s) => !s)} aria-label="Agregar evento">
					+
				</button>
			</div>
			{showForm && (
				<form className='agenda-form' onSubmit={handleSubmit}>
					<input
						type="text"
						placeholder="Título"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className='agenda-form-input'
						autoFocus
					/>
					<input
						type="time"
						placeholder="Hora"
						value={time}
						onChange={(e) => setTime(e.target.value)}
						className='agenda-form-input'
					/>
					<textarea
						placeholder="Descripción"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className='agenda-form-textarea'
						rows={2}
					/>
					<div className='agenda-form-actions'>
						<button type="button" className='agenda-form-btn cancel' onClick={handleCancel}>
							Cancelar
						</button>
						<button type="submit" className='agenda-form-btn submit'>
							Agregar
						</button>
					</div>
				</form>
			)}
			<div className='agenda-content'>
				{events.length > 0 ? (
					<ul className='agenda-event-list'>
						{events.map((ev) => (
							<li key={ev.id} className='agenda-event-item'>
								<div className='agenda-event-main'>
									<span className='agenda-event-title'>{ev.title}</span>
									{ev.time && <span className='agenda-event-time'>{ev.time}</span>}
								</div>
								{ev.description && <p className='agenda-event-desc'>{ev.description}</p>}
								<button
									type="button"
									className='agenda-event-delete'
									onClick={() => onDeleteEvent?.(ev.id)}
									aria-label="Eliminar evento"
								>
									×
								</button>
							</li>
						))}
					</ul>
				) : (
					<div className='agenda-empty'>
						<p>{isHoy ? 'No hay eventos para hoy' : 'No hay eventos para este día'}</p>
						<p>Toca el botón <b>+</b> para agregar</p>
					</div>
				)}
			</div>
		</div>
	);
}