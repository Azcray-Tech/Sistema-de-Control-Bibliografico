$(document).ready(function () {
    var tablaInventario = $('#tablaInventario').DataTable({
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
            targets: [5]
        }]
    });

    $('#searchInventario').on('keyup', function () {
        tablaInventario.search(this.value).draw();
    });
});
