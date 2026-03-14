import './Style/App.css'
import { Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { AuthProvider } from './contexts/AuthContext'
import Perfil from './assets/Foto_perfil.jpg'
import House from './assets/house.svg'
import Note from './assets/note.svg'
import Calendar from './assets/Calendar.svg'
import List from './assets/List.svg'
import Wallet from './assets/wallet.svg'
import Key from './assets/key.svg'
import Home from './Components/Home.jsx'
import Agenda from './page/PageAgenda.jsx'
import Keypas from './Components/Keypas.jsx'
import Lista from './page/PageLista.jsx'
import Notas from './page/PageNotas.jsx'
import Login from './page/Login.jsx'
import fechadate from './hooks/Fecha.js'

function App() {
	const [user, setUser] = useState(null)
	const [authReady, setAuthReady] = useState(false)

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null)
			setAuthReady(true)
		})
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null)
		})
		return () => subscription.unsubscribe()
	}, [])

	const { Fechabonita } = fechadate()

	if (!authReady) {
		return (
			<div className="main" style={{ justifyContent: 'center', alignItems: 'center' }}>
				<span>Cargando…</span>
			</div>
		)
	}

	if (!user) {
		return (
			<main className="main">
				<div className="main-content">
					<Login onLoginSuccess={(session) => setUser(session?.user ?? null)} />
				</div>
			</main>
		)
	}

	async function handleSignOut() {
		await supabase.auth.signOut()
	}

	return (
		<>
			<header className="header">
				<span>{user.email ?? 'Usuario'}</span>
				<div className="header-content">
					<img src={Perfil} alt="Perfil" />
				</div>
				<span className="header-right">
					{Fechabonita}
					<button type="button" className="header-signout" onClick={handleSignOut} title="Cerrar sesión">
						Salir
					</button>
				</span>
			</header>

			<main className="main">
				<div className="main-content">
					<AuthProvider user={user}>
						<Routes>
							<Route path="/" element={<Home />} />
							<Route path="/agenda" element={<Agenda />} />
							<Route path="/keypas" element={<Keypas />} />
							<Route path="/lista" element={<Lista />} />
							<Route path="/notas" element={<Notas />} />
						</Routes>
					</AuthProvider>
				</div>
			</main>

			<div className="footer">
				<Link to="/">
					<img src={House} alt="Home" />
				</Link>
				<Link to="/agenda">
					<img src={Calendar} alt="Agenda" />
				</Link>
				<Link to="/notas">
					<img src={Note} alt="Notas" />
				</Link>
				<Link to="/lista">
					<img src={List} alt="Lista" />
				</Link>
				<span>
					<img src={Wallet} alt="Wallet" />
				</span>
				<Link to="/keypas">
					<img src={Key} alt="Keypas" />
				</Link>
			</div>
		</>
	)
}

export default App
