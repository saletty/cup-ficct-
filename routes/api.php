<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AsignacionDocenteController;
use App\Http\Controllers\AulaController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BitacoraController;
use App\Http\Controllers\CarreraController;
use App\Http\Controllers\ConvocatoriaController;
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\InscripcionController;
use App\Http\Controllers\MateriaController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\RegistroController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\PermisoController;
use App\Http\Controllers\UsuarioController;

/* ============================================================
   PÚBLICAS — sin autenticación
   ============================================================ */
Route::prefix('v1')->group(function () {
    Route::post('/login',                [AuthController::class, 'login']);
    Route::post('/password/solicitar',   [PasswordController::class, 'solicitar']);
    Route::post('/password/restablecer', [PasswordController::class, 'restablecer']);

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

    /* ── Coordinador: convocatorias (CU11) ── */
    Route::middleware('permiso:Gestionar convocatorias')->group(function () {
        Route::apiResource('convocatorias', ConvocatoriaController::class);
    });

    /* ── Coordinador: grupos y horarios (CU14) ── */
    Route::middleware('permiso:Gestionar grupos')->group(function () {
        Route::get('/grupos',                                             [GrupoController::class, 'index']);
        Route::post('/grupos',                                            [GrupoController::class, 'store']);
        Route::get('/grupos/{grupoId}/{convocatoriaId}',                  [GrupoController::class, 'show']);
        Route::put('/grupos/{grupoId}/{convocatoriaId}',                  [GrupoController::class, 'update']);
        Route::delete('/grupos/{grupoId}/{convocatoriaId}',               [GrupoController::class, 'destroy']);
        Route::get('/grupos/{grupoId}/{convocatoriaId}/horarios',         [GrupoController::class, 'horarios']);
        Route::post('/grupos/{grupoId}/{convocatoriaId}/horarios',        [GrupoController::class, 'agregarHorario']);
        Route::delete('/grupos/{grupoId}/{convocatoriaId}/horarios/{id}', [GrupoController::class, 'quitarHorario']);
        Route::apiResource('aulas', AulaController::class)->parameters(['aulas' => 'nro']);
    });

    /* ── Coordinador: docentes y asignaciones (CU12, CU13) ── */
    Route::middleware('permiso:Gestionar docentes')->group(function () {
        Route::apiResource('docentes', DocenteController::class)
            ->parameters(['docentes' => 'ci'])
            ->except(['show']);
        Route::get('/asignaciones',        [AsignacionDocenteController::class, 'index']);
        Route::post('/asignaciones',       [AsignacionDocenteController::class, 'store']);
        Route::delete('/asignaciones/{id}',[AsignacionDocenteController::class, 'destroy']);
        Route::apiResource('materias', MateriaController::class);
    });

    /* ── Docente: ver su propia carga horaria (CU13)
         También accesible para quien gestiona docentes ── */
    Route::get('/docentes/{ci}', [DocenteController::class, 'show'])
        ->middleware('permiso:Ver carga horaria propia,Gestionar docentes');
    Route::get('/docentes/{ci}/carga-horaria', [AsignacionDocenteController::class, 'cargaHoraria'])
        ->middleware('permiso:Ver carga horaria propia,Gestionar docentes');

    /* ── Docente: registrar asistencia ── */
    // (Endpoint futuro, ya protegido con el permiso)
    // Route::post('/asistencia', [...])
    //     ->middleware('permiso:Registrar asistencia');

    /* ── Operador + Cajero: gestionar postulantes (CU8, CU9) ── */
    Route::middleware('permiso:Gestionar postulantes')->group(function () {
        Route::post('/registro/operador',            [RegistroController::class, 'registrarCI']);
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
});
