// ════════════════════════════════════════════════════════
//  DOÑA METICHE — TIENDA
// ════════════════════════════════════════════════════════

let carrito = [];
let filtroActivo = '';
let productoModalActivo = null;
let fotoActivaIdx = 0;

// ─────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────
function appInit() {
  renderFiltros();
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
//  FILTROS
// ─────────────────────────────────────────────────────────
function renderFiltros() {
  const recetas = ['Morita', 'Habanero', 'Chile de árbol'];
  const el = document.getElementById('filtros-receta');
  el.innerHTML = `
    <button class="filtro-btn active" onclick="setFiltroReceta('', this)">Todas</button>
    ${recetas.map(r => `<button class="filtro-btn" onclick="setFiltroReceta('${r}', this)">${r}</button>`).join('')}
  `;
}

function setFiltroReceta(r, btn) {
  filtroActivo = r;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCatalogo();
}
window.setFiltroReceta = setFiltroReceta;

// ─────────────────────────────────────────────────────────
//  HELPERS DE DATOS
// ─────────────────────────────────────────────────────────
function getProductos() {
  return window._PRODUCTOS || [];
}
function getInventario() {
  return window._app ? window._app.inventario : {};
}
function getFotos(productoId) {
  const fotos = window._app ? window._app.fotosProductos : {};
  return (fotos && fotos[productoId]) ? fotos[productoId] : [];
}
function getRecetaInfo(receta) {
  return (window._RECETA_INFO && window._RECETA_INFO[receta]) || { tagline: '', descripcion: '', color: '#7a2a10' };
}

// ─────────────────────────────────────────────────────────
//  RENDER CATÁLOGO
// ─────────────────────────────────────────────────────────
function renderCatalogo() {
  const grid = document.getElementById('catalogo-grid');
  if (!grid) return;
  let productos = getProductos();
  if (filtroActivo) productos = productos.filter(p => p.receta === filtroActivo);
  const inventario = getInventario();

  grid.innerHTML = productos.map(p => {
    const stock = inventario[p.id] || 0;
    const fotos = getFotos(p.id);
    const fotoPrincipal = fotos[0];
    const agotado = stock < 1;

    return `
      <div class="producto-card" onclick="abrirModalProducto('${p.id}')">
        <div class="card-img-wrap">
          ${fotoPrincipal
            ? `<img src="${fotoPrincipal}" alt="${p.nombre}" loading="lazy"/>`
            : `<div class="card-img-placeholder"><div class="ph-jar"></div></div>`
          }
          ${agotado
            ? `<span class="card-badge agotado">Agotado</span>`
            : (stock < 5 ? `<span class="card-badge">Últimas piezas</span>` : '')
          }
          <div class="card-quickview">→</div>
        </div>
        <div class="card-receta">${p.receta}</div>
        <div class="card-nombre">${p.ml} ml</div>
        <div class="card-ml">${getRecetaInfo(p.receta).tagline}</div>
        <div class="card-price-row">
          <span class="card-price">$${p.precio} MXN</span>
          <span class="card-stock ${stock < 5 ? 'low' : ''}">${agotado ? 'Sin stock' : stock + ' disponibles'}</span>
        </div>
      </div>
    `;
  }).join('');
}
window.renderCatalogo = renderCatalogo;

// ─────────────────────────────────────────────────────────
//  MODAL DE PRODUCTO
// ─────────────────────────────────────────────────────────
function abrirModalProducto(productoId) {
  productoModalActivo = productoId;
  fotoActivaIdx = 0;
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

function renderProductoActivo() {
  if (!productoModalActivo) return;
  const p = getProductos().find(x => x.id === productoModalActivo);
  if (!p) return;
  const inventario = getInventario();
  const stock = inventario[p.id] || 0;
  const fotos = getFotos(p.id);
  const info = getRecetaInfo(p.receta);

  const galeriaThumbsHtml = fotos.length > 1
    ? `<div class="modal-gallery-thumbs">
        ${fotos.map((f, i) => `<div class="modal-thumb ${i === fotoActivaIdx ? 'active' : ''}" onclick="setFotoActiva(${i})"><img src="${f}" loading="lazy"/></div>`).join('')}
      </div>`
    : '';

  const fotoMain = fotos[fotoActivaIdx];

  const content = document.getElementById('modal-producto-content');
  content.innerHTML = `
    <button class="modal-close" onclick="cerrarModalProducto()">✕</button>
    <div class="modal-gallery">
      <div class="modal-gallery-main">
        ${fotoMain
          ? `<img src="${fotoMain}" alt="${p.nombre}"/>`
          : `<div class="card-img-placeholder"><div class="ph-jar"></div></div>`
        }
      </div>
      ${galeriaThumbsHtml}
    </div>
    <div class="modal-info">
      <div class="modal-receta">${p.receta}</div>
      <h2 class="modal-nombre">${p.ml} ml</h2>
      <p class="modal-tagline">${info.tagline}</p>
      <div class="modal-precio">$${p.precio} MXN</div>
      <p class="modal-descripcion">${info.descripcion}</p>
      <div class="modal-stock-info ${stock < 5 ? 'low' : ''}">
        ${stock < 1 ? 'Sin existencias por el momento' : stock < 5 ? `Solo quedan ${stock} piezas` : `${stock} piezas disponibles`}
      </div>
      <div class="modal-qty-row">
        <label>Cantidad</label>
        <div class="qty-control">
          <button onclick="cambiarQtyModal(-1)">−</button>
          <span id="modal-qty-display">1</span>
          <button onclick="cambiarQtyModal(1)">+</button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-add-cart" id="btn-add-cart-modal" onclick="agregarAlCarritoDesdeModal('${p.id}')" ${stock < 1 ? 'disabled' : ''}>
          ${stock < 1 ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  `;
  window._modalQty = 1;
}
window.renderProductoActivo = renderProductoActivo;

function setFotoActiva(idx) {
  fotoActivaIdx = idx;
  renderProductoActivo();
}
window.setFotoActiva = setFotoActiva;

function cambiarQtyModal(delta) {
  const p = getProductos().find(x => x.id === productoModalActivo);
  const stock = getInventario()[p.id] || 0;
  window._modalQty = Math.max(1, Math.min((window._modalQty || 1) + delta, stock));
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

  if (enCarrito + qty > stock) {
    toastTienda('No hay suficiente stock disponible');
    return;
  }

  if (existente) existente.qty += qty;
  else carrito.push({ id: p.id, nombre: p.receta + ' ' + p.ml + 'ml', receta: p.receta, ml: p.ml, precio: p.precio, qty });

  renderCarrito();
  toastTienda(`${p.receta} ${p.ml}ml agregado al carrito`);
}
window.agregarAlCarrito = agregarAlCarrito;

function quitarDelCarrito(idx) {
  carrito.splice(idx, 1);
  renderCarrito();
}
window.quitarDelCarrito = quitarDelCarrito;

function calcularTotalCarrito() {
  return carrito.reduce((a, c) => a + c.precio * c.qty, 0);
}

function renderCarrito() {
  const totalItems = carrito.reduce((a, c) => a + c.qty, 0);
  document.getElementById('cart-count').textContent = totalItems;

  const listEl = document.getElementById('cart-items-list');
  const footerEl = document.getElementById('cart-footer');

  if (!carrito.length) {
    listEl.innerHTML = `
      <div class="cart-empty-state">
        <div class="seal-icon"></div>
        <div>Tu carrito está vacío</div>
      </div>
    `;
    footerEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = carrito.map((c, i) => {
    const fotos = getFotos(c.id);
    const foto = fotos[0];
    return `
      <div class="cart-item">
        <div class="cart-item-img">${foto ? `<img src="${foto}"/>` : ''}</div>
        <div class="cart-item-body">
          <div class="cart-item-name">${c.nombre}</div>
          <div class="cart-item-meta">Cantidad: ${c.qty}</div>
          <div class="cart-item-bottom">
            <span class="cart-item-price">$${c.precio * c.qty} MXN</span>
            <button class="cart-item-remove" onclick="quitarDelCarrito(${i})">Quitar</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const total = calcularTotalCarrito();
  footerEl.innerHTML = `
    <div class="cart-total-row"><span>Total</span><span>$${total} MXN</span></div>
    <div id="paypal-button-container"></div>
    <div class="checkout-note">Pago seguro procesado por PayPal. Tus datos de tarjeta nunca pasan por nuestros servidores.</div>
  `;

  renderBotonPayPal(total);
}
window.renderCarrito = renderCarrito;

// ─────────────────────────────────────────────────────────
//  PAYPAL CHECKOUT
// ─────────────────────────────────────────────────────────
function renderBotonPayPal(total) {
  const container = document.getElementById('paypal-button-container');
  if (!container) return;
  container.innerHTML = '';

  if (typeof paypal === 'undefined') {
    container.innerHTML = '<div style="font-size:12px;color:#A32D2D;text-align:center;padding:12px">PayPal no se pudo cargar. Verifica tu conexión.</div>';
    return;
  }

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
        await registrarVentaTienda(details, total);
        carrito = [];
        renderCarrito();
        cerrarCarrito();
        toastTienda('¡Pago exitoso! Gracias por tu compra 🎉');
      });
    },
    onError: function(err) {
      console.error('Error PayPal:', err);
      toastTienda('Hubo un problema con el pago. Intenta de nuevo.');
    }
  }).render('#paypal-button-container');
}

// Registrar la venta en Firebase (mismo historial que la app de POS)
async function registrarVentaTienda(detallesPaypal, total) {
  try {
    const { getDatabase, ref, push, set, get } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
    const db = getDatabase();

    const lineas = carrito.map(c => ({
      tipo: 'normal',
      nombre: c.nombre,
      receta: c.receta,
      ml: c.ml,
      qty: c.qty,
      precioUnit: c.precio,
      subtotal: c.precio * c.qty
    }));

    const entry = {
      tipo: 'venta',
      canal: 'tienda-online',
      lineas,
      subtotal: total,
      descPromo: 0,
      descMayoreoVal: 0,
      mayoreo: null,
      total,
      pago: 'paypal',
      cambio: 0,
      paypalOrderId: detallesPaypal.id || null,
      paypalPayer: (detallesPaypal.payer && detallesPaypal.payer.email_address) || null,
      fecha: new Date().toISOString()
    };

    await push(ref(db, 'historial'), entry);

    // Descontar inventario
    for (const c of carrito) {
      const invRef = ref(db, 'inventario/' + c.id);
      const snap = await get(invRef);
      const actual = snap.val() || 0;
      await set(invRef, Math.max(0, actual - c.qty));
    }
  } catch (err) {
    console.error('Error registrando venta en Firebase:', err);
  }
}

// ─────────────────────────────────────────────────────────
//  CARRITO DRAWER OPEN/CLOSE
// ─────────────────────────────────────────────────────────
function abrirCarrito() {
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
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
//  QUIENES SOMOS (editable vía Firebase)
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
//  CERRAR MODALES CON ESC
// ─────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModalProducto();
    cerrarCarrito();
  }
});
