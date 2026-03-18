require('dotenv').config(); // Carga las variables del archivo .env
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middlewares
app.use(cors()); 
app.use(express.json()); // Permite a la API entender formato JSON

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para bases de datos en la nube como Render
    }
});

// Lista de composteras válidas (1 al 6)
const validComposters = [1, 2, 3, 4, 5, 6];

// ==========================================
// RUTA POST: Guardar datos del ESP32
// ==========================================
app.post('/data/:id', async (req, res) => {
    const compostId = parseInt(req.params.id, 10);
    const { humidity, temperature } = req.body;

    // Validación: ¿Es una compostera válida?
    if (!validComposters.includes(compostId)) {
        return res.status(404).json({ error: 'Compostera no encontrada. Usa un ID del 1 al 6.' });
    }

    // Validación: ¿Los datos son números?
    if (typeof humidity !== 'number' || typeof temperature !== 'number') {
        return res.status(400).json({ error: 'Datos inválidos. Humedad y temperatura deben ser números.' });
    }

    try {
        // Query SQL para insertar o actualizar (UPSERT)
        // Si el ID no existe lo crea, si ya existe lo actualiza con los nuevos valores
        const query = `
            INSERT INTO compostera_state (id, humidity, temperature, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (id) 
            DO UPDATE SET 
                humidity = EXCLUDED.humidity, 
                temperature = EXCLUDED.temperature, 
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        
        const result = await pool.query(query, [compostId, humidity, temperature]);
        
        res.status(200).json({ 
            message: `Datos actualizados exitosamente para compostera ${compostId}`, 
            data: result.rows[0] 
        });

    } catch (error) {
        console.error('Error al guardar en BD:', error);
        res.status(500).json({ error: 'Error interno del servidor al guardar los datos.' });
    }
});

// ==========================================
// RUTA GET: Leer datos de la base de datos
// ==========================================
app.get('/data/:id', async (req, res) => {
    const compostId = parseInt(req.params.id, 10);

    if (!validComposters.includes(compostId)) {
        return res.status(404).json({ error: 'Compostera no encontrada. Usa un ID del 1 al 6.' });
    }

    try {
        // Buscar los datos de esa compostera en PostgreSQL
        const query = 'SELECT humidity, temperature, updated_at FROM compostera_state WHERE id = $1';
        const result = await pool.query(query, [compostId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todavía no hay datos registrados para esta compostera.' });
        }

        // Devolvemos los datos encontrados
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Error al consultar BD:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener los datos.' });
    }
});

// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
// Usa el puerto de Render o el 3000 si estás en tu computadora
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor de composteras corriendo en http://localhost:${PORT}`);
});