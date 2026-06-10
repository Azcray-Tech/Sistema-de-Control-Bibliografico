# AGENTS.md — CEELA Bibliographic Control System

## Commands
```
npm run dev                         # Dev server (nodemon)
npm start                           # Production
npm test                            # Jest (--passWithNoTests — exit 0 si no hay tests)
npm run test:watch                  # Jest watch mode
npm run lint                        # ESLint 8 (falla sin .eslintrc*)
node scripts/migrate.js             # Create DB schema + seed (must run before first start)
node scripts/clear_data.js          # Wipe transactional data, keep seeds (admin, categories, params)
node scripts/complexity.js          # CCN analysis via typhonjs-escomplex (reports/complexity/)
npx jest tests/<file>               # Focused test
npx jest --watch                    # Watch mode
```

## Setup
- Copy `.env.example` → `.env`. DB: `ceela_biblioteca` on `127.0.0.1:3306`.
- **Must run** `node scripts/migrate.js` before first start (creates tables via `scripts/schema.sql`, seeds admin/categories/params).
- `sequelize.sync({ alter: false })` on every startup — no auto-migrations. Schema changes go in `scripts/schema.sql`.
- Default admin credentials: `admin` / `admin123`.
- Session TTL: 15 min (`app.js:24`). Relevant for auth testing.
- File uploads: `public/images/covers/`, max 3MB, JPG/PNG/WebP only (`middleware/upload.js`). Directory must exist (gitignored except `default.jpg`).

## Architecture
**MVCS**: Models → Controllers → Services, wired in route files.

### Controllers
- ES6 classes, **arrow function properties** for methods (preserves `this`, no `.bind()`).
- Constructor receives **services only**.
- No business logic — extract `req` params, call service, send response.
- Export the **class**, never an instance.

### Services
- One class per domain aggregate. Constructor receives models (as one object) + optional `auditoria` middleware + optional sibling services.
- Business logic, validation, DB coordination live here.

### Dependency Wiring (in each `routes/*.js`)
```js
const models = require('../models');
const Service = require('../services/x.service');
const Controller = require('../controllers/xController');
const service = new Service(models, auditoria);
const controller = new Controller(service);
router.get('/', controller.listar);
```

### Models (`models/`)
- `Sequelize.define` per entity, all wired in `models/index.js` with associations.
- **Class Table Inheritance**: `Material` (base) → `Libro`/`Revista`/`Tesis`/`Anuario` via `hasOne`.
- Junction tables defined inline: `MaterialAutor`, `ArticuloAutor`.
- Singleton Sequelize instance in `config/database.js`.

### Routes
- `/admin/*` — auth-protected (`middleware/auth.js: requiereAuth`), dashboard, CRUD, loans
- `/` — public OPAC (search, browse)
- `/api/*` — JSON endpoints (solicitantes, ejemplares)
- `/admin/login`, `/admin/logout` — auth (`routes/auth.js`)

## Domain Rules (Academic — non-negotiable)
- Base entity: **`Material`** (never "Publicacion" or "Item").
- Subtypes: `Libro`, `Revista`, `Tesis`, `Anuario`.
- `Articulo` belongs to `Revista` only; **N:M** with `Autor` via junction table `articulo_autor` (Sequelize `belongsToMany`).
- DB columns: `snake_case`. JS properties: `camelCase`.

## Code Annotations
Every route, controller method, and model MUST have JSDoc tags:
```js
/**
 * @requirement RF-XX
 * @use_case CU-XX
 * @description ...
 */
```

## Testing
- **Jest** with `--passWithNoTests`. No real DB needed — tests use mocks.
- **Mock factory**: `tests/mocks/models.js` — `crearMocksModelos()` returns all model mocks; `mockAuditoria` is a `jest.fn()`. Pass directly to service/controller constructors (DI).
- Test setup (`tests/setup.js`): `process.env.NODE_ENV = 'test'`.
