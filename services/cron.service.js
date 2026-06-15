/**
 * @requirement RF-19 (Suspensión automática por morosidad extrema), RF-29 (Backup automático diario)
 * @use_case CU-19, CU-29
 * @description Tareas programadas del sistema: suspensión automática y backup diario.
 */
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const MS_POR_DIA = 86400000;
const DELAY_SUSPENSION = 30000;
const DELAY_BACKUP = 45000;

class CronService {
  constructor(models, auditoria, backupService, parametroService) {
    this.models = models;
    this.Prestamo = models.Prestamo;
    this.Solicitante = models.Solicitante;
    this.Sancion = models.Sancion;
    this.Ejemplar = models.Ejemplar;
    this.Material = models.Material;
    this.auditoria = auditoria;
    this.backupService = backupService;
    this.parametroService = parametroService;
    this.Op = models.sequelize.constructor.Op;
    this._backupTask = null;
  }

  _log(level, msg) {
    const prefix = `[Cron]`;
    if (level === 'error') {
      console.error(`${prefix} ${msg}`);
    } else {
      console.log(`${prefix} ${msg}`);
    }
  }

  async _aplicarSuspensionesPorVencimiento(hoy) {
    const vencidos = await this.Prestamo.findAll({
      where: {
        estado: 'Activo',
        fechaDevolucionPrevista: { [this.Op.lt]: hoy },
        fechaDevolucionReal: null
      },
      include: [{ model: this.Solicitante }]
    });

    for (const prestamo of vencidos) {
      const solicitante = prestamo.Solicitante;
      if (!solicitante || solicitante.estado === 'Suspendido permanente') {continue;}
      if (solicitante.estado === 'Suspendido temporal') {continue;}

      const retraso = Math.floor((hoy - new Date(prestamo.fechaDevolucionPrevista)) / MS_POR_DIA);
      const factorSancion = await this.parametroService.obtener('factor_sancion', 2);
      const suspensionMaxima = await this.parametroService.obtener('suspension_maxima', 30);
      const diasSancion = Math.min(retraso * factorSancion, suspensionMaxima);
      const fechaFin = new Date(hoy);
      fechaFin.setDate(fechaFin.getDate() + diasSancion);

      await this.Sancion.create({
        solicitanteCedula: solicitante.cedula,
        motivo: `Suspensión automática por retraso de ${retraso} días`,
        fechaInicio: hoy, diasSancion, fechaFin
      });
      await solicitante.update({ estado: 'Suspendido temporal', fechaFinSuspension: fechaFin });
      await this.auditoria({
        accion: 'SUSPENSION_AUTOMATICA',
        tablaAfectada: 'solicitante',
        registroId: solicitante.cedula,
        valorNuevo: { estado: 'Suspendido temporal', diasSancion, fechaFin }
      });
    }
    return vencidos.length;
  }

  async _elevarSuspensionesVencidasAPermanente(hoy) {
    const suspendidosVencidos = await this.Solicitante.findAll({
      where: { estado: 'Suspendido temporal', fechaFinSuspension: { [this.Op.lt]: hoy } },
      include: [{
        model: this.Prestamo,
        where: { estado: 'Activo', fechaDevolucionReal: null },
        required: false
      }]
    });

    for (const solicitante of suspendidosVencidos) {
      const tienePrestamoActivo = (solicitante.Prestamos || []).length > 0;
      if (!tienePrestamoActivo) {continue;}

      await solicitante.update({ estado: 'Suspendido permanente', fechaFinSuspension: null });
      await this.auditoria({
        accion: 'SUSPENSION_PERMANENTE',
        tablaAfectada: 'solicitante',
        registroId: solicitante.cedula,
        valorNuevo: { estado: 'Suspendido permanente' }
      });
    }
    return suspendidosVencidos.length;
  }

