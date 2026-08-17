// ════════════════════════════════════════════════════════
//  DOÑA METICHE — TIENDA — app.js
// ════════════════════════════════════════════════════════

let carrito = [];
let cuponAplicado = null;
let pasoCheckout = 'carrito';
let datosCliente = {};
let _modalRecetaActiva = null;
let _tamanoSel = null;
let _modalQty = 1;
let _fotoIdx = 0;

// ── ACCESORES A DATOS GLOBALES ───────────────────────────
function getRecetas()   { return window.recetas   || {}; }
function getInventario(){ return window.inventario || {}; }
function getPrecios()   { return window.precios    || {}; }
function getPromos()    { return window.promos     || {}; }
function getEnvios()    { return window.envios     || { costo:100, minimoGratis:700 }; }
function getCupones()   { return window.cupones    || {}; }
function getFotosAll()  { return window.fotos      || {}; }

function getProductos() {
  const prods = [];
  Object.entries(getRecetas()).forEach(([rid,r]) => {
    if (!r.activa) return;
    Object.entries(r.tallas||{}).forEach(([tid,t]) => {
      const id = rid+'_'+tid;
      prods.push({
        id, recetaId:rid, tallaId:tid,
        nombre: r.nombre+' '+t.ml+'ml',
        receta: r.nombre, ml: t.ml,
        precio: getPrecios()[id] !== undefined ? getPrecios()[id] : (t.precio||0),
        codigo: t.codigo||'',
        tagline: r.tagline||'',
        descripcion: r.descripcion||''
      });
    });
  });
  return prods.sort((a,b)=>a.receta.localeCompare(b.receta)||b.ml-a.ml);
}

function getStock(id)    { return getInventario()[id] || 0; }
function getFotos(id)    { return (getFotosAll()[id] || []); }
function getPromoCfg(ml) {
  const d = {235:{cantidad:3,precio:380},120:{cantidad:3,precio:250},29:{cantidad:3,precio:130}};
  const p = getPromos();
  return (p && p['p'+ml]) || d[ml] || {cantidad:3,precio:100};
}

// Exponer para que el módulo Firebase pueda actualizarlos
window.recetas   = {};
window.inventario= {};
window.precios   = {};
window.promos    = {};
window.envios    = { costo:100, minimoGratis:700 };
window.cupones   = {};
window.fotos     = {};

