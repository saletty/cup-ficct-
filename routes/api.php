<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BitacoraController;
use App\Http\Controllers\CarreraController;
use App\Http\Controllers\InscripcionController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\RegistroController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\PermisoController;
use App\Http\Controllers\UsuarioController;

/* ============================================================
   RUTAS PÚBLICAS — sin autenticación
   ============================================================ */

Route::prefix('v1')->group(function () {

    // CU1 — Inicio de sesión (email o CI + contraseña)
    Route::post('/login', [AuthController::class, 'login']);

    // Restablecimiento de contraseña (olvidé mi clave)
    Route::post('/password/solicitar',    [PasswordController::class, 'solicitar']);
    Route::post('/password/restablecer',  [PasswordController::class, 'restablecer']);

    // Registro de postulantes (flujo en 2 pasos)
    Route::prefix('registro')->group(function () {
        Route::get('/carreras',         [RegistroController::class, 'carreras']);    // catálogo
        Route::post('/verificar-ci',    [RegistroController::class, 'verificarCI']); // Paso 2a
        Route::post('/completar',       [RegistroController::class, 'completar']);   // Paso 2b
    });
});

/* ============================================================
   RUTAS PROTEGIDAS — requieren token Sanctum
   ============================================================ */

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {

    // CU2 — Cerrar sesión
    Route::post('/logout', [AuthController::class, 'logout']);

    // Cambio de contraseña (obligatorio si debe_cambiar_contrasena = true)
    Route::post('/password/cambiar', [PasswordController::class, 'cambiar']);

    // Rutas que requieren contraseña ya cambiada
    Route::middleware('cambio.contrasena')->group(function () {

        // CU3 — Gestionar Usuarios
        Route::apiResource('usuarios', UsuarioController::class);

        // CU4 — Gestionar Roles
        Route::apiResource('roles', RolController::class);

        // CU5 — Gestionar Permisos
        Route::get('/permisos',                              [PermisoController::class, 'index']);
        Route::get('/roles/{rol}/permisos',                  [PermisoController::class, 'permisosPorRol']);
        Route::post('/roles/{rol}/permisos',                 [PermisoController::class, 'asignar']);
        Route::post('/roles/{rol}/permisos/{permiso}',       [PermisoController::class, 'agregar']);
        Route::delete('/roles/{rol}/permisos/{permiso}',     [PermisoController::class, 'quitar']);

        // Registro Paso 1 — sólo el operador (con auth) registra el CI inicial
        Route::post('/registro/operador', [RegistroController::class, 'registrarCI']);

        // CU6 — Bitácora del sistema
        Route::get('/bitacora', [BitacoraController::class, 'index']);

        // CU7 — Gestionar Carreras
        Route::apiResource('carreras', CarreraController::class);

        // CU8 — Gestionar Postulantes
        Route::get('/postulantes',               [PostulanteController::class, 'index']);
        Route::get('/postulantes/{ci}',           [PostulanteController::class, 'show']);
        Route::put('/postulantes/{ci}',           [PostulanteController::class, 'update']);
        Route::delete('/postulantes/{ci}',        [PostulanteController::class, 'destroy']);

        // CU9 — Información de Bachillerato
        Route::get('/postulantes/{ci}/bachillerato',  [PostulanteController::class, 'bachillerato']);
        Route::put('/postulantes/{ci}/bachillerato',  [PostulanteController::class, 'actualizarBachillerato']);

        // CU10 — Inscripción al CUP
        Route::get('/inscripciones/convocatorias',         [InscripcionController::class, 'convocatorias']);
        Route::get('/inscripciones',                       [InscripcionController::class, 'index']);
        Route::post('/inscripciones',                      [InscripcionController::class, 'store']);
        Route::get('/inscripciones/postulante/{ci}',       [InscripcionController::class, 'porPostulante']);
        Route::put('/inscripciones/{id}',                  [InscripcionController::class, 'update']);
    });
});
