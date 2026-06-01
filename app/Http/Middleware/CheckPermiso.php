<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifica que el rol del usuario autenticado tenga al menos uno
 * de los permisos requeridos para acceder al endpoint.
 *
 * Uso en rutas:
 *   ->middleware('permiso:Gestionar usuarios')
 *   ->middleware('permiso:Ver carga horaria propia,Gestionar docentes')  ← OR lógico
 *
 * El Administrador pasa sin verificación (tiene todos los permisos).
 */
class CheckPermiso
{
    public function handle(Request $request, Closure $next, string ...$requeridos): Response
    {
        $usuario = auth()->user();

        if (! $usuario) {
            return response()->json(['mensaje' => 'No autenticado.'], 401);
        }

        // Administrador tiene acceso total
        if ($usuario->rol?->nombre === 'Administrador') {
            return $next($request);
        }

        $permisosRol = $usuario->rol?->permisos->pluck('descripcion')->toArray() ?? [];

        // OR: el usuario debe tener AL MENOS UNO de los permisos requeridos
        foreach ($requeridos as $permiso) {
            if (in_array($permiso, $permisosRol, true)) {
                return $next($request);
            }
        }

        return response()->json([
            'mensaje' => 'Acceso denegado: no tienes el permiso necesario para esta acción.',
            'codigo'  => 'SIN_PERMISO',
            'permiso_requerido' => $requeridos,
        ], 403);
    }
}
