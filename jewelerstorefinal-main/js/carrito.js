const API_URL = 'http://localhost:1337'; // Se mantiene solo por si alguna otra función lo usa
const WHATSAPP_NUMERO_EMPRESA = '50581090209'; // <--- ¡Tu número de negocio!

document.addEventListener("DOMContentLoaded", () => {
    mostrarCarrito();
    const formPedido = document.getElementById('formPedido');
    if(formPedido) {
        formPedido.addEventListener('submit', procesarPedido);
    }
});

// --- FUNCIONES VISUALES (Correctas) ---

function agregarAlCarrito(nombre, precio, imagenUrl) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    let index = carrito.findIndex(p => p.nombre === nombre);
    
    if (index !== -1) {
        carrito[index].cantidad += 1;
    } else {
        const imgFinal = imagenUrl || 'https://via.placeholder.com/80?text=Joya';
        carrito.push({ nombre, precio, imagen: imgFinal, cantidad: 1 });
    }
    
    localStorage.setItem('carrito', JSON.stringify(carrito));
    alert(nombre + " se ha agregado al carrito correctamente.");
    mostrarCarrito();
}

function mostrarCarrito() {
    // [... CÓDIGO VISUAL SIN CAMBIOS, FUNCIONA CORRECTAMENTE ...]
    const cont = document.getElementById("carrito-lista");
    const tot = document.getElementById("total");
    if (!cont) return;
    cont.innerHTML = "";
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    let total = 0;

    if(carrito.length === 0) {
        cont.innerHTML = `<div style="text-align:center; padding: 40px;"><p style='font-size: 1.3rem; color: #888; margin-bottom:20px;'>Tu carrito está vacío 😢</p><a href="catalogo.html" class="boton-verde" style="display:inline-block; width:auto; padding: 10px 30px;">Ir a comprar</a></div>`;
        tot.innerText = "Total: C$ 0.00";
        return;
    }

    carrito.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "carrito-item"; 

        const imgSrc = item.imagen || 'img/logo.png';

        li.innerHTML = `
            <div class="carrito-img-block"><img src="${imgSrc}" alt="${item.nombre}"></div>
            <div class="carrito-info-block"><h3 class="carrito-item-nombre">${item.nombre}</h3><span class="carrito-item-precio">Unitario: C$${item.precio.toFixed(2)}</span></div>
            <div class="carrito-controls-block"><button onclick="cambiarCantidad(${index}, -1)" class="btn-control-qty">-</button><span class="carrito-qty-display">${item.cantidad}</span><button onclick="cambiarCantidad(${index}, 1)" class="btn-control-qty">+</button></div>
            <div class="carrito-subtotal-block"><span class="carrito-item-subtotal">C$${(item.precio * item.cantidad).toFixed(2)}</span><button onclick="eliminarProducto(${index})" class="btn-eliminar-item">Eliminar</button></div>
        `;
        cont.appendChild(li);
        total += item.precio * item.cantidad;
    });

    tot.innerText = "Total: C$ " + total.toFixed(2);
}

function eliminarProducto(i) { let c = JSON.parse(localStorage.getItem('carrito')) || []; c.splice(i, 1); localStorage.setItem('carrito', JSON.stringify(c)); mostrarCarrito(); }
function cambiarCantidad(i, d) { let c = JSON.parse(localStorage.getItem('carrito')) || []; c[i].cantidad += d; if (c[i].cantidad <= 0) { if(confirm("¿Borrar?")) c.splice(i, 1); else c[i].cantidad = 1; } localStorage.setItem('carrito', JSON.stringify(c)); mostrarCarrito(); }
function vaciarCarrito() { if(confirm("¿Vaciar?")) { localStorage.removeItem('carrito'); mostrarCarrito(); } }


// ==========================================
// 2. GENERADOR DE MENSAJES DE WHATSAPP
// ==========================================

function crearMensajeWhatsApp(nombre, tel, dir, total, carrito) {
    let mensaje = `*🚨 NUEVA ORDEN DE COMPRA - JEWELER'S STORE 💎*\n\n`;
    mensaje += `*Cliente:* ${nombre}\n`;
    mensaje += `*Teléfono:* ${tel}\n`;
    mensaje += `*Dirección:* ${dir}\n\n`;
    mensaje += `--- Detalle de la Orden ---\n`;

    carrito.forEach(item => {
        mensaje += `• ${item.nombre} (x${item.cantidad}) @ C$${item.precio.toFixed(2)}\n`;
    });

    mensaje += `\n*TOTAL A PAGAR:* C$${total.toFixed(2)}\n\n`;
    mensaje += `*INSTRUCCIONES:* Adjuntar el archivo PDF que se descargó automáticamente.`;
    
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    return `https://wa.me/${WHATSAPP_NUMERO_EMPRESA}?text=${mensajeCodificado}`;
}


// ==========================================
// 3. FUNCIÓN PRINCIPAL (FLUJO WHATSAPP DIRECTO)
// ==========================================

async function procesarPedido(e) {
    e.preventDefault(); 

    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

    const nombre = document.getElementById('clienteNombre').value;
    const tel = document.getElementById('clienteTelefono').value;
    const dir = document.getElementById('clienteDireccion').value;
    
    if (!confirm("¿Confirmar pedido? Se descargará tu comprobante y serás redirigido a WhatsApp para el envío final.")) return;

    let totalPagar = 0;
    carrito.forEach(item => totalPagar += (item.precio * item.cantidad));

    // A. PREPARAR DATOS
    const carritoLimpio = carrito.map(item => ({ nombre: item.nombre, precio: item.precio, cantidad: item.cantidad }));
    const datosCliente = { nombre: nombre, telefono: tel, direccion: dir };

    // B. DESCARGAR PDF (PARA QUE EL CLIENTE LO ENVÍE)
    try {
        if (typeof generatePDF === "function") {
             // Generamos el PDF (sin esperar, para que el navegador lo baje al instante)
             await generatePDF(datosCliente, carrito, new Date(), Date.now()); 
        }
    } catch (e) {
        console.error("Error crítico en la descarga de PDF. El pedido se enviará sin adjunto.");
    }

    // C. CREAR URL Y REDIRIGIR A WHATSAPP
    const whatsappUrl = crearMensajeWhatsApp(nombre, tel, dir, totalPagar, carritoLimpio);

    // D. Limpiar y Redireccionar
    localStorage.removeItem('carrito');
    
    setTimeout(() => {
        window.location.href = whatsappUrl;
    }, 500); 
}