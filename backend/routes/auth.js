const express  = require('express');
const router   = express.Router();
const pool     = require('../db/pool');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// POST registro
router.post('/registro', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO public.usuarios (nombre, email, password) VALUES ($1, $2, $3)',
            [nombre, email, hash]
        );
        res.json({ mensaje: 'Usuario registrado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM public.usuarios WHERE email = $1', [email]
        );
        if (result.rows.length === 0)
            return res.status(401).json({ error: 'Usuario no encontrado' });

        const usuario = result.rows[0];
        const valido  = await bcrypt.compare(password, usuario.password);
        if (!valido)
            return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.json({ token, nombre: usuario.nombre, rol: usuario.rol });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;