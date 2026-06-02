function descargarReporte(ruta, formato, btn) {
    if (btn.disabled) return;

    const url = `/admin/reportes/${ruta}/${formato}`;

    if (ruta === 'inventario/completo') {
        Swal.fire({
            title: '¿Generar reporte?',
            text: 'El inventario completo puede contener muchos registros. La generación puede tomar unos segundos.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2c5f4f'
        }).then(result => {
            if (result.isConfirmed) {
                window.open(url, '_blank');
            }
        });
        return;
    }

    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Generando...';

    window.open(url, '_blank');

    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }, 2000);
}

function descargarReporteFiltrado(filtro, formato, btn) {
    if (btn.disabled) return;

    const selectId = filtro === 'categoria' ? 'selectCategoria' : 'selectTipo';
    const select = document.getElementById(selectId);
    const val = select ? select.value : '';

    if (!val) {
        Swal.fire({
            icon: 'warning',
            title: 'Seleccione un filtro',
            text: `Debe seleccionar ${filtro === 'categoria' ? 'una categoría' : 'un tipo'} antes de generar el reporte.`,
            confirmButtonColor: '#2c5f4f'
        });
        if (select) select.focus();
        return;
    }

    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Generando...';

    const url = `/admin/reportes/inventario/${filtro}/${encodeURIComponent(val)}/${formato}`;
    window.open(url, '_blank');

    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }, 2000);
}
