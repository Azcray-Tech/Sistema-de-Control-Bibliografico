function abrirModalCategoria() {
    window.categoriaAlpine.abrirModal();
}

function editarCategoria(id, nombre, descripcion) {
    window.categoriaAlpine.editarCategoria(id, nombre, descripcion);
}

function eliminarCategoria(nombre, formId) {
    Swal.fire({
        title: '¿Eliminar categoría?',
        text: '¿Deseas eliminar la categoría "' + nombre + '"?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(function(result) {
        if (result.isConfirmed) {
            document.getElementById(formId).submit();
        }
    });
}

function abrirReasignar(id, nombre, total, nombreOrigen) {
    document.getElementById('categoriaOrigenId').value = id;
    document.getElementById('categoriaOrigenNombre').value = nombreOrigen;
    document.getElementById('nombreOrigen').textContent = nombre;
    document.getElementById('totalMateriales').textContent = total;
    document.getElementById('categoriaDestino').value = '';
    document.getElementById('categoriaDestinoNombre').value = '';
    document.getElementById('formReasignar').action = '/admin/categorias/' + id + '/reasignar';
    new bootstrap.Modal(document.getElementById('modalReasignar')).show();
}