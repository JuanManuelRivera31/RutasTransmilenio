const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// POST registrar consulta
router.post('/', async (req, res) => {
    const { usuario_nombre, usuario_email, elemento_id, elemento_nombre, tipo_consulta } = req.body;
    try {
        await pool.query(`
            INSERT INTO public.reporte 
                (usuario_nombre, usuario_email, elemento_id, elemento_nombre, tipo_consulta)
            VALUES ($1, $2, $3, $4, $5)
        `, [usuario_nombre, usuario_email, elemento_id, elemento_nombre, tipo_consulta]);
        res.json({ mensaje: 'Reporte registrado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET listar reportes
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM public.reporte ORDER BY fecha_consulta DESC LIMIT 50'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;