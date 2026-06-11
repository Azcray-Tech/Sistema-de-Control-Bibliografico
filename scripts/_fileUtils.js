/**
 * @requirement RF-METRICS
 * @use_case CU-METRICS
 * @description Utilidades compartidas para recorrido de archivos.
 *   Uso: const { walkFiles } = require('./_fileUtils');
 */
const fs = require('fs');
const path = require('path');

/**
 * Recorre recursivamente un directorio y retorna archivos que coincidan con las extensiones dadas.
 *
 * @param {string}   rootDir          - Directorio raíz absoluto.
 * @param {string[]} extensions       - Extensiones a incluir (ej. ['.js', '.sql']).
 * @param {string[]} excludeSegments  - Segmentos de ruta a excluir (ej. ['node_modules', '.git']).
 * @returns {string[]} Lista de rutas absolutas de archivos encontrados.
 */
function walkFiles(rootDir, extensions, excludeSegments) {
  const files = [];

  function _isExcluded(relPath) {
    const normalized = relPath.split(path.sep).join('/');
    const segments = normalized.split('/');
    return segments.some(seg => excludeSegments.includes(seg));
  }

  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d); } catch { return; }
    for (const entry of entries) {
      const full = path.join(d, entry);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      const rel = path.relative(rootDir, full);
      if (_isExcluded(rel)) { continue; }
      if (stat.isDirectory()) {
        walk(full);
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        files.push(full);
      }
    }
  }
  walk(rootDir);
  return files;
}

module.exports = { walkFiles };
