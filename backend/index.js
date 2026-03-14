import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";

const app = express();

app.use(cors());
app.use(express.json());

// 1) Conectar a SQLite
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("❌ Error al conectar a la base de datos:", err.message);
  } else {
    console.log("🗄️ Conectado a la base de datos SQLite.");
  }
});

// 2) Crear tabla si no existe (para citas/recordatorios)
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    time TEXT,
    notes TEXT
  )
`);

// 3) Ruta de prueba
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Backend alive" });
});

// 4) Ruta para agregar un nuevo evento
app.get('/events', (req, res)=> {
    const {date} = req.query;

    if (!date) {
        return res.status(400).json({error: "La fecha es requerida"});
    }

    db.all(
        'SELECT * FROM events WHERE date = ? ORDER BY time ASC',
        [date],
        (err, rows) => {
            if (err) {
                console.error('Error al consultar events:', err.message);
                return res.status(500).json({ error: "Error al consultar eventos" });
            }
            res.json(rows);
        });
});

// 4) Arrancar servidor
app.listen(3000, () => {
  console.log("🟢 Backend corriendo en http://localhost:3000");
});
