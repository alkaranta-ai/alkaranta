const categorias = {
  Ingreso: ["Sueldo","Horas Extras","Comisiones","Ventas","Honorarios","Inversiones","Otros"],
  Egreso:  ["Supermercado","Combustible","Servicios","Internet","Telefonía","Salud","Educación","Impuestos","Tarjetas","Entretenimiento","Otros"]
};

let movimientos  = JSON.parse(localStorage.getItem("movimientos"))  || [];
let presupuestos = JSON.parse(localStorage.getItem("presupuestos")) || {};
let metas        = JSON.parse(localStorage.getItem("metas"))        || [];
let modoActual   = 'personal';
let editandoIndice = null;
let metaAhorroIdx  = null;
let graficoTorta = null, graficoBarras = null, graficoCat = null;

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fecha").value = new Date().toISOString().split("T")[0];
  actualizarCategorias();
  poblarFiltroMeses();
  renderizar();
  renderPresupuesto();
  renderMetas();
});

// ── TABS ──
function cambiarTab(tab, btn) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'inicio') renderizar();
  if (tab === 'presupuesto') renderPresupuesto();
  if (tab === 'metas') renderMetas();
}

// ── MODO ──
function cambiarModo(modo) {
  modoActual = modo;
  document.getElementById('btnPersonal').classList.toggle('active', modo === 'personal');
  document.getElementById('btnLaboral').classList.toggle('active', modo === 'laboral');
  poblarFiltroMeses();
  renderizar();
  renderPresupuesto();
  renderMetas();
}

function perteneceAlModo(m) {
  return (m.entidad || 'personal') === modoActual;
}

// ── CATEGORÍAS ──
function actualizarCategorias() {
  const tipo = document.getElementById("tipo").value;
  const sel  = document.getElementById("categoria");
  sel.innerHTML = "";
  categorias[tipo].forEach(item => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = item;
    sel.appendChild(opt);
  });
}

// ── MOVIMIENTOS ──
function guardarMovimiento() {
  const fecha       = document.getElementById("fecha").value;
  const tipo        = document.getElementById("tipo").value;
  const categoria   = document.getElementById("categoria").value;
  const monto       = Number(document.getElementById("monto").value);
  const descripcion = document.getElementById("descripcion").value.trim();

  if (!monto || monto <= 0) { alert("Ingresá un monto válido."); return; }
  if (!fecha)               { alert("Seleccioná una fecha."); return; }

  const mov = { fecha, tipo, categoria, monto, descripcion, entidad: modoActual };

  if (editandoIndice !== null) {
    movimientos[editandoIndice] = mov;
    editandoIndice = null;
    document.getElementById("btnGuardar").textContent = "💾 Guardar";
    document.getElementById("btnCancelar").style.display = "none";
  } else {
    movimientos.push(mov);
  }

  guardarLS();
  limpiarFormulario();
  poblarFiltroMeses();
  renderizar();
}

function limpiarFormulario() {
  document.getElementById("monto").value = "";
  document.getElementById("descripcion").value = "";
}

function cancelarEdicion() {
  editandoIndice = null;
  document.getElementById("btnGuardar").textContent = "💾 Guardar";
  document.getElementById("btnCancelar").style.display = "none";
  limpiarFormulario();
}

function editarMovimiento(indice) {
  const mov = movimientos[indice];
  editandoIndice = indice;
  document.getElementById("fecha").value       = mov.fecha;
  document.getElementById("tipo").value        = mov.tipo;
  actualizarCategorias();
  document.getElementById("categoria").value   = mov.categoria;
  document.getElementById("monto").value       = mov.monto;
  document.getElementById("descripcion").value = mov.descripcion;
  document.getElementById("btnGuardar").textContent = "✏️ Actualizar";
  document.getElementById("btnCancelar").style.display = "block";
  cambiarTab('movimientos', document.querySelectorAll('.nav-item')[1]);
  setTimeout(() => document.querySelector('.form-card').scrollIntoView({ behavior: "smooth" }), 100);
}

function eliminarMovimiento(indice) {
  if (!confirm("¿Eliminar este movimiento?")) return;
  movimientos.splice(indice, 1);
  if (editandoIndice === indice) cancelarEdicion();
  guardarLS();
  poblarFiltroMeses();
  renderizar();
}

