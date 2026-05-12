const API = 'http://localhost:3000/api';
const GEOSERVER = 'http://localhost:8080/geoserver/tm/wms';

// --- MAPAS BASE ---
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});
const satelital = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri World Imagery' }
);

// --- MAPA PRINCIPAL ---
const map = L.map('map', { layers: [osm] }).setView([4.6534, -74.0836], 12);

// --- MINIMAP ---
const miniOsm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
new L.Control.MiniMap(miniOsm, { toggleDisplay: true, minimized: false }).addTo(map);

// --- ESCALA ---
L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

// --- CAPAS WMS GEOSERVER ---
const viasWMS = L.tileLayer.wms(GEOSERVER, {
    layers: 'tm:vias', format: 'image/png',
    transparent: true, version: '1.1.0'
});
const estacionesWMS = L.tileLayer.wms(GEOSERVER, {
    layers: 'tm:estaciones', format: 'image/png',
    transparent: true, version: '1.1.0'
});

viasWMS.addTo(map);
estacionesWMS.addTo(map);

// --- CHECKBOXES ---
document.getElementById('chk-estaciones').addEventListener('change', function () {
    this.checked ? estacionesWMS.addTo(map) : map.removeLayer(estacionesWMS);
});
document.getElementById('chk-vias').addEventListener('change', function () {
    this.checked ? viasWMS.addTo(map) : map.removeLayer(viasWMS);
});
document.getElementById('chk-satelital').addEventListener('change', function () {
    if (this.checked) { satelital.addTo(map); osm.remove(); }
    else { osm.addTo(map); satelital.remove(); }
});

// --- ESTACIONES GEOJSON ---
let estacionesLayer = null;
let estacionesData = [];

fetch(`${API}/estaciones`)
    .then(r => r.json())
    .then(data => {
        estacionesData = data.features || [];
        estacionesLayer = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                radius: 8, fillColor: '#C8102E', color: '#ffffff',
                weight: 2, opacity: 1, fillOpacity: 0.9,
                pane: 'markerPane'
            }),
            onEachFeature: (feature, layer) => {
                const nombre = feature.properties.nombre || 'Sin nombre';
                layer.bindPopup(`<b>${nombre}</b><br><small>Clic para seleccionar como punto de ruta</small>`);
                layer.on('click', () => seleccionarEstacion(feature, layer));
            }
        }).addTo(map);
        console.log(`✅ ${estacionesData.length} estaciones cargadas`);
    })
    .catch(err => console.error('Error cargando estaciones:', err));

// --- BUFFER ---
let modoBuffer = false;
let bufferLayer = null;

function toggleBuffer() {
    const btn = document.getElementById('btn-buffer');
    if (modoBuffer) {
        modoBuffer = false;
        map.getContainer().style.cursor = '';
        btn.textContent = '📍 Activar buffer';
        btn.classList.remove('btn-buffer-active');
    } else {
        modoBuffer = true;
        map.getContainer().style.cursor = 'crosshair';
        btn.textContent = '✕ Cancelar';
        btn.classList.add('btn-buffer-active');
    }
}

function limpiarBuffer() {
    if (bufferLayer) { map.removeLayer(bufferLayer); bufferLayer = null; }
    modoBuffer = false;
    map.getContainer().style.cursor = '';
    const btn = document.getElementById('btn-buffer');
    btn.textContent = '📍 Activar buffer';
    btn.classList.remove('btn-buffer-active');
}

map.on('click', function (e) {
    if (!modoBuffer) return;
    const radio = parseInt(document.getElementById('radio-buffer').value) || 500;
    if (bufferLayer) map.removeLayer(bufferLayer);
    bufferLayer = L.circle(e.latlng, {
        radius: radio, color: '#2DC653',
        fillColor: '#2DC653', fillOpacity: 0.15, weight: 2
    }).addTo(map);
    toggleBuffer();
});

// --- BÚSQUEDA ---
function buscarEstacion() {
    const q = document.getElementById('input-busqueda').value;
    if (!q) return;
    fetch(`${API}/estaciones/buscar?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
            const div = document.getElementById('resultados-busqueda');
            div.innerHTML = '';
            data.forEach(est => {
                const item = document.createElement('div');
                item.textContent = est.nombre;
                item.onclick = () => {
                    const geo = JSON.parse(est.geojson);
                    let latlng;
                    if (geo.type === 'Point') {
                        latlng = [geo.coordinates[1], geo.coordinates[0]];
                    } else if (geo.type === 'MultiLineString') {
                        let all = [];
                        geo.coordinates.forEach(line => line.forEach(c => all.push(c)));
                        latlng = [
                            all.reduce((s, c) => s + c[1], 0) / all.length,
                            all.reduce((s, c) => s + c[0], 0) / all.length
                        ];
                    } else if (geo.type === 'LineString') {
                        const mid = Math.floor(geo.coordinates.length / 2);
                        latlng = [geo.coordinates[mid][1], geo.coordinates[mid][0]];
                    }
                    if (!latlng) return;
                    map.setView(latlng, 16);
                    L.popup().setLatLng(latlng).setContent(`<b>${est.nombre}</b>`).openOn(map);
                    registrarReporte(est.gid, est.nombre, 'busqueda');
                };
                div.appendChild(item);
            });
        });
}

// --- MODALES ---
function abrirModal(id)  { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }