/* global Chart */
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.DASHBOARD_DATA === 'undefined') return;

    const { materialesPorTipo, prestamosPorMes, periodo } = window.DASHBOARD_DATA;

    if (materialesPorTipo && document.getElementById('chartMaterialesTipo')) {
        new Chart(document.getElementById('chartMaterialesTipo'), {
            type: 'doughnut',
            data: {
                labels: ['Libros', 'Revistas', 'Tesis', 'Anuarios'],
                datasets: [{
                    data: [
                        materialesPorTipo.find(m => m.tipo === 'libro')?.total || 0,
                        materialesPorTipo.find(m => m.tipo === 'revista')?.total || 0,
                        materialesPorTipo.find(m => m.tipo === 'tesis')?.total || 0,
                        materialesPorTipo.find(m => m.tipo === 'anuario')?.total || 0
                    ],
                    backgroundColor: ['#2c5f4f', '#8b7355', '#d4a574', '#17a2b8'],
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, font: { size: 11 } }
                    }
                }
            }
        });
    }

    if (prestamosPorMes && document.getElementById('chartPrestamosMes')) {
        const formatLabel = (mes) => {
            if (periodo === '12meses') return mes;
            if (periodo === '1mes' || periodo === '1semana') {
                const parts = mes.split('-');
                return parts[2] + '/' + parts[1];
            }
            if (periodo === 'hoy') return mes;
            return mes;
        };

        const labels = prestamosPorMes.map(p => formatLabel(p.mes));
        const data = prestamosPorMes.map(p => p.total);

        const xTicks = {};
        if (periodo === '1mes') {
            xTicks.maxRotation = 90;
            xTicks.autoSkip = true;
            xTicks.maxTicksLimit = 15;
        } else if (periodo === '1semana' || periodo === 'hoy') {
            xTicks.maxRotation = 45;
        } else {
            xTicks.maxRotation = 45;
        }

        new Chart(document.getElementById('chartPrestamosMes'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Préstamos',
                    data: data,
                    backgroundColor: 'rgba(44, 95, 79, 0.75)',
                    borderColor: '#2c5f4f',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false }, ticks: xTicks }
                }
            }
        });
    }
});