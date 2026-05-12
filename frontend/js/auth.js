let usuarioActual = null;

function login() {
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(r => r.json())
    .then(data => {
        if (data.token) {
            usuarioActual = { nombre: data.nombre, email, token: data.token };
            localStorage.setItem('tm_token', data.token);
            localStorage.setItem('tm_usuario', JSON.stringify(usuarioActual));
            document.getElementById('usuario-info').textContent = `👤 ${data.nombre}`;
            document.getElementById('btn-login-modal').style.display    = 'none';
            document.getElementById('btn-registro-modal').style.display = 'none';
            document.getElementById('btn-logout').style.display         = 'inline';
            cerrarModal('modal-login');
        } else {
            document.getElementById('login-error').textContent = data.error;
        }
    });
}

function registro() {
    const nombre   = document.getElementById('reg-nombre').value;
    const email    = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    fetch(`${API}/auth/registro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password })
    })
    .then(r => r.json())
    .then(data => {
        document.getElementById('reg-msg').textContent =
            data.mensaje || data.error;
    });
}

function logout() {
    usuarioActual = null;
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_usuario');
    document.getElementById('usuario-info').textContent         = '';
    document.getElementById('btn-login-modal').style.display    = 'inline';
    document.getElementById('btn-registro-modal').style.display = 'inline';
    document.getElementById('btn-logout').style.display         = 'none';
}

// Restaurar sesión si ya había iniciado
window.addEventListener('load', () => {
    const u = localStorage.getItem('tm_usuario');
    if (u) {
        usuarioActual = JSON.parse(u);
        document.getElementById('usuario-info').textContent         = `👤 ${usuarioActual.nombre}`;
        document.getElementById('btn-login-modal').style.display    = 'none';
        document.getElementById('btn-registro-modal').style.display = 'none';
        document.getElementById('btn-logout').style.display         = 'inline';
    }
});