import './Style/Calendario.css';

export default function Calendario({
	FechaMes,
	prevMonth,
	nextMonth,
	offset,
	dayInMonth,
	todayNumber,
	isCurrentMonth,
	onSelectDay,
	isSelectedDay,
}) {
	return (
		<div className='calendar'>
			{/* Meses */}
			<div className='title-calendar'>
				<i className="fa fa-chevron-left prev" onClick={prevMonth}></i>
				<h4> {FechaMes} </h4>
				<i className="fa fa-chevron-right next" onClick={nextMonth}></i>
			</div>

			{/* Dias de la semana */}
			<div className='day-semana'>
				<span>L</span>
				<span>M</span>
				<span>Mi</span>
				<span>J</span>
				<span>V</span>
				<span>S</span>
				<span>D</span>
			</div>

			{/* Dibujar numeros del mes */}
			<ol className='calendar-Num'>
				{[
					...Array.from({ length: offset }, () => null),
					...Array.from({ length: dayInMonth }, (_, i) => i + 1),
				].map((day, index) => {
					if (day === null) {
						return <li key={index} className='empty'></li>;
					}
					const isToday = isCurrentMonth && day === todayNumber;
					const selected = isSelectedDay(day);
					const className = [isToday && 'today', selected && 'selected'].filter(Boolean).join(' ');
					return (
						<li
							key={index}
							className={className || ''}
							onClick={() => onSelectDay(day)}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => e.key === 'Enter' && onSelectDay(day)}
						>
							{day}
						</li>
					);
				})}
			</ol>
		</div>
	);
}