function guardarLS() {
  localStorage.setItem("movimientos",  JSON.stringify(movimientos));
  localStorage.setItem("presupuestos", JSON.stringify(presupuestos));
  localStorage.setItem("metas",        JSON.stringify(metas));
}

// ── FILTRO MESES ──
function poblarFiltroMeses() {
  const sel = document.getElementById("filtroMes");
  const actual = sel.value;
  const meses = new Set();
  movimientos.filter(perteneceAlModo).forEach(m => {
    if (m.fecha && m.fecha.length >= 7) meses.add(m.fecha.slice(0, 7));
  });
  sel.innerHTML = '<option value="">Todos los meses</option>';
  [...meses].sort().reverse().forEach(mes => {
    const [anio, num] = mes.split("-");
    const nombre = new Date(anio, num - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    const opt = document.createElement("option");
    opt.value = mes;
    opt.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    if (mes === actual) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── RENDERIZAR ──
function renderizar() {
  const filtroMes  = document.getElementById("filtroMes").value;
  const filtroTipo = document.getElementById("filtroTipo").value;

  const filtrados = movimientos.filter(m =>
    perteneceAlModo(m) &&
    (!filtroMes  || (m.fecha && m.fecha.startsWith(filtroMes))) &&
    (!filtroTipo || m.tipo === filtroTipo)
  );

  const tabla = document.getElementById("tablaMovimientos");
  tabla.innerHTML = "";

  let ingresos = 0, egresos = 0;
  filtrados.forEach(m => {
    if (m.tipo === "Ingreso") ingresos += m.monto;
    else egresos += m.monto;
  });

  const saldo = ingresos - egresos;
  const saldoEl = document.getElementById("saldoTotal");
  saldoEl.textContent = "$" + saldo.toLocaleString("es-AR");
  saldoEl.className = "amount" + (saldo < 0 ? " negative" : "");
  document.getElementById("totalIngresos").textContent = "$" + ingresos.toLocaleString("es-AR");
  document.getElementById("totalEgresos").textContent  = "$" + egresos.toLocaleString("es-AR");

  const periodoEl = document.getElementById("periodoLabel");
  if (filtroMes) {
    const [a, n] = filtroMes.split("-");
    periodoEl.textContent = new Date(a, n-1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } else {
    periodoEl.textContent = "Todos los períodos";
  }

  const sinMov = document.getElementById("sinMovimientos");
  sinMov.style.display = filtrados.length === 0 ? "block" : "none";

  [...filtrados].reverse().forEach(mov => {
    const idxReal = movimientos.indexOf(mov);
    const fecha = mov.fecha ? new Date(mov.fecha + "T00:00:00").toLocaleDateString("es-AR") : "";
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${fecha}</td>
      <td><span class="badge badge-${mov.tipo.toLowerCase()}">${mov.tipo}</span></td>
      <td>${mov.categoria}</td>
      <td class="monto-${mov.tipo.toLowerCase()}">$${mov.monto.toLocaleString("es-AR")}</td>
      <td style="color:var(--text-3);font-size:0.82rem">${mov.descripcion || "—"}</td>
      <td>
        <button class="btn-accion" onclick="editarMovimiento(${idxReal})">✏️</button>
        <button class="btn-accion" onclick="eliminarMovimiento(${idxReal})">🗑️</button>
      </td>`;
    tabla.appendChild(fila);
  });

  actualizarGraficos(ingresos, egresos, filtrados);
  actualizarResumenCategorias(filtrados);
}

function actualizarResumenCategorias(filtrados) {
  const contenedor = document.getElementById("listaCategorias");
  contenedor.innerHTML = "";
  const resumen = {};
  filtrados.forEach(m => { resumen[m.categoria] = (resumen[m.categoria] || 0) + m.monto; });
  const sorted = Object.entries(resumen).sort((a,b) => b[1]-a[1]);
  if (sorted.length === 0) {
    contenedor.innerHTML = '<div class="cat-row"><span class="cat-name" style="color:var(--text-3)">Sin datos aún</span></div>';
    return;
  }
  sorted.forEach(([cat, total]) => {
    const div = document.createElement("div");
    div.className = "cat-row";
    div.innerHTML = `<span class="cat-name">${cat}</span><span class="cat-amount">$${total.toLocaleString("es-AR")}</span>`;
    contenedor.appendChild(div);
  });
}

// ── GRÁFICOS ──
function actualizarGraficos(ingresos, egresos, filtrados) {
  const tickColor = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
  const gridColor = "rgba(128,128,128,0.1)";

  const ctxT = document.getElementById("graficoTorta").getContext("2d");
  if (graficoTorta) graficoTorta.destroy();
  graficoTorta = new Chart(ctxT, {
    type: "doughnut",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{ data: [ingresos, egresos], backgroundColor: ["#10B981","#EF4444"], borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { color: tickColor, font: { size: 11 }, boxWidth: 12 } } },
      animation: { duration: 400 }
    }
  });

  const resumen = {};
  filtrados.filter(m => m.tipo === "Egreso").forEach(m => {
    resumen[m.categoria] = (resumen[m.categoria] || 0) + m.monto;
  });
  const sorted = Object.entries(resumen).sort((a,b) => b[1]-a[1]).slice(0,5);
  const ctxC = document.getElementById("graficoCat").getContext("2d");
  if (graficoCat) graficoCat.destroy();
  graficoCat = new Chart(ctxC, {
    type: "bar",
    data: {
      labels: sorted.map(e => e[0]),
      datasets: [{ data: sorted.map(e => e[1]), backgroundColor: "#3B82F6", borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } }
      },
      animation: { duration: 400 }
    }
  });

  const hoy = new Date();
  const meses = [], datosIng = [], datosEgr = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const clave = d.toISOString().slice(0, 7);
    meses.push(d.toLocaleDateString("es-AR", { month: "short" }));
    let ing = 0, egr = 0;
    movimientos.filter(perteneceAlModo).forEach(m => {
      if (m.fecha && m.fecha.startsWith(clave)) {
        if (m.tipo === "Ingreso") ing += m.monto; else egr += m.monto;
      }
    });
    datosIng.push(ing); datosEgr.push(egr);
  }
  const ctxB = document.getElementById("graficoBarras").getContext("2d");
  if (graficoBarras) graficoBarras.destroy();
  graficoBarras = new Chart(ctxB, {
    type: "bar",
    data: {
      labels: meses,
      datasets: [
        { label: "Ingresos", data: datosIng, backgroundColor: "#10B981", borderRadius: 4 },
        { label: "Egresos",  data: datosEgr, backgroundColor: "#EF4444", borderRadius: 4 }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { color: tickColor, font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } }
      },
      animation: { duration: 400 }
    }
  });
}

// ── PRESUPUESTO ──
function abrirModalPresupuesto() {
  const sel = document.getElementById("budgetCat");
  sel.innerHTML = "";
  categorias.Egreso.forEach(c => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = c;
    sel.appendChild(opt);
  });
  document.getElementById("budgetMonto").value = "";
  document.getElementById("modalPresupuesto").classList.add("open");
}

function guardarPresupuesto() {
  const cat   = document.getElementById("budgetCat").value;
  const monto = Number(document.getElementById("budgetMonto").value);
  if (!monto || monto <= 0) { alert("Ingresá un monto válido."); return; }
  presupuestos[modoActual + "_" + cat] = monto;
  guardarLS();
  cerrarModales();
  renderPresupuesto();
}

function renderPresupuesto() {
  const mesActual = new Date().toISOString().slice(0, 7);
  const contenedor = document.getElementById("budgetList");
  contenedor.innerHTML = "";
  const keys = Object.keys(presupuestos).filter(k => k.startsWith(modoActual + "_"));

  if (keys.length === 0) {
    contenedor.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:0.88rem">No hay presupuestos definidos aún.</div>';
    return;
  }

  keys.forEach(key => {
    const cat    = key.replace(modoActual + "_", "");
    const limite = presupuestos[key];
    const gastado = movimientos.filter(m =>
      perteneceAlModo(m) && m.tipo === "Egreso" && m.categoria === cat && m.fecha && m.fecha.startsWith(mesActual)
    ).reduce((s, m) => s + m.monto, 0);

    const pct = Math.min((gastado / limite) * 100, 100);
    const claseBar = pct >= 100 ? "progress-over" : pct >= 80 ? "progress-warn" : "progress-ok";

    const div = document.createElement("div");
    div.className = "budget-item";
    div.innerHTML = `
      <div class="budget-header">
        <span class="budget-label">${cat}</span>
        <span class="budget-amounts">$${gastado.toLocaleString("es-AR")} / <span>$${limite.toLocaleString("es-AR")}</span></span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${claseBar}" style="width:${pct}%"></div>
      </div>`;
    contenedor.appendChild(div);
  });
}

// ── METAS ──
function abrirModalMeta() {
  document.getElementById("metaNombre").value   = "";
  document.getElementById("metaObjetivo").value = "";
  document.getElementById("metaAhorrado").value = "";
  document.getElementById("modalMeta").classList.add("open");
}

function guardarMeta() {
  const nombre   = document.getElementById("metaNombre").value.trim();
  const objetivo = Number(document.getElementById("metaObjetivo").value);
  const ahorrado = Number(document.getElementById("metaAhorrado").value) || 0;
  const icono    = document.getElementById("metaIcono").value;

  if (!nombre)             { alert("Ingresá un nombre."); return; }
  if (!objetivo || objetivo <= 0) { alert("Ingresá un objetivo válido."); return; }

  metas.push({ nombre, objetivo, ahorrado, icono, entidad: modoActual });
  guardarLS();
  cerrarModales();
  renderMetas();
}

function abrirModalAhorro(idx) {
  metaAhorroIdx = idx;
  document.getElementById("modalAhorroTitulo").textContent = "Agregar ahorro — " + metas[idx].nombre;
  document.getElementById("ahorroMonto").value = "";
  document.getElementById("modalAhorro").classList.add("open");
}

function confirmarAhorro() {
  const monto = Number(document.getElementById("ahorroMonto").value);
  if (!monto || monto <= 0) { alert("Ingresá un monto válido."); return; }
  metas[metaAhorroIdx].ahorrado += monto;
  guardarLS();
  cerrarModales();
  renderMetas();
}

function eliminarMeta(idx) {
  if (!confirm("¿Eliminar esta meta?")) return;
  metas.splice(idx, 1);
  guardarLS();
  renderMetas();
}

function renderMetas() {
  const grid = document.getElementById("metaGrid");
  grid.innerHTML = "";

  const metasDelModo = metas.map((m, i) => ({ ...m, _idx: i })).filter(m => (m.entidad || 'personal') === modoActual);

  metasDelModo.forEach(m => {
    const pct = Math.min(Math.round((m.ahorrado / m.objetivo) * 100), 100);
    const claseBar = pct >= 100 ? "progress-over" : pct >= 60 ? "progress-warn" : "progress-ok";
    const card = document.createElement("div");
    card.className = "meta-card";
    card.innerHTML = `
      <div class="meta-icon">${m.icono}</div>
      <div class="meta-name">${m.nombre}</div>
      <div class="meta-amounts">$<span>${m.ahorrado.toLocaleString("es-AR")}</span> de $${m.objetivo.toLocaleString("es-AR")}</div>
      <div class="progress-bar" style="margin-bottom:6px">
        <div class="progress-fill ${claseBar}" style="width:${pct}%"></div>
      </div>
      <div class="meta-pct">${pct}%</div>
      <div class="meta-actions">
        <button class="btn-meta-add" onclick="abrirModalAhorro(${m._idx})">+ Agregar ahorro</button>
        <button class="btn-meta-del" onclick="eliminarMeta(${m._idx})">🗑️</button>
      </div>`;
    grid.appendChild(card);
  });

  const btnAdd = document.createElement("button");
  btnAdd.className = "btn-add-meta";
  btnAdd.textContent = "+ Nueva meta";
  btnAdd.onclick = abrirModalMeta;
  if (metasDelModo.length > 0) btnAdd.style.gridColumn = "1 / -1";
  grid.appendChild(btnAdd);
}

// ── MODALES ──
function cerrarModales() {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
}
document.querySelectorAll(".modal-overlay").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) cerrarModales(); });
});

// ── UTILS ──
function exportarCSV() {
  if (movimientos.length === 0) { alert("No hay movimientos para exportar."); return; }
  const enc = ["Fecha","Tipo","Categoría","Monto","Descripción","Entidad"];
  const filas = movimientos.map(m => [m.fecha, m.tipo, m.categoria, m.monto, m.descripcion || "", m.entidad || "personal"]);
  const csv = [enc, ...filas].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `finanzas-${modoActual}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function resetearFecha() {
  document.getElementById("fecha").value = new Date().toISOString().split("T")[0];
}
