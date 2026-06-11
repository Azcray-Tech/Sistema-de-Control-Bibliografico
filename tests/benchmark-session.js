/**
 * @requirement RF-13
 * @description Benchmark comparativo: MemoryStore vs SequelizeStore.
 * Ejecuta el mismo escenario de Artillery con ambos session stores
 * y muestra una tabla comparativa de resultados.
 *
 * Uso:
 *   node tests/benchmark-session.js
 *   node tests/benchmark-session.js --scenario tests/stress/ceela-carga-documental.yml
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SCENARIO = process.argv[2]?.startsWith('--scenario=')
  ? process.argv[2].split('=')[1]
  : path.join(__dirname, 'stress', 'ceela-carga-documental.yml');
const PORT = process.env.PORT || 3000;
const REPORTS_DIR = path.join(__dirname, 'stress');
const REPORT_MEMORY = path.join(REPORTS_DIR, 'report-bench-memory.json');
const REPORT_SEQUELIZE = path.join(REPORTS_DIR, 'report-bench-sequelize.json');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 302 || res.status === 404) return true;
    } catch { /* server not ready yet */ }
    await sleep(500);
  }
  return false;
}

function killProcessOnPort(port) {
  try {
    if (os.platform() === 'win32') {
      execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe' });
      const result = execSync(
        `powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force"`,
        { stdio: 'pipe' }
      );
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'pipe' });
    }
  } catch { /* process may not exist */ }
}

async function runServer(env) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ...env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
    child.stdout.on('data', d => log(`[SERVER ${env.SESSION_STORE || 'default'}] ${d.toString().trim()}`));
    child.stderr.on('data', d => log(`[SERVER ERR] ${d.toString().trim()}`));
    child.on('error', reject);
    child.on('exit', code => log(`Server exited with code ${code}`));
    resolve(child);
  });
}

async function runArtillery(reportPath) {
  return new Promise((resolve, reject) => {
    const args = [
      'artillery', 'run',
      '--output', reportPath,
      SCENARIO
    ];
    log(`Running: npx ${args.join(' ')}`);
    const child = spawn('npx', args, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`Artillery exited with code ${code}`));
    });
  });
}

function parseReport(reportPath) {
  const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const aggr = data.aggregate || {};
  const codes = aggr.httpCodes || aggr.codes || {};
  const errors = aggr.errors || {};
  const scenarios = aggr.scenarios || {};
  const latency = aggr.latency || aggr.httpResponseTime || {};

  const totalRequests = Object.values(codes).reduce((a, b) => a + b, 0) || aggr.requestsCompleted || 0;
  const ok2xx = (codes['200'] || 0) + (codes['201'] || 0) + (codes['204'] || 0);
  const redirect3xx = (codes['302'] || 0) + (codes['301'] || 0);
  const clientError4xx = (codes['400'] || 0) + (codes['401'] || 0) + (codes['403'] || 0) + (codes['404'] || 0);
  const serverError5xx = (codes['500'] || 0) + (codes['502'] || 0) + (codes['503'] || 0);
  const errorCount = Object.values(errors).reduce((a, b) => a + b, 0) || scenarios.errors || 0;

  return {
    totalRequests,
    errorCount,
    ok2xx,
    redirect3xx,
    clientError4xx,
    serverError5xx,
    p95: latency.p95 || latency['p95'] || latency['95'] || '-',
    p99: latency.p99 || latency['p99'] || latency['99'] || '-',
    median: latency.median || latency.p50 || latency['50'] || '-',
    max: latency.max || '-',
    min: latency.min || '-',
    rps: aggr.rps || aggr.requestRate || '-',
    scenariosCompleted: scenarios.completed || aggr.scenariosCompleted || 0,
    scenariosErrors: errorCount
  };
}

