<?php

/*
 |=============================================================
 | MAPA DE CASOS DE USO — SISTEMA CUP FICCT
 |=============================================================
 | PKG 1 — GESTIÓN DE ACCESO Y SEGURIDAD
 |-------------------------------------------------------------
 | CU1  Iniciar Sesión              POST   /v1/login
 | CU2  Cerrar Sesión               POST   /v1/logout
 | CU3  Gestionar Usuarios          CRUD   /v1/usuarios
 | CU4  Gestionar Roles             CRUD   /v1/roles
 | CU5  Gestionar Permisos          GET/POST/DELETE /v1/roles/{rol}/permisos
 | CU6  Administrar Bitácora        GET    /v1/bitacora
 |-------------------------------------------------------------
 | PKG 2 — GESTIÓN DE PERSONAS Y ESTRUCTURA
 |-------------------------------------------------------------
 | CU7  Gestionar Carreras          CRUD   /v1/carreras
 | CU8  Gestionar Postulantes       CRUD   /v1/postulantes
 |      Flujo ventanilla (Paso 1)   POST   /v1/registro/operador
 |      Flujo web (Paso 2a/2b)      POST   /v1/registro/verificar-ci
 |                                  POST   /v1/registro/completar
 | CU10 Gestionar Convocatorias     CRUD   /v1/convocatorias
 | CU11 Gestionar Docentes          CRUD   /v1/docentes
 |-------------------------------------------------------------
 | PKG 3 — GESTIÓN OPERATIVA DEL CUP
 |-------------------------------------------------------------
 | CU9  Registrar Inscripción CUP   GET/POST/PUT /v1/inscripciones
 |      Mis horarios (postulante)   GET    /v1/mis-horarios
 | CU12 Asignar Carga Horaria       GET/POST/DELETE /v1/asignaciones
 |      Carga horaria propia        GET    /v1/docentes/{ci}/carga-horaria
 |      Registrar asistencia        GET/POST /v1/asistencia
 | CU13 Gestionar Grupos            CRUD   /v1/grupos/{id}/{convocatoria_id}
 |      Administrar Horarios        GET/POST/DELETE /v1/grupos/{id}/{conv}/horarios
 |      Aplicar turno               POST   /v1/grupos/{id}/{conv}/aplicar-turno
 |      Generar grupos automático   POST   /v1/grupos/generar
 |      Catálogos de apoyo          CRUD   /v1/aulas  |  /v1/materias
 | CU14 Gestionar Tipos de Pago     CRUD   /v1/tipos-pago
 | CU15 Gestionar Pagos Admisión    CRUD   /v1/pagos
 |      Pago QR (Libélula)          POST   /v1/pagos/iniciar-qr
 |      Webhook Libélula            POST   /v1/pagos/webhook  (público)
 |      Historial por postulante    GET    /v1/pagos/postulante/{ci}
 | CU16 Gestionar Exámenes          CRUD   /v1/examenes
 |      Publicar examen             POST   /v1/examenes/{id}/publicar
 |      Cronograma por grupo        GET/POST /v1/examenes/{id}/cronograma
 |      Asignar postulante          GET/POST /v1/examenes/{id}/asignaciones
 |      Auto-distribuir             POST   /v1/examenes/{id}/asignaciones/auto
 |      Quitar asignación           DELETE /v1/examenes/{id}/asignaciones/{asignId}
 | CU17 Gestionar Evaluaciones      CRUD   /v1/evaluaciones
 |      Por postulante (staff)      GET    /v1/evaluaciones/postulante/{ci}
 |      Mi examen (postulante)      GET    /v1/mi-examen
 |-------------------------------------------------------------
 | PKG 4 — GESTIÓN DE REPORTES Y ESTADÍSTICAS
 |-------------------------------------------------------------
 | CU18 Consultar Resultados        GET    /v1/mis-resultados
 | CU19 Calcular Cantidad de Grupos GET    /v1/convocatorias/{id}/calcular-grupos
 | CU20 Visualizar Dashboard        GET    /v1/dashboard/stats
 | CU21 Generar Reportes            GET    /v1/reportes/{postulantes|estadisticas|docentes}
 |=============================================================
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Reportes\DashboardController;
use App\Http\Controllers\Reportes\ReporteController;
use App\Http\Controllers\Operativa\AsignacionDocenteController;
use App\Http\Controllers\Operativa\AsistenciaController;
use App\Http\Controllers\Operativa\AulaController;
use App\Http\Controllers\Seguridad\AuthController;
use App\Http\Controllers\Seguridad\BitacoraController;
use App\Http\Controllers\Personas\CarreraController;
use App\Http\Controllers\Personas\ConvocatoriaController;
use App\Http\Controllers\Personas\DocenteController;
use App\Http\Controllers\Operativa\GrupoController;
use App\Http\Controllers\Operativa\InscripcionController;
use App\Http\Controllers\Operativa\MateriaController;
use App\Http\Controllers\Operativa\EvaluacionController;
use App\Http\Controllers\Operativa\ExamenAdmisionController;
use App\Http\Controllers\Operativa\PagoController;
use App\Http\Controllers\Seguridad\PasswordController;
use App\Http\Controllers\Personas\PostulanteController;
use App\Http\Controllers\Personas\RegistroController;
use App\Http\Controllers\Seguridad\RolController;
use App\Http\Controllers\Seguridad\PermisoController;
use App\Http\Controllers\Operativa\TipoPagoController;
use App\Http\Controllers\Seguridad\UsuarioController;

/* ============================================================
   PÚBLICAS — sin autenticación
   ============================================================ */
