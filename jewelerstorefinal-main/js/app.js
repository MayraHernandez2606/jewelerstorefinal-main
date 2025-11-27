document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:1337'; 
    const contenedor = document.getElementById('contenedor-productos');

    // VERIFICAMOS SI ESTA PÁGINA TIENE UN CONTENEDOR
    if(contenedor) {
        // Leemos qué categoría pide este HTML
        const categoriaSolicitada = contenedor.getAttribute('data-categoria');
        cargarProductos(categoriaSolicitada);
    }

    async function cargarProductos(categoria) {
        try {
            // URL base con populate para traer imágenes
            let url = `${API_URL}/api/productos?populate=*`;
            
            // Lógica de filtrado
            if (categoria === 'ofertas') {
                url = `${API_URL}/api/productos?filters[esOferta][$eq]=true&populate=*`;
            } 
            else if (categoria && categoria !== 'todos') {
                url = `${API_URL}/api/productos?filters[categoria][$eq]=${categoria}&populate=*`;
            }

            const respuesta = await fetch(url);
            const datos = await respuesta.json();
            const productos = datos.data;

            contenedor.innerHTML = '';

            if(!productos || productos.length === 0) {
                contenedor.innerHTML = '<p style="text-align:center; width:100%; font-size:18px;">No hay productos disponibles.</p>';
                return;
            }

            // Pintar los productos
            productos.forEach(item => {
                const prod = item.attributes ? item.attributes : item; 
                
                // --- LÓGICA DE IMAGEN (Strapi v4/v5) ---
                let imgUrl = 'img/logo.png'; // Imagen por defecto si falla Strapi
                
                if (prod.imagen && prod.imagen.data) {
                    const imgData = Array.isArray(prod.imagen.data) ? prod.imagen.data[0] : prod.imagen.data;
                    if (imgData && imgData.attributes && imgData.attributes.url) {
                        imgUrl = API_URL + imgData.attributes.url;
                    }
                } else if (prod.imagen && prod.imagen.url) {
                    imgUrl = API_URL + prod.imagen.url;
                } else if (prod.imagen && Array.isArray(prod.imagen) && prod.imagen[0]) {
                    imgUrl = API_URL + prod.imagen[0].url;
                }

                // --- PRECIOS ---
                let precioFinal = prod.precio;
                let precioHTML = `<p style="font-size: 20px; font-weight:bold;">C$ ${prod.precio}</p>`;
                
                if (prod.esOferta && prod.precioOferta) {
                    precioFinal = prod.precioOferta;
                    precioHTML = `
                        <p style="font-size: 20px;">
                            <span style="text-decoration: line-through; color: #999; font-size: 0.8em;">C$ ${prod.precio}</span>
                            <span style="color: #d4af37; font-weight: bold;">C$ ${prod.precioOferta}</span>
                        </p>
                    `;
                }

                const tarjeta = document.createElement('div');
                tarjeta.classList.add('producto');
                
                // ENVIAMOS LA IMAGEN (imgUrl) A LA FUNCIÓN DEL CARRITO
                tarjeta.innerHTML = `
                    <img src="${imgUrl}" alt="${prod.nombre}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
                    <h3 style="margin-top:10px;">${prod.nombre}</h3>
                    ${precioHTML}
                    <button class="boton-verde" onclick="agregarAlCarrito('${prod.nombre}', ${precioFinal}, '${imgUrl}')">
                        Agregar al carrito
                    </button>
                `;
                contenedor.appendChild(tarjeta);
            });

        } catch (error) {
            console.error("Error:", error);
            contenedor.innerHTML = '<p style="text-align:center;">Error de conexión.</p>';
        }
    }
});