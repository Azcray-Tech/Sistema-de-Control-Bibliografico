# Sistema de Control Bibliográfico — CEELA

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Sequelize](https://img.shields.io/badge/Sequelize-6-52B0E7?logo=sequelize&logoColor=white)](https://sequelize.org)
[![MariaDB](https://img.shields.io/badge/MariaDB-11-003545?logo=mariadb&logoColor=white)](https://mariadb.org)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com)
[![EJS](https://img.shields.io/badge/EJS-3.1-B4CA65?logo=ejs&logoColor=white)](https://ejs.co)
[![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest&logoColor=white)](https://jestjs.io)
[![License](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

---

**Sistema web para la administración integral del inventario bibliográfico, préstamos, sanciones y catálogo público del Centro Experimental de Estudios Latinoamericanos (CEELA).**

Desarrollado para despliegue en red LAN sobre Windows Server, permite a bibliotecarios y administradores gestionar materiales académicos (libros, revistas, tesis, anuarios) y sus ejemplares, mientras que el público puede consultar el catálogo OPAC sin autenticación.

---

## Tabla de Contenidos

- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
  - [MVCS](#mvcs)
  - [Modelo de Datos](#modelo-de-datos)
- [Comenzando](#comenzando)
  - [Prerrequisitos](#prerrequisitos)
  - [Instalación](#instalación)
- [Uso](#uso)
  - [Panel de Administración](#panel-de-administración)
  - [Catálogo Público (OPAC)](#catálogo-público-opac)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Comandos Útiles](#comandos-útiles)
- [Licencia](#licencia)

---

## Características

| Módulo | Funcionalidades |
|---|---|
| **Catalogación** | Alta, edición y baja lógica de materiales con campos específicos por tipo (ISBN, ISSN, tutor, año de edición). Validación de ISBN-10/ISBN-13 e ISSN. |
| **Ejemplares** | Gestión individual de copias físicas con identificador único. Cambio de estado (Disponible, Prestado, Dañado, Perdido, etc.). |
| **Categorías** | CRUD de categorías con desactivación controlada (no se permite desactivar si tiene materiales activos asociados). |
| **Préstamos** | Registro, renovación (una vez) y devolución con cálculo automático de sanciones por retraso (días × factor, con tope configurable). Manejo de concurrencia con bloqueo pesimista. |
| **Sanciones** | Suspensión temporal o permanente de solicitantes morosos. Levantamiento manual por Administrador. |
| **OPAC** | Catálogo público sin autenticación con búsqueda simple (título/autor/sinopsis) y avanzada (filtros combinables por tipo, categoría, año, autor). |
| **Auditoría** | Registro de todas las operaciones críticas (creación, modificación, baja, préstamos, login/logout) con trazabilidad de usuario. |
| **Parámetros** | Configuración global dinámica: días de préstamo, factor de sanción, tiempo de inactividad, backups, etc. |
| **Backup/Restore** | Backup manual descargable (.zip con dump SQL + portadas). Restauración desde backup con generación automática de pre-restore. Backup automático programado vía node-cron. |
| **Autenticación** | Login con sesiones (express-session), cierre automático por inactividad (15 min configurable), roles: Administrador / Bibliotecario. |

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Backend** | [Node.js](https://nodejs.org) 18+ · [Express](https://expressjs.com) 4.18 |
| **ORM** | [Sequelize](https://sequelize.org) 6 (MySQL2 driver) |
| **Base de Datos** | [MariaDB](https://mariadb.org) 11 / MySQL 8 |
| **Frontend** | [EJS](https://ejs.co) (SSR) · [Bootstrap](https://getbootstrap.com) 5 · [Alpine.js](https://alpinejs.dev) |
| **Autenticación** | express-session · [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Archivos** | [Multer](https://github.com/expressjs/multer) (upload portadas, 3MB max, JPG/PNG/WebP) · [Sharp](https://sharp.pixelplumbing.com) |
| **Reportes** | [PDFKit](https://pdfkit.org) · [ExcelJS](https://github.com/exceljs/exceljs) |
| **Tareas Programadas** | [node-cron](https://github.com/node-cron/node-cron) |
| **Testing** | [Jest](https://jestjs.io) 30 |
| **Calidad** | [ESLint](https://eslint.org) 8 |

---

## Arquitectura

### MVCS

El sistema sigue el patrón **Model-View-Controller-Service** con inyección de dependencias en toda la cadena.

```
Cliente (Browser)
     │
     ▼
   Routes (composition root: instancia modelos → services → controllers)
     │
     ├──► Controllers (extraen req, llaman services, responden)
     │         │
     │         ▼
     │     Services (lógica de negocio, validación, coordinación BD)
     │         │
     │         ▼
     │     Models (Sequelize — definiciones y asociaciones)
     │
     └──► Views (EJS templates — solo presentación)
```

**Principios clave:**

- **Controladores**: Clases ES6, métodos como arrow functions (preservan `this`), exportan la clase no una instancia. Sin lógica de negocio — solo extraen parámetros del `req`, llaman al servicio y envían la respuesta.
- **Servicios**: Una clase por agregado de dominio. Reciben modelos (como un objeto) + auditoría opcional + servicios hermanos por constructor. Toda la lógica de negocio y coordinación transaccional reside aquí.
- **Models**: Definiciones `Sequelize.define` asociadas en `models/index.js`. Singleton de Sequelize en `config/database.js`.
- **Wiring**: Cada archivo de ruta actúa como composition root: importa modelos, instancia servicios y controladores, enlaza a rutas.

### Modelo de Datos

Herencia de tabla por clase (Class Table Inheritance):

```
Material (base)
  ├── Libro          (ISBN, editorial)
  ├── Revista        (ISSN, volumen, número, fecha)
  │     └── Articulo  (título, páginas) — N:M con Autor
  ├── Tesis          (tutor, grado académico, institución)
  └── Anuario        (año de edición)
```

**Relaciones principales:**

- `Material` N:M `Autor` vía `material_autor`
- `Articulo` N:M `Autor` vía `articulo_autor` (solo para revistas)
- `Material` 1:N `Ejemplar` (copia física con identificador único y estado)
- `Ejemplar` N:1 `Prestamo` → `Solicitante` (persona que toma prestado)
- `Prestamo` N:1 `UsuarioSistema` (bibliotecario que registra)
- `Solicitante` 1:N `Sancion`

---

## Comenzando

### Prerrequisitos

- Node.js 18+
- MariaDB 11+ o MySQL 8+
- npm 9+

### Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd "Sistema de Control Bibliografico"

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de tu base de datos
#   DB_HOST=127.0.0.1
#   DB_PORT=3306
#   DB_NAME=ceela_biblioteca
#   DB_USER=root
#   DB_PASS=tu_contraseña

# 4. Crear base de datos y sembrar datos iniciales
node scripts/migrate.js
#   Crea tablas, categorías (Literatura, Historia, etc.),
#   parámetros del sistema y usuario admin.

# 5. Iniciar servidor de desarrollo
npm run dev
# Servidor en http://localhost:3000
```

> La migración debe ejecutarse **antes** del primer inicio. `sequelize.sync({ alter: false })` se ejecuta en cada arranque, por lo que los cambios de esquema deben hacerse manualmente en `scripts/schema.sql`.

### Credenciales por Defecto

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |

---

## Uso

### Panel de Administración

Acceder a `http://localhost:3000/admin/login` e iniciar sesión.

| Ruta | Descripción |
|---|---|
| `/admin/dashboard` | Panel principal con resumen del sistema |
| `/admin/materiales` | CRUD de materiales (alta, edición, baja, gestión de ejemplares) |
| `/admin/categorias` | Gestión de categorías |
| `/admin/prestamos` | Registro, renovación y devolución de préstamos |
| `/admin/prestamos/historial` | Historial de préstamos |
| `/admin/prestamos/sanciones` | Gestión de sanciones |
| `/admin/parametros` | Configuración global dinámica (días de préstamo, factor sanción, etc.) |
| `/admin/backup` | Backup manual descargable (.zip con dump SQL + portadas) |
| `/admin/restaurar` | Restauración desde backup con pre-restore automático |
| `/admin/usuarios` | Administración de cuentas de personal (solo Administrador) |

### Catálogo Público (OPAC)

Acceder a `http://localhost:3000/` — no requiere autenticación.

- Búsqueda simple por título, autor o sinopsis
- Búsqueda avanzada con filtros combinables (tipo, categoría, año, autor)
- Ficha completa de cada material con portada, autores, metadatos y artículos (para revistas)

---

## Estructura del Proyecto

```
├── app.js                  # Punto de entrada Express
├── config/
│   └── database.js         # Singleton Sequelize
├── controllers/            # Controladores MVCS (11 archivos)
├── middleware/
│   ├── auth.js             # requiereAuth, requiereRol, cargarUsuarioSession
│   ├── auditoria.js        # Registro de operaciones en log_actividad
│   ├── errorHandler.js     # Manejador global de errores
│   └── upload.js           # Multer para portadas
├── models/                 # Definiciones Sequelize (14 entidades + 2 junction tables)
│   └── index.js            # Asociaciones y tablas pivote
├── public/                 # Archivos estáticos (CSS, JS, imágenes, fuentes)
│   └── images/covers/      # Portadas subidas
├── routes/                 # Rutas Express (4 archivos)
├── scripts/
│   ├── schema.sql          # DDL completo de la base de datos
│   ├── migrate.js          # Migración inicial + seed
│   └── clear_data.js       # Limpieza de datos transaccionales
├── services/               # Servicios MVCS (13 clases)
├── tests/                  # Pruebas unitarias con Jest
│   └── mocks/models.js     # Fábrica de mocks Sequelize
└── views/                  # Plantillas EJS
    ├── admin/              # 14 vistas del panel administrativo
    ├── public/             # 3 vistas del OPAC
    └── partials/           # Fragmentos reutilizables
```

---

## Pruebas

```bash
# Ejecutar toda la suite
npm test

# Modo watch
npm run test:watch

# Prueba específica
npx jest tests/material.service.test.js
npx jest tests/material.controller.test.js
npx jest tests/auth.service.test.js
```

Las pruebas usan **mocks** (no requieren base de datos real). La fábrica `tests/mocks/models.js` provee `crearMocksModelos()` y `mockAuditoria` para inyección directa en servicios y controladores.

---

## Comandos Útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con nodemon |
| `npm start` | Servidor de producción |
| `npm test` | Ejecutar tests (Jest) |
| `npm run lint` | Analizar código con ESLint |
| `node scripts/migrate.js` | Crear BD + seed (admin, categorías, parámetros) |
| `node scripts/clear_data.js` | Limpiar datos transaccionales, conservar seed |

---

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">
  <sub>Desarrollado para el Centro Experimental de Estudios Latinoamericanos (CEELA)</sub>
</div>