Route::prefix('v1')->group(function () {
    Route::post('/login',                [AuthController::class, 'login']);
    Route::post('/password/solicitar',   [PasswordController::class, 'solicitar']);
    Route::post('/password/restablecer', [PasswordController::class, 'restablecer']);

    // Webhook Libélula — público, validado por token secreto en cabecera
    Route::post('/pagos/webhook', [PagoController::class, 'webhookLibelula']);

    Route::prefix('registro')->group(function () {
        Route::get('/carreras',      [RegistroController::class, 'carreras']);
        Route::post('/verificar-ci', [RegistroController::class, 'verificarCI']);
        Route::post('/completar',    [RegistroController::class, 'completar']);
    });
});

/* ============================================================
   PROTEGIDAS — Sanctum + contraseña cambiada
   ============================================================ */
Route::prefix('v1')->middleware(['auth:sanctum', 'cambio.contrasena'])->group(function () {

    // CU2 — Cerrar sesión (cualquier usuario autenticado)
    Route::post('/logout', [AuthController::class, 'logout'])->withoutMiddleware('cambio.contrasena');
    Route::post('/password/cambiar', [PasswordController::class, 'cambiar'])->withoutMiddleware('cambio.contrasena');

    /* ── Administrador: usuarios, roles, permisos, bitácora ── */
    Route::middleware('permiso:Gestionar usuarios')->group(function () {
        Route::post('/usuarios/importar-postulantes', [UsuarioController::class, 'importarPostulantes']);
        Route::post('/usuarios/importar-docentes',    [UsuarioController::class, 'importarDocentes']);
        Route::apiResource('usuarios', UsuarioController::class);
        Route::apiResource('roles', RolController::class);
        Route::get('/permisos',                          [PermisoController::class, 'index']);
        Route::get('/roles/{rol}/permisos',              [PermisoController::class, 'permisosPorRol']);
        Route::post('/roles/{rol}/permisos',             [PermisoController::class, 'asignar']);
        Route::post('/roles/{rol}/permisos/{permiso}',   [PermisoController::class, 'agregar']);
        Route::delete('/roles/{rol}/permisos/{permiso}', [PermisoController::class, 'quitar']);
        Route::get('/bitacora',                          [BitacoraController::class, 'index']);
    });

    /* ── Coordinador: carreras ── */
    Route::middleware('permiso:Gestionar carreras')->group(function () {
        Route::apiResource('carreras', CarreraController::class);
    });

    /* ── Coordinador: convocatorias (CU10) + cálculo de grupos (CU19) ── */
    Route::middleware('permiso:Gestionar convocatorias')->group(function () {
        Route::apiResource('convocatorias', ConvocatoriaController::class);
        Route::get('/convocatorias/{id}/calcular-grupos', [ConvocatoriaController::class, 'calcularGrupos']);
    });

    /* ── Coordinador: grupos y horarios (CU13) ── */
    Route::middleware('permiso:Gestionar grupos')->group(function () {
        Route::get('/grupos',                                             [GrupoController::class, 'index']);
        Route::post('/grupos',                                            [GrupoController::class, 'store']);
        Route::get('/grupos/{grupoId}/{convocatoriaId}',                  [GrupoController::class, 'show']);
        Route::put('/grupos/{grupoId}/{convocatoriaId}',                  [GrupoController::class, 'update']);
        Route::delete('/grupos/{grupoId}/{convocatoriaId}',               [GrupoController::class, 'destroy']);
        Route::get('/grupos/{grupoId}/{convocatoriaId}/horarios',                [GrupoController::class, 'horarios']);
        Route::post('/grupos/{grupoId}/{convocatoriaId}/horarios',               [GrupoController::class, 'agregarHorario']);
        Route::delete('/grupos/{grupoId}/{convocatoriaId}/horarios/{id}',        [GrupoController::class, 'quitarHorario']);
        Route::post('/grupos/{grupoId}/{convocatoriaId}/aplicar-turno',          [GrupoController::class, 'aplicarTurno']);
        Route::post('/grupos/generar',                                            [GrupoController::class, 'generarGrupos']);
        Route::apiResource('aulas', AulaController::class)->parameters(['aulas' => 'nro']);
    });

    /* ── Coordinador: docentes y asignaciones (CU11, CU12) ── */
    Route::middleware('permiso:Gestionar docentes')->group(function () {
        Route::apiResource('docentes', DocenteController::class)
            ->parameters(['docentes' => 'ci'])
            ->except(['show']);
        Route::get('/asignaciones',        [AsignacionDocenteController::class, 'index']);
        Route::post('/asignaciones',       [AsignacionDocenteController::class, 'store']);
        Route::delete('/asignaciones/{id}',[AsignacionDocenteController::class, 'destroy']);
        Route::apiResource('materias', MateriaController::class);
    });

    /* ── Docente: ver su propia carga horaria (CU12)
         También accesible para quien gestiona docentes ── */
    Route::get('/docentes/{ci}', [DocenteController::class, 'show'])
        ->middleware('permiso:Ver carga horaria propia,Gestionar docentes');
    Route::get('/docentes/{ci}/carga-horaria', [AsignacionDocenteController::class, 'cargaHoraria'])
        ->middleware('permiso:Ver carga horaria propia,Gestionar docentes');

    /* ── Docente: registrar asistencia ── */
    Route::middleware('permiso:Registrar asistencia')->group(function () {
        Route::get('/asistencia',  [AsistenciaController::class, 'index']);
        Route::post('/asistencia', [AsistenciaController::class, 'store']);
    });

    /* ── Operador + Cajero: gestionar postulantes (CU8, CU9) ── */
    Route::middleware('permiso:Gestionar postulantes')->group(function () {
        Route::post('/registro/operador',            [RegistroController::class, 'registrarCI']);
        Route::get('/registro/estado-ci/{ci}',       [RegistroController::class, 'estadoCI']);
        Route::get('/postulantes',                   [PostulanteController::class, 'index']);
        Route::get('/postulantes/{ci}',              [PostulanteController::class, 'show']);
        Route::put('/postulantes/{ci}',              [PostulanteController::class, 'update']);
        Route::delete('/postulantes/{ci}',           [PostulanteController::class, 'destroy']);
        Route::get('/postulantes/{ci}/bachillerato', [PostulanteController::class, 'bachillerato']);
        Route::put('/postulantes/{ci}/bachillerato', [PostulanteController::class, 'actualizarBachillerato']);
    });

    /* ── Postulante + Cajero: inscripciones (CU10) ── */
    // Las convocatorias habilitadas y las inscripciones las puede ver
    // cualquier usuario autenticado; registrar inscripción solo el propio postulante.
    Route::get('/inscripciones/convocatorias',   [InscripcionController::class, 'convocatorias']);
    Route::get('/inscripciones',                 [InscripcionController::class, 'index']);
    Route::post('/inscripciones',                [InscripcionController::class, 'store']);
    Route::get('/inscripciones/postulante/{ci}', [InscripcionController::class, 'porPostulante']);
    Route::put('/inscripciones/{id}',            [InscripcionController::class, 'update']);

    /* ── Ver reportes: Coordinador y Cajero ── */
    // Route::get('/reportes', ...)->middleware('permiso:Ver reportes');

    /* ── CU14: Tipos de pago ── */
    // GET disponible también para Cajero (necesita el catálogo al registrar pagos)
    Route::get('/tipos-pago',          [TipoPagoController::class, 'index'])
        ->middleware('permiso:Gestionar tipos de pago,Gestionar pagos');
    Route::get('/tipos-pago/{id}',     [TipoPagoController::class, 'show'])
        ->middleware('permiso:Gestionar tipos de pago,Gestionar pagos');
    Route::middleware('permiso:Gestionar tipos de pago')->group(function () {
        Route::post('/tipos-pago',         [TipoPagoController::class, 'store']);
        Route::put('/tipos-pago/{id}',     [TipoPagoController::class, 'update']);
        Route::delete('/tipos-pago/{id}',  [TipoPagoController::class, 'destroy']);
    });

    /* ── CU15: Pagos de admisión ── */
    Route::middleware('permiso:Gestionar pagos')->group(function () {
        Route::get('/pagos',                      [PagoController::class, 'index']);
        Route::post('/pagos',                     [PagoController::class, 'store']);
        Route::post('/pagos/iniciar-qr',          [PagoController::class, 'iniciarQR']);
        Route::get('/pagos/{id}/estado',          [PagoController::class, 'estadoPago']);
        Route::get('/pagos/{id}',                 [PagoController::class, 'show']);
        Route::put('/pagos/{id}',                 [PagoController::class, 'update']);
        Route::delete('/pagos/{id}',              [PagoController::class, 'destroy']);
        Route::get('/pagos/postulante/{ci}',      [PagoController::class, 'porPostulante']);
    });

    /* ── CU16: Exámenes de admisión ── */
    Route::middleware('permiso:Gestionar exámenes')->group(function () {
        Route::get('/examenes',                                     [ExamenAdmisionController::class, 'index']);
        Route::post('/examenes',                                    [ExamenAdmisionController::class, 'store']);
        Route::get('/examenes/{id}',                                [ExamenAdmisionController::class, 'show']);
        Route::put('/examenes/{id}',                                [ExamenAdmisionController::class, 'update']);
        Route::delete('/examenes/{id}',                             [ExamenAdmisionController::class, 'destroy']);
        Route::post('/examenes/{id}/publicar',                      [ExamenAdmisionController::class, 'publicar']);
        Route::get('/examenes/{id}/cronograma',                     [ExamenAdmisionController::class, 'cronograma']);
        Route::post('/examenes/{id}/cronograma',                    [ExamenAdmisionController::class, 'guardarCronograma']);
        Route::get('/examenes/{id}/asignaciones',                   [ExamenAdmisionController::class, 'asignaciones']);
        Route::post('/examenes/{id}/asignaciones',                  [ExamenAdmisionController::class, 'asignar']);
        Route::post('/examenes/{id}/asignaciones/auto',             [ExamenAdmisionController::class, 'autoAsignar']);
        Route::delete('/examenes/{id}/asignaciones/{asignId}',      [ExamenAdmisionController::class, 'quitarAsignacion']);
    });

    /* ── CU17: Evaluaciones (Coordinador) ── */
    Route::middleware('permiso:Gestionar exámenes')->group(function () {
        Route::get('/evaluaciones',                     [EvaluacionController::class, 'index']);
        Route::post('/evaluaciones',                    [EvaluacionController::class, 'store']);
        Route::get('/evaluaciones/{id}',                [EvaluacionController::class, 'show']);
        Route::put('/evaluaciones/{id}',                [EvaluacionController::class, 'update']);
        Route::delete('/evaluaciones/{id}',             [EvaluacionController::class, 'destroy']);
        Route::get('/evaluaciones/postulante/{ci}',     [EvaluacionController::class, 'porPostulante']);
    });

    /* ── CU18: Consultar resultados (cualquier postulante autenticado) ── */
    Route::get('/mis-resultados', [EvaluacionController::class, 'misResultados']);
    Route::get('/mi-examen',      [ExamenAdmisionController::class, 'miExamen']);
    Route::get('/mis-horarios',   [InscripcionController::class, 'misHorarios']);

    /* ── CU20: Dashboard estadístico (cualquier usuario autenticado) ── */
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    /* ── CU21: Reportes estadísticos ── */
    Route::middleware('permiso:Ver reportes')->group(function () {
        Route::get('/reportes/postulantes',  [ReporteController::class, 'postulantes']);
        Route::get('/reportes/estadisticas', [ReporteController::class, 'estadisticas']);
        Route::get('/reportes/docentes',     [ReporteController::class, 'docentes']);
    });
});
