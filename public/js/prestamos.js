let solicitanteSeleccionado = null;
let ejemplarSeleccionado = null;

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getDiasPrestamo() {
  return 7;
}

async function buscarSolicitante() {
  const cedula = document.getElementById('inputCedula').value.trim();
  if (!cedula) return;

  const res = await fetch('/api/solicitantes/prestamo?cedula=' + encodeURIComponent(cedula));
  const data = await res.json();

  const div = document.getElementById('resultadoSolicitante');
  div.style.display = 'block';
  document.getElementById('formNuevoSolicitante').style.display = 'none';

  if (data.encontrado) {
    const s = data.solicitante;
    const colorCard = s.suspendido ? '#fff3cd;border-color:#ffc107' : '#f0f9f4;border-color:#28a745';
    let estadoHtml;
    if (s.estado === 'Suspendido permanente') {
      estadoHtml = '<span class="badge bg-danger">Suspendido permanente</span>';
    } else if (s.suspendido) {
      estadoHtml = '<span class="badge bg-danger">Suspendido hasta ' + new Date(s.fechaFinSuspension).toLocaleDateString('es-VE') + '</span>';
    } else {
      estadoHtml = '<span class="badge bg-success">Activo</span>';
    }

    div.innerHTML = `
      <div class="p-3 rounded mb-2" style="background:${colorCard};border:2px solid;">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>${escHtml(s.nombre)} ${escHtml(s.apellido)}</strong>
            <span class="text-muted ms-2">${escHtml(s.cedula)}</span>
            <span class="ms-2">${estadoHtml}</span>
          </div>
          <button class="btn btn-sm btn-outline-secondary" onclick="reiniciarSolicitante()">
            <i class="bi bi-x"></i> Cambiar
          </button>
        </div>
        <div class="mt-2 d-flex gap-4">
          <small><i class="bi bi-arrow-left-right me-1"></i>Préstamos activos: <strong>${s.prestamosActivos}</strong></small>
          ${s.correoElectronico ? '<small><i class="bi bi-envelope me-1"></i>' + escHtml(s.correoElectronico) + '</small>' : ''}
          ${s.telefono ? '<small><i class="bi bi-telephone me-1"></i>' + escHtml(s.telefono) + '</small>' : ''}
        </div>
        ${s.prestamosActivos > 0 ? `
        <div class="mt-2">
          <small class="text-muted">Préstamos actuales:</small>
          <ul class="mb-0 mt-1">
            ${(s.prestamos||[]).map(function(p) {
              return '<li><small>' + escHtml(p.material) + ' <code>' + escHtml(p.ejemplar) + '</code> — vence ' + new Date(p.fechaDevolucionPrevista).toLocaleDateString('es-VE') + '</small></li>';
            }).join('')}
          </ul>
        </div>` : ''}
      </div>`;

    if (s.suspendido) {
      div.innerHTML += '<div class="alert alert-warning py-2"><i class="bi bi-exclamation-triangle me-2"></i>Este solicitante está suspendido y no puede recibir préstamos.</div>';
    } else {
      solicitanteSeleccionado = s;
      document.getElementById('hiddenSolicitanteCedula').value = s.cedula;
      document.getElementById('paso2').style.display = 'block';
    }
  } else {
    div.innerHTML = '<div class="alert alert-warning py-2">' +
      '<i class="bi bi-person-x me-2"></i>' +
      'Solicitante con cédula <strong>' + escHtml(cedula) + '</strong> no encontrado. ' +
      '¿Desea registrarlo ahora? ' +
      '<button class="btn btn-sm btn-primary-custom ms-3" onclick="mostrarFormNuevoSolicitante()">' +
      '<i class="bi bi-person-plus me-1"></i>Registrar' +
      '</button>' +
      '</div>';
  }
}

function mostrarFormNuevoSolicitante() {
  document.getElementById('formNuevoSolicitante').style.display = 'block';
}

function reiniciarSolicitante() {
  solicitanteSeleccionado = null;
  document.getElementById('resultadoSolicitante').style.display = 'none';
  document.getElementById('formNuevoSolicitante').style.display = 'none';
  document.getElementById('paso2').style.display = 'none';
  document.getElementById('resultadoEjemplares').innerHTML = '';
  document.getElementById('inputCedula').value = '';
  document.getElementById('inputCedula').focus();
}

async function registrarSolicitante() {
  const cedula = document.getElementById('inputCedula').value.trim();
  const nombre = document.getElementById('nuevoNombre').value.trim();
  const apellido = document.getElementById('nuevoApellido').value.trim();
  const telefono = document.getElementById('nuevoTelefono').value.trim();
  const correoElectronico = document.getElementById('nuevoCorreo').value.trim();

  if (!nombre || !apellido) {
    alert('El nombre y apellido son obligatorios.');
    return;
  }

  const res = await fetch('/api/solicitantes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cedula, nombre, apellido, correoElectronico, telefono })
  });
  const data = await res.json();

  if (data.success) {
    document.getElementById('formNuevoSolicitante').style.display = 'none';
    solicitanteSeleccionado = data.solicitante;
    document.getElementById('hiddenSolicitanteCedula').value = data.solicitante.cedula;
    document.getElementById('resultadoSolicitante').innerHTML = '<div class="alert alert-success py-2">' +
      '<i class="bi bi-check-circle me-2"></i>' +
      'Solicitante <strong>' + escHtml(nombre) + ' ' + escHtml(apellido) + '</strong> registrado correctamente.' +
      '</div>';
    document.getElementById('paso2').style.display = 'block';
  } else {
    alert('Error al registrar: ' + (data.error || 'Error desconocido'));
  }
}

