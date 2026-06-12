# Informe Final — Sistema de Control Bibliográfico (CEELA)

## Resumen Ejecutivo

Sistema web para la gestión bibliográfica académica implementado con Node.js/Express, Sequelize (MySQL) y EJS. Arquitectura MVCS con herencia de tabla por clase (Class Table Inheritance). El proyecto ha sido sometido a un proceso integral de refactorización, cobertura de pruebas y métricas de calidad de código.

| Métrica | Valor |
|---|---|
| **Tests** | 31 suites, **456 tests** — 100% pasando |
| **Cobertura (Statements)** | **97.30%** |
| **Cobertura (Branches)** | **83.84%** |
| **Cobertura (Functions)** | **97.53%** |
| **Cobertura (Lines)** | **98.96%** |
| **Líneas de código** | 44,085 (en 174 archivos) |
| **Líneas de comentarios** | 857 |
| **Comentarios vs Código** | ~1.9% |
| **CCN Promedio** | 2.30 |
| **CCN Máximo** | 9 |
| **Duplicación (líneas)** | 1.29% (11 clones) |
| **Lint** | **0 errores, 14 warnings** (↓ 14 corregidos) |
| **Archivos totales (proyecto)** | ~270 |

## Arquitectura

### Patrón MVCS (Model-View-Controller-Service)

```
Cliente → Routes → Controller → Service → Model (Sequelize) → MySQL
                      ↓
                Vista (EJS)
```

### Inyección de Dependencias Manual

Cada archivo de ruta crea e inyecta dependencias:

```js
const models = require('../models');
const Service = require('../services/x.service');
const Controller = require('../controllers/xController');
const service = new Service(models, auditoria);
const controller = new Controller(service);
```

### Class Table Inheritance

`Material` (base) → `Libro` / `Revista` / `Tesis` / `Anuario` vía `hasOne`.

`Articulo` pertenece exclusivamente a `Revista` con relación N:M a `Autor` mediante `articulo_autor`.

### Componentes

| Capa | Cantidad |
|---|---|
| **Controllers** | 12 (auth, backup, categoria, dashboard, ejemplar, material, opac, parametro, prestamo, reporte, usuario, API) |
| **Services** | 14 (articulo, auth, backup, categoria, cron, dashboard, ejemplar, material, opac, parametro, prestamo, reporte, solicitante, usuario) |
| **Models** | 14 (Anuario, Articulo, Autor, Categoria, Ejemplar, Libro, LogActividad, Material, Parametro, Prestamo, Revista, Sancion, Solicitante, UsuarioSistema) |
| **Middlewares** | 4 (auth, auditoria, errorHandler, upload) |
| **Routers** | 5 (admin, api, auth, main, opac) |

## Pruebas

### Resumen

| Tipo | Archivos | Tests | Estado |
|---|---|---|---|
| Unitarias (servicios) | 14 | ~250 | ✅ 100% |
| Unitarias (controladores) | 12 | ~80 | ✅ 100% |
| Middleware | 4 | ~40 | ✅ 100% |
| Modelos | 1 | ~15 | ✅ 100% |
| E2E (supertest) | 12 | ~60 | ✅ 100% |
| Integración (MySQL real) | 14 | ~60 | ✅ 100% |
| **Total** | **31 suites** | **456 tests** | **✅** |

### Cobertura por capa

| Capa | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| **Controllers** | 97.83% | 90.19% | 95.65% | 98.88% |
| **Services** | 93.63% | 80.10% | 96.72% | 95.79% |
| **Middleware** | 100% | 100% | 100% | 100% |
| **Models** | 100% | 100% | 100% | 100% |
| **Global** | **97.30%** | **83.84%** | **97.53%** | **98.96%** |

## Calidad de Código

### Complejidad Ciclomática (CCN)

- **Promedio:** 2.30 (bajo — fácil de mantener)
- **Máximo:** 9 (en `reporte.service.js:parseReport`)
- **Archivos analizados:** 62
- **Funciones analizadas:** 64

