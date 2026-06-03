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
        const labels = prestamosPorMes.map(p => p.mes);
        const data = prestamosPorMes.map(p => p.total);

        const xTicks = { maxRotation: periodo === '1mes' ? 90 : 45 };
        if (periodo === '1mes') {
            xTicks.autoSkip = true;
            xTicks.maxTicksLimit = 31;
        } else if (periodo === 'hoy') {
            xTicks.autoSkip = true;
            xTicks.maxTicksLimit = 12;
        } else if (periodo === '1semana') {
            xTicks.autoSkip = false;
        }

        new Chart(document.getElementById('chartPrestamosMes'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Préstamos',
                    data: data,
                    backgroundColor: function(ctx) {
                        const chart = ctx.chart;
                        const { ctx: c, chartArea } = chart;
                        if (!chartArea) return 'rgba(44, 95, 79, 0.75)';
                        const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(44, 95, 79, 0.25)');
                        gradient.addColorStop(1, '#2c5f4f');
                        return gradient;
                    },
                    borderColor: '#2c5f4f',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        displayColors: false,
                        callbacks: {
                            label: function(ctx) {
                                return ctx.parsed.y + ' préstamo' + (ctx.parsed.y !== 1 ? 's' : '');
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false }, ticks: xTicks }
                }
            }
        });
    }
});