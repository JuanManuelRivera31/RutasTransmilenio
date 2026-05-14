# 🚍 Visor TransMilenio Bogotá

> Visor web GIS interactivo para la red de TransMilenio en Bogotá. Calcula rutas óptimas entre estaciones, visualiza capas geográficas en tiempo real y registra consultas de usuarios.

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql&logoColor=white)
![PostGIS](https://img.shields.io/badge/PostGIS-3.4-4CAF50?style=flat)
![pgRouting](https://img.shields.io/badge/pgRouting-3.6-FF6B35?style=flat)
![GeoServer](https://img.shields.io/badge/GeoServer-2.25-0099CC?style=flat)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat&logo=node.js&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=flat)
![License](https://img.shields.io/badge/Licencia-MIT-blue?style=flat)

---

## 📸 Vista general

| Mapa OSM + Estaciones | Vista satelital + Ruta calculada |
|---|---|
| Panel de capas, búsqueda y herramientas GIS | Ruta óptima trazada en verde con distancia |

---

## ✨ Funcionalidades

- 🗺️ **Visualización de capas** — Estaciones TM, red vial y vista satelital Esri (WMS desde GeoServer)
- 🔍 **Búsqueda de estaciones** — Por nombre con centrado automático en el mapa
- 🛣️ **Cálculo de rutas óptimas** — Algoritmo de Dijkstra sobre 10,253 segmentos viales reales
- 📍 **Análisis espacial** — Buffer configurable con radio en metros
- 🔐 **Autenticación** — Registro e inicio de sesión con JWT
- 📋 **Reportes** — Auditoría automática de todas las consultas realizadas
- 🛰️ **Minimap + escala + leyenda** — Controles cartográficos completos

---

## 🏗️ Arquitectura

```
Usuario
  │
  ▼
Nginx (puerto 80) ──── Frontend estático (Leaflet.js)
  │                         │ fetch /api/
  ▼                         ▼
Node.js / Express (puerto 3000)
  │                    │
  ▼                    ▼
PostgreSQL          GeoServer (puerto 8080)
PostGIS             Capas WMS/WFS
pgRouting
```

---

## 🗂️ Estructura del proyecto

```
ProyectoFinal_LineaB/
├── backend/
│   ├── server.js           # Punto de entrada Express
│   ├── db/
│   │   └── pool.js         # Conexión a PostgreSQL
│   ├── routes/
│   │   ├── estaciones.js   # GET /api/estaciones
│   │   ├── rutas.js        # GET /api/rutas (pgRouting)
│   │   ├── reportes.js     # GET/POST /api/reportes
│   │   └── auth.js         # POST /api/auth/login|registro
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── map.js          # Inicialización del mapa y capas
        ├── rutas.js        # Módulo de cálculo de rutas
        ├── auth.js         # Login / registro / sesión
        └── reportes.js     # Registro de consultas
```

---

## 🚀 Instalación local

### Requisitos previos

- PostgreSQL 16 + PostGIS + pgRouting
- GeoServer 2.25 (requiere Java 11+)
- Node.js 20.x

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/visor-transmilenio.git
cd visor-transmilenio
```

### 2. Configurar la base de datos

```bash
# Crear la BD y habilitar extensiones
psql -U postgres -c "CREATE DATABASE transmilenio_db;"
psql -U postgres -d transmilenio_db -c "CREATE EXTENSION postgis;"
psql -U postgres -d transmilenio_db -c "CREATE EXTENSION pgrouting;"

# Restaurar el volcado de datos
pg_restore -U postgres -d transmilenio_db backup/transmilenio_db.dump
```

### 3. Configurar el backend

```bash
cd backend
cp .env.example .env
# Editar .env con tus credenciales
npm install
node server.js
```

Contenido del `.env`:

```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=transmilenio_db
PGUSER=postgres
PGPASSWORD=tu_contraseña
JWT_SECRET=transmilenio_secret_2026
```

### 4. Configurar GeoServer

1. Iniciar GeoServer en `http://localhost:8080/geoserver`
2. Crear espacio de trabajo `tm`
3. Crear almacén PostGIS apuntando a `transmilenio_db`
4. Publicar las capas `tm:estaciones` y `tm:vias`

### 5. Abrir el visor

Con el backend corriendo, abre en el navegador:

```
http://localhost:3000
```

---

## 🗃️ Base de datos

### Tablas principales

| Tabla | Geometría | Registros | Descripción |
|---|---|---|---|
| `public.vias` | MultiLineString | 10,253 | Red vial de Bogotá con topología pgRouting |
| `public.vias_vertices_pgr` | Point | 9,181 | Nodos de la red vial |
| `public.estaciones` | Geometry | 119 | Estaciones de TransMilenio |
| `public.usuarios` | — | — | Usuarios registrados |
| `public.reporte` | Geometry | — | Auditoría de consultas |

### Cálculo de rutas

```sql
-- Ejemplo: ruta entre dos nodos de la red
SELECT seq, node, edge, ROUND(agg_cost::numeric) AS metros
FROM pgr_dijkstra(
    'SELECT gid AS id, source::int4, target::int4,
            cost::float8, reverse_cost::float8 FROM public.vias',
    origen_nodo::int4,
    destino_nodo::int4,
    directed := false
);
```

---

## 🔌 API REST

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/estaciones` | GET | Todas las estaciones como GeoJSON |
| `/api/estaciones/buscar?q=` | GET | Búsqueda por nombre |
| `/api/rutas?origen=&destino=` | GET | Ruta óptima entre dos estaciones |
| `/api/reportes` | GET / POST | Consulta y registro de auditoría |
| `/api/auth/registro` | POST | Registro de nuevo usuario |
| `/api/auth/login` | POST | Login — retorna token JWT |

---

## 🌍 Fuentes de datos

- **Red vial y estaciones** — [OpenStreetMap](https://www.openstreetmap.org) vía [Overpass API](https://overpass-turbo.eu)
- **Imagen satelital** — [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer)
- **Cartografía base** — [IGAC](https://geoportal.igac.gov.co) — Instituto Geográfico Agustín Codazzi

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 16 + PostGIS + pgRouting |
| Servidor de mapas | GeoServer 2.25 |
| Backend | Node.js 20 + Express |
| Autenticación | bcryptjs + JSON Web Tokens |
| Frontend | Leaflet.js 1.9.4 + HTML/CSS/JS vanilla |
| Proceso manager (prod) | PM2 |
| Proxy inverso (prod) | Nginx |

---

## 👥 Equipo

Proyecto Final — Asignatura Línea B  
Facultad de Ingeniería de Sistemas · 2026-I

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.