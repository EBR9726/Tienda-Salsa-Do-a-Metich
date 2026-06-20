// ════════════════════════════════════════════════════════
//  DOÑA METICHE — TIENDA — LÓGICA COMPLETA
// ════════════════════════════════════════════════════════

let carrito = [];
let productoModalActivo = null;
let fotoActivaIdx = 0;
let tamanoSeleccionado = null;
let cuponAplicado = null;
let pasoCheckout = 'carrito'; // carrito | datos | pago
let datosCliente = {};

// ─────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────
function appInit() {
  renderCatalogo();
  renderQuienesSomos();
  renderCarrito();
}
window.appInit = appInit;

// ─────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────
let toastTimer;
function toastTienda(msg) {
  const el = document.getElementById('toast-tienda');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────────────────────
//  HELPERS DE DATOS
// ─────────────────────────────────────────────────────────
function getProductos() { return window._PRODUCTOS || []; }
function getInventario() { return window._app ? window._app.inventario : {}; }
function getFotos(productoId) {
  const fotos = window._app ? window._app.fotosProductos : {};
  return (fotos && fotos[productoId]) ? fotos[productoId] : [];
}
function getRecetaInfo(receta) {
  return (window._RECETA_INFO && window._RECETA_INFO[receta]) || { tagline: '', descripcion: '' };
}
function getPromos() { return window._app ? window._app.promos : {}; }
function getEnvios() { return window._app ? window._app.envios : { costo: 80, minimoGratis: 600 }; }
function getCupones() { return window._app ? window._app.cupones : {}; }

function getPromoParaMl(ml) {
  const promos = getPromos();
  if (ml === 235) return promos.p235;
  if (ml === 120) return promos.p120;
  if (ml === 29) return promos.p29;
  return null;
}

// ─────────────────────────────────────────────────────────
//  RENDER CATÁLOGO — 3 TARJETAS POR RECETA
// ─────────────────────────────────────────────────────────
function renderCatalogo() {
  const grid = document.getElementById('recetas-grid');
  if (!grid) return;
  const recetas = ['Morita', 'Habanero', 'Chile de árbol'];
  const productos = getProductos();
  const inventario = getInventario();

  grid.innerHTML = recetas.map(receta => {
    // Usamos el tamaño 235ml como representativo del "anuncio"
    const repPrincipal = productos.find(p => p.receta === receta && p.ml === 235);
    const todosTamanos = productos.filter(p => p.receta === receta);
    const stockTotal = todosTamanos.reduce((a, p) => a + (inventario[p.id] || 0), 0);
    const fotos = getFotos(repPrincipal.id);
    const fotoPrincipal = fotos[0];
    const info = getRecetaInfo(receta);

    return `
      <div class="receta-card" onclick="abrirModalProducto('${receta}')">
        <div class="rc-img-wrap">
          ${fotoPrincipal ? `<img src="${fotoPrincipal}" alt="${receta}" loading="lazy"/>` : `<div class="rc-img-placeholder"><div class="ph-jar"></div></div>`}
          ${stockTotal < 1 ? `<span class="rc-badge" style="background:rgba(139,26,26,0.92)">Agotado</span>` : `<span class="rc-badge">Artesanal</span>`}
          <div class="rc-quickview">→</div>
        </div>
        <div class="rc-nombre">${receta}</div>
        <div class="rc-tagline">${info.tagline}</div>
        <div class="rc-price-row">
          <span class="rc-price">$${repPrincipal.precio}<span> desde / 235ml</span></span>
        </div>
      </div>
    `;
  }).join('');
}
window.renderCatalogo = renderCatalogo;

// ─────────────────────────────────────────────────────────
//  MODAL DE PRODUCTO — con selector de tamaño y cantidad
// ─────────────────────────────────────────────────────────
function abrirModalProducto(receta) {
  productoModalActivo = receta;
  fotoActivaIdx = 0;
  const productos = getProductos().filter(p => p.receta === receta);
  const inventario = getInventario();
  // Seleccionar por default el primer tamaño con stock, o 235ml si no hay stock en ninguno
  const conStock = productos.find(p => (inventario[p.id] || 0) > 0);
  tamanoSeleccionado = (conStock || productos.find(p => p.ml === 235)).id;
  window._modalQty = 1;
  renderProductoActivo();
  document.getElementById('modal-producto-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
window.abrirModalProducto = abrirModalProducto;

function cerrarModalProducto() {
  document.getElementById('modal-producto-overlay').classList.remove('open');
  document.body.style.overflow = '';
  productoModalActivo = null;
}
window.cerrarModalProducto = cerrarModalProducto;

function seleccionarTamano(productoId) {
  tamanoSeleccionado = productoId;
  window._modalQty = 1;
  fotoActivaIdx = 0;
  renderProductoActivo();
}
window.seleccionarTamano = seleccionarTamano;

function renderProductoActivo() {
  if (!productoModalActivo) return;
  const receta = productoModalActivo;
  const productosReceta = getProductos().filter(p => p.receta === receta).sort((a, b) => b.ml - a.ml);
  const pActivo = productosReceta.find(p => p.id === tamanoSeleccionado) || productosReceta[0];
  const inventario = getInventario();
  const stock = inventario[pActivo.id] || 0;
  const fotos = getFotos(pActivo.id);
  const info = getRecetaInfo(receta);

  const galeriaThumbsHtml = fotos.length > 1
    ? `<div class="modal-gallery-thumbs">${fotos.map((f, i) => `<div class="modal-thumb ${i === fotoActivaIdx ? 'active' : ''}" onclick="setFotoActiva(${i})"><img src="${f}" loading="lazy"/></div>`).join('')}</div>`
    : '';
  const fotoMain = fotos[fotoActivaIdx];

  const tamanosHtml = productosReceta.map(p => {
    const s = inventario[p.id] || 0;
    return `
      <button class="tamano-btn ${p.id === pActivo.id ? 'active' : ''} ${s < 1 ? 'sin-stock' : ''}" onclick="seleccionarTamano('${p.id}')">
        <div class="tb-ml">${p.ml} ml</div>
        <div class="tb-precio">$${p.precio}</div>
        <div class="tb-stock">${s < 1 ? 'Sin stock' : s + ' disp.'}</div>
      </button>
    `;
  }).join('');

  const content = document.getElementById('modal-producto-content');
  content.innerHTML = `
    <button class="modal-close" onclick="cerrarModalProducto()">✕</button>
    <div class="modal-gallery">
      <div class="modal-gallery-main">
        ${fotoMain ? `<img src="${fotoMain}" alt="${receta}"/>` : `<div class="rc-img-placeholder"><div class="ph-jar"></div></div>`}
      </div>
      ${galeriaThumbsHtml}
    </div>
    <div class="modal-info">
      <div class="modal-receta">${receta}</div>
      <h2 class="modal-nombre">${receta}</h2>
      <p class="modal-tagline">${info.tagline}</p>
      <p class="modal-descripcion">${info.descripcion}</p>

      <div class="tamano-selector">
        <label>Elige el tamaño</label>
        <div class="tamano-opciones">${tamanosHtml}</div>
      </div>

      <div class="modal-precio-display">$${pActivo.precio} MXN</div>
      <div class="modal-stock-info ${stock < 5 ? 'low' : ''}">
        ${stock < 1 ? 'Sin existencias por el momento' : stock < 5 ? `Solo quedan ${stock} piezas` : `${stock} piezas disponibles`}
      </div>
      <div class="modal-qty-row">
        <label>Cantidad</label>
        <div class="qty-control">
          <button onclick="cambiarQtyModal(-1)">−</button>
          <span id="modal-qty-display">${window._modalQty}</span>
          <button onclick="cambiarQtyModal(1)">+</button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-add-cart" onclick="agregarAlCarritoDesdeModal('${pActivo.id}')" ${stock < 1 ? 'disabled' : ''}>
          ${stock < 1 ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  `;
}
window.renderProductoActivo = renderProductoActivo;

function setFotoActiva(idx) { fotoActivaIdx = idx; renderProductoActivo(); }
window.setFotoActiva = setFotoActiva;

function cambiarQtyModal(delta) {
  const p = getProductos().find(x => x.id === tamanoSeleccionado);
  const stock = getInventario()[p.id] || 0;
  window._modalQty = Math.max(1, Math.min((window._modalQty || 1) + delta, stock || 1));
  document.getElementById('modal-qty-display').textContent = window._modalQty;
}
window.cambiarQtyModal = cambiarQtyModal;

function agregarAlCarritoDesdeModal(productoId) {
  const qty = window._modalQty || 1;
  agregarAlCarrito(productoId, qty);
  cerrarModalProducto();
}
window.agregarAlCarritoDesdeModal = agregarAlCarritoDesdeModal;

// ─────────────────────────────────────────────────────────
//  CARRITO
// ─────────────────────────────────────────────────────────
function agregarAlCarrito(productoId, qty = 1) {
  const p = getProductos().find(x => x.id === productoId);
  if (!p) return;
  const stock = getInventario()[p.id] || 0;
  const existente = carrito.find(c => c.id === productoId);
  const enCarrito = existente ? existente.qty : 0;

  if (enCarrito + qty > stock) { toastTienda('No hay suficiente stock disponible'); return; }

  if (existente) existente.qty += qty;
  else carrito.push({ id: p.id, nombre: p.receta + ' ' + p.ml + 'ml', receta: p.receta, ml: p.ml, precio: p.precio, qty });

  renderCarrito();
  toastTienda(`${p.receta} ${p.ml}ml agregado al carrito`);
}
window.agregarAlCarrito = agregarAlCarrito;

function quitarDelCarrito(idx) { carrito.splice(idx, 1); renderCarrito(); }
window.quitarDelCarrito = quitarDelCarrito;

function cambiarQtyCarrito(idx, delta) {
  const c = carrito[idx];
  const stock = getInventario()[c.id] || 0;
  const nuevaQty = c.qty + delta;
  if (nuevaQty < 1) { carrito.splice(idx, 1); }
  else if (nuevaQty > stock) { toastTienda('No hay más stock disponible'); }
  else { c.qty = nuevaQty; }
  renderCarrito();
}
window.cambiarQtyCarrito = cambiarQtyCarrito;

// ─────────────────────────────────────────────────────────
//  CÁLCULO DE TOTALES (con promos automáticas por ml)
// ─────────────────────────────────────────────────────────
function calcularDesglose() {
  // Agrupar por ml para detectar promos
  const porMl = {};
  carrito.forEach(c => {
    porMl[c.ml] = porMl[c.ml] || [];
    porMl[c.ml].push(c);
  });

  let subtotal = 0;
  let descuentoPromo = 0;
  const detalleLineas = [];

  Object.keys(porMl).forEach(mlStr => {
    const ml = parseInt(mlStr);
    const items = porMl[ml];
    const totalUnidades = items.reduce((a, c) => a + c.qty, 0);
    const promo = getPromoParaMl(ml);
    const precioNormalUnit = items[0].precio;

    if (promo && promo.cantidad > 0 && totalUnidades >= promo.cantidad) {
      const grupos = Math.floor(totalUnidades / promo.cantidad);
      const resto = totalUnidades - grupos * promo.cantidad;
      const totalSinPromo = totalUnidades * precioNormalUnit;
      const totalConPromo = grupos * promo.precio + resto * precioNormalUnit;
      subtotal += totalSinPromo;
      descuentoPromo += totalSinPromo - totalConPromo;
      detalleLineas.push({
        tipo: 'promo', ml, grupos, resto, cantidadPromo: promo.cantidad,
        precioPromo: promo.precio, items: items.map(i => ({ nombre: i.nombre, qty: i.qty }))
      });
    } else {
      const total = totalUnidades * precioNormalUnit;
      subtotal += total;
      detalleLineas.push({ tipo: 'normal', ml, items: items.map(i => ({ nombre: i.nombre, qty: i.qty, precio: i.precio })) });
    }
  });

  const despuesPromo = subtotal - descuentoPromo;

  let descuentoCupon = 0;
  if (cuponAplicado) {
    const cupones = getCupones();
    const pct = cupones[cuponAplicado];
    if (pct) descuentoCupon = Math.round(despuesPromo * pct / 100);
  }

  const despuesCupon = despuesPromo - descuentoCupon;

  const envios = getEnvios();
  let costoEnvio = envios.costo || 0;
  let envioGratis = false;
  if (envios.minimoGratis > 0 && despuesCupon >= envios.minimoGratis) {
    costoEnvio = 0;
    envioGratis = true;
  }

  const total = despuesCupon + costoEnvio;

  return { subtotal, descuentoPromo, despuesPromo, descuentoCupon, despuesCupon, costoEnvio, envioGratis, total, detalleLineas, envios };
}

// ─────────────────────────────────────────────────────────
//  RENDER CARRITO
// ─────────────────────────────────────────────────────────
function renderCarrito() {
  const totalItems = carrito.reduce((a, c) => a + c.qty, 0);
  document.getElementById('cart-count').textContent = totalItems;

  if (pasoCheckout === 'carrito') renderPasoCarrito();
  else if (pasoCheckout === 'datos') renderPasoDatos();
  else if (pasoCheckout === 'pago') renderPasoPago();
}
window.renderCarrito = renderCarrito;

function renderPasoCarrito() {
  document.getElementById('cart-title').textContent = 'Tu carrito';
  const bodyEl = document.getElementById('cart-body');
  const footerEl = document.getElementById('cart-footer');

  if (!carrito.length) {
    bodyEl.innerHTML = `<div class="cart-empty-state"><div class="seal-icon"></div><div>Tu carrito está vacío</div></div>`;
    footerEl.innerHTML = '';
    return;
  }

  bodyEl.innerHTML = carrito.map((c, i) => {
    const fotos = getFotos(c.id);
    const foto = fotos[0];
    return `
      <div class="cart-item">
        <div class="cart-item-img">${foto ? `<img src="${foto}"/>` : ''}</div>
        <div class="cart-item-body">
          <div class="cart-item-name">${c.nombre}</div>
          <div class="cart-item-bottom">
            <div class="cart-qty-control">
              <button onclick="cambiarQtyCarrito(${i},-1)">−</button>
              <span>${c.qty}</span>
              <button onclick="cambiarQtyCarrito(${i},1)">+</button>
            </div>
            <span class="cart-item-price">$${c.precio * c.qty}</span>
          </div>
          <button class="cart-item-remove" onclick="quitarDelCarrito(${i})" style="margin-top:6px;align-self:flex-start">Quitar</button>
        </div>
      </div>
    `;
  }).join('');

  const desglose = calcularDesglose();

  const promoActivaHtml = desglose.detalleLineas.filter(l => l.tipo === 'promo').map(l =>
    `<div class="promo-banner">🏷️ Promo ${l.ml}ml aplicada (${l.cantidadPromo} piezas = $${l.precioPromo})${l.resto > 0 ? ` · ${l.resto} pieza(s) extra a precio normal` : ''}</div>`
  ).join('');

  const cuponHtml = cuponAplicado
    ? `<div class="cupon-aplicado"><span>🎟️ ${cuponAplicado} aplicado</span><button class="quitar-cupon" onclick="quitarCupon()">Quitar</button></div>`
    : `<div class="cupon-box"><input type="text" id="cupon-input" placeholder="Código de cupón"/><button onclick="aplicarCupon()">Aplicar</button></div>`;

  footerEl.innerHTML = `
    ${promoActivaHtml}
    ${cuponHtml}
    <div class="cart-line"><span>Subtotal</span><span>$${desglose.subtotal}</span></div>
    ${desglose.descuentoPromo > 0 ? `<div class="cart-line verde"><span>Descuento promo</span><span>-$${desglose.descuentoPromo}</span></div>` : ''}
    ${desglose.descuentoCupon > 0 ? `<div class="cart-line verde"><span>Cupón</span><span>-$${desglose.descuentoCupon}</span></div>` : ''}
    <div class="cart-line"><span>Envío</span><span>${desglose.envioGratis ? 'Gratis' : '$' + desglose.costoEnvio}</span></div>
    <div class="cart-total-row"><span>Total</span><span>$${desglose.total}</span></div>
    <button class="btn-continuar" onclick="irAPasoDatos()">Continuar con mis datos</button>
  `;
}

function aplicarCupon() {
  const input = document.getElementById('cupon-input');
  const codigo = input.value.trim().toUpperCase();
  const cupones = getCupones();
  if (!codigo) return;
  if (!cupones[codigo]) { toastTienda('Cupón no válido'); return; }
  cuponAplicado = codigo;
  renderCarrito();
  toastTienda(`Cupón ${codigo} aplicado: ${cupones[codigo]}% de descuento`);
}
window.aplicarCupon = aplicarCupon;

function quitarCupon() { cuponAplicado = null; renderCarrito(); }
window.quitarCupon = quitarCupon;

// ─────────────────────────────────────────────────────────
//  PASO 2 — DATOS DEL CLIENTE
// ─────────────────────────────────────────────────────────
function irAPasoDatos() {
  if (!carrito.length) return;
  pasoCheckout = 'datos';
  renderCarrito();
}
window.irAPasoDatos = irAPasoDatos;

function renderPasoDatos() {
  document.getElementById('cart-title').textContent = 'Tus datos de envío';
  const bodyEl = document.getElementById('cart-body');
  const footerEl = document.getElementById('cart-footer');

  bodyEl.innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Nombre</label><input type="text" id="dc-nombre" value="${datosCliente.nombre || ''}"/></div>
      <div class="form-field"><label>Apellidos</label><input type="text" id="dc-apellidos" value="${datosCliente.apellidos || ''}"/></div>
    </div>
    <div class="form-field"><label>Correo electrónico</label><input type="email" id="dc-email" value="${datosCliente.email || ''}"/></div>
    <div class="form-field"><label>Teléfono</label><input type="tel" id="dc-telefono" value="${datosCliente.telefono || ''}"/></div>
    <div class="form-field"><label>Dirección (calle y número)</label><input type="text" id="dc-direccion" value="${datosCliente.direccion || ''}"/></div>
    <div class="form-row">
      <div class="form-field"><label>Colonia</label><input type="text" id="dc-colonia" value="${datosCliente.colonia || ''}"/></div>
      <div class="form-field"><label>C.P.</label><input type="text" id="dc-cp" value="${datosCliente.cp || ''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Ciudad</label><input type="text" id="dc-ciudad" value="${datosCliente.ciudad || ''}"/></div>
      <div class="form-field"><label>Estado</label><input type="text" id="dc-estado" value="${datosCliente.estado || ''}"/></div>
    </div>
    <div class="form-field"><label>Referencias (opcional)</label><textarea id="dc-referencias" rows="2">${datosCliente.referencias || ''}</textarea></div>
  `;

  footerEl.innerHTML = `
    <button class="btn-continuar" onclick="irAPasoPago()">Continuar al pago</button>
    <button class="btn-volver" onclick="volverACarrito()">← Volver al carrito</button>
  `;
}

function volverACarrito() { pasoCheckout = 'carrito'; renderCarrito(); }
window.volverACarrito = volverACarrito;

function irAPasoPago() {
  const nombre = document.getElementById('dc-nombre').value.trim();
  const apellidos = document.getElementById('dc-apellidos').value.trim();
  const email = document.getElementById('dc-email').value.trim();
  const direccion = document.getElementById('dc-direccion').value.trim();
  const colonia = document.getElementById('dc-colonia').value.trim();
  const cp = document.getElementById('dc-cp').value.trim();
  const ciudad = document.getElementById('dc-ciudad').value.trim();
  const estado = document.getElementById('dc-estado').value.trim();

  if (!nombre || !apellidos || !email || !direccion || !colonia || !cp || !ciudad || !estado) {
    toastTienda('Por favor completa todos los campos obligatorios');
    return;
  }
  if (!email.includes('@') || !email.includes('.')) {
    toastTienda('Ingresa un correo electrónico válido');
    return;
  }

  datosCliente = {
    nombre, apellidos, email,
    telefono: document.getElementById('dc-telefono').value.trim(),
    direccion, colonia, cp, ciudad, estado,
    referencias: document.getElementById('dc-referencias').value.trim()
  };

  pasoCheckout = 'pago';
  renderCarrito();
}
window.irAPasoPago = irAPasoPago;

// ─────────────────────────────────────────────────────────
//  PASO 3 — PAGO
// ─────────────────────────────────────────────────────────
function renderPasoPago() {
  document.getElementById('cart-title').textContent = 'Confirmar y pagar';
  const bodyEl = document.getElementById('cart-body');
  const footerEl = document.getElementById('cart-footer');
  const desglose = calcularDesglose();

  bodyEl.innerHTML = `
    <div class="resumen-direccion">
      <strong>Enviar a</strong>
      ${datosCliente.nombre} ${datosCliente.apellidos}<br>
      ${datosCliente.direccion}, ${datosCliente.colonia}<br>
      ${datosCliente.ciudad}, ${datosCliente.estado}, CP ${datosCliente.cp}<br>
      ${datosCliente.email}
    </div>
    ${carrito.map(c => `
      <div class="cart-item">
        <div class="cart-item-body">
          <div class="cart-item-name">${c.nombre} ×${c.qty}</div>
        </div>
        <span class="cart-item-price">$${c.precio * c.qty}</span>
      </div>
    `).join('')}
  `;

  footerEl.innerHTML = `
    <div class="cart-line"><span>Subtotal</span><span>$${desglose.subtotal}</span></div>
    ${desglose.descuentoPromo > 0 ? `<div class="cart-line verde"><span>Descuento promo</span><span>-$${desglose.descuentoPromo}</span></div>` : ''}
    ${desglose.descuentoCupon > 0 ? `<div class="cart-line verde"><span>Cupón</span><span>-$${desglose.descuentoCupon}</span></div>` : ''}
    <div class="cart-line"><span>Envío</span><span>${desglose.envioGratis ? 'Gratis' : '$' + desglose.costoEnvio}</span></div>
    <div class="cart-total-row"><span>Total</span><span>$${desglose.total}</span></div>
    <div id="paypal-button-container"></div>
    <button class="btn-simulado" onclick="procesarCompraSimulada()">🧪 Compra simulada (modo prueba)</button>
    <button class="btn-volver" onclick="volverADatos()">← Volver a mis datos</button>
    <div class="checkout-note">Pago seguro procesado por PayPal. Tus datos de tarjeta nunca pasan por nuestros servidores.</div>
  `;

  renderBotonPayPal(desglose.total);
}

function volverADatos() { pasoCheckout = 'datos'; renderCarrito(); }
window.volverADatos = volverADatos;

// ─────────────────────────────────────────────────────────
//  PAYPAL CHECKOUT
// ─────────────────────────────────────────────────────────
function renderBotonPayPal(total) {
  const container = document.getElementById('paypal-button-container');
  if (!container) return;
  container.innerHTML = '';

  if (typeof paypal === 'undefined') {
    container.innerHTML = '<div style="font-size:12px;color:#A32D2D;text-align:center;padding:12px">PayPal no se pudo cargar. Verifica tu conexión o usa la compra simulada.</div>';
    return;
  }

  try {
    paypal.Buttons({
      style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'pay' },
      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: { value: total.toString(), currency_code: 'MXN' },
            description: 'Doña Metiche — ' + carrito.map(c => c.nombre + ' x' + c.qty).join(', ')
          }]
        });
      },
      onApprove: function(data, actions) {
        return actions.order.capture().then(async function(details) {
          await finalizarCompra({ metodo: 'paypal', paypalOrderId: details.id, paypalPayer: details.payer && details.payer.email_address });
        });
      },
      onError: function(err) {
        console.error('Error PayPal:', err);
        toastTienda('Hubo un problema con PayPal. Puedes usar la compra simulada para probar.');
      }
    }).render('#paypal-button-container');
  } catch (err) {
    console.error('Error renderizando botón PayPal:', err);
    container.innerHTML = '<div style="font-size:12px;color:#A32D2D;text-align:center;padding:12px">Error cargando PayPal. Usa la compra simulada mientras lo revisamos.</div>';
  }
}

// ─────────────────────────────────────────────────────────
//  COMPRA SIMULADA (modo prueba)
// ─────────────────────────────────────────────────────────
async function procesarCompraSimulada() {
  await finalizarCompra({ metodo: 'simulado', paypalOrderId: 'SIMULADO-' + Date.now(), paypalPayer: datosCliente.email });
}
window.procesarCompraSimulada = procesarCompraSimulada;

// ─────────────────────────────────────────────────────────
//  FINALIZAR COMPRA — registrar en Firebase + descontar inventario + ticket
// ─────────────────────────────────────────────────────────
async function finalizarCompra(infoPago) {
  try {
    const desglose = calcularDesglose();
    const { getDatabase, ref, push, set, get } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
    const db = getDatabase();

    const lineas = carrito.map(c => ({
      tipo: 'normal', nombre: c.nombre, receta: c.receta, ml: c.ml,
      qty: c.qty, precioUnit: c.precio, subtotal: c.precio * c.qty
    }));

    const entry = {
      tipo: 'venta',
      canal: 'tienda-online',
      lineas,
      subtotal: desglose.subtotal,
      descPromo: desglose.descuentoPromo,
      descMayoreoVal: desglose.descuentoCupon,
      cupon: cuponAplicado || null,
      costoEnvio: desglose.costoEnvio,
      envioGratis: desglose.envioGratis,
      total: desglose.total,
      pago: infoPago.metodo,
      cambio: 0,
      paypalOrderId: infoPago.paypalOrderId || null,
      paypalPayer: infoPago.paypalPayer || null,
      cliente: datosCliente,
      fecha: new Date().toISOString()
    };

    await push(ref(db, 'historial'), entry);

    for (const c of carrito) {
      const invRef = ref(db, 'inventario/' + c.id);
      const snap = await get(invRef);
      const actual = snap.val() || 0;
      await set(invRef, Math.max(0, actual - c.qty));
    }

    await enviarCorreoNuevoPedido(entry);

    mostrarTicket(entry);

    carrito = [];
    cuponAplicado = null;
    pasoCheckout = 'carrito';
    renderCarrito();
    cerrarCarrito();
  } catch (err) {
    console.error('Error finalizando compra:', err);
    toastTienda('Hubo un error procesando tu compra. Contáctanos directamente.');
  }
}

// ─────────────────────────────────────────────────────────
//  TICKET DE COMPRA
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
//  CORREO DE CONFIRMACIÓN AL CREAR EL PEDIDO
// ─────────────────────────────────────────────────────────
async function enviarCorreoNuevoPedido(pedido) {
  if (!window.emailjs) { console.warn('EmailJS no cargó todavía'); return; }
  const cfg = window._EMAILJS_CONFIG;
  if (!cfg || cfg.serviceId === 'TU_SERVICE_ID') { console.warn('EmailJS no configurado'); return; }
  const c = pedido.cliente;
  const productos = pedido.lineas.map(l => l.nombre + ' x' + l.qty).join(', ');
  try {
    await window.emailjs.send(cfg.serviceId, cfg.templateId, {
      nombre: c.nombre,
      pedido_id: (pedido.paypalOrderId || '').slice(-8),
      nuevo_estatus: '🟡 Pedido recibido',
      guia: 'Aún no disponible',
      paqueteria: 'Por confirmar',
      productos,
      total: '$' + pedido.total,
      to_email: c.email
    });
  } catch (err) {
    console.error('Error enviando correo de confirmación:', err);
  }
}

function mostrarTicket(venta) {
  const d = new Date(venta.fecha);
  const fecha = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const itemsHtml = venta.lineas.map(l => `<div class="ticket-row"><span>${l.nombre} ×${l.qty}</span><span>$${l.subtotal}</span></div>`).join('');

  document.getElementById('ticket-modal-content').innerHTML = `
    <div class="ticket-header-icon">✓</div>
    <h2>¡Compra confirmada!</h2>
    <p class="ticket-sub">${venta.pago === 'simulado' ? '🧪 Compra simulada (modo prueba)' : 'Gracias por tu pedido, ' + venta.cliente.nombre}</p>
    <hr class="ticket-divider">
    ${itemsHtml}
    <hr class="ticket-divider">
    <div class="ticket-row"><span>Subtotal</span><span>$${venta.subtotal}</span></div>
    ${venta.descPromo > 0 ? `<div class="ticket-row"><span>Descuento promo</span><span>-$${venta.descPromo}</span></div>` : ''}
    ${venta.descMayoreoVal > 0 ? `<div class="ticket-row"><span>Cupón ${venta.cupon || ''}</span><span>-$${venta.descMayoreoVal}</span></div>` : ''}
    <div class="ticket-row"><span>Envío</span><span>${venta.envioGratis ? 'Gratis' : '$' + venta.costoEnvio}</span></div>
    <div class="ticket-row bold"><span>Total pagado</span><span>$${venta.total}</span></div>
    <hr class="ticket-divider">
    <div class="ticket-row"><span>Enviar a</span></div>
    <p style="font-size:12.5px;color:var(--gris);line-height:1.6;margin-top:4px">
      ${venta.cliente.direccion}, ${venta.cliente.colonia}<br>
      ${venta.cliente.ciudad}, ${venta.cliente.estado}, CP ${venta.cliente.cp}
    </p>
    <p style="font-size:11px;color:var(--gris);margin-top:14px;text-align:center">${fecha} · Pedido #${(venta.paypalOrderId || '').slice(-8)}</p>
    <button class="btn-cerrar-ticket" onclick="cerrarTicket()">Cerrar</button>
  `;
  document.getElementById('ticket-overlay').classList.add('open');
}

function cerrarTicket() { document.getElementById('ticket-overlay').classList.remove('open'); }
window.cerrarTicket = cerrarTicket;

// ─────────────────────────────────────────────────────────
//  CARRITO DRAWER OPEN/CLOSE
// ─────────────────────────────────────────────────────────
function abrirCarrito() {
  pasoCheckout = 'carrito';
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCarrito();
}
window.abrirCarrito = abrirCarrito;

function cerrarCarrito() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
window.cerrarCarrito = cerrarCarrito;

function cerrarCarritoOverlay(e) {
  if (e.target.id === 'cart-overlay') cerrarCarrito();
}
window.cerrarCarritoOverlay = cerrarCarritoOverlay;

// ─────────────────────────────────────────────────────────
//  QUIENES SOMOS
// ─────────────────────────────────────────────────────────
function renderQuienesSomos() {
  const qs = window._app ? window._app.quienesSomos : null;
  if (!qs) return;
  const elTitulo = document.getElementById('qs-titulo');
  const elP1 = document.getElementById('qs-p1');
  const elP2 = document.getElementById('qs-p2');
  const elP3 = document.getElementById('qs-p3');
  if (elTitulo) elTitulo.textContent = qs.titulo || '';
  if (elP1) elP1.textContent = qs.parrafo1 || '';
  if (elP2) elP2.textContent = qs.parrafo2 || '';
  if (elP3) elP3.textContent = qs.parrafo3 || '';
}
window.renderQuienesSomos = renderQuienesSomos;

// ─────────────────────────────────────────────────────────
//  ESC PARA CERRAR
// ─────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { cerrarModalProducto(); cerrarCarrito(); cerrarTicket(); }
});
