/**
 * @requirement RF-39 (Aviso de expiración de sesión por inactividad)
 * @use_case CU-39 (Aviso de expiración de sesión)
 * @description Temporizador de inactividad del panel administrativo. Avisa un minuto
 * antes de la expiración y, al cumplirse el tiempo, redirige al login donde se muestra
 * el diálogo de "sesión expirada".
 */
(function () {
    'use strict';

    var config = window.CEELA_SESION || {};
    var TTL = config.ttlMs || 900000;
    var AVISO = config.avisoPrevioMs || 60000;
    var UMBRAL_AVISO = Math.max(TTL - AVISO, 0);
    var EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

    var ultimaActividad = Date.now();
    var avisoAbierto = false;
    var terminado = false;
    var intervaloAviso = null;

    function detenerContador() {
        if (intervaloAviso) {
            clearInterval(intervaloAviso);
            intervaloAviso = null;
        }
    }

    function irAlLoginPorExpiracion() {
        if (terminado) { return; }
        terminado = true;
        window.location.href = '/admin/login?expirada=1';
    }

    function registrarActividad() {
        if (avisoAbierto || terminado) { return; }
        ultimaActividad = Date.now();
    }

    function continuarSesion() {
        fetch('/admin/sesion/ping', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        }).then(function (res) {
            // Si requiereAuth redirigió al login, la sesión ya había expirado.
            if (!res.ok || res.redirected) { throw new Error('sesion_expirada'); }
            avisoAbierto = false;
            ultimaActividad = Date.now();
            if (window.Toast) {
                var minutos = Math.round(TTL / 60000);
                window.Toast.fire({
                    icon: 'success',
                    title: 'Sesión extendida ' + minutos + (minutos === 1 ? ' minuto' : ' minutos')
                });
            }
        }).catch(function () {
            irAlLoginPorExpiracion();
        });
    }

    function cerrarSesion() {
        terminado = true;
        window.location.href = '/admin/logout';
    }

    function mostrarAviso() {
        if (avisoAbierto || terminado) { return; }
        avisoAbierto = true;
        var segundos = Math.max(1, Math.round(AVISO / 1000));
        Swal.fire({
            icon: 'question',
            title: '¿Sigues ahí?',
            html: 'Tu sesión expirará en <strong id="ceela-sesion-segundos">' + segundos + '</strong> segundos por inactividad.',
            confirmButtonText: 'Continuar sesión',
            cancelButtonText: 'Cerrar sesión',
            confirmButtonColor: '#2c5f4f',
            cancelButtonColor: '#6c757d',
            showCancelButton: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            timer: AVISO,
            timerProgressBar: true,
            didOpen: function () {
                var restantes = segundos;
                var etiqueta = document.getElementById('ceela-sesion-segundos');
                intervaloAviso = setInterval(function () {
                    restantes = Math.max(0, restantes - 1);
                    if (etiqueta) { etiqueta.textContent = String(restantes); }
                }, 1000);
            },
            willClose: detenerContador
        }).then(function (result) {
            detenerContador();
            if (result.isConfirmed) {
                continuarSesion();
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                cerrarSesion();
            } else {
                irAlLoginPorExpiracion();
            }
        });
    }

    function revisar() {
        if (terminado || avisoAbierto) { return; }
        var inactivo = Date.now() - ultimaActividad;
        if (inactivo >= TTL) {
            irAlLoginPorExpiracion();
        } else if (inactivo >= UMBRAL_AVISO) {
            mostrarAviso();
        }
    }

    EVENTOS.forEach(function (evento) {
        document.addEventListener(evento, registrarActividad, { passive: true });
    });

    setInterval(revisar, 1000);
})();