// ── TOAST ────────────────────────────────────────────────
let _toastT;
function toastTienda(msg) {
  const el = document.getElementById('toast-tienda');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── CATÁLOGO ─────────────────────────────────────────────
function renderCatalogo() {
  const grid = document.getElementById('recetas-grid'); if (!grid) return;
  const rKeys = Object.keys(getRecetas()).filter(rid => getRecetas()[rid].activa);
  if (!rKeys.length) { grid.innerHTML = '<p style="color:var(--gris);text-align:center;grid-column:1/-1">Cargando productos...</p>'; return; }

  grid.innerHTML = rKeys.map(rid => {
    const r = getRecetas()[rid];
    const tallas = Object.entries(r.tallas||{}).sort((a,b)=>b[1].ml-a[1].ml);
    const repTalla = tallas[0]; // mayor talla como representativa
    if (!repTalla) return '';
    const [, t] = repTalla;
    const repId = rid+'_'+repTalla[0];
    const stockTotal = tallas.reduce((a,[tid])=>a+getStock(rid+'_'+tid),0);
    const fotosRep = getFotos(repId);
    const fotoPrincipal = fotosRep[0];
    const precio = getPrecios()[repId] !== undefined ? getPrecios()[repId] : (t.precio||0);

    return `
      <div class="receta-card" onclick="abrirModalProducto('${rid}')">
        <div class="rc-img-wrap">
          ${fotoPrincipal
            ? `<img src="${fotoPrincipal}" alt="${r.nombre}" loading="lazy"/>`
            : `<div class="rc-img-placeholder"><div class="ph-jar"></div></div>`}
          <span class="rc-badge">${stockTotal < 1 ? 'Agotado' : 'Artesanal'}</span>
          <div class="rc-quickview">→</div>
        </div>
        <div class="rc-nombre">${r.nombre}</div>
        <div class="rc-tagline">${r.tagline||''}</div>
        <div class="rc-precio">$${precio}<span> / ${t.ml}ml</span></div>
      </div>`;
  }).join('');
}
window.renderCatalogo = renderCatalogo;

// ── MODAL DE PRODUCTO ────────────────────────────────────
function abrirModalProducto(recetaId) {
  _modalRecetaActiva = recetaId;
  window._modalRecetaActiva = recetaId;
  _fotoIdx = 0;
  const r = getRecetas()[recetaId]; if (!r) return;
  const tallas = Object.entries(r.tallas||{}).sort((a,b)=>b[1].ml-a[1].ml);
  const conStock = tallas.find(([tid]) => getStock(recetaId+'_'+tid) > 0);
  _tamanoSel = (conStock || tallas[0])?.[0] || null;
  _modalQty = 1;
  renderProductoActivo();
  document.getElementById('modal-producto-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
window.abrirModalProducto = abrirModalProducto;

function cerrarModalProducto() {
  document.getElementById('modal-producto-overlay').classList.remove('open');
  document.body.style.overflow = '';
  _modalRecetaActiva = null;
  window._modalRecetaActiva = null;
}
window.cerrarModalProducto = cerrarModalProducto;

function seleccionarTamano(tid) {
  _tamanoSel = tid; _modalQty = 1; _fotoIdx = 0;
  renderProductoActivo();
}
window.seleccionarTamano = seleccionarTamano;

function setFotoActiva(idx) { _fotoIdx = idx; renderProductoActivo(); }
window.setFotoActiva = setFotoActiva;

function renderProductoActivo() {
  if (!_modalRecetaActiva) return;
  const rid = _modalRecetaActiva;
  const r = getRecetas()[rid]; if (!r) return;
  const tallas = Object.entries(r.tallas||{}).sort((a,b)=>b[1].ml-a[1].ml);
  if (!_tamanoSel && tallas[0]) _tamanoSel = tallas[0][0];
  const tallaActiva = r.tallas?.[_tamanoSel];
  if (!tallaActiva) return;
  const prodId = rid+'_'+_tamanoSel;
  const stock = getStock(prodId);
  const precio = getPrecios()[prodId] !== undefined ? getPrecios()[prodId] : (tallaActiva.precio||0);
  const fotosArr = getFotos(prodId);
  const fotoMain = fotosArr[_fotoIdx];

  const thumbsHtml = fotosArr.length > 1
    ? `<div class="modal-gallery-thumbs">${fotosArr.map((f,i)=>`<div class="modal-thumb ${i===_fotoIdx?'active':''}" onclick="setFotoActiva(${i})"><img src="${f}" loading="lazy"/></div>`).join('')}</div>`
    : '';

  const tamanosHtml = tallas.map(([tid,t]) => {
    const s = getStock(rid+'_'+tid);
    const p = getPrecios()[rid+'_'+tid] !== undefined ? getPrecios()[rid+'_'+tid] : (t.precio||0);
    return `<button class="tamano-btn ${tid===_tamanoSel?'active':''} ${s<1?'sin-stock':''}" onclick="seleccionarTamano('${tid}')">
      <div class="tb-ml">${t.ml} ml</div>
      <div class="tb-precio">$${p}</div>
      <div class="tb-stock">${s<1?'Sin stock':s+' disp.'}</div>
    </button>`;
  }).join('');

  document.getElementById('modal-producto-content').innerHTML = `
    <button class="modal-close" onclick="cerrarModalProducto()">✕</button>
    <div class="modal-gallery">
      <div class="modal-gallery-main">
        ${fotoMain ? `<img src="${fotoMain}" alt="${r.nombre}"/>` : `<div class="rc-img-placeholder" style="height:100%"><div class="ph-jar"></div></div>`}
      </div>
      ${thumbsHtml}
    </div>
    <div class="modal-info">
      <div class="modal-receta">${r.nombre}</div>
      <h2 class="modal-nombre">${r.nombre}</h2>
      <p class="modal-tagline">${r.tagline||''}</p>
      <p class="modal-descripcion">${r.descripcion||''}</p>
      <div class="tamano-selector">
        <label>Elige el tamaño</label>
        <div class="tamano-opciones">${tamanosHtml}</div>
      </div>
      <div class="modal-precio-display">$${precio} MXN</div>
      <div class="modal-stock-info ${stock<5?'low':''}">
        ${stock<1?'Sin existencias por el momento':stock<5?`Solo quedan ${stock} piezas`:`${stock} piezas disponibles`}
      </div>
      <div class="modal-qty-row">
        <label>Cantidad</label>
        <div class="qty-control">
          <button onclick="cambiarQtyModal(-1)">−</button>
          <span id="modal-qty-display">${_modalQty}</span>
          <button onclick="cambiarQtyModal(1)">+</button>
        </div>
      </div>
      <button class="btn-add-cart" onclick="agregarAlCarritoDesdeModal('${prodId}')" ${stock<1?'disabled':''}>
        ${stock<1?'Sin stock':'Agregar al carrito'}
      </button>
    </div>`;
}
window.renderProductoActivo = renderProductoActivo;

function cambiarQtyModal(d) {
  const stock = getStock(`${_modalRecetaActiva}_${_tamanoSel}`);
  _modalQty = Math.max(1, Math.min((_modalQty||1)+d, stock||1));
  const el = document.getElementById('modal-qty-display');
  if (el) el.textContent = _modalQty;
}
window.cambiarQtyModal = cambiarQtyModal;

function agregarAlCarritoDesdeModal(prodId) {
  agregarAlCarrito(prodId, _modalQty||1);
  cerrarModalProducto();
}
window.agregarAlCarritoDesdeModal = agregarAlCarritoDesdeModal;

// ── CARRITO ──────────────────────────────────────────────
function agregarAlCarrito(prodId, qty=1) {
  const p = getProductos().find(x=>x.id===prodId); if (!p) return;
  const stock = getStock(prodId);
  const enCarrito = carrito.filter(c=>!c.promo&&c.id===prodId).reduce((a,c)=>a+c.qty,0);
  const enPromo = carrito.filter(c=>c.promo&&c.lineas).reduce((a,c)=>{
    const l=c.lineas.find(x=>x.id===prodId); return a+(l?l.qty*c.qty:0);},0);
  if (enCarrito+enPromo+qty > stock) { toastTienda('No hay suficiente stock'); return; }
  const ex = carrito.find(c=>!c.promo&&c.id===prodId);
  if (ex) ex.qty += qty;
  else carrito.push({id:p.id,nombre:p.nombre,receta:p.receta,ml:p.ml,precio:p.precio,qty});
  verificarPromos();
  renderCarrito();
  toastTienda(`${p.nombre} agregado al carrito`);
}
window.agregarAlCarrito = agregarAlCarrito;

function verificarPromos() {
  const mls = [...new Set(getProductos().map(p=>p.ml))];
  mls.forEach(ml => {
    const itemsML = carrito.filter(c=>!c.promo&&c.ml===ml);
    const totalUnd = itemsML.reduce((a,c)=>a+c.qty,0);
    const cfg = getPromoCfg(ml);
    if (totalUnd < cfg.cantidad) return;
    const grupos = Math.floor(totalUnd/cfg.cantidad);
    const precioUnit = getProductos().find(p=>p.ml===ml)?.precio || 0;
    let porAsignar = grupos*cfg.cantidad;
    const lineas = [];
    for (const item of itemsML) {
      if (porAsignar<=0) break;
      const tomar = Math.min(item.qty, porAsignar);
      if (tomar>0) { lineas.push({id:item.id,receta:item.receta,nombre:item.nombre,qty:tomar}); porAsignar-=tomar; }
    }
    let restante = grupos*cfg.cantidad;
    for (const item of itemsML) {
      if (restante<=0) break;
      const q = Math.min(item.qty,restante); item.qty-=q; restante-=q;
    }
    carrito = carrito.filter(c=>c.qty>0);
    const desc = lineas.map(l=>l.receta.split(' ')[0]+'x'+l.qty).join(', ');
    carrito.push({promo:'p'+ml,nombre:'Promo '+cfg.cantidad+'x'+ml+'ml',desglose:desc,ml,
      precio:cfg.precio*grupos,precioUnitarioNormal:precioUnit,qty:grupos,lineas});
  });
}

function quitarDelCarrito(idx) { carrito.splice(idx,1); renderCarrito(); }
window.quitarDelCarrito = quitarDelCarrito;

function cambiarQtyCarrito(idx,d) {
  const c = carrito[idx];
  if (c.promo) {
    const nuevaQty = c.qty+d;
    if (nuevaQty<1) carrito.splice(idx,1);
    else { const cfg=getPromoCfg(c.ml); c.qty=nuevaQty; c.precio=cfg.precio*nuevaQty; }
  } else {
    const s = getStock(c.id);
    const nueva = c.qty+d;
    if (nueva<1) carrito.splice(idx,1);
    else if (nueva>s) toastTienda('Sin más stock');
    else c.qty = nueva;
  }
  verificarPromos();
  renderCarrito();
}
window.cambiarQtyCarrito = cambiarQtyCarrito;

// ── CÁLCULO DE TOTALES ───────────────────────────────────
function calcularDesglose() {
  let subtotal=0, descPromo=0;
  carrito.forEach(c => {
    if (c.promo) {
      const cfg = getPromoCfg(c.ml);
      const sinPromo = c.precioUnitarioNormal * cfg.cantidad * c.qty;
      subtotal += sinPromo; descPromo += sinPromo - c.precio;
    } else {
      subtotal += c.precio*c.qty;
    }
  });
  const despuesPromo = subtotal - descPromo;

  let descCupon=0, cuponEnvioGratis=false;
  if (cuponAplicado) {
    const cData = getCupones()[cuponAplicado];
    const pct = typeof cData==='object' ? (cData.pct||0) : (cData||0);
    cuponEnvioGratis = typeof cData==='object' ? !!cData.envioGratis : false;
    if (pct) descCupon = Math.round(despuesPromo*pct/100);
  }
  const despuesCupon = despuesPromo - descCupon;

  const env = getEnvios();
  let costoEnvio = env.costo||0;
  let envioGratis = false;
  if (cuponEnvioGratis) { costoEnvio=0; envioGratis=true; }
  else if (env.minimoGratis>0 && despuesCupon>=env.minimoGratis) { costoEnvio=0; envioGratis=true; }

  return { subtotal, descPromo, despuesPromo, descCupon, despuesCupon, costoEnvio, envioGratis, total:despuesCupon+costoEnvio };
}

// ── RENDER CARRITO ───────────────────────────────────────
function renderCarrito() {
  const totalItems = carrito.reduce((a,c)=>a+c.qty,0);
  document.getElementById('cart-count').textContent = totalItems;
  if (pasoCheckout==='carrito') renderPasoCarrito();
  else if (pasoCheckout==='datos') renderPasoDatos();
  else if (pasoCheckout==='pago') renderPasoPago();
}
window.renderCarrito = renderCarrito;

function renderCarritoBody() { renderCarrito(); }
window.renderCarritoBody = renderCarritoBody;

function renderPasoCarrito() {
  document.getElementById('cart-title').textContent = 'Tu carrito';
  const bodyEl = document.getElementById('cart-body');
  const footerEl = document.getElementById('cart-footer');

  if (!carrito.length) {
    bodyEl.innerHTML = '<div class="cart-empty-state"><div style="font-size:48px">🛒</div><div>Tu carrito está vacío</div></div>';
    footerEl.innerHTML = '';
    return;
  }

  bodyEl.innerHTML = carrito.map((c,i) => {
    const fotos = getFotos(c.id||'');
    const foto = fotos[0];
    return `<div class="cart-item">
      <div class="cart-item-img">${foto?`<img src="${foto}"/>`:'<div style="width:100%;height:100%;background:var(--crema)"></div>'}</div>
      <div class="cart-item-body">
        <div class="cart-item-name">${c.nombre}${c.promo?`<br><span style="font-size:10px;color:var(--gris)">${c.desglose}</span>`:''}</div>
        <div class="cart-item-bottom">
          <div class="cart-qty-c">
            <button onclick="cambiarQtyCarrito(${i},-1)">−</button>
            <span>${c.qty}</span>
            <button onclick="cambiarQtyCarrito(${i},1)">+</button>
          </div>
          <span class="cart-item-price">$${c.promo?c.precio:c.precio*c.qty}</span>
        </div>
        <button class="cart-item-remove" onclick="quitarDelCarrito(${i})" style="margin-top:4px;align-self:flex-start">Quitar</button>
      </div>
    </div>`;
  }).join('');

  const dg = calcularDesglose();
  const promosActivas = carrito.filter(c=>c.promo);
  const promoHtml = promosActivas.map(c=>`<div class="promo-banner">🏷️ Promo ${c.ml}ml aplicada — ${c.desglose}</div>`).join('');

  const cuponHtml = cuponAplicado
    ? `<div class="cupon-aplicado"><span>🎟️ ${cuponAplicado}</span><button class="quitar-cupon" onclick="quitarCupon()">Quitar</button></div>`
    : `<div class="cupon-box"><input type="text" id="cupon-input" placeholder="Código de cupón"/><button onclick="aplicarCupon()">Aplicar</button></div>`;

  footerEl.innerHTML = `
    ${promoHtml}${cuponHtml}
    <div class="cart-line"><span>Subtotal</span><span>$${dg.subtotal}</span></div>
    ${dg.descPromo>0?`<div class="cart-line verde"><span>Ahorro promo</span><span>-$${dg.descPromo}</span></div>`:''}
    ${dg.descCupon>0?`<div class="cart-line verde"><span>Cupón ${cuponAplicado}</span><span>-$${dg.descCupon}</span></div>`:''}
    <div class="cart-line"><span>Envío</span><span>${dg.envioGratis?'Gratis':'$'+dg.costoEnvio}</span></div>
    <div class="cart-total-row"><span>Total</span><span>$${dg.total}</span></div>
    <button class="btn-continuar" onclick="irAPasoDatos()">Continuar con mis datos</button>`;
}

function renderResumenCarrito() { if (pasoCheckout==='carrito'&&carrito.length) renderPasoCarrito(); }
window.renderResumenCarrito = renderResumenCarrito;

function aplicarCupon() {
  const codigo = document.getElementById('cupon-input')?.value.trim().toUpperCase();
  if (!codigo) return;
  const cData = getCupones()[codigo];
  if (!cData && cData!==0) { toastTienda('Cupón no válido'); return; }
  cuponAplicado = codigo;
  const pct = typeof cData==='object'?(cData.pct||0):(cData||0);
  const envioG = typeof cData==='object'?!!cData.envioGratis:false;
  const partes=[]; if(pct>0) partes.push(pct+'% descuento'); if(envioG) partes.push('envío gratis');
  renderCarrito();
  toastTienda(`Cupón ${codigo}: ${partes.join(' + ')}`);
}
window.aplicarCupon = aplicarCupon;

function quitarCupon() { cuponAplicado=null; renderCarrito(); }
window.quitarCupon = quitarCupon;

// ── PASO 2: DATOS ────────────────────────────────────────
function irAPasoDatos() {
  if (!carrito.length) return;
  pasoCheckout = 'datos'; renderCarrito();
}
window.irAPasoDatos = irAPasoDatos;

function renderPasoDatos() {
  document.getElementById('cart-title').textContent = 'Datos de envío';
  const d = datosCliente;
  document.getElementById('cart-body').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Nombre</label><input id="dc-nombre" value="${d.nombre||''}"/></div>
      <div class="form-field"><label>Apellidos</label><input id="dc-apellidos" value="${d.apellidos||''}"/></div>
    </div>
    <div class="form-field"><label>Correo electrónico</label><input type="email" id="dc-email" value="${d.email||''}"/></div>
    <div class="form-field"><label>Teléfono</label><input type="tel" id="dc-telefono" value="${d.telefono||''}"/></div>
    <div class="form-field"><label>Calle y número</label><input id="dc-direccion" value="${d.direccion||''}"/></div>
    <div class="form-row">
      <div class="form-field"><label>Colonia</label><input id="dc-colonia" value="${d.colonia||''}"/></div>
      <div class="form-field"><label>C.P.</label><input id="dc-cp" value="${d.cp||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Ciudad</label><input id="dc-ciudad" value="${d.ciudad||''}"/></div>
      <div class="form-field"><label>Estado</label><input id="dc-estado" value="${d.estado||''}"/></div>
    </div>
    <div class="form-field"><label>Referencias (opcional)</label><input id="dc-referencias" value="${d.referencias||''}"/></div>`;
  document.getElementById('cart-footer').innerHTML = `
    <button class="btn-continuar" onclick="irAPasoPago()">Continuar al pago</button>
    <button class="btn-volver" onclick="volverACarrito()">← Volver al carrito</button>`;
}

function volverACarrito() { pasoCheckout='carrito'; renderCarrito(); }
window.volverACarrito = volverACarrito;

function irAPasoPago() {
  const campos = ['dc-nombre','dc-apellidos','dc-email','dc-direccion','dc-colonia','dc-cp','dc-ciudad','dc-estado'];
  const vals = campos.map(id=>document.getElementById(id)?.value.trim());
  if (vals.some(v=>!v)) { toastTienda('Completa todos los campos obligatorios'); return; }
  if (!vals[2].includes('@')) { toastTienda('Correo electrónico inválido'); return; }
  datosCliente = {
    nombre:vals[0], apellidos:vals[1], email:vals[2],
    telefono: document.getElementById('dc-telefono')?.value.trim()||'',
    direccion:vals[3], colonia:vals[4], cp:vals[5], ciudad:vals[6], estado:vals[7],
    referencias: document.getElementById('dc-referencias')?.value.trim()||''
  };
  pasoCheckout='pago'; renderCarrito();
}
window.irAPasoPago = irAPasoPago;

// ── PASO 3: PAGO ─────────────────────────────────────────
function renderPasoPago() {
  document.getElementById('cart-title').textContent = 'Confirmar y pagar';
  const dg = calcularDesglose();
  const c = datosCliente;

  document.getElementById('cart-body').innerHTML = `
    <div class="resumen-dir">
      <strong>Enviar a</strong>
      ${c.nombre} ${c.apellidos}<br>
      ${c.direccion}, ${c.colonia}<br>
      ${c.ciudad}, ${c.estado}, CP ${c.cp}<br>
      ${c.email}
    </div>
    ${carrito.map(x=>`<div class="cart-item">
      <div class="cart-item-body">
        <div class="cart-item-name">${x.nombre} ×${x.qty}</div>
      </div>
      <span class="cart-item-price">$${x.promo?x.precio:x.precio*x.qty}</span>
    </div>`).join('')}`;

  document.getElementById('cart-footer').innerHTML = `
    <div class="cart-line"><span>Subtotal</span><span>$${dg.subtotal}</span></div>
    ${dg.descPromo>0?`<div class="cart-line verde"><span>Promo</span><span>-$${dg.descPromo}</span></div>`:''}
    ${dg.descCupon>0?`<div class="cart-line verde"><span>Cupón</span><span>-$${dg.descCupon}</span></div>`:''}
    <div class="cart-line"><span>Envío</span><span>${dg.envioGratis?'Gratis':'$'+dg.costoEnvio}</span></div>
    <div class="cart-total-row"><span>Total</span><span>$${dg.total}</span></div>
    <div id="paypal-button-container"></div>
    <button class="btn-simulado" onclick="procesarCompraSimulada()">🧪 Compra simulada (prueba)</button>
    <button class="btn-volver" onclick="volverADatos()">← Volver a mis datos</button>
    <div class="checkout-note">Pago seguro con PayPal. Tus datos de tarjeta nunca pasan por nuestros servidores.</div>`;

  renderBotonPayPal(dg.total);
}

function volverADatos() { pasoCheckout='datos'; renderCarrito(); }
window.volverADatos = volverADatos;

// ── PAYPAL ───────────────────────────────────────────────
function renderBotonPayPal(total) {
  const container = document.getElementById('paypal-button-container');
  if (!container) return;
  container.innerHTML = '';
  if (typeof paypal === 'undefined') {
    container.innerHTML = '<div style="font-size:12px;color:#A32D2D;text-align:center;padding:10px">PayPal no cargó. Usa la compra simulada.</div>';
    return;
  }
  try {
    paypal.Buttons({
      style:{ layout:'vertical', color:'black', shape:'rect', label:'pay' },
      createOrder:(data,actions) => actions.order.create({
        purchase_units:[{ amount:{value:total.toString(),currency_code:'MXN'},
          description:'Doña Metiche — '+carrito.map(c=>c.nombre+' x'+c.qty).join(', ') }]
      }),
      onApprove:(data,actions) => actions.order.capture().then(async details => {
        await finalizarCompra({ metodo:'paypal', paypalOrderId:details.id, paypalPayer:details.payer?.email_address });
      }),
      onError: err => { console.error(err); toastTienda('Error con PayPal. Usa la compra simulada.'); }
    }).render('#paypal-button-container');
  } catch(e) {
    container.innerHTML = '<div style="font-size:12px;color:#A32D2D;text-align:center;padding:10px">Error cargando PayPal.</div>';
  }
}

async function procesarCompraSimulada() {
  await finalizarCompra({ metodo:'simulado', paypalOrderId:'SIM-'+Date.now(), paypalPayer:datosCliente.email });
}
window.procesarCompraSimulada = procesarCompraSimulada;

// ── FINALIZAR COMPRA ─────────────────────────────────────
async function finalizarCompra(infoPago) {
  try {
    const dg = calcularDesglose();
    const { getDatabase, ref, push, set, get } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
    const db = getDatabase();

    const lineas = carrito.map(c => c.promo
      ? { tipo:'promo', nombre:c.nombre, desglose:c.desglose, ml:c.ml, qty:c.qty, precioPromo:c.precio, lineas:c.lineas }
      : { tipo:'normal', nombre:c.nombre, receta:c.receta, ml:c.ml, qty:c.qty, precioUnit:c.precio, subtotal:c.precio*c.qty }
    );

    const entry = {
      tipo:'venta', canal:'tienda-online', lineas,
      subtotal:dg.subtotal, descPromo:dg.descPromo, descCupon:dg.descCupon,
      cupon:cuponAplicado||null, costoEnvio:dg.costoEnvio, envioGratis:dg.envioGratis,
      total:dg.total, pago:infoPago.metodo,
      paypalOrderId:infoPago.paypalOrderId||null,
      paypalPayer:infoPago.paypalPayer||null,
      cliente:datosCliente, fecha:new Date().toISOString()
    };

    await push(ref(db,'historial'), entry);

    // Descontar inventario
    for (const c of carrito) {
      if (c.promo && c.lineas) {
        for (const l of c.lineas) {
          const s = await get(ref(db,'inventario/'+l.id)).then(s=>s.val()||0);
          await set(ref(db,'inventario/'+l.id), Math.max(0, s-l.qty*c.qty));
        }
      } else if (!c.promo) {
        const s = await get(ref(db,'inventario/'+c.id)).then(s=>s.val()||0);
        await set(ref(db,'inventario/'+c.id), Math.max(0, s-c.qty));
      }
    }

    // Guardar cliente
    const cKey = datosCliente.email.replace(/[.#$[\]]/g,'_');
    const prevSnap = await get(ref(db,'clientes/'+cKey));
    const prev = prevSnap.val()||{};
    await set(ref(db,'clientes/'+cKey), {
      nombre:datosCliente.nombre, apellidos:datosCliente.apellidos,
      email:datosCliente.email, telefono:datosCliente.telefono||'',
      direccion:datosCliente.direccion, colonia:datosCliente.colonia,
      cp:datosCliente.cp, ciudad:datosCliente.ciudad, estado:datosCliente.estado,
      ultimaCompra:new Date().toISOString(),
      totalCompras:(prev.totalCompras||0)+1
    });

    await enviarCorreoConfirmacion(entry);
    mostrarTicket(entry);
    carrito=[]; cuponAplicado=null; pasoCheckout='carrito';
    renderCarrito(); cerrarCarrito();
  } catch(err) {
    console.error(err);
    toastTienda('Error procesando la compra. Contáctanos directamente.');
  }
}

// ── CORREO DE CONFIRMACIÓN ───────────────────────────────
async function enviarCorreoConfirmacion(pedido) {
  if (!window.emailjs) return;
  const cfg = window._EMAILJS_CONFIG;
  if (!cfg || cfg.serviceId==='TU_SERVICE_ID') return;
  const c = pedido.cliente;
  const pedidoId = (pedido.paypalOrderId||'').slice(-8);
  const lineasHtml = pedido.lineas.map(l =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #f0ede5">${l.nombre}</td><td style="text-align:center">×${l.qty}</td><td style="text-align:right">$${l.tipo==='promo'?l.precioPromo:l.subtotal}</td></tr>`
  ).join('');
  const ticket = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #e8e3dc;border-radius:8px;overflow:hidden">
    <div style="background:#0A0A0A;padding:24px;text-align:center">
      <div style="color:#D4621A;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Confirmación de pedido</div>
      <div style="color:#fff;font-size:20px;font-weight:600">Doña Metiche</div>
      <div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:4px">Pedido #${pedidoId}</div>
    </div>
    <div style="padding:24px">
      <p style="margin-bottom:16px">Hola <strong>${c.nombre}</strong>, recibimos tu pedido.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead><tr><th style="text-align:left;font-size:11px;color:#6B6862;text-transform:uppercase;padding-bottom:7px;border-bottom:2px solid #e8e3dc">Producto</th><th style="text-align:center;font-size:11px;color:#6B6862;text-transform:uppercase;padding-bottom:7px;border-bottom:2px solid #e8e3dc">Cant.</th><th style="text-align:right;font-size:11px;color:#6B6862;text-transform:uppercase;padding-bottom:7px;border-bottom:2px solid #e8e3dc">Precio</th></tr></thead>
        <tbody>${lineasHtml}</tbody>
      </table>
      ${pedido.descPromo>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#27500A;margin-bottom:5px"><span>Ahorro promo</span><span>-$${pedido.descPromo}</span></div>`:''}
      ${pedido.descCupon>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#27500A;margin-bottom:5px"><span>Cupón</span><span>-$${pedido.descCupon}</span></div>`:''}
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6B6862;margin-bottom:5px"><span>Envío</span><span>${pedido.envioGratis?'Gratis':'$'+pedido.costoEnvio}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:19px;font-weight:700;border-top:2px solid #0A0A0A;padding-top:12px;margin-top:8px"><span>Total</span><span>$${pedido.total}</span></div>
      <div style="background:#F3EFE7;border-radius:6px;padding:14px;margin-top:18px">
        <div style="font-size:11px;text-transform:uppercase;color:#6B6862;margin-bottom:6px;font-weight:600">Dirección de entrega</div>
        <div style="font-size:13px;line-height:1.7">${c.nombre} ${c.apellidos}<br>${c.direccion}, ${c.colonia}<br>${c.ciudad}, ${c.estado}, CP ${c.cp}</div>
      </div>
      <p style="font-size:12px;color:#6B6862;margin-top:18px;text-align:center">Recibirás notificación cuando tu pedido sea enviado.</p>
    </div>
    <div style="background:#1C1C1A;padding:14px;text-align:center;font-size:11px;color:rgba(255,255,255,.35)">Salsa Doña Metiche · Artesanal con amor 🌶️</div>
  </div>`;
  try {
    await window.emailjs.send(cfg.serviceId, cfg.templateId, {
      nombre:c.nombre, pedido_id:pedidoId,
      nuevo_estatus:'🟡 Pedido recibido',
      guia:'Aún no disponible', paqueteria:'Por confirmar',
      productos:pedido.lineas.map(l=>l.nombre+' x'+l.qty).join(', '),
      total:'$'+pedido.total, to_email:c.email, ticket_html:ticket
    });
  } catch(e) { console.error('Error enviando correo:', e); }
}

// ── TICKET ───────────────────────────────────────────────
function mostrarTicket(venta) {
  const d = new Date(venta.fecha);
  const fecha = d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  const pedidoId = (venta.paypalOrderId||'').slice(-8)||'N/A';
  const c = venta.cliente;
  const itemsHtml = venta.lineas.map(l =>
    `<div class="ticket-row"><span>${l.nombre} ×${l.qty}</span><span>$${l.tipo==='promo'?l.precioPromo:l.subtotal}</span></div>`
  ).join('');
  document.getElementById('ticket-modal-content').innerHTML = `
    <div class="ticket-icon">✓</div>
    <h2>¡Pedido confirmado!</h2>
    <p class="ticket-sub">${venta.pago==='simulado'?'🧪 Compra simulada':'Gracias, '+c.nombre}</p>
    <hr class="ticket-divider">
    ${itemsHtml}
    <hr class="ticket-divider">
    ${venta.descPromo>0?`<div class="ticket-row"><span>Promo</span><span>-$${venta.descPromo}</span></div>`:''}
    ${venta.descCupon>0?`<div class="ticket-row"><span>Cupón</span><span>-$${venta.descCupon}</span></div>`:''}
    <div class="ticket-row"><span>Envío</span><span>${venta.envioGratis?'Gratis':'$'+venta.costoEnvio}</span></div>
    <div class="ticket-row bold"><span>Total pagado</span><span>$${venta.total}</span></div>
    <hr class="ticket-divider">
    <p style="font-size:12.5px;color:var(--gris);line-height:1.7;margin-bottom:4px">
      ${c.direccion}, ${c.colonia}<br>${c.ciudad}, ${c.estado}, CP ${c.cp}
    </p>
    <p style="font-size:11px;color:var(--gris);text-align:center;margin-top:10px">${fecha} · Pedido #${pedidoId}</p>
    <button class="btn-cerrar-ticket" onclick="cerrarTicket()">Cerrar</button>`;
  document.getElementById('ticket-overlay').classList.add('open');
}

function cerrarTicket() { document.getElementById('ticket-overlay').classList.remove('open'); }
window.cerrarTicket = cerrarTicket;

// ── DRAWER ───────────────────────────────────────────────
function abrirCarrito() {
  pasoCheckout='carrito';
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow='hidden';
  renderCarrito();
}
window.abrirCarrito = abrirCarrito;

function cerrarCarrito() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow='';
}
window.cerrarCarrito = cerrarCarrito;

function cerrarCarritoOverlay(e) { if(e.target.id==='cart-overlay') cerrarCarrito(); }
window.cerrarCarritoOverlay = cerrarCarritoOverlay;

// ── ESC ──────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key==='Escape') { cerrarModalProducto(); cerrarCarrito(); cerrarTicket(); }
});
