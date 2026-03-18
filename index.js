require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors()); 
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const validComposters = [1, 2, 3, 4, 5, 6];

// ==========================================
// RUTA POST: Guardar datos (Crea un nuevo registro siempre)
// ==========================================
app.post('/data/:id', async (req, res) => {
    const compostId = parseInt(req.params.id, 10);
    const { humidity, temperature } = req.body;

    if (!validComposters.includes(compostId)) {
        return res.status(404).json({ error: 'Compostera no encontrada. Usa un ID del 1 al 6.' });
    }

    if (typeof humidity !== 'number' || typeof temperature !== 'number') {
        return res.status(400).json({ error: 'Datos inválidos. Humedad y temperatura deben ser números.' });
    }

    try {
        // Hacemos un INSERT simple en la nueva tabla.
        // Ahora se guarda un historial infinito.
        const query = `
            INSERT INTO compostera_history (compost_id, humidity, temperature, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *;
        `;
        
        const result = await pool.query(query, [compostId, humidity, temperature]);
        
        res.status(200).json({ 
            message: `Nuevo registro guardado para compostera ${compostId}`, 
            data: result.rows[0] 
        });

    } catch (error) {
        console.error('Error al guardar en BD:', error);
        res.status(500).json({ error: 'Error interno del servidor al guardar los datos.' });
    }
});

// ==========================================
// RUTA GET: Leer SOLO el último registro
// ==========================================
app.get('/data/:id', async (req, res) => {
    const compostId = parseInt(req.params.id, 10);

    if (!validComposters.includes(compostId)) {
        return res.status(404).json({ error: 'Compostera no encontrada. Usa un ID del 1 al 6.' });
    }

    try {
        // Ordenamos por fecha descendente (DESC) y limitamos a 1 resultado
        const query = `
            SELECT registro_id, compost_id, humidity, temperature, created_at 
            FROM compostera_history 
            WHERE compost_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1;
        `;
        const result = await pool.query(query, [compostId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todavía no hay datos registrados para esta compostera.' });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Error al consultar BD:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener los datos.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de composteras corriendo en el puerto ${PORT}`);
});