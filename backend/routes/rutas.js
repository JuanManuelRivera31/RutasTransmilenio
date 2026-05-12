const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
    const origen = parseInt(req.query.origen);
    const destino = parseInt(req.query.destino);

    if (isNaN(origen) || isNaN(destino))
        return res.status(400).json({ error: 'origen y destino deben ser enteros' });

    try {
        // Buscar las dos estaciones por gid
        const nodos = await pool.query(
            `SELECT gid, nodo_cercano, nombre
             FROM public.estaciones
             WHERE gid = $1 OR gid = $2`,
            [origen, destino]
        );

        console.log('Nodos encontrados:', nodos.rows);

        const estOrigen = nodos.rows.find(r => parseInt(r.gid) === origen);
        const estDestino = nodos.rows.find(r => parseInt(r.gid) === destino);

        if (!estOrigen || !estDestino)
            return res.status(404).json({
                error: 'Estación no encontrada',
                origen_ok: !!estOrigen,
                destino_ok: !!estDestino,
                gids_buscados: [origen, destino],
                gids_encontrados: nodos.rows.map(r => r.gid)
            });

        const nodoO = parseInt(estOrigen.nodo_cercano);
        const nodoD = parseInt(estDestino.nodo_cercano);

        console.log(`Ruteo: nodo ${nodoO} -> nodo ${nodoD}`);

        // Calcular ruta
        const ruta = await pool.query(`
    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
            json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(v.geom)::json,
                'properties', json_build_object(
                    'seq', r.seq,
                    'acumulado_metros', ROUND(r.agg_cost::numeric, 2)
                )
            )
        ), '[]'::json)
    ) AS geojson
    FROM pgr_dijkstra(
        'SELECT gid AS id, source::int4, target::int4,
                cost::float8, reverse_cost::float8 FROM public.vias',
        $1::int4, $2::int4,
        directed := false
    ) r
    JOIN public.vias v ON r.edge = v.gid
    WHERE r.edge <> -1
`, [nodoO, nodoD]);

        // Distancia total
        const dist = await pool.query(`
            SELECT ROUND(SUM(cost)::numeric, 0) AS metros
            FROM pgr_dijkstra(
                'SELECT gid AS id, source::int4, target::int4,
                        cost::float8, reverse_cost::float8 FROM public.vias',
                $1::int4, $2::int4,
                directed := false
            )
        `, [nodoO, nodoD]);

        res.json({
            geojson: ruta.rows[0].geojson,
            distancia_metros: dist.rows[0].metros,
            estacion_origen: estOrigen.nombre,
            estacion_destino: estDestino.nombre
        });

    } catch (err) {
        console.error('Error en rutas:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;