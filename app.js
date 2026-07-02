var categorias = {
  Ingreso: [
    "Sueldo",
    "Horas Extras",
    "Comisiones",
    "Ventas",
    "Honorarios",
    "Freelance",
    "Inversiones",
    "Alquiler Cobrado",
    "Reintegros",
    "Regalos",
    "Bono / Aguinaldo",
    "Préstamo Recibido",
    "Reembolso",
    "Herencia",
    "Premio / Sorteo",
    "Venta de Activos",
    "Dividendos",
    "Propinas",
    "Subsidio / Ayuda",
    "Otros"
  ],
  Egreso: [
    "Supermercado",
    "Combustible",
    "Servicios",
    "Internet",
    "Telefonía",
    "Salud",
    "Educación",
    "Impuestos",
    "Tarjetas",
    "Entretenimiento",
    "Alquiler/Expensas",
    "Indumentaria",
    "Mascotas",
    "Hogar/Mantenimiento",
    "Viajes",
    "Regalos",
    "Transporte",
    "Seguros",
    "Suscripciones",
    "Restaurantes/Delivery",
    "Cuidado Personal",
    "Deportes/Gimnasio",
    "Cultura/Libros",
    "Auto/Vehículo",
    "Ferretería/Bricolaje",
    "Donaciones",
    "Préstamos Otorgados",
    "Multas",
    "Farmacia",
    "Otros"
  ]
};

// Los datos ahora viven en Firestore (colección "users", un documento por uid).
// Estas variables se completan cuando llega la primera respuesta del servidor,
// ver suscribirDatos() en la parte de abajo del archivo.
var movimientos  = [];
var presupuestos = {};
var metas        = [];
var logrosDesbloqueados = [];

var modoActual   = 'personal';
var editandoIdx  = null;
var metaAhorroIdx = null;
var appIniciada  = false;
var guardando    = false;

// ---------------------------------------------------------------
// Sincronización con Firestore
// ---------------------------------------------------------------

function suscribirDatos(uid) {
  var ref = db.collection("users").doc(uid);
  unsubscribeSnapshot = ref.onSnapshot(function(snap) {
    var data = snap.exists ? snap.data() : {};
    movimientos = data.movimientos || [];
    presupuestos = data.presupuestos || {};
    metas = data.metas || [];
    logrosDesbloqueados = data.logros || [];

    if (!appIniciada) {
      appIniciada = true;
      inicializarUI();
    } else {
      // Actualización en vivo (por ejemplo, desde otro dispositivo): re-renderizamos.
      poblarFiltroMeses();
      renderizar();
      renderPresupuesto();
      renderMetas();
      renderLogros();
    }
  }, function(err) {
    console.error("Error de sincronización:", err);
  });
}

function guardarDatos() {
  if (!currentUser) return Promise.resolve();
  guardando = true;
  return db.collection("users").doc(currentUser.uid).set({
    movimientos: movimientos,
    presupuestos: presupuestos,
    metas: metas,
    logros: logrosDesbloqueados
  }, { merge: true }).catch(function(err) {
    console.error("No se pudo guardar en la nube:", err);
    alert("No se pudo guardar. Revisá tu conexión a internet.");
  }).finally(function() { guardando = false; });
}

function inicializarUI() {
  document.getElementById("fecha").value = new Date().toISOString().split("T")[0];
  actualizarCategorias();
  poblarFiltroMeses();
  renderizar();
  renderPresupuesto();
  renderMetas();
  renderLogros();
  document.querySelectorAll(".overlay").forEach(function(m) {
    m.addEventListener("click", function(e) { if (e.target === m) cerrarModales(); });
  });
}

// ---------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------

function cambiarTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('sec-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'inicio')        { renderizar(); }
  if (tab === 'movimientos')   { poblarFiltroMeses(); renderizar(); }
  if (tab === 'presupuesto')   { renderPresupuesto(); }
  if (tab === 'metas')         { renderMetas(); }
  if (tab === 'logros')        { renderLogros(); }
}

function cambiarModo(modo) {
  modoActual = modo;
  document.getElementById('btnPersonal').classList.toggle('active', modo === 'personal');
  document.getElementById('btnLaboral').classList.toggle('active', modo === 'laboral');
  cancelarEdicion();
  poblarFiltroMeses();
  renderizar();
  renderPresupuesto();
  renderMetas();
  renderLogros();
}

