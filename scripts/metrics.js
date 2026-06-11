/**
 * @description Pipeline automatizado de métricas de código.
 * Genera reportes HTML en reports/.
 * Uso: node scripts/metrics.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { walkFiles } = require('./_fileUtils');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const ROOT_DIR = path.join(__dirname, '..');

const EXCLUDE_FILES = new Set(['package-lock.json']);

function _handleRunError(err, opts) {
  if (opts.optional) {
    if (err.stdout) {process.stdout.write(err.stdout);}
    if (err.stderr) {process.stderr.write(err.stderr);}
    return err.stdout ? err.stdout.toString() : '';
  }
  if (err.stdout) {process.stdout.write(err.stdout);}
  console.error(`  [ERROR] ${err.message}`);
  return '';
}

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  try {
    const out = execSync(cmd, {
      cwd: ROOT_DIR,
      stdio: opts.silent ? 'pipe' : 'inherit',
      timeout: 120000,
      ...opts
    });
    if (opts.silent) {return out.toString();}
  } catch (err) {
    return _handleRunError(err, opts);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {fs.mkdirSync(dir, { recursive: true });}
}

function _contarLinea(t, estado) {
  if (estado.inBlock) {
    if (t.includes('*/')) {estado.inBlock = false;}
    return 1;
  }
  if (t.startsWith('/*')) {
    if (!t.includes('*/')) {estado.inBlock = true;}
    return 1;
  }
  if (t.startsWith('//')) {return 1;}
  if (t.startsWith('*')) {return 1;}
  if (t.startsWith('#')) {return 1;}
  return 0;
}

function _contarComentarios(lines) {
  let comment = 0;
  const estado = { inBlock: false };
  for (const l of lines) {
    comment += _contarLinea(l.trim(), estado);
  }
  return comment;
}

function countLines(dir) {
  const files = walkFiles(dir, ['.js', '.sql', '.json', '.ejs'], ['node_modules', 'reports', 'report', '.git', 'public']);
  const results = [];
  let totalCode = 0, totalComment = 0, totalBlank = 0;

  for (const full of files) {
    if (EXCLUDE_FILES.has(path.basename(full))) { continue; }
    const rel = path.relative(ROOT_DIR, full);
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');
    const total = lines.length;
    const blank = lines.filter(l => /^\s*$/.test(l)).length;
    const comment = _contarComentarios(lines);
    const code = total - blank - comment;
    totalCode += code; totalComment += comment; totalBlank += blank;
    results.push({ file: rel, code, comment, blank, total });
  }
  return { files: results, totalCode, totalComment, totalBlank };
}

