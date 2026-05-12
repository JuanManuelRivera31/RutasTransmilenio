let puntosRuta = [];
let rutaLayer = null;
let marcadoresRuta = [];

function seleccionarEstacion(feature, layer) {
    if (puntosRuta.length >= 2) limpiarRuta();

    const idEstacion = feature.properties.id || feature.properties.gid;

    // Calcular centroide según tipo de geometría
    let latlng;
    const geom = feature.geometry;

    if (geom.type === 'Point') {
        latlng = L.latLng(geom.coordinates[1], geom.coordinates[0]);

    } else if (geom.type === 'MultiLineString' || geom.type === 'LineString') {
        // Promediar todas las coordenadas para obtener el centro
        let allCoords = [];
        if (geom.type === 'MultiLineString') {
            geom.coordinates.forEach(line => line.forEach(c => allCoords.push(c)));
        } else {
            allCoords = geom.coordinates;
        }
        const avgLng = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
        const avgLat = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;
        latlng = L.latLng(avgLat, avgLng);

    } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        // Usar bounds del layer
        latlng = layer.getBounds().getCenter();

    } else {
        console.error('Tipo de geometría no soportado:', geom.type);
        return;
    }

    puntosRuta.push(idEstacion);

    const marker = L.circleMarker(latlng, {
        radius: 12,
        fillColor: '#2DC653',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
    }).addTo(map);

    const label = L.tooltip({ permanent: true, direction: 'top' })
        .setContent(`${puntosRuta.length}`)
        .setLatLng(latlng);
    map.addLayer(label);
    marcadoresRuta.push(marker, label);

    const nombre = feature.properties.nombre || 'Estación';
    document.getElementById('ruta-info').innerHTML =
        puntosRuta.length === 1
            ? `<b>Origen:</b> ${nombre}<br>Selecciona el destino`
            : `<b>Destino:</b> ${nombre}<br>Calculando...`;

    if (puntosRuta.length === 2) calcularRuta();
}

function calcularRuta() {
    const url = `${API}/rutas?origen=${puntosRuta[0]}&destino=${puntosRuta[1]}`;
    console.log('Calculando ruta:', url);

    fetch(url)
        .then(r => r.json())
        .then(data => {
            console.log('Respuesta ruta:', JSON.stringify(data).substring(0, 200));

            if (data.error) {
                document.getElementById('ruta-info').innerHTML =
                    `<span style="color:red">Error: ${data.error}</span>`;
                return;
            }

            if (rutaLayer) map.removeLayer(rutaLayer);

            // Verificar que hay features
            const features = data.geojson && data.geojson.features;
            if (!features || features.length === 0) {
                document.getElementById('ruta-info').innerHTML =
                    `<b>De:</b> ${data.estacion_origen}<br>
                     <b>A:</b> ${data.estacion_destino}<br>
                     <b>Distancia:</b> ${data.distancia_metros} m<br>
                     <small style="color:orange">Ruta calculada pero sin geometría visible</small>`;
                return;
            }

            rutaLayer = L.geoJSON(data.geojson, {
                style: { color: '#FF0000', weight: 10, opacity: 1 }
            }).addTo(map);
            rutaLayer.bringToFront();

            // Recopilar todas las coordenadas manualmente
            let allLatLngs = [];
            features.forEach(f => {
                const geom = f.geometry;
                if (geom.type === 'MultiLineString') {
                    geom.coordinates.forEach(line => {
                        line.forEach(c => allLatLngs.push(L.latLng(c[1], c[0])));
                    });
                } else if (geom.type === 'LineString') {
                    geom.coordinates.forEach(c => allLatLngs.push(L.latLng(c[1], c[0])));
                }
            });

            if (allLatLngs.length > 0) {
                const bounds = L.latLngBounds(allLatLngs);
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [60, 60] });
                }
            }

            document.getElementById('ruta-info').innerHTML =
                `<b>De:</b> ${data.estacion_origen}<br>
                 <b>A:</b> ${data.estacion_destino}<br>
                 <b>Distancia:</b> ${data.distancia_metros} m`;

            if (typeof registrarReporte === 'function')
                registrarReporte(puntosRuta[1], data.estacion_destino, 'ruta');
        })
        .catch(err => console.error('Fetch error:', err));
}

function limpiarRuta() {
    puntosRuta = [];
    if (rutaLayer) map.removeLayer(rutaLayer);
    marcadoresRuta.forEach(m => map.removeLayer(m));
    marcadoresRuta = [];
    document.getElementById('ruta-info').innerHTML = '';
}