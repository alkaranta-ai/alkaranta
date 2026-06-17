const categorias = {
  Ingreso: ["Sueldo","Horas Extras","Comisiones","Ventas","Honorarios","Inversiones","Otros"],
  Egreso:  ["Supermercado","Combustible","Servicios","Internet","Telefonía","Salud","Educación","Impuestos","Tarjetas","Entretenimiento","Otros"]
};

let movimientos = JSON.parse(localStorage.getItem("movimientos")) || [];
let modoActual = 'personal';

function cambiarModo(modo) {
  modoActual = modo;
  document.getElementById('btnPersonal').style.backgroundColor = modo === 'personal' ? '#3498db' : '#bdc3c7';
  document.getElementById('btnLaboral').style.backgroundColor = modo === 'laboral' ? '#3498db' : '#bdc3c7';
  renderizar();
}

let editandoIndice = null;
let graficoTorta  = null;
let graficoBarras = null;

document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fecha").value = hoy;
  actualizarCategorias();
  poblarFiltroMeses();
  renderizar();
});

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

// Función auxiliar para saber si un movimiento pertenece al modo actual
function perteneceAlModo(m) {
  const entidad = m.entidad || 'personal';
  return entidad === modoActual;
}

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
    document.getElementById("tituloFormulario").textContent = "Nuevo Movimiento";
    document.getElementById("btnGuardar").textContent = "💾 Guardar Movimiento";
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
  document.getElementById("tituloFormulario").textContent = "Nuevo Movimiento";
  document.getElementById("btnGuardar").textContent = "💾 Guardar Movimiento";
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
  document.getElementById("tituloFormulario").textContent = "Editar Movimiento";
  document.getElementById("btnGuardar").textContent = "✏️ Actualizar";
  document.getElementById("btnCancelar").style.display = "inline-block";
  document.querySelector(".formulario").scrollIntoView({ behavior: "smooth" });
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
  localStorage.setItem("movimientos", JSON.stringify(movimientos));
}

function poblarFiltroMeses() {
  const sel = document.getElementById("filtroMes");
  const actual = sel.value;
  const meses = new Set();
  // Solo consideramos los meses de los movimientos que pertenecen al modo actual
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

function renderizar() {
  const filtroMes  = document.getElementById("filtroMes").value;
  const filtroTipo = document.getElementById("filtroTipo").value;

  const filtrados = movimientos.filter(m => {
    return perteneceAlModo(m) && 
           (!filtroMes || (m.fecha && m.fecha.startsWith(filtroMes))) && 
           (!filtroTipo || m.tipo === filtroTipo);
  });

  const tabla = document.getElementById("tablaMovimientos");
  tabla.innerHTML = "";

  let ingresos = 0, egresos = 0;
  filtrados.forEach(m => {
    if (m.tipo === "Ingreso") ingresos += m.monto;
    else                      egresos  += m.monto;
  });

  document.getElementById("totalIngresos").textContent = "$" + ingresos.toLocaleString("es-AR");
  document.getElementById("totalEgresos").textContent  = "$" + egresos.toLocaleString("es-AR");
  document.getElementById("saldoTotal").textContent    = "$" + (ingresos - egresos).toLocaleString("es-AR");
  document.getElementById("saldoTotal").style.color = (ingresos - egresos) < 0 ? "#e74c3c" : "#27ae60";

  const sinMov = document.getElementById("sinMovimientos");
  if (filtrados.length === 0) {
    sinMov.style.display = "block";
  } else {
    sinMov.style.display = "none";
    filtrados.forEach(mov => {
      const idxReal = movimientos.indexOf(mov);
      const fecha = mov.fecha ? new Date(mov.fecha + "T00:00:00").toLocaleDateString("es-AR") : "";
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${fecha}</td>
        <td><span class="badge badge-${mov.tipo.toLowerCase()}">${mov.tipo}</span></td>
        <td>${mov.categoria}</td>
        <td class="monto-${mov.tipo.toLowerCase()}">$${mov.monto.toLocaleString("es-AR")}</td>
        <td style="color:#888;font-size:0.85rem">${mov.descripcion || "—"}</td>
        <td>
          <button class="btn-accion" onclick="editarMovimiento(${idxReal})" title="Editar">✏️</button>
          <button class="btn-accion" onclick="eliminarMovimiento(${idxReal})" title="🗑️">🗑️</button>
        </td>
      `;
      tabla.appendChild(fila);
    });
  }
  actualizarGraficos(ingresos, egresos);
}

function actualizarGraficos(ingresos, egresos) {
  const ctxTorta = document.getElementById("graficoTorta").getContext("2d");
  if (graficoTorta) graficoTorta.destroy();
  graficoTorta = new Chart(ctxTorta, {
    type: "doughnut",
    data: {
      labels: ["Ingresos", "Egresos"],
      datasets: [{ data: [ingresos, egresos], backgroundColor: ["#2196f3", "#e74c3c"], borderWidth: 0, hoverOffset: 6 }]
    },
    options: { cutout: "65%", plugins: { legend: { position: "bottom" } }, animation: { duration: 500 } }
  });

  const ctxBarras = document.getElementById("graficoBarras").getContext("2d");
  if (graficoBarras) graficoBarras.destroy();

  const hoy = new Date();
  const meses = [], datosIng = [], datosEgr = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const clave = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
    meses.push(label);
    let ing = 0, egr = 0;
    movimientos.filter(perteneceAlModo).forEach(m => {
      if (m.fecha && m.fecha.startsWith(clave)) {
        if (m.tipo === "Ingreso") ing += m.monto;
        else egr += m.monto;
      }
    });
    datosIng.push(ing);
    datosEgr.push(egr);
  }

  graficoBarras = new Chart(ctxBarras, {
    type: "bar",
    data: {
      labels: meses,
      datasets: [
        { label: "Ingresos", data: datosIng, backgroundColor: "#2196f3", borderRadius: 6 },
        { label: "Egresos",  data: datosEgr, backgroundColor: "#e74c3c", borderRadius: 6 }
      ]
    },
    options: { plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
  });
}

function exportarCSV() {
  if (movimientos.length === 0) { alert("No hay movimientos para exportar."); return; }
  const encabezado = ["Fecha","Tipo","Categoría","Monto","Descripción", "Entidad"];
  const filas = movimientos.map(m => [m.fecha, m.tipo, m.categoria, m.monto, m.descripcion || "", m.entidad || "personal"]);
  const csv = [encabezado, ...filas].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `finanzas-${modoActual}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function resetearFecha() {
  document.getElementById("fecha").value = new Date().toISOString().split("T")[0];
}
