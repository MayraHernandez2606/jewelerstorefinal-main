async function cargarImagen(url) {
    if (!url) return null;
    try {
        const response = await fetch(url + '?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("Error cargando imagen:", url);
        return null;
    }
}

// --- FUNCIONES PRINCIPALES ---
async function generatePDF(cliente, carrito, fecha = new Date(), idPedido = "Nuevo") {
    const doc = await crearDocumentoPDF(cliente, carrito, fecha, idPedido);
    if(doc) doc.save(`Orden_Jeweler_${idPedido}.pdf`);
}

async function obtenerBlobPDF(cliente, carrito, fecha = new Date(), idPedido = "Nuevo") {
    const doc = await crearDocumentoPDF(cliente, carrito, fecha, idPedido);
    return doc ? doc.output('blob') : null;
}

// --- DISEÑO DEL DOCUMENTO ---
async function crearDocumentoPDF(cliente, carrito, fecha, idPedido) {
    if (!window.jspdf) { console.error("Falta librería jsPDF"); return null; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // === 1. PALETA DE COLORES ===
    const colorVerdePrincipal = [22, 52, 21];  // #163415
    const colorDorado = [212, 175, 55];        // #d4af37
    const colorTextoOscuro = [60, 60, 60];     
    const colorBlanco = [255, 255, 255];

    // === 2. CARGAR RECURSOS ===
    const logoData = await cargarImagen('img/logo.png');
    const bgData = await cargarImagen('img/fondo-pdf.png'); // Asegúrate que sea .png

    // === 3. FONDO MARCA DE AGUA ===
    if (bgData) {
        doc.addImage(bgData, 'PNG', 0, 0, 210, 297);
        doc.setGState(new doc.GState({opacity: 0.85})); 
        doc.setFillColor(...colorBlanco);
        doc.rect(0, 0, 210, 297, 'F');
        doc.setGState(new doc.GState({opacity: 1.0})); 
    } else {
        doc.setFillColor(252, 247, 242);
        doc.rect(0, 0, 210, 297, "F");
    }

    doc.setFont("times");

    // === 4. ENCABEZADO ===
    let y = 20;
    if (logoData) {
        doc.addImage(logoData, 'PNG', 90, 10, 30, 30); 
        y = 45; 
    }

    doc.setTextColor(...colorVerdePrincipal);
    doc.setFontSize(28);
    doc.setFont("times", "bold");
    doc.text("Orden de Compra", 105, y, { align: "center" });
    
    y += 5;
    doc.setDrawColor(...colorDorado);
    doc.setLineWidth(0.5);
    doc.line(70, y, 140, y);

    y += 8;
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    const fechaTexto = new Date(fecha).toLocaleDateString();
    doc.text(`Pedido #${idPedido}  |  Fecha: ${fechaTexto}`, 105, y, { align: "center" });

    // === 5. DATOS CLIENTE ===
    y += 20;
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.setTextColor(...colorVerdePrincipal);
    doc.text("Datos de Envío", 15, y);

    y += 8;
    doc.setTextColor(...colorTextoOscuro);
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    
    doc.setFillColor(...colorDorado);
    doc.circle(17, y-1, 0.6, 'F'); doc.text(`Cliente:  ${cliente.nombre}`, 22, y); y += 7;
    doc.circle(17, y-1, 0.6, 'F'); doc.text(`Teléfono: ${cliente.telefono}`, 22, y); y += 7;
    
    const direccionLines = doc.splitTextToSize(`Dirección: ${cliente.direccion}`, 160);
    doc.circle(17, y-1, 0.6, 'F'); doc.text(direccionLines, 22, y);
    y += (direccionLines.length * 6) + 15;

    // === 6. DETALLE PRODUCTOS ===
    doc.setTextColor(...colorVerdePrincipal);
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.text("Joyas Seleccionadas", 15, y);
    y += 5;
    
    doc.setDrawColor(...colorDorado);
    doc.setLineWidth(0.3);
    doc.line(15, y, 195, y);
    y += 12;

    let total = 0;
    doc.setTextColor(...colorTextoOscuro);

    for (const item of carrito) {
        let subtotal = item.precio * item.cantidad;
        total += subtotal;

        if (item.imagen) {
            try {
                const imgData = await cargarImagen(item.imagen);
                if (imgData) {
                    doc.setDrawColor(...colorVerdePrincipal);
                    doc.setLineWidth(0.1);
                    doc.rect(15, y - 6, 22, 22);
                    doc.addImage(imgData, "JPEG", 16, y - 5, 20, 20); 
                }
            } catch (e) {}
        }

        doc.setFontSize(12);
        doc.setFont("times", "bold");
        doc.setTextColor(...colorVerdePrincipal);
        doc.text(item.nombre, 42, y + 2);

        doc.setFontSize(11);
        doc.setFont("times", "normal");
        doc.setTextColor(...colorTextoOscuro);
        doc.text(`${item.cantidad} unidad(es) x C$${item.precio.toFixed(2)}`, 42, y + 8);
        
        doc.setFont("times", "bold");
        doc.text(`C$ ${subtotal.toFixed(2)}`, 195, y + 5, { align: "right" });

        y += 28;

        if (y > 230) { 
            agregarFooterSuave(doc, 297, colorVerdePrincipal, colorDorado);
            doc.addPage(); 
            if (bgData) {
                doc.addImage(bgData, 'PNG', 0, 0, 210, 297);
                doc.setGState(new doc.GState({opacity: 0.85}));
                doc.setFillColor(...colorBlanco); doc.rect(0,0,210,297,'F');
                doc.setGState(new doc.GState({opacity: 1.0}));
            }
            y = 30; 
        }
    }

    // === 7. TOTAL ===
    y += 5;
    doc.setDrawColor(...colorDorado);
    doc.setLineWidth(0.5);
    doc.line(120, y, 195, y);
    y += 12;

    doc.setFontSize(16);
    doc.setTextColor(...colorVerdePrincipal);
    doc.setFont("times", "bold");
    doc.text(`Total a Pagar:  C$ ${total.toFixed(2)}`, 195, y, { align: "right" });


    agregarFooterSuave(doc, 297, colorVerdePrincipal, colorDorado);

    return doc;
}


function agregarFooterSuave(doc, pageHeight, colorBg, colorAccent) {
    const altoBarra = 25;
    const yBarra = pageHeight - altoBarra;


    doc.setGState(new doc.GState({opacity: 0.75}));
    
    // Barra Verde
    doc.setFillColor(...colorBg);
    doc.rect(0, yBarra, 210, altoBarra, 'F');
    
    // Reseteamos opacidad para que el texto se vea bien nítido
    doc.setGState(new doc.GState({opacity: 1.0}));

    // Línea dorada superior
    doc.setDrawColor(...colorAccent);
    doc.setLineWidth(0.5);
    doc.line(0, yBarra, 210, yBarra);

    // Textos
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("times", "bold");
    doc.text("Jeweler's Store", 15, yBarra + 15);

    doc.setFontSize(10);
    doc.setFont("times", "italic");
    doc.setTextColor(...colorAccent); 
    doc.text("Gracias por su preferencia. Calidad y elegancia en cada detalle.", 105, yBarra + 15, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "normal");
    doc.text("WhatsApp: +505 8109-0209", 195, yBarra + 15, { align: "right" });
}