const API_URL = 'http://localhost:1337';
const WHATSAPP_NUMERO = '50581090209'; // Tu número

document.addEventListener("DOMContentLoaded", () => {
    mostrarCarrito();
    const formPedido = document.getElementById('formPedido');
    if(formPedido) {
        formPedido.addEventListener('submit', procesarPedido);
    }
});

// --- FUNCIONES VISUALES (Sin cambios) ---
function agregarAlCarrito(n, p, i) {
    let c = JSON.parse(localStorage.getItem('carrito')) || [];
    let idx = c.findIndex(x => x.nombre === n);
    let img = i || 'https://via.placeholder.com/80';
    if (idx !== -1) c[idx].cantidad++; else c.push({ nombre: n, precio: p, imagen: img, cantidad: 1 });
    localStorage.setItem('carrito', JSON.stringify(c));
    alert(n + " agregado.");
    mostrarCarrito();
}

function mostrarCarrito() {
    const cont = document.getElementById("carrito-lista");
    const tot = document.getElementById("total");
    if (!cont) return;
    cont.innerHTML = "";
    let c = JSON.parse(localStorage.getItem('carrito')) || [];
    let t = 0;
    if(c.length === 0) { cont.innerHTML = "<p style='text-align:center; padding:20px;'>Carrito vacío</p>"; tot.innerText = "Total: 0"; return; }
    c.forEach((x, i) => {
        let img = x.imagen || 'img/logo.png';
        cont.innerHTML += `
        <li class="carrito-item" style="display:flex; align-items:center; border-bottom:1px solid #eee; padding:10px;">
            <img src="${img}" style="width:60px; height:60px; object-fit:cover; border-radius:5px; margin-right:10px;">
            <div style="flex:1;"><strong>${x.nombre}</strong><br><small>C$${x.precio}</small></div>
            <div><button onclick="cambiarCantidad(${i}, -1)">-</button> <b>${x.cantidad}</b> <button onclick="cambiarCantidad(${i}, 1)">+</button></div>
            <div style="text-align:right; margin-left:10px;"><b>C$${(x.precio*x.cantidad).toFixed(2)}</b><br><button onclick="eliminarProducto(${i})" style="color:red; border:none; background:none; cursor:pointer;">X</button></div>
        </li>`;
        t += x.precio * x.cantidad;
    });
    tot.innerText = "Total: C$ " + t.toFixed(2);
}
function eliminarProducto(i) { let c = JSON.parse(localStorage.getItem('carrito')) || []; c.splice(i, 1); localStorage.setItem('carrito', JSON.stringify(c)); mostrarCarrito(); }
function cambiarCantidad(i, d) { let c = JSON.parse(localStorage.getItem('carrito')) || []; c[i].cantidad += d; if (c[i].cantidad <= 0) { if(confirm("¿Borrar?")) c.splice(i, 1); else c[i].cantidad = 1; } localStorage.setItem('carrito', JSON.stringify(c)); mostrarCarrito(); }
function vaciarCarrito() { if(confirm("¿Vaciar?")) { localStorage.removeItem('carrito'); mostrarCarrito(); } }


// --- GENERAR LINK WHATSAPP ---
function generarLinkWhatsApp(nombre, tel, dir, total, carrito) {
    let mensaje = `*💎 PEDIDO WEB - JEWELER'S STORE*\n`;
    mensaje += `*Cliente:* ${nombre}\n*Dir:* ${dir}\n\n`;
    carrito.forEach(p => mensaje += `• ${p.cantidad}x ${p.nombre}\n`);
    mensaje += `\n*TOTAL: C$ ${total.toFixed(2)}*\n\n>> Adjunto mi PDF descargado.`;
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

async function procesarPedido(e) {
    e.preventDefault(); 

    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (carrito.length === 0) { alert("Carrito vacío."); return; }

    const token = localStorage.getItem('jwt');
    const user = JSON.parse(localStorage.getItem('user'));
    // Validación de sesión (opcional, si quieres quitarla borra este bloque)
    if (!token || !user) { alert("Inicia sesión primero."); window.location.href = "login.html"; return; }

    const nombre = document.getElementById('clienteNombre').value;
    const tel = document.getElementById('clienteTelefono').value;
    const dir = document.getElementById('clienteDireccion').value;
    
    if (!confirm("¿Confirmar pedido? Se descargará tu recibo y te llevaremos a WhatsApp.")) return;

    let total = 0;
    carrito.forEach(x => total += (x.precio * x.cantidad));

    // 1. PREPARAMOS TODO
    const idTemporal = Date.now(); // Usamos ID temporal para no esperar al servidor
    const datosCliente = { nombre, telefono: tel, direccion: dir };
    const linkWhatsapp = generarLinkWhatsApp(nombre, tel, dir, total, carrito);

    // 2. DESCARGAR PDF INMEDIATAMENTE (Lo forzamos primero)
    try {
        if (typeof generatePDF === "function") {
            // No usamos await para que no bloquee, lo lanzamos y seguimos
            generatePDF(datosCliente, carrito, new Date(), idTemporal);
        }
    } catch (error) {
        console.error("Error PDF:", error);
    }

    // 3. GUARDAR EN STRAPI (En "Segundo Plano" - Fire and Forget)
    // No esperamos (await) a que termine para redirigir al usuario
    guardarEnStrapiSegundoPlano(token, carrito, total, nombre, tel, dir);

    // 4. AVISO Y REDIRECCIÓN (Garantizado)
    alert("¡Pedido generado! 🎉\n\n1. El PDF se está descargando.\n2. Vamos a WhatsApp para finalizar.");
    
    localStorage.removeItem('carrito');
    
    // Pequeña pausa de 1.5 segundos para asegurar que la descarga del PDF inicie
    setTimeout(() => {
        window.location.href = linkWhatsapp;
    }, 1500);
}

// Función auxiliar para no bloquear el flujo principal
async function guardarEnStrapiSegundoPlano(token, carrito, total, nombre, tel, dir) {
    try {
        const carritoLimpio = carrito.map(x => ({ nombre: x.nombre, precio: x.precio, cantidad: x.cantidad }));
        const pedidoData = {
            data: {
                productos_comprados: carritoLimpio,
                total: parseFloat(total),
                estatus: 'Recibida',
                fecha_compra: new Date().toISOString(),
                nombre_contacto: nombre,
                telefono: tel,
                direccion: dir
                // El backend pondrá el cliente
            }
        };

        // Enviamos sin esperar respuesta en el hilo principal
        fetch(`${API_URL}/api/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(pedidoData)
        }).then(res => {
            console.log("Guardado en background:", res.status);
        }).catch(err => console.error("Error background:", err));

    } catch (e) {
        console.error("Error silencioso en guardado:", e);
    }
}