function showComparison(memory, sequelize) {
  const bar = '─'.repeat(68);
  console.log(`\n${bar}`);
  console.log('  BENCHMARK: MemoryStore vs SequelizeStore');
  console.log(`  Escenario: ${SCENARIO}`);
  console.log(`  Fecha:     ${new Date().toLocaleString()}`);
  console.log(`${bar}`);
  console.log('  Métrica                 MemoryStore   SequelizeStore   Diferencia');
  console.log(`  ${'─'.repeat(66)}`);
  const rows = [
    ['Peticiones totales', memory.totalRequests, sequelize.totalRequests, 'num'],
    ['Tasa errores', memory.errorCount, sequelize.errorCount, 'num'],
    ['Éxitos 2xx', memory.ok2xx, sequelize.ok2xx, 'num'],
    ['Redirecciones 3xx', memory.redirect3xx, sequelize.redirect3xx, 'num'],
    ['Errores 4xx', memory.clientError4xx, sequelize.clientError4xx, 'num'],
    ['Errores 5xx', memory.serverError5xx, sequelize.serverError5xx, 'num'],
    ['p95 (ms)', memory.p95, sequelize.p95, 'ms'],
    ['p99 (ms)', memory.p99, sequelize.p99, 'ms'],
    ['Mediana (ms)', memory.median, sequelize.median, 'ms'],
    ['Máximo (ms)', memory.max, sequelize.max, 'ms'],
    ['Req/s', memory.rps, sequelize.rps, 'num'],
  ];
  for (const [label, mem, seq, type] of rows) {
    const memStr = type === 'ms' ? `${mem}`.padStart(12) : String(mem).padStart(12);
    const seqStr = type === 'ms' ? `${seq}`.padStart(14) : String(seq).padStart(14);
    let diff;
    if (type === 'num') {
      diff = seq - mem;
      diff = diff > 0 ? `+${diff}` : String(diff);
    } else {
      diff = `${(Number(seq) - Number(mem)).toFixed(0)} ms`;
      if (Number(seq) > Number(mem)) diff = `+${diff}`;
    }
    console.log(`  ${label.padEnd(24)} ${memStr.padStart(12)} ${seqStr.padStart(14)}   ${diff}`);
  }
  console.log(`${bar}`);
  if (sequelize.p95 !== '-' && memory.p95 !== '-') {
    const overhead = Number(sequelize.p95) - Number(memory.p95);
    console.log(`\n  ▶ Impacto SequelizeStore en p95: ${overhead > 0 ? `+${overhead}` : overhead} ms`);
    if (overhead < 50) {
      console.log('  ▶ Veredicto: ✅ Impacto imperceptible (< 50 ms)');
    } else if (overhead < 200) {
      console.log('  ▶ Veredicto: ⚠️ Impacto leve (< 200 ms) — aceptable');
    } else {
      console.log('  ▶ Veredicto: ❌ Impacto significativo — considerar optimización');
    }
  }
  console.log(`${bar}\n`);
}

async function main() {
  console.log(`\n═══ Benchmark de Session Store ═══\n`);
  log('Paso 1: Matando procesos existentes en puerto ' + PORT);
  killProcessOnPort(PORT);
  await sleep(1000);

  // --- MemoryStore ---
  log('Paso 2: Iniciando servidor con MemoryStore...');
  const serverMem = await runServer({ SESSION_STORE: 'memory', NODE_ENV: 'development' });
  await sleep(2000);
  const readyMem = await waitForServer(`http://localhost:${PORT}/admin/login`);
  if (!readyMem) { log('ERROR: MemoryStore server no respondió'); process.exit(1); }
  log('MemoryStore listo. Ejecutando Artillery...');
  await runArtillery(REPORT_MEMORY);
  log('Artillery MemoryStore completado. Deteniendo servidor...');
  serverMem.kill('SIGTERM');
  await sleep(1000);
  killProcessOnPort(PORT);
  await sleep(1000);

  // --- SequelizeStore ---
  log('Paso 3: Iniciando servidor con SequelizeStore...');
  const serverSeq = await runServer({ NODE_ENV: 'development' });
  await sleep(3000);
  const readySeq = await waitForServer(`http://localhost:${PORT}/admin/login`);
  if (!readySeq) { log('ERROR: SequelizeStore server no respondió'); process.exit(1); }
  log('SequelizeStore listo. Ejecutando Artillery...');
  await runArtillery(REPORT_SEQUELIZE);
  log('Artillery SequelizeStore completado. Deteniendo servidor...');
  serverSeq.kill('SIGTERM');
  await sleep(1000);
  killProcessOnPort(PORT);

  // --- Comparación ---
  log('Paso 4: Generando comparativa...');
  const memory = parseReport(REPORT_MEMORY);
  const sequelize = parseReport(REPORT_SEQUELIZE);
  showComparison(memory, sequelize);
}

main().catch(err => {
  console.error('Error en benchmark:', err);
  process.exit(1);
});
