export default function Fechadate() {

    const Hoy = new Date();
    const Fechabonita = Hoy.toLocaleDateString('es-CL', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return {
        Fechabonita
    }
}