document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', reindexarArticulos);
  }
});

function reindexarArticulos() {
  const tbody = document.getElementById('articulosBody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(function(row, i) {
    const inputs = row.querySelectorAll('input[name^="articulos["]');
    inputs.forEach(function(input) {
      input.name = input.name.replace(/articulos\[\d+\]/, 'articulos[' + i + ']');
    });
  });
}
