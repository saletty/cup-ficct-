<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VerificarCambioContrasena
 *
 * Bloquea todas las rutas protegidas si el usuario inició sesión
 * con una contraseña temporal y aún no la ha cambiado.
 * Sólo permite el acceso al endpoint de cambio de contraseña.
 */
class VerificarCambioContrasena
{
    // Rutas permitidas aunque debe_cambiar_contrasena = true
    private const RUTAS_PERMITIDAS = [
        'api/v1/password/cambiar',
        'api/logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if ($usuario && $usuario->debe_cambiar_contrasena) {
            $rutaActual = $request->path();
            $permitida  = collect(self::RUTAS_PERMITIDAS)
                ->contains(fn($ruta) => $request->is($ruta));

            if (! $permitida) {
                return response()->json([
                    'mensaje'                 => 'Debe cambiar su contraseña temporal antes de continuar.',
                    'debe_cambiar_contrasena' => true,
                    'codigo'                  => 'CAMBIO_REQUERIDO',
                ], 403);
            }
        }

        return $next($request);
    }
}