> **Nota:** Los controllers usan sintaxis de class field (`metodo = () => {}`), que typhonjs-escomplex no detecta. Para ver su complejidad real, consultar `reports/lint.html`.

### Duplicación

- **Clones encontrados:** 11
- **Líneas duplicadas:** 82 (1.29%)
- **Clones principales:** validaciones Create/Update en `categoriaService`, bloques de conexión DB en `scripts/`, y fragmentos de backup en `backupService`.

### ESLint

- **0 errores**, 14 warnings (↓14 corregidos en esta iteración)
- Warnings principales: `max-lines` (reporte.service.js, prestamo.service.test.js, material.service.test.js), `complexity` (parseReport: 39, benchmark-session.js), `sonarjs/cognitive-complexity`, `max-statements`

## Refactorización Aplicada

| Mejora | Detalle |
|---|---|
| **JSDoc completo** | `@requirement`, `@use_case`, `@description` en todos los controllers, modelos, routes y middleware (~52 métodos) |
| **Console.* eliminados** | `console.error` silencioso → `next(err)` en controllers. `_log()` wrapper en cron.service. |
| **Catch vacíos** | `.catch(() => {})` → logs con contexto en cron, backup |
| **Duplicación eliminada** | Clone B: `_verificarDuplicadosCrear`/`_verificarDuplicadosActualizar` → `_verificarDuplicados` unificado. Clone A: `agregarEjemplares` delega a `ejemplarService.agregar` |
| **Constantes con nombre** | `COLORES`, `MS_POR_DIA`, `TTL_PRE_RESTORE`, `DELAY_SUSPENSION`, `DELAY_BACKUP` |
| **HTML inline** | Código HTML en `app.js` → vista `views/maintenance.ejs` |
| **CCN hotspots** | `_chequearSancionActiva`, `_chequearLimitePrestamos` extraídos. `_configurarPeriodo` partido en 4. Helper `_generarReporte` |
| **OPAC** | Incorporaciones recientes: 8 → 12 materiales |
| **Rate limiting** | `keyGenerator` actualizado para IPv6 (`express-rate-limit` v8) |
| **Cobertura backup.service** | Subió de 72% → 94.65% (+22pts), 7 nuevos tests (rollback, dump data, portadas, auto-increment) |
| **Timer leaks cron** | `jest.spyOn(setTimeout)` global + `afterEach` cleanup, eliminado "worker process failed to exit" |
| **Lint warnings** | 28 → 14 (corregidos: `_next`, `_PORT`, `curly`, `var`→`let`, `let`→`const`, brace style) |

## Ramas Mergeadas

Ambas ramas fueron fusionadas a `main` sin regresiones:

- **`refactor/refactorizacion-codigo`** — Refactorización de calidad (JSDoc, constantes, CCN, duplicación, console.*, tests unitarios)
- **`integracion-test-modulos`** — Pruebas E2E, integración, estrés, middleware, modelos, benchmark

## Reportes Generados

Los siguientes reportes están disponibles en `reports/`:

| Reporte | Ruta |
|---|---|
| Dashboard principal | `reports/index.html` |
| Cobertura de tests | `reports/coverage/lcov-report/index.html` |
| ESLint (HTML) | `reports/lint.html` |
| Conteo de líneas | `reports/loc.html` |
| Complejidad Ciclomática | `reports/complexity/index.html` |
| Duplicación de código | `reports/duplication/index.html` |

## Comandos Útiles

```bash
npm test                    # Ejecutar tests unitarios (456 tests)
npm run test:e2e            # Pruebas E2E (requiere MySQL)
npm run test:integration    # Pruebas de integración (requiere MySQL)
npm run metrics             # Regenerar todos los reportes
npm run lint                # Verificar calidad de código
node scripts/migrate.js     # Crear BD + seed data
npm start                   # Iniciar servidor (puerto 3000)
```

---

*Generado el 11 de junio de 2026.*
