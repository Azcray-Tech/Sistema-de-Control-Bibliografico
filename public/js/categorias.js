var tablaCategorias;

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

$(document).ready(function () {
    tablaCategorias = $('#tablaCategorias').DataTable({
        language: {
            url: '/js/es-ES.json'
        },
        pageLength: 10,
        dom: 'rt<"d-flex justify-content-between align-items-center mt-3"ip>',
        order: [
            [0, 'asc']
        ],
        columnDefs: [{
            orderable: false,
            targets: [3]
        }]
    });

    $('#searchCategorias').on('keyup', function() {
        tablaCategorias.search(this.value).draw();
    });
});