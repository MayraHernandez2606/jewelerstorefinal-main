document.addEventListener('DOMContentLoaded', () => {
    
    const API_URL = 'http://localhost:1337';

    // Contenedores principales (Las cajas que se ocultan/muestran)
    const loginWrapper = document.getElementById('loginForm'); 
    const registerWrapper = document.getElementById('registerForm');
    
    // Botones de texto para cambiar (Regístrate aquí / Inicia Sesión)
    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    
    // Etiquetas <form> reales (para enviar datos)
    const formLoginTag = document.getElementById('formLogin');
    const formRegisterTag = document.getElementById('formRegister');

    // Iconos de ojo para ver contraseña
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    // --- 2. LÓGICA VISUAL: CAMBIAR ENTRE LOGIN Y REGISTRO ---
    if(showRegisterBtn && showLoginBtn){
        // Al hacer clic en "Regístrate aquí"
        showRegisterBtn.addEventListener('click', () => {
            loginWrapper.classList.add('hidden');       // Oculta el login
            registerWrapper.classList.remove('hidden'); // Muestra el registro
        });

        // Al hacer clic en "Inicia Sesión"
        showLoginBtn.addEventListener('click', () => {
            registerWrapper.classList.add('hidden');    // Oculta el registro
            loginWrapper.classList.remove('hidden');    // Muestra el login
        });
    }

    // --- 3. LÓGICA VISUAL: MOSTRAR/OCULTAR CONTRASEÑA ---
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling; // El input que está antes del icono
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // --- 4. REGISTRO DE USUARIO (CONECTADO A STRAPI) ---
    if(formRegisterTag){
        formRegisterTag.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita recargar la página
            
            // Capturamos datos (IDs corregidos: regName, regEmail, regPassword)
            const username = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            if(password.length < 6) {
                alert("La contraseña debe tener al menos 6 caracteres.");
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/auth/local/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password
                    })
                });

                const data = await response.json();

                if (data.error) {
                    alert('Error: ' + data.error.message);
                } else {
                    alert('¡Cuenta creada con éxito! Ahora inicia sesión.');
                    // Volver al login automáticamente
                    registerWrapper.classList.add('hidden');
                    loginWrapper.classList.remove('hidden');
                    formRegisterTag.reset();
                }
            } catch (error) {
                console.error(error);
                alert('Error de conexión. Asegúrate que Strapi esté encendido.');
            }
        });
    }

    // --- 5. INICIO DE SESIÓN (CONECTADO A STRAPI) ---
    if(formLoginTag){
        formLoginTag.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch(`${API_URL}/api/auth/local`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: email,
                        password: password
                    })
                });

                const data = await response.json();

                if (data.jwt) {
                    // Guardar sesión
                    localStorage.setItem('jwt', data.jwt);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    alert(`¡Bienvenido de nuevo, ${data.user.username}!`);
                    window.location.href = "index.html";
                } else {
                    alert('Correo o contraseña incorrectos.');
                }

            } catch (error) {
                console.error(error);
                alert('Error de conexión. Asegúrate que Strapi esté encendido.');
            }
        });
    }
});