  async ejecutarSuspensionAutomatica() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [contVencidos, contSuspendidos] = await Promise.all([
      this._aplicarSuspensionesPorVencimiento(hoy),
      this._elevarSuspensionesVencidasAPermanente(hoy)
    ]);
    this._log('info', `Suspensión automática ejecutada: ${contVencidos} vencidos, ${contSuspendidos} suspendidos revisados`);
  }

  _existeBackupDelDia(ruta) {
    if (!fs.existsSync(ruta)) {return false;}
    const hoy = new Date();
    const y = hoy.getFullYear();
    const M = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    const prefijo = `backup_${y}-${M}-${d}`;
    return fs.readdirSync(ruta).some(f => f.startsWith(prefijo) && f.endsWith('.zip'));
  }

  async ejecutarBackupAutomatico() {
    if (!this.backupService) {return;}

    try {
      const habilitado = await this.parametroService.obtenerTexto('backup_auto_habilitado', '0');
      if (habilitado !== '1') {return;}

      const ruta = await this.parametroService.obtenerTexto('ruta_backup_automatico');
      if (!ruta) {
        this._log('warn', 'Backup automático: ruta no configurada, omitiendo');
        return;
      }
      if (!fs.existsSync(ruta)) {
        this._log('warn', 'Backup automático: ruta no accesible, omitiendo');
        return;
      }

      // Evitar duplicados del mismo día
      if (this._existeBackupDelDia(ruta)) {
        this._log('warn', 'Backup automático: ya existe backup del día actual, omitiendo');
        return;
      }

      const backup = await this.backupService.generarBackup(null);
      const destino = path.join(ruta, backup.nombre);
      fs.copyFileSync(backup.ruta, destino);
      this.backupService.limpiarBackup(backup.ruta);

      // Rotación: conservar solo los 7 más recientes
      const archivos = fs.readdirSync(ruta)
        .filter(f => f.startsWith('backup_') && f.endsWith('.zip'))
        .map(f => ({ nombre: f, ruta: path.join(ruta, f), mtime: fs.statSync(path.join(ruta, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);

      if (archivos.length > 7) {
        archivos.slice(7).forEach(f => fs.unlinkSync(f.ruta));
      }

      this._log('info', `Backup automático completado: ${backup.nombre}`);
    } catch (err) {
          this._log('error', `Error en backup automático: ${err.message}`);
    }
  }

  _horaAExpresionCron(hora) {
    const [hh, mm] = hora.split(':').map(Number);
    return `${mm} ${hh} * * *`;
  }

  reprogramarBackup() {
    if (this._backupTask) {
      this._backupTask.destroy();
      this._backupTask = null;
    }

    this.parametroService.obtenerTexto('hora_backup_automatico', '09:00').then(hora => {
      const expresion = this._horaAExpresionCron(hora);
      this._backupTask = cron.schedule(expresion, () => {
        this.ejecutarBackupAutomatico().catch(err => {
      this._log('error', `Error en backup automático: ${err.message}`);
        });
      });
      this._log('info', `Backup reprogramado a las ${hora} (${expresion})`);
    });
  }

  async _verificarBackupPendienteAlIniciar() {
    try {
      const habilitado = await this.parametroService.obtenerTexto('backup_auto_habilitado', '0');
      if (habilitado !== '1') {return;}

      const ruta = await this.parametroService.obtenerTexto('ruta_backup_automatico');
      if (!ruta || !fs.existsSync(ruta)) {return;}

      if (!this._existeBackupDelDia(ruta)) {
        this._log('info', 'Inicio: no hay backup del día actual, ejecutando...');
        await this.ejecutarBackupAutomatico();
      }
    } catch (err) {
      this._log('error', `Error en verificación de backup al iniciar: ${err.message}`);
    }
  }

  async verificarRutaBackup() {
    const ruta = await this.parametroService.obtenerTexto('ruta_backup_automatico');
    if (!ruta) {return { configurada: false, accesible: false, mensaje: 'Ruta no configurada' };}
    const accesible = fs.existsSync(ruta);
    const tieneBackupHoy = accesible ? this._existeBackupDelDia(ruta) : false;
    return { configurada: true, accesible, tieneBackupHoy, mensaje: accesible ? null : 'La ruta configurada no es accesible' };
  }

  iniciar() {
    // Suspensión automática: cada día a las 02:00
    cron.schedule('0 2 * * *', () => {
      this.ejecutarSuspensionAutomatica().catch(err => {
        this._log('error', `Error en suspensión automática: ${err.message}`);
      });
    });

    // Backup automático: programado dinámicamente según hora_backup_automatico
    this.reprogramarBackup();

    // Ejecutar también al iniciar para detectar rezagados
    setTimeout(() => {
      this.ejecutarSuspensionAutomatica().catch(err => {
        this._log('error', `Error en suspensión automática al iniciar: ${err.message}`);
      });
    }, DELAY_SUSPENSION);

    // Verificar si hay backup pendiente del día al iniciar
    setTimeout(() => {
      this._verificarBackupPendienteAlIniciar().catch(err => {
        this._log('error', `Error en verificación de backup al iniciar: ${err.message}`);
      });
    }, DELAY_BACKUP);

    this._log('info', 'Tareas programadas iniciadas');
  }
}

module.exports = CronService;
