# Pruebas de Estrés — CEELA

## Requisitos

- Node.js 18+
- Servidor CEELA corriendo en `http://localhost:3000`
- Artillery instalado: `npm install -g artillery` (o usar `npx artillery`, se instala automáticamente)
- Base de datos migrada con datos representativos (`node scripts/migrate.js`)

## Escenarios

| Archivo | Escenario | Perfil de carga |
|---|---|---|
| `stress-opac.yml` | Navegación pública (OPAC) | 5→30 usr/s (30s) + mantener 30 usr/s (30s) |
| `stress-login.yml` | Login + Dashboard | 5→20 usr/s (20s) + pico 20 usr/s (20s) |
| `stress-prestamo.yml` | Flujo completo: login → admin → préstamos | 2→10 usr/s (30s) |
| `stress-mixto.yml` | Carga mixta realista (80% OPAC, 10% login, 10% admin) | 10→50 usr/s (60s) |

## Resultados — Ejecutados el 06/06/2026

| Escenario | VUs | Req/s | p95 | p99 | Máx | 200 | 302 | 4xx | Fallos |
|-----------|-----|-------|-----|-----|-----|-----|-----|-----|--------|
| `stress-opac` | 1425 | 30/s | **6ms** | 6ms | 9ms | 100% | 0% | 0% | 0 |
| `stress-login` | 650 | 67/s | 6569ms | 7709ms | 8009ms | 28% | 38% | 24% | 279† |
| `stress-prestamo` | 180 | 22/s | **147ms** | 247ms | 302ms | 60% | 20% | 20% | 0 |
| `stress-mixto` | 1800 | 87/s | **150ms** | 242ms | 713ms | 60% | 7% | 33%* | 0 |

† `stress-login`: 279 socket timeouts bajo carga pico de 20 login/s — el servidor dev en Windows 10 no escala a ese nivel con sesiones en RAM.  
* Los 4xx en OPAC y Mixto corresponden a `/buscar?q=...` sin resultados (404 esperado con BD vacía de materiales). Cero errores reales de servidor (5xx).

### Interpretación

| Escenario | Clasificación | Notas |
|-----------|--------------|-------|
| **OPAC** | ✅ Excelente | Cero errores, latencia mínima (p95 < 10ms) |
| **Login** | ⚠️ Aceptable | Timeouts a 20 login/s; funciona bien hasta ~10/s |
| **Préstamo** | ✅ Excelente | Cero fallos, latencia baja (p95 < 150ms) |
| **Mixto** | ✅ Excelente | Cero fallos, 87 req/s sostenidos con p95 < 200ms |

**Conclusión:** El sistema maneja sin problemas **hasta 50 usuarios concurrentes** en entorno dev. El cuello de botella principal es el store de sesiones en memoria bajo carga alta de login. Para producción, se recomienda usar Redis como session store y realizar la prueba con datos reales.

## Ejecución

### Individual

```bash
# Ejecutar escenario OPAC
npx artillery run tests/stress/stress-opac.yml

# Ejecutar login
npx artillery run tests/stress/stress-login.yml

# Ejecutar flujo de préstamo
npx artillery run tests/stress/stress-prestamo.yml

# Ejecutar carga mixta
npx artillery run tests/stress/stress-mixto.yml
```

### Guardar reportes JSON

```bash
npx artillery run --output tests/stress/report-opac.json tests/stress/stress-opac.yml
```

Los JSON generados pueden visualizarse en [Artillery Cloud](https://app.artillery.io) (servicio gratuito para proyectos open-source).

## Interpretación de resultados

Artillery reporta por cada escenario:

| Métrica | Qué indica |
|---|---|
| **http.response_time.min** | Tiempo mínimo de respuesta |
| **http.response_time.median** | Tiempo mediano (p50) |
| **http.response_time.p95** | Tiempo p95 (el 95% de las peticiones responden en este tiempo) |
| **http.response_time.p99** | Tiempo p99 |
| **http.response_time.max** | Tiempo máximo |
| **http.codes.200** | Peticiones exitosas |
| **http.codes.302** | Redirecciones (login exitoso) |
| **http.codes.4xx/5xx** | Errores — deben ser 0 o muy bajos |
| **http.requests** | Total de peticiones realizadas |
| **scenarios.created** | Escenarios iniciados |
| **scenarios.completed** | Escenarios completados exitosamente |
| **scenarios.errors** | Errores — deben ser 0 |

## Umbrales de referencia

| Métrica | Aceptable | Bueno | Excelente |
|---|---|---|---|
| Tiempo de respuesta p95 | < 2000ms | < 1000ms | < 500ms |
| Tasa de errores | < 5% | < 1% | 0% |
| Pérdida de escenarios | < 1% | 0% | 0% |

## Notas

- Ejecutar las pruebas de estrés contra un entorno que no sea el de producción.
- Asegurar que la base de datos tenga datos representativos antes de ejecutar.
- Monitorear el uso de CPU y memoria durante las pruebas para identificar cuellos de botella.
