const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// GET todas las estaciones como GeoJSON
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', json_build_object(
                            'id',      gid,
                            'gid',     gid,
                            'nombre',  nombre,
                            'nodo_cercano', nodo_cercano
                        )
                    )
                )
            ) AS geojson
            FROM public.estaciones
        `);
        res.json(result.rows[0].geojson);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET buscar estación por nombre (módulo de reportes)
router.get('/buscar', async (req, res) => {
    const { q } = req.query;
    try {
        const result = await pool.query(`
            SELECT gid, nombre,
                   ST_AsGeoJSON(geom) AS geojson
            FROM public.estaciones
            WHERE nombre ILIKE $1
            LIMIT 10
        `, [`%${q}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;