function generateLocHtml(data) {
  const rows = data.files
    .map(f => `<tr><td>${f.file}</td><td>${f.code}</td><td>${f.comment}</td><td>${f.blank}</td><td>${f.total}</td></tr>`)
    .join('\n');
  const total = data.totalCode + data.totalComment + data.totalBlank;
  const pctCode = (data.totalCode / total * 100).toFixed(1);
  const pctComment = (data.totalComment / total * 100).toFixed(1);
  const pctBlank = (data.totalBlank / total * 100).toFixed(1);
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Conteo de Líneas</title>
<style>
  body { font-family: -apple-system, sans-serif; padding: 2rem; background: #f5f7fa; color: #333; }
  h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: .25rem; }
  .subtitle { color: #666; margin-bottom: 1.5rem; font-size: .9rem; }
  table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 2rem; }
  th, td { padding: .4rem .75rem; text-align: left; border-bottom: 1px solid #e8ecf1; font-size: .85rem; }
  th { background: #1a1a2e; color: #fff; position: sticky; top: 0; }
  .summary { display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .summary-item { background: #fff; border: 1px solid #e8ecf1; border-radius: 8px; padding: 1rem 1.25rem; text-align: center; min-width: 120px; }
  .summary-item .num { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
  .summary-item .label { font-size: .8rem; color: #666; margin-top: .2rem; }
  .methodology { background: #fff; border: 1px solid #e8ecf1; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; font-size: .9rem; line-height: 1.6; }
  .methodology h2 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: .5rem; }
  .methodology ul { padding-left: 1.25rem; margin: .25rem 0; }
  .methodology li { margin: .15rem 0; }
  .methodology code { background: #eef2f7; padding: .1rem .35rem; border-radius: 3px; font-size: .8rem; }
</style></head>
<body>
  <h1>Conteo de L&iacute;neas</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleString('es-VE')}</p>

  <div class="summary">
    <div class="summary-item"><div class="num">${data.files.length}</div><div class="label">Archivos</div></div>
    <div class="summary-item"><div class="num">${data.totalCode.toLocaleString()}</div><div class="label">C&oacute;digo (${pctCode}%)</div></div>
    <div class="summary-item"><div class="num">${data.totalComment.toLocaleString()}</div><div class="label">Comentarios (${pctComment}%)</div></div>
    <div class="summary-item"><div class="num">${data.totalBlank.toLocaleString()}</div><div class="label">Blanco (${pctBlank}%)</div></div>
    <div class="summary-item"><div class="num">${total.toLocaleString()}</div><div class="label">Total l&iacute;neas</div></div>
  </div>

  <div class="methodology">
    <h2>Metodolog&iacute;a</h2>
    <p>Conteo realizado con <strong>Node.js nativo</strong> (script propio <code>scripts/metrics.js</code>, sin dependencias externas como CLOC).</p>
    <table style="width:auto;min-width:400px;margin:.5rem 0;box-shadow:none;border:1px solid #e8ecf1;">
      <thead><tr><th>Tipo</th><th>Criterio</th></tr></thead>
      <tbody>
        <tr><td>C&oacute;digo</td><td>L&iacute;neas que no est&aacute;n vac&iacute;as ni son comentarios</td></tr>
        <tr><td>Comentarios</td><td>L&iacute;neas que inician con <code>//</code>, <code>#</code>, <code>*</code> o est&aacute;n dentro de <code>/* */</code></td></tr>
        <tr><td>Blanco</td><td>L&iacute;neas vac&iacute;as (solo espacios o tabs)</td></tr>
        <tr><td>Extensiones incluidas</td><td><code>.js</code>, <code>.sql</code>, <code>.json</code>, <code>.ejs</code></td></tr>
        <tr><td>Excluidos</td><td><code>node_modules/</code>, <code>reports/</code>, <code>.git/</code>, <code>public/js/</code>, <code>package-lock.json</code></td></tr>
      </tbody>
    </table>
  </div>

  <h2 style="font-size:1.1rem;color:#1a1a2e;margin-bottom:.5rem;">Detalle por archivo</h2>
  <table><thead><tr><th>Archivo</th><th>C&oacute;digo</th><th>Comentarios</th><th>Blanco</th><th>Total</th></tr></thead>
  <tbody>${rows}</tbody></table>
</body></html>`;
}

async function main() {
  console.log('=== Métricas de Código - Sistema de Control Bibliográfico ===\n');
  ensureDir(REPORTS_DIR);

  // 1. Cobertura de tests
  console.log('\n--- 1/6: Cobertura de tests (Jest) ---');
  run('npx jest --passWithNoTests --coverage --coverageDirectory=reports/coverage --no-cache', { optional: true });

  // 2. ESLint con reporte HTML
  console.log('\n--- 2/6: Calidad de código (ESLint) ---');
  run('npx eslint . -f html -o reports/lint.html', { optional: true });

  // 3. Conteo de líneas (Node.js nativo, sin dependencias)
  console.log('\n--- 3/6: Conteo de líneas ---');
  const locData = countLines(ROOT_DIR);
  const locHtml = generateLocHtml(locData);
  fs.writeFileSync(path.join(REPORTS_DIR, 'loc.html'), locHtml);
  console.log(`  Archivos: ${locData.files.length}, Código: ${locData.totalCode}, Comentarios: ${locData.totalComment}, Blanco: ${locData.totalBlank}`);

  // 4. Métricas de complejidad vía ESLint JSON
  console.log('\n--- 4/6: Métricas de complejidad (ESLint) ---');
  run('npx eslint . -f json -o reports/eslint.json', { silent: true, optional: true });
  if (fs.existsSync(path.join(REPORTS_DIR, 'eslint.json'))) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'eslint.json'), 'utf8'));
      const complexityData = parsed
        .filter(f => f.messages && f.messages.length > 0)
        .map(f => ({
          file: f.filePath.replace(ROOT_DIR + path.sep, ''),
          errors: f.errorCount,
          warnings: f.warningCount,
          complexityWarnings: f.messages.filter(m => m.ruleId === 'complexity').length
        }));
      fs.writeFileSync(
        path.join(REPORTS_DIR, 'complexity-summary.json'),
        JSON.stringify(complexityData, null, 2)
      );
    } catch { /* ignore */ }
  }

  // 5. Complejidad Ciclomática (typhonjs-escomplex)
  console.log('\n--- 5/6: Complejidad Ciclomática (typhonjs-escomplex) ---');
  let ccnData = null;
  try {
    ccnData = require('./complexity.js').analyze();
    console.log(`  Archivos: ${ccnData.totalFiles}, Funciones: ${ccnData.totalFunctions}, CCN Prom: ${ccnData.averageCcn.toFixed(2)}, CCN Max: ${ccnData.maxCcn}`);
  } catch (e) {
    console.error('  Error analizando complejidad ciclomática:', e.message);
  }

  // 6. Duplicación de código (jscpd)
  console.log('\n--- 6/6: Duplicación de código (jscpd) ---');
  const dupOpts = { silent: true, optional: true };
  const dupOut = run('npx jscpd . --output reports/duplication --min-lines 5 --min-tokens 50 --reporters console,json --format javascript,json,sql --ignore-pattern "node_modules/**,reports/**,public/js/**,tests/**,package-lock.json"', dupOpts);
  if (dupOut) {process.stdout.write(dupOut);}
  const dupJsonPath = path.join(REPORTS_DIR, 'duplication', 'jscpd-report.json');
  let dupData = null;
  if (fs.existsSync(dupJsonPath)) {
    try {
      dupData = JSON.parse(fs.readFileSync(dupJsonPath, 'utf8'));
      generateDuplicationHtml(dupData);
    } catch (e) {
      console.error('  Error al procesar reporte de duplicación:', e.message);
    }
  }

  // 7. Generar dashboard
  console.log('\n--- Generando dashboard ---');
  generateDashboard(locData, dupData, ccnData);

  console.log('\n=== Reportes generados en reports/ ===');
  console.log('  reports/index.html                       - Dashboard principal');
  console.log('  reports/coverage/lcov-report/            - Cobertura');
  console.log('  reports/lint.html                        - Violaciones ESLint');
  console.log('  reports/loc.html                         - Conteo de líneas');
  console.log('  reports/complexity-summary.json          - Resumen complejidad ESLint');
  console.log('  reports/complexity/index.html            - Complejidad Ciclomática');
  console.log('  reports/duplication/index.html           - Duplicación de código');
}

function generateDuplicationHtml(data) {
  const stats = data.statistics;
  const files = data.duplicates || [];

  const formatRows = Object.entries(stats.formats)
    .map(([fmt, s]) => `<tr>
      <td>${fmt}</td>
      <td>${s.sources}</td>
      <td>${s.lines}</td>
      <td>${s.clones}</td>
      <td>${s.duplicatedLines} (${s.percentage.toFixed(2)}%)</td>
      <td>${s.duplicatedTokens} (${s.percentageTokens.toFixed(2)}%)</td>
    </tr>`)
    .join('\n');

  const t = stats.total;
  const totalRow = `<tr class="total">
    <td><strong>Total</strong></td>
    <td>${t.sources}</td>
    <td>${t.lines}</td>
    <td>${t.clones}</td>
    <td>${t.duplicatedLines} (${t.percentage.toFixed(2)}%)</td>
    <td>${t.duplicatedTokens} (${t.percentageTokens.toFixed(2)}%)</td>
  </tr>`;

  const cloneItems = files.map((d, i) => {
    const f1 = d.firstFile;
    const f2 = d.secondFile;
    const file1Short = f1.name.replace(/^\.\\+/, '').replace(/\\/g, '/');
    const file2Short = f2.name.replace(/^\.\\+/, '').replace(/\\/g, '/');
    const code = d.fragment.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div class="clone">
      <div class="clone-header">
        <span class="clone-num">#${i + 1}</span>
        <span class="clone-format">${d.format}</span>
        <span class="clone-meta">${d.lines} lines, ${d.tokens} tokens</span>
      </div>
      <div class="clone-locations">
        <div class="location"><code>${file1Short}:${f1.startLoc.line}:${f1.startLoc.column} &rarr; ${f1.endLoc.line}:${f1.endLoc.column}</code></div>
        <div class="location"><code>${file2Short}:${f2.startLoc.line}:${f2.startLoc.column} &rarr; ${f2.endLoc.line}:${f2.endLoc.column}</code></div>
      </div>
      <pre class="code"><code>${code}</code></pre>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Duplicaci&oacute;n de C&oacute;digo</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; padding: 2rem; }
  h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: .25rem; }
  .subtitle { color: #666; margin-bottom: 1.5rem; font-size: .9rem; }
  table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.06); margin-bottom: 2rem; font-size: .85rem; }
  th, td { padding: .5rem .75rem; text-align: left; border-bottom: 1px solid #e8ecf1; }
  th { background: #1a1a2e; color: #fff; font-weight: 600; }
  .total { background: #eef2f7; font-weight: 600; }
  .clone { background: #fff; border: 1px solid #e8ecf1; border-radius: 8px; margin-bottom: 1rem; overflow: hidden; }
  .clone-header { background: #f8f9fb; padding: .6rem 1rem; border-bottom: 1px solid #e8ecf1; display: flex; align-items: center; gap: .75rem; }
  .clone-num { background: #1a1a2e; color: #fff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 600; flex-shrink: 0; }
  .clone-format { background: #4a6cf7; color: #fff; padding: .15rem .5rem; border-radius: 4px; font-size: .75rem; font-weight: 500; text-transform: uppercase; }
  .clone-meta { color: #666; font-size: .8rem; margin-left: auto; }
  .clone-locations { padding: .5rem 1rem; background: #fafbfc; font-size: .82rem; }
  .location { margin: .2rem 0; color: #555; }
  .location code { background: #eef2f7; padding: .1rem .35rem; border-radius: 3px; font-size: .8rem; }
  .code { background: #1e1e2e; color: #cdd6f4; padding: 1rem; overflow-x: auto; font-size: .8rem; line-height: 1.5; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; max-height: 300px; }
  .footer { margin-top: 2rem; color: #999; font-size: .8rem; text-align: center; }
</style></head>
<body>
  <h1>Duplicaci&oacute;n de C&oacute;digo</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleString('es-VE')}</p>

  <table>
    <thead><tr><th>Formato</th><th>Archivos</th><th>L&iacute;neas</th><th>Clones</th><th>L&iacute;neas duplicadas</th><th>Tokens duplicados</th></tr></thead>
    <tbody>${formatRows}${totalRow}</tbody>
  </table>

  <h2 style="font-size:1.1rem;margin-bottom:.75rem;color:#1a1a2e;">Detalle de clones (${files.length})</h2>
  ${cloneItems}

  <div class="footer">Reporte generado por jscpd + scripts/metrics.js</div>
</body></html>`;

  const outPath = path.join(REPORTS_DIR, 'duplication', 'index.html');
  fs.writeFileSync(outPath, html);
  console.log('  Reporte HTML de duplicaci\xF3n generado: reports/duplication/index.html');
}

function generateDashboard(locData, dupData, ccnData) {
  const coverageExists = fs.existsSync(path.join(REPORTS_DIR, 'coverage', 'lcov-report', 'index.html'));
  const lintExists = fs.existsSync(path.join(REPORTS_DIR, 'lint.html'));
  let dupSummary = '';
  if (dupData && dupData.statistics) {
    const t = dupData.statistics.total;
    dupSummary = `<tr><td>Clones encontrados</td><td>${t.clones}</td></tr>
<tr><td>L&iacute;neas duplicadas</td><td>${t.duplicatedLines} (${t.percentage.toFixed(2)}%)</td></tr>`;
  }
  const dupExists = fs.existsSync(path.join(REPORTS_DIR, 'duplication', 'index.html'));
  const complexityExists = ccnData && ccnData.totalFiles > 0;

  const locSummary = `<tr><td>Archivos analizados</td><td>${locData.files.length}</td></tr>
<tr><td>Líneas de código</td><td>${locData.totalCode}</td></tr>
<tr><td>Líneas de comentarios</td><td>${locData.totalComment}</td></tr>
<tr><td>Líneas en blanco</td><td>${locData.totalBlank}</td></tr>
<tr><td>Total líneas</td><td>${locData.totalCode + locData.totalComment + locData.totalBlank}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Métricas - Sistema de Control Bibliográfico</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; padding: 2rem; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: .5rem; color: #1a1a2e; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,.08); border: 1px solid #e8ecf1; }
    .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #1a1a2e; }
    .card p { color: #666; font-size: .9rem; margin-bottom: 1rem; }
    .card .status { display: inline-block; padding: .25rem .75rem; border-radius: 20px; font-size: .8rem; font-weight: 500; }
    .status.ok { background: #d4edda; color: #155724; }
    .status.missing { background: #f8d7da; color: #721c24; }
    .btn { display: inline-block; padding: .5rem 1rem; background: #1a1a2e; color: #fff; text-decoration: none; border-radius: 6px; font-size: .85rem; margin-top: .5rem; }
    .btn:hover { background: #16213e; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: .5rem .75rem; text-align: left; border-bottom: 1px solid #e8ecf1; font-size: .9rem; }
    th { color: #666; font-weight: 600; }
    .footer { margin-top: 2rem; color: #999; font-size: .8rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Métricas de C&oacute;digo</h1>
    <p class="subtitle">Sistema de Control Bibliogr&aacute;fico &mdash; Reporte generado el ${new Date().toLocaleString('es-VE')}</p>

    <div class="grid">
      <div class="card">
        <h2>Cobertura de Tests</h2>
        ${coverageExists
          ? '<span class="status ok">Disponible</span><br><a class="btn" href="coverage/lcov-report/index.html">Ver reporte</a>'
          : '<span class="status missing">No disponible</span><p>Ejecuta: npm run metrics:coverage</p>'}
      </div>

      <div class="card">
        <h2>Calidad ESLint</h2>
        ${lintExists
          ? '<span class="status ok">Disponible</span><br><a class="btn" href="lint.html">Ver reporte</a>'
          : '<span class="status missing">No disponible</span><p>Ejecuta: npm run metrics:lint</p>'}
      </div>

      ${complexityExists ? `<div class="card">
        <h2>Complejidad Ciclom&aacute;tica</h2>
        <span class="status ok">Disponible</span>
        <table><tbody>
          <tr><td>CCN Promedio</td><td>${ccnData.averageCcn.toFixed(2)}</td></tr>
          <tr><td>CCN M&aacute;ximo</td><td>${ccnData.maxCcn}</td></tr>
          <tr><td>Funciones analizadas</td><td>${ccnData.totalFunctions}</td></tr>
          <tr><td>Archivos analizados</td><td>${ccnData.totalFiles}</td></tr>
        </tbody></table>
        <br><a class="btn" href="complexity/index.html">Ver reporte</a>
      </div>` : ''}

      <div class="card">
        <h2>Conteo de L&iacute;neas</h2>
        <span class="status ok">Disponible</span><br><a class="btn" href="loc.html">Ver reporte</a>
      </div>

      <div class="card">
        <h2>Duplicaci&oacute;n de C&oacute;digo</h2>
        ${dupExists
          ? `<span class="status ok">Disponible</span>${dupSummary ? `<table><tbody>${dupSummary}</tbody></table>` : ''}<br><a class="btn" href="duplication/index.html">Ver reporte</a>`
          : '<span class="status missing">No disponible</span><p>Ejecuta: npm run metrics:dup</p>'}
      </div>
    </div>

    <div class="card">
      <h2>Resumen de l&iacute;neas</h2>
      <table>
        ${locSummary}
      </table>
    </div>

    <div class="footer">
      <p>Ejecuta <code>npm run metrics</code> para regenerar todos los reportes.</p>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(REPORTS_DIR, 'index.html'), html);
  console.log('  Dashboard generado: reports/index.html');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
