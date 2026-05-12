let puntosRuta = [];
let rutaLayer = null;
let marcadoresRuta = [];

function seleccionarEstacion(feature, layer) {
    if (puntosRuta.length >= 2) limpiarRuta();

    const idEstacion = feature.properties.id || feature.properties.gid;
    const nombre = feature.properties.nombre || 'Estación';
    const geom = feature.geometry;

    let latlng;
    if (geom.type === 'Point') {
        latlng = L.latLng(geom.coordinates[1], geom.coordinates[0]);
    } else if (geom.type === 'MultiLineString' || geom.type === 'LineString') {
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
        latlng = layer.getBounds ? layer.getBounds().getCenter() : L.latLng(0, 0);
    } else {
        console.error('Tipo de geometría no soportado:', geom.type);
        return;
    }

    puntosRuta.push(idEstacion);

    const isOrigen = puntosRuta.length === 1;
    const color = isOrigen ? '#2DC653' : '#C8102E';

    const marker = L.circleMarker(latlng, {
        radius: 12, fillColor: color, color: '#fff',
        weight: 2.5, fillOpacity: 1, pane: 'markerPane'
    }).addTo(map);

    const label = L.tooltip({ permanent: true, direction: 'top', className: 'ruta-label' })
        .setContent(isOrigen ? '1' : '2')
        .setLatLng(latlng);
    map.addLayer(label);
    marcadoresRuta.push(marker, label);

    if (isOrigen) {
        document.getElementById('punto-origen').classList.add('filled');
        document.getElementById('nombre-origen').textContent = nombre;
    } else {
        document.getElementById('punto-destino').classList.add('filled');
        document.getElementById('nombre-destino').textContent = nombre;
    }

    if (puntosRuta.length === 2) calcularRuta();
}

function calcularRuta() {
    const url = `${API}/rutas?origen=${puntosRuta[0]}&destino=${puntosRuta[1]}`;
    console.log('Calculando ruta:', url);

    document.getElementById('nombre-destino').textContent = 'Calculando...';

    fetch(url)
        .then(r => r.json())
        .then(data => {
            console.log('Respuesta ruta:', JSON.stringify(data).substring(0, 200));

            if (data.error) {
                document.getElementById('nombre-destino').textContent = 'Error al calcular';
                console.error('Error ruta:', data);
                return;
            }

            if (rutaLayer) map.removeLayer(rutaLayer);

            const features = data.geojson && data.geojson.features;
            if (!features || features.length === 0) {
                document.getElementById('nombre-destino').textContent = data.estacion_destino || 'Sin ruta';
                mostrarResultado(data);
                return;
            }

            rutaLayer = L.geoJSON(data.geojson, {
                style: { color: '#2DC653', weight: 5, opacity: 0.95 }
            }).addTo(map);
            rutaLayer.bringToFront();

            let allLatLngs = [];
            features.forEach(f => {
                const g = f.geometry;
                if (g.type === 'MultiLineString') {
                    g.coordinates.forEach(line => line.forEach(c => allLatLngs.push(L.latLng(c[1], c[0]))));
                } else if (g.type === 'LineString') {
                    g.coordinates.forEach(c => allLatLngs.push(L.latLng(c[1], c[0])));
                }
            });

            if (allLatLngs.length > 0) {
                const bounds = L.latLngBounds(allLatLngs);
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60] });
            }

            document.getElementById('nombre-destino').textContent = data.estacion_destino || 'Destino';
            mostrarResultado(data);

            if (typeof registrarReporte === 'function')
                registrarReporte(puntosRuta[1], data.estacion_destino, 'ruta');
        })
        .catch(err => {
            console.error('Fetch error:', err);
            document.getElementById('nombre-destino').textContent = 'Error de conexión';
        });
}

function mostrarResultado(data) {
    const dist = parseInt(data.distancia_metros) || 0;
    const distStr = dist >= 1000
        ? (dist / 1000).toFixed(1) + ' <span class="distancia-unit">km</span>'
        : dist + ' <span class="distancia-unit">m</span>';

    document.getElementById('dist-valor').innerHTML = distStr;
    document.getElementById('res-origen').textContent =
        (data.estacion_origen || '').split(';')[0].substring(0, 20);
    document.getElementById('res-destino').textContent =
        (data.estacion_destino || '').split(';')[0].substring(0, 20);
    document.getElementById('ruta-resultado').classList.add('visible');
}

function limpiarRuta() {
    puntosRuta = [];
    if (rutaLayer) map.removeLayer(rutaLayer);
    marcadoresRuta.forEach(m => map.removeLayer(m));
    marcadoresRuta = [];

    document.getElementById('punto-origen').classList.remove('filled');
    document.getElementById('punto-destino').classList.remove('filled');
    document.getElementById('nombre-origen').textContent = 'Selecciona origen';
    document.getElementById('nombre-destino').textContent = 'Selecciona destino';
    document.getElementById('ruta-resultado').classList.remove('visible');
}