async function buscarEjemplares() {
  const titulo = document.getElementById('inputTitulo').value.trim();
  if (!titulo) return;

  const res = await fetch('/api/ejemplares/disponibles?titulo=' + encodeURIComponent(titulo));
  const data = await res.json();
  const div = document.getElementById('resultadoEjemplares');

  if (!data.length) {
    div.innerHTML = '<div class="alert alert-warning py-2">' +
      '<i class="bi bi-search me-2"></i>No se encontraron ejemplares disponibles para "<strong>' + escHtml(titulo) + '".</div>';
    return;
  }

  div.innerHTML = '<p class="text-muted mb-2"><small>Seleccione el ejemplar a prestar:</small></p>' +
    '<div class="table-responsive">' +
    '<table class="table table-custom table-sm">' +
    '<thead><tr><th>Título</th><th>Autor(es)</th><th>Código ejemplar</th><th>Tipo</th><th></th></tr></thead>' +
    '<tbody>' +
    data.map(function(e) {
      return '<tr>' +
        '<td>' + escHtml(e.titulo) + '</td>' +
        '<td><small class="text-muted">' + escHtml(e.autores || '-') + '</small></td>' +
        '<td><code>' + escHtml(e.identificadorUnico) + '</code></td>' +
        '<td><span class="badge bg-secondary">' + escHtml(e.tipo) + '</span></td>' +
        '<td>' +
        '<button class="btn btn-sm btn-primary-custom btn-seleccionar-ejemplar" ' +
        'data-id="' + e.id + '" ' +
        'data-titulo="' + escHtml(e.titulo) + '" ' +
        'data-codigo="' + escHtml(e.identificadorUnico) + '" ' +
        'data-autores="' + escHtml(e.autores || '-') + '">' +
        'Seleccionar' +
        '</button>' +
        '</td>' +
        '</tr>';
    }).join('') +
    '</tbody></table></div>';
}

document.getElementById('inputTitulo')?.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); buscarEjemplares(); }
});

document.getElementById('inputCedula')?.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); buscarSolicitante(); }
});

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.btn-seleccionar-ejemplar');
  if (!btn) return;
  seleccionarEjemplar(
    parseInt(btn.dataset.id),
    btn.dataset.titulo,
    btn.dataset.codigo,
    btn.dataset.autores
  );
});

function seleccionarEjemplar(id, titulo, codigo, autores) {
  ejemplarSeleccionado = { id, titulo, codigo, autores };
  document.getElementById('hiddenEjemplarId').value = id;

  const s = solicitanteSeleccionado;
  const dias = getDiasPrestamo();
  const fechaDev = new Date();
  fechaDev.setDate(fechaDev.getDate() + dias);

  document.getElementById('resultadoEjemplares').innerHTML =
    '<div class="p-3 rounded mb-3" style="background:#f0f9f4;border:2px solid #28a745;border-radius:8px;">' +
    '<h6 class="fw-bold mb-3"><i class="bi bi-clipboard-check me-1"></i>Paso 3 — Confirmar Datos</h6>' +
    '<h6 class="mb-3"><i class="bi bi-check-circle me-2"></i>Ejemplar seleccionado: ' + escHtml(titulo) + ' — <code>' + escHtml(codigo) + '</code></h6>' +
    '<div class="row g-2 mb-3">' +
    '<div class="col-md-6">' +
    '<small class="text-muted d-block">Solicitante</small>' +
    '<strong>' + escHtml(s.nombre) + ' ' + escHtml(s.apellido) + '</strong>' +
    '<small class="text-muted ms-2">' + escHtml(s.cedula) + '</small>' +
    '</div>' +
    '<div class="col-md-6">' +
    '<small class="text-muted d-block">Devolución estimada</small>' +
    '<strong>' + fechaDev.toLocaleDateString('es-VE') + '</strong>' +
    '<small class="text-muted"> (' + dias + ' días)</small>' +
    '</div>' +
    '</div>' +
    '<form method="POST" action="/admin/prestamos">' +
    '<input type="hidden" name="solicitanteCedula" value="' + escHtml(s.cedula) + '">' +
    '<input type="hidden" name="ejemplarId" value="' + id + '">' +
    '<div class="d-flex gap-2">' +
    '<button type="button" class="btn btn-outline-secondary flex-grow-1" onclick="buscarEjemplares()">' +
    '<i class="bi bi-arrow-left me-1"></i>Cambiar' +
    '</button>' +
    '<button type="button" class="btn btn-outline-secondary flex-grow-1" onclick="reiniciar()">' +
    '<i class="bi bi-x-lg me-1"></i>Cancelar' +
    '</button>' +
    '<button type="submit" class="btn btn-primary-custom flex-grow-1">' +
    '<i class="bi bi-check-lg me-1"></i>Confirmar Préstamo' +
    '</button>' +
    '</div>' +
    '</form>' +
    '</div>';
}

function reiniciar() {
  reiniciarSolicitante();
  document.getElementById('inputTitulo').value = '';
  document.getElementById('resultadoEjemplares').innerHTML = '';
  ejemplarSeleccionado = null;
}

function filtrarPrestamos(val) {
  val = val.toLowerCase();
  document.querySelectorAll('#tablaPrestamos tbody tr').forEach(function(row) {
    row.style.display = row.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
}
