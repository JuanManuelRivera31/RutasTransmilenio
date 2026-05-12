function registrarReporte(elemento_id, elemento_nombre, tipo_consulta) {
    if (!usuarioActual) return; // Solo registra si hay sesión
    fetch(`${API}/reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario_nombre: usuarioActual.nombre,
            usuario_email:  usuarioActual.email,
            elemento_id, elemento_nombre, tipo_consulta
        })
    });
}