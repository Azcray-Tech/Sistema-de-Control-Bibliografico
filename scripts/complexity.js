/**
 * @description Análisis de Complejidad Ciclomática vía typhonjs-escomplex.
 *   Uso directo: node scripts/complexity.js
 *   Integrado:   require('./complexity.js').analyze()
 */
const fs = require('fs');
const path = require('path');
const { walkFiles } = require('./_fileUtils');

const ROOT_DIR = path.join(__dirname, '..');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');

function generateHtml(data) {
  const filesHtml = data.files
    .map(f => {
      const methodsHtml = f.methods
        .map(m => `<tr>
          <td><code>${m.name}</code></td>
          <td>${m.cyclomatic}</td>
          <td>${m.cyclomaticDensity.toFixed(0)}%</td>
          <td>${m.lineStart}&ndash;${m.lineEnd}</td>
        </tr>`)
        .join('\n');
      return `<tr class="file-header"><td colspan="4"><strong>${f.file}</strong> &mdash; CCN total: ${f.totalCcn}, funciones: ${f.methods.length}</td></tr>${methodsHtml}`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Complejidad Ciclom&aacute;tica</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; padding: 2rem; }
  h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: .25rem; }
  .subtitle { color: #666; margin-bottom: 1.5rem; font-size: .9rem; }
  .summary { display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .summary-item { background: #fff; border: 1px solid #e8ecf1; border-radius: 8px; padding: 1rem 1.25rem; text-align: center; min-width: 120px; }
  .summary-item .num { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
  .summary-item .label { font-size: .8rem; color: #666; margin-top: .2rem; }
  table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 2rem; }
  th, td { padding: .4rem .75rem; text-align: left; border-bottom: 1px solid #e8ecf1; font-size: .85rem; }
  th { background: #1a1a2e; color: #fff; position: sticky; top: 0; }
  .file-header td { background: #eef2f7; font-weight: 600; color: #1a1a2e; padding: .5rem .75rem; }
  .high-ccn { color: #e74c3c; font-weight: 700; }
  .med-ccn { color: #e67e22; font-weight: 600; }
  .low-ccn { color: #27ae60; }
  .methodology { background: #fff; border: 1px solid #e8ecf1; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; font-size: .9rem; }
  .methodology h2 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: .5rem; }
  .methodology ul { padding-left: 1.25rem; margin: .25rem 0; }
  .methodology li { margin: .15rem 0; }
  .methodology code { background: #eef2f7; padding: .1rem .35rem; border-radius: 3px; font-size: .8rem; }
</style></head>
<body>
  <h1>Complejidad Ciclom&aacute;tica (CCN)</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleString('es-VE')}</p>

  <div class="summary">
    <div class="summary-item"><div class="num">${data.totalFiles}</div><div class="label">Archivos</div></div>
    <div class="summary-item"><div class="num">${data.totalFunctions}</div><div class="label">Funciones</div></div>
    <div class="summary-item"><div class="num">${data.averageCcn.toFixed(2)}</div><div class="label">CCN Promedio</div></div>
    <div class="summary-item"><div class="num">${data.maxCcn}</div><div class="label">CCN M&aacute;ximo</div></div>
    <div class="summary-item"><div class="num">${data.totalCcn}</div><div class="label">CCN Total</div></div>
  </div>

  <div class="methodology">
    <h2>Metodolog&iacute;a</h2>
    <p>An&aacute;lisis realizado con <strong>typhonjs-escomplex</strong>. La Complejidad Ciclom&aacute;tica (CCN) mide el n&uacute;mero de caminos linealmente independientes en el flujo de control.</p>
    <p style="color:#856404;background:#fff3cd;padding:.5rem .75rem;border-radius:4px;font-size:.85rem;">
      <strong>Nota:</strong> Los m&eacute;todos definidos con sintaxis de <em>class field</em> (<code>método = () =&gt; {}</code>)
      no son detectados por typhonjs-escomplex. Los controllers del proyecto usan esta sintaxis y aparecen con CCN=0.
      Para ver la complejidad real de esos archivos, consulte el reporte ESLint (<code>reports/lint.html</code>)
      o ejecute <code>npx eslint . --rule 'complexity: ["warn",{max:1}]'</code>.
    </p>
    <table style="width:auto;min-width:400px;margin:.5rem 0;box-shadow:none;border:1px solid #e8ecf1;">
      <thead><tr><th>CCN</th><th>Interpretaci&oacute;n</th></tr></thead>
      <tbody>
        <tr><td class="low-ccn">1&ndash;10</td><td>Bajo &mdash; f&aacute;cil de mantener</td></tr>
        <tr><td class="med-ccn">11&ndash;20</td><td>Moderado &mdash; requiere atenci&oacute;n</td></tr>
        <tr><td class="high-ccn">21+</td><td>Alto &mdash; dif&iacute;cil de probar/mantener</td></tr>
      </tbody>
    </table>
  </div>

  <h2 style="font-size:1.1rem;color:#1a1a2e;margin-bottom:.5rem;">Detalle por archivo y funci&oacute;n</h2>
  <table><thead><tr><th>Funci&oacute;n</th><th>CCN</th><th>Densidad</th><th>L&iacute;neas</th></tr></thead>
  <tbody>${filesHtml}</tbody></table>
</body></html>`;
}

function analyze() {
  const ec = require('typhonjs-escomplex');

  const jsFiles = walkFiles(ROOT_DIR, ['.js'], ['node_modules', 'reports', 'report', '.git', 'coverage', 'tests', 'public', 'documentacion']);
  const allMethods = [];
  const fileReports = [];

  for (const filePath of jsFiles) {
    const relPath = path.relative(ROOT_DIR, filePath);
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      const report = ec.analyzeModule(source);
      const methods = (report.methods || []).map(m => ({
        name: m.name || '(anonymous)',
        cyclomatic: m.cyclomatic,
        cyclomaticDensity: m.cyclomaticDensity,
        lineStart: m.lineStart,
        lineEnd: m.lineEnd
      }));

      const totalCcn = methods.reduce((s, m) => s + m.cyclomatic, 0);
      allMethods.push(...methods);
      fileReports.push({ file: relPath, methods, totalCcn });
    } catch (err) {
      console.error(`  [SKIP] ${relPath}: ${err.message}`);
      fileReports.push({ file: relPath, methods: [], totalCcn: 0 });
    }
  }

  const ccnValues = allMethods.map(m => m.cyclomatic);
  const totalFunctions = allMethods.length;
  const averageCcn = totalFunctions > 0
    ? ccnValues.reduce((s, v) => s + v, 0) / totalFunctions
    : 0;
  const maxCcn = totalFunctions > 0 ? Math.max(...ccnValues) : 0;
  const totalFiles = jsFiles.length;
  const totalCcn = ccnValues.reduce((s, v) => s + v, 0);

  const result = {
    totalFiles,
    totalFunctions,
    averageCcn,
    maxCcn,
    totalCcn,
    files: fileReports
  };

  // Generate HTML report
  const htmlDir = path.join(REPORTS_DIR, 'complexity');
  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }
  fs.writeFileSync(path.join(htmlDir, 'index.html'), generateHtml(result));

  return result;
}

// CLI: node scripts/complexity.js
if (require.main === module) {
  console.log('=== Complejidad Ciclomática (CCN) ===\n');
  try {
    const data = analyze();
    console.log(`\nArchivos: ${data.totalFiles}`);
    console.log(`Funciones: ${data.totalFunctions}`);
    console.log(`CCN Promedio: ${data.averageCcn.toFixed(2)}`);
    console.log(`CCN Máximo: ${data.maxCcn}`);
    console.log(`CCN Total: ${data.totalCcn}`);
    console.log(`\nReporte HTML: reports/complexity/index.html`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

module.exports = { analyze };
