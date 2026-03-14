import { useState } from 'react';

export function useCalendarioLogic() {

        // 1) Mes y año actual
        const today = new Date();
        const todayNumber = today.getDate();
        const [viewDate, setViewDate] = useState(() => new Date());
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        //selecionar fecha 
        const [selectedDate, setSelectedDate] = useState(() => new Date());

        function onSelectDay(dayNumber){
          setSelectedDate(new Date(year, month, dayNumber));
        }

        function isSelectedDay(dayNumber) {
          return (
            selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month &&
            selectedDate.getDate() === dayNumber
          );
        }

        function isToday(dayNumber){
          return (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === dayNumber
          );
        }

        // cambiar al mes anterior
        function prevMonth() {
          setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
        }

        // cambiar al mes siguiente
        function nextMonth() {
          setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
        }

        // 2) Primer día del mes y espacio donde corresponde
        const firstDay = new Date(year, month, 1).getDay();
        const offset = (firstDay + 6) % 7;
        
        // Nombre del mes y año para el calendario
        const FechaMes = viewDate.toLocaleDateString('es-CL', {
        month: 'long',
        year: 'numeric',
        });
        
        // Cantidad de dias en el mes
        const dayInMonth =  new Date(year, month + 1, 0).getDate();
        
        // Mostrar el dia actual
        const isCurrentMonth =
          today.getFullYear() === year && today.getMonth() === month;
        return {
            isToday,
            today,
            todayNumber,
            viewDate,
            setViewDate,
            year,
            month,
            prevMonth,
            nextMonth,
            firstDay,
            offset,
            FechaMes,
            dayInMonth,
            isCurrentMonth,
            onSelectDay,
            isSelectedDay,
            selectedDate,
        }
    }