function pertenece(m) { return (m.entidad || 'personal') === modoActual; }

function actualizarCategorias() {
  var tipo = document.getElementById("tipo").value;
  var sel  = document.getElementById("categoria");
  sel.innerHTML = "";
  categorias[tipo].forEach(function(c) {
    var o = document.createElement("option");
    o.value = o.textContent = c;
    sel.appendChild(o);
  });
}

// ---------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------

function guardarMovimiento() {
  var fecha       = document.getElementById("fecha").value;
  var tipo        = document.getElementById("tipo").value;
  var categoria   = document.getElementById("categoria").value;
  var monto       = Number(document.getElementById("monto").value);
  var descripcion = document.getElementById("descripcion").value.trim();
  if (!monto || monto <= 0) { alert("Ingresá un monto válido."); return; }
  if (!fecha) { alert("Seleccioná una fecha."); return; }
  var mov = { fecha: fecha, tipo: tipo, categoria: categoria, monto: monto, descripcion: descripcion, entidad: modoActual };
  if (editandoIdx !== null) {
    movimientos[editandoIdx] = mov;
    editandoIdx = null;
    document.getElementById("btnGuardar").textContent = "Guardar";
    document.getElementById("btnCancelar").style.display = "none";
  } else {
    movimientos.push(mov);
  }
  guardarDatos(); limpiar(); poblarFiltroMeses(); renderizar(); renderPresupuesto();
  checkLogros();
}

function limpiar() {
  document.getElementById("monto").value = "";
  document.getElementById("descripcion").value = "";
}

function cancelarEdicion() {
  editandoIdx = null;
  document.getElementById("btnGuardar").textContent = "Guardar";
  document.getElementById("btnCancelar").style.display = "none";
  limpiar();
}

function editarMovimiento(i) {
  var m = movimientos[i];
  if (!m) return;
  editandoIdx = i;
  document.getElementById("fecha").value       = m.fecha;
  document.getElementById("tipo").value        = m.tipo;
  actualizarCategorias();
  document.getElementById("categoria").value   = m.categoria;
  document.getElementById("monto").value       = m.monto;
  document.getElementById("descripcion").value = m.descripcion || "";
  document.getElementById("btnGuardar").textContent = "Actualizar";
  document.getElementById("btnCancelar").style.display = "block";
  cambiarTab('movimientos', document.querySelectorAll('.nav-btn')[1]);
  setTimeout(function() { document.querySelector('.form-card').scrollIntoView({ behavior: "smooth" }); }, 100);
}

function eliminarMovimiento(i) {
  if (!confirm("¿Eliminar este movimiento?")) return;
  if (editandoIdx !== null) {
    if (editandoIdx === i) cancelarEdicion();
    else if (editandoIdx > i) editandoIdx--;
  }
  movimientos.splice(i, 1);
  guardarDatos(); poblarFiltroMeses(); renderizar(); renderPresupuesto();
  checkLogros();
}

function poblarFiltroMeses() {
  var sel = document.getElementById("filtroMes");
  var actual = sel.value;
  var meses = {};
  movimientos.filter(pertenece).forEach(function(m) {
    if (m.fecha && m.fecha.length >= 7) meses[m.fecha.slice(0, 7)] = true;
  });
  sel.innerHTML = '<option value="">Todos los meses</option>';
  Object.keys(meses).sort().reverse().forEach(function(mes) {
    var parts = mes.split("-");
    var nombre = new Date(parts[0], parts[1] - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    var o = document.createElement("option");
    o.value = mes;
    o.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    if (mes === actual) o.selected = true;
    sel.appendChild(o);
  });
}

function renderizar() {
  var filtroMes  = document.getElementById("filtroMes").value;
  var filtroTipo = document.getElementById("filtroTipo").value;
  var filtrados = movimientos.filter(function(m) {
    return pertenece(m) &&
      (!filtroMes  || (m.fecha && m.fecha.startsWith(filtroMes))) &&
      (!filtroTipo || m.tipo === filtroTipo);
  });

  var ingresos = 0, egresos = 0;
  filtrados.forEach(function(m) { if (m.tipo === "Ingreso") ingresos += m.monto; else egresos += m.monto; });

  var saldo = ingresos - egresos;
  var sEl = document.getElementById("saldoTotal");
  sEl.textContent = "$" + saldo.toLocaleString("es-AR");
  sEl.className = "hero-amount" + (saldo < 0 ? " negative" : "");
  document.getElementById("totalIngresos").textContent = "$" + ingresos.toLocaleString("es-AR");
  document.getElementById("totalEgresos").textContent  = "$" + egresos.toLocaleString("es-AR");

  if (filtroMes) {
    var parts = filtroMes.split("-");
    document.getElementById("periodoLabel").textContent =
      new Date(parts[0], parts[1] - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } else {
    document.getElementById("periodoLabel").textContent = "Todos los períodos";
  }

  var lista = document.getElementById("listaMovimientos");
  lista.className = "list-group glass";
  lista.innerHTML = "";

  if (filtrados.length === 0) {
    lista.innerHTML = '<div class="empty"><span class="empty-icon">📭</span>Sin movimientos para mostrar.</div>';
  } else {
    filtrados.slice().reverse().forEach(function(mov) {
      var idx = movimientos.indexOf(mov);
      var fecha = mov.fecha
        ? new Date(mov.fecha + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })
        : "";
      var isIng = mov.tipo === "Ingreso";
      var row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML =
        '<div class="list-row-left">' +
          '<div class="list-icon ' + (isIng ? 'ing' : 'egr') + '">' + (isIng ? '↑' : '↓') + '</div>' +
          '<div>' +
            '<div class="list-title">' + mov.categoria + '</div>' +
            '<div class="list-sub">' + (mov.descripcion || mov.tipo) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="list-right">' +
          '<div class="list-amount ' + (isIng ? 'ing' : 'egr') + '">' + (isIng ? '+' : '-') + '$' + mov.monto.toLocaleString("es-AR") + '</div>' +
          '<div class="list-date">' + fecha + '</div>' +
        '</div>' +
        '<div class="list-actions">' +
          '<button class="btn-row-action" onclick="editarMovimiento(' + idx + ')">✏️</button>' +
          '<button class="btn-row-action" onclick="eliminarMovimiento(' + idx + ')">🗑️</button>' +
        '</div>';
      lista.appendChild(row);
    });
  }

  actualizarCategoriasList(filtrados);
  renderDashboard(ingresos, egresos, filtrados, filtroMes);
}

function actualizarCategoriasList(filtrados) {
  var cont = document.getElementById("listaCategorias");
  cont.className = "list-group glass";
  cont.innerHTML = "";
  var res = {};
  filtrados.forEach(function(m) { res[m.categoria] = (res[m.categoria] || 0) + m.monto; });
  var sorted = Object.entries(res).sort(function(a, b) { return b[1] - a[1]; });
  if (sorted.length === 0) {
    cont.innerHTML = '<div class="empty"><span class="empty-icon">📊</span>Sin datos aún.</div>';
    return;
  }
  var maxVal = sorted[0][1];
  sorted.forEach(function(entry) {
    var cat = entry[0], total = entry[1];
    var pct = Math.round((total / maxVal) * 100);
    var isEgreso = filtrados.some(function(m) { return m.categoria === cat && m.tipo === "Egreso"; });
    var color = isEgreso ? "var(--red)" : "var(--emerald)";
    var row = document.createElement("div");
    row.className = "list-row";
    row.style.flexDirection = "column";
    row.style.alignItems = "stretch";
    row.style.gap = "6px";
    row.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
        '<span style="color:var(--text-1);font-size:15px;font-weight:500">' + cat + '</span>' +
        '<span style="font-size:15px;font-weight:600;color:var(--text-1)">$' + total.toLocaleString("es-AR") + '</span>' +
      '</div>' +
      '<div class="prog-bar"><div class="prog-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    cont.appendChild(row);
  });
}

function diasEnPeriodo(filtroMes, filtrados) {
  if (filtroMes) {
    var parts = filtroMes.split("-").map(Number);
    return new Date(parts[0], parts[1], 0).getDate();
  }
  var fechas = filtrados.map(function(m) { return m.fecha; }).filter(Boolean).sort();
  if (fechas.length === 0) return 1;
  var ini = new Date(fechas[0] + "T00:00:00");
  var fin = new Date(fechas[fechas.length - 1] + "T00:00:00");
  return Math.max(Math.round((fin - ini) / 86400000) + 1, 1);
}

function renderDashboard(ingresos, egresos, filtrados, filtroMes) {
  var total = ingresos + egresos;
  var pctIng = total > 0 ? Math.round((ingresos / total) * 100) : 50;
  var pctEgr = 100 - pctIng;
  document.getElementById("balBarIng").style.width = pctIng + "%";
  document.getElementById("balBarEgr").style.width = pctEgr + "%";
  document.getElementById("balPctIng").textContent = pctIng + "%";
  document.getElementById("balPctEgr").textContent = pctEgr + "%";
  var tasa = ingresos > 0 ? Math.round(((ingresos - egresos) / ingresos) * 100) : 0;
  var tasaEl = document.getElementById("kpiTasa");
  tasaEl.textContent = tasa + "%";
  tasaEl.classList.toggle("kpi-neg", tasa < 0);
  var porCat = {};
  filtrados.filter(function(m) { return m.tipo === "Egreso"; }).forEach(function(m) {
    porCat[m.categoria] = (porCat[m.categoria] || 0) + m.monto;
  });
  var topCat = Object.entries(porCat).sort(function(a, b) { return b[1] - a[1]; })[0];
  document.getElementById("kpiTopCat").textContent = topCat ? topCat[0] : "—";
  document.getElementById("kpiTopCatMonto").textContent = topCat ? "$" + topCat[1].toLocaleString("es-AR") : "$0";
  var dias = diasEnPeriodo(filtroMes, filtrados);
  var promedio = Math.round(egresos / dias);
  document.getElementById("kpiPromedio").textContent = "$" + promedio.toLocaleString("es-AR");
  document.getElementById("kpiMovs").textContent = filtrados.length;
}

function explicarTasaAhorro() {
  alert(
    "¿Cómo se calcula la tasa de ahorro?\n\n" +
    "Es automática: (Ingresos − Egresos) / Ingresos del período que estés viendo.\n\n" +
    "Para que sea correcta, registrá tus ingresos y egresos en 'Movimientos'.\n\n" +
    "Si querés guardar para un objetivo (vacaciones, auto, etc.), usá la pestaña 'Metas'."
  );
}

// ---------------------------------------------------------------
// Presupuesto
// ---------------------------------------------------------------

function abrirModalPresupuesto() {
  var sel = document.getElementById("budgetCat");
  sel.innerHTML = "";
  var usadas = {};
  Object.keys(presupuestos).filter(function(k) { return k.startsWith(modoActual + "_"); }).forEach(function(k) {
    usadas[k.replace(modoActual + "_", "")] = true;
  });
  categorias.Egreso.forEach(function(c) {
    if (usadas[c]) return;
    var o = document.createElement("option");
    o.value = o.textContent = c;
    sel.appendChild(o);
  });
  if (sel.options.length === 0) {
    alert("Ya tenés presupuestos en todas las categorías. Eliminá uno antes de agregar otro.");
    return;
  }
  document.getElementById("budgetMonto").value = "";
  document.getElementById("modalPresupuesto").classList.add("open");
}

function guardarPresupuesto() {
  var cat   = document.getElementById("budgetCat").value;
  var monto = Number(document.getElementById("budgetMonto").value);
  if (!monto || monto <= 0) { alert("Ingresá un monto válido."); return; }
  presupuestos[modoActual + "_" + cat] = monto;
  guardarDatos(); cerrarModales(); renderPresupuesto();
  checkLogros();
}

function eliminarPresupuesto(key) {
  var cat = key.replace(modoActual + "_", "");
  if (!confirm("¿Eliminar el presupuesto de \"" + cat + "\"?")) return;
  delete presupuestos[key];
  guardarDatos(); renderPresupuesto();
  checkLogros();
}

function renderPresupuesto() {
  var filtroMes = document.getElementById("filtroMes") ? document.getElementById("filtroMes").value : "";
  var mes = filtroMes || new Date().toISOString().slice(0, 7);
  var cont = document.getElementById("budgetList");
  cont.className = "list-group glass";
  cont.innerHTML = "";
  var keys = Object.keys(presupuestos).filter(function(k) { return k.startsWith(modoActual + "_"); });
  if (keys.length === 0) {
    cont.innerHTML = '<div class="empty"><span class="empty-icon">🎯</span>No hay presupuestos aún.</div>';
    return;
  }
  var totalLimite = 0, totalGastado = 0;
  keys.forEach(function(key) {
    var cat     = key.replace(modoActual + "_", "");
    var limite  = presupuestos[key];
    var gastado = movimientos
      .filter(function(m) { return pertenece(m) && m.tipo === "Egreso" && m.categoria === cat && m.fecha && m.fecha.startsWith(mes); })
      .reduce(function(s, m) { return s + m.monto; }, 0);
    var pct = Math.min((gastado / limite) * 100, 100);
    var cls = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
    totalLimite  += limite;
    totalGastado += gastado;
    var div = document.createElement("div");
    div.className = "budget-row";
    div.innerHTML =
      '<div class="budget-head">' +
        '<span class="budget-name">' + cat + '</span>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span class="budget-nums">$' + gastado.toLocaleString("es-AR") + ' / <b>$' + limite.toLocaleString("es-AR") + '</b></span>' +
          '<button class="btn-row-action" onclick="eliminarPresupuesto(\'' + key + '\')" title="Eliminar" style="padding:3px 7px;font-size:11px">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="prog-bar"><div class="prog-fill ' + cls + '" style="width:' + pct + '%"></div></div>';
    cont.appendChild(div);
  });
  if (keys.length > 1) {
    var totalPct = Math.min((totalGastado / totalLimite) * 100, 100);
    var totalCls = totalPct >= 100 ? "over" : totalPct >= 80 ? "warn" : "ok";
    var totalDiv = document.createElement("div");
    totalDiv.className = "budget-row";
    totalDiv.style.background = "var(--surface-2)";
    totalDiv.style.fontWeight = "600";
    totalDiv.innerHTML =
      '<div class="budget-head">' +
        '<span class="budget-name">Total</span>' +
        '<span class="budget-nums">$' + totalGastado.toLocaleString("es-AR") + ' / <b>$' + totalLimite.toLocaleString("es-AR") + '</b></span>' +
      '</div>' +
      '<div class="prog-bar"><div class="prog-fill ' + totalCls + '" style="width:' + totalPct + '%"></div></div>';
    cont.appendChild(totalDiv);
  }
}

// ---------------------------------------------------------------
// Metas
// ---------------------------------------------------------------

function abrirModalMeta() {
  ["metaNombre", "metaObjetivo", "metaAhorrado"].forEach(function(id) { document.getElementById(id).value = ""; });
  document.getElementById("modalMeta").classList.add("open");
}

function guardarMeta() {
  var nombre   = document.getElementById("metaNombre").value.trim();
  var objetivo = Number(document.getElementById("metaObjetivo").value);
  var ahorrado = Number(document.getElementById("metaAhorrado").value) || 0;
  var icono    = document.getElementById("metaIcono").value;
  if (!nombre) { alert("Ingresá un nombre."); return; }
  if (!objetivo || objetivo <= 0) { alert("Ingresá un objetivo válido."); return; }
  metas.push({ nombre: nombre, objetivo: objetivo, ahorrado: ahorrado, icono: icono, entidad: modoActual });
  guardarDatos(); cerrarModales(); renderMetas();
  checkLogros();
}

function abrirModalAhorro(idx) {
  metaAhorroIdx = idx;
  document.getElementById("modalAhorroTitulo").textContent = metas[idx].nombre;
  document.getElementById("ahorroMonto").value = "";
  document.getElementById("modalAhorro").classList.add("open");
}

function confirmarAhorro() {
  var monto = Number(document.getElementById("ahorroMonto").value);
  if (!monto || monto <= 0) { alert("Ingresá un monto válido."); return; }
  metas[metaAhorroIdx].ahorrado += monto;
  guardarDatos(); cerrarModales(); renderMetas();
  checkLogros();
}

function eliminarMeta(idx) {
  if (!confirm("¿Eliminar esta meta?")) return;
  metas.splice(idx, 1);
  guardarDatos(); renderMetas();
  checkLogros();
}

function renderMetas() {
  var grid = document.getElementById("metaGrid");
  grid.innerHTML = "";
  var del = [];
  metas.forEach(function(m, i) {
    if ((m.entidad || 'personal') === modoActual) del.push({ nombre: m.nombre, objetivo: m.objetivo, ahorrado: m.ahorrado, icono: m.icono, _i: i });
  });
  if (del.length === 0) {
    var empty = document.createElement("div");
    empty.style.gridColumn = "1/-1";
    empty.className = "empty";
    empty.innerHTML = '<span class="empty-icon">⭐</span>Todavía no tenés metas. Creá la primera.';
    grid.appendChild(empty);
  }
  del.forEach(function(m) {
    var pct = Math.min(Math.round((m.ahorrado / m.objetivo) * 100), 100);
    var cls = pct >= 100 ? "over" : pct >= 60 ? "warn" : "ok";
    var card = document.createElement("div");
    card.className = "meta-card glass";
    card.innerHTML =
      '<span class="meta-emoji">' + m.icono + '</span>' +
      '<div class="meta-name">' + m.nombre + '</div>' +
      '<div class="meta-sub">$<b>' + m.ahorrado.toLocaleString("es-AR") + '</b> de $' + m.objetivo.toLocaleString("es-AR") + '</div>' +
      '<div class="prog-bar"><div class="prog-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
      '<div class="meta-pct">' + pct + '%</div>' +
      '<div class="meta-btns">' +
        '<button class="btn-meta-plus" onclick="abrirModalAhorro(' + m._i + ')">+ Agregar</button>' +
        '<button class="btn-meta-del" onclick="eliminarMeta(' + m._i + ')">🗑️</button>' +
      '</div>';
    grid.appendChild(card);
  });
  var btnNew = document.createElement("button");
  btnNew.className = "btn-add-meta";
  btnNew.textContent = "+ Nueva meta";
  btnNew.onclick = abrirModalMeta;
  grid.appendChild(btnNew);
}

function cerrarModales() {
  document.querySelectorAll(".overlay").forEach(function(m) {
    m.classList.remove("open");
    m.style.top = '';
    m.style.height = '';
  });
}

function exportarCSV() {
  var del = movimientos.filter(pertenece);
  if (del.length === 0) { alert("No hay movimientos para exportar."); return; }
  var enc  = ["Fecha", "Tipo", "Categoría", "Monto", "Descripción"];
  var filas = del.map(function(m) { return [m.fecha, m.tipo, m.categoria, m.monto, m.descripcion || ""]; });
  var csv = [enc].concat(filas).map(function(r) {
    return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\n");
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = "finanzas-" + modoActual + "-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
  checkLogros();
}

function resetearFecha() {
  document.getElementById("fecha").value = new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------
// Logros
// ---------------------------------------------------------------

var LOGROS_DEF = [
  { id: 'primer_mov',    emoji: '🎬', nombre: 'Primer paso',       desc: 'Registra tu primer movimiento' },
  { id: 'primer_ing',    emoji: '💰', nombre: 'Primer ingreso',    desc: 'Registra tu primer ingreso' },
  { id: 'primer_egr',    emoji: '🛒', nombre: 'Primer gasto',      desc: 'Registra tu primer egreso' },
  { id: 'mov_10',        emoji: '📊', nombre: 'Diez movimientos',  desc: 'Alcanzá 10 movimientos' },
  { id: 'mov_50',        emoji: '🚀', nombre: 'Cincuenta',         desc: 'Alcanzá 50 movimientos' },
  { id: 'mov_100',       emoji: '💎', nombre: 'Cien movimientos',  desc: 'Alcanzá 100 movimientos' },
  { id: 'primer_pres',   emoji: '🎯', nombre: 'Presupuestador',    desc: 'Creá tu primer presupuesto' },
  { id: 'pres_3',        emoji: '🧠', nombre: 'Organizado',        desc: 'Creá presupuestos en 3 categorías' },
  { id: 'primer_meta',   emoji: '⭐', nombre: 'Soñador',           desc: 'Creá tu primera meta de ahorro' },
  { id: 'meta_cumplida', emoji: '🏆', nombre: 'Meta cumplida',     desc: 'Completá una meta al 100%' },
  { id: 'ahorro_30',     emoji: '📈', nombre: 'Ahorrador',         desc: 'Tasa de ahorro mayor al 30% en algún mes' },
  { id: 'ahorro_50',     emoji: '💎', nombre: 'Súper ahorrador',   desc: 'Tasa de ahorro mayor al 50% en algún mes' },
  { id: 'meses_3',       emoji: '📅', nombre: 'Constancia',        desc: 'Registra movimientos en 3 meses distintos' },
  { id: 'cats_5',        emoji: '🏷️', nombre: 'Explorador',        desc: 'Usá 5 categorías de gasto distintas' },
  { id: 'exportar',      emoji: '📤', nombre: 'Exportador',        desc: 'Exportá tus datos a CSV' }
];

function checkLogros() {
  var delModo = movimientos.filter(pertenece);
  var ahora = [];

  if (delModo.length >= 1) ahora.push('primer_mov');
  if (delModo.some(function(m) { return m.tipo === 'Ingreso'; })) ahora.push('primer_ing');
  if (delModo.some(function(m) { return m.tipo === 'Egreso'; })) ahora.push('primer_egr');
  if (delModo.length >= 10) ahora.push('mov_10');
  if (delModo.length >= 50) ahora.push('mov_50');
  if (delModo.length >= 100) ahora.push('mov_100');

  var totalPres = Object.keys(presupuestos).filter(function(k) { return k.startsWith(modoActual + "_"); }).length;
  if (totalPres >= 1) ahora.push('primer_pres');
  if (totalPres >= 3) ahora.push('pres_3');

  var delMetas = metas.filter(function(m) { return (m.entidad || 'personal') === modoActual; });
  if (delMetas.length >= 1) ahora.push('primer_meta');
  if (delMetas.some(function(m) { return m.ahorrado >= m.objetivo; })) ahora.push('meta_cumplida');

  var mesesSet = {};
  delModo.forEach(function(m) { if (m.fecha && m.fecha.length >= 7) mesesSet[m.fecha.slice(0, 7)] = true; });
  Object.keys(mesesSet).forEach(function(mes) {
    var delMes = delModo.filter(function(m) { return m.fecha && m.fecha.startsWith(mes); });
    var ing = delMes.filter(function(m) { return m.tipo === 'Ingreso'; }).reduce(function(s, m) { return s + m.monto; }, 0);
    var egr = delMes.filter(function(m) { return m.tipo === 'Egreso'; }).reduce(function(s, m) { return s + m.monto; }, 0);
    if (ing > 0) {
      var tasa = ((ing - egr) / ing) * 100;
      if (tasa >= 30) ahora.push('ahorro_30');
      if (tasa >= 50) ahora.push('ahorro_50');
    }
  });

  if (Object.keys(mesesSet).length >= 3) ahora.push('meses_3');

  var catsEgr = {};
  delModo.filter(function(m) { return m.tipo === 'Egreso'; }).forEach(function(m) { catsEgr[m.categoria] = true; });
  if (Object.keys(catsEgr).length >= 5) ahora.push('cats_5');

  var cambio = JSON.stringify(logrosDesbloqueados) !== JSON.stringify(ahora);
  logrosDesbloqueados = ahora;
  if (cambio) { guardarDatos(); renderLogros(); }
  return cambio;
}

function renderLogros() {
  var grid = document.getElementById("logrosGrid");
  grid.innerHTML = "";
  var total = LOGROS_DEF.length;
  var completados = 0;

  LOGROS_DEF.forEach(function(logro) {
    var unlocked = logrosDesbloqueados.indexOf(logro.id) !== -1;
    if (unlocked) completados++;
    var card = document.createElement("div");
    card.className = "logro-card glass" + (unlocked ? "" : " locked");
    card.innerHTML =
      '<span class="logro-emoji">' + logro.emoji + '</span>' +
      '<div class="logro-name">' + logro.nombre + '</div>' +
      '<div class="logro-desc">' + logro.desc + '</div>' +
      (unlocked ? '<div class="logro-check">✓</div>' : '');
    grid.appendChild(card);
  });

  document.getElementById("logrosCount").textContent = completados + " / " + total;
  document.getElementById("logrosBar").style.width = (total > 0 ? Math.round((completados / total) * 100) : 0) + "%";
}
