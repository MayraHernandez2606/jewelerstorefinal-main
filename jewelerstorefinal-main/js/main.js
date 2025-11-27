
document.addEventListener("DOMContentLoaded", () => {
    verificarEstadoSesion();
});

function verificarEstadoSesion() {

    const usuarioGuardado = localStorage.getItem('user'); 
    
    if (usuarioGuardado) {
        const userObj = JSON.parse(usuarioGuardado);
        

        const enlaces = document.querySelectorAll('.navegacion a');
        
        enlaces.forEach(enlace => {
            if(enlace.href.includes('login.html')) {
                enlace.textContent = "HOLA, " + userObj.username.toUpperCase();
                enlace.href = "perfil.html"; // Ahora lleva al perfil
                enlace.style.backgroundColor = "#163415"; // Cambiar a verde para resaltar
            }
        });
    }
}