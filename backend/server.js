const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/estaciones', require('./routes/estaciones'));
app.use('/api/rutas',      require('./routes/rutas'));
app.use('/api/reportes',   require('./routes/reportes'));
app.use('/api/auth',       require('./routes/auth'));

// Servir frontend estático
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));