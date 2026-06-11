<?php

namespace App\Http\Controllers\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\LoginRequest;
use App\Models\User;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * AuthController
 *
 * CU1 – Iniciar Sesión (acepta email o CI como identificador)
 * CU2 – Cerrar Sesión
 *
 * Seguridad: bloqueo temporal tras 3 intentos fallidos consecutivos (3 minutos).
 */
class AuthController extends Controller
{
    private const MAX_INTENTOS   = 3;
    private const MINUTOS_BLOQUEO = 3;

    /* ── CU1: Iniciar Sesión ────────────────────────────────────────────── */

    // [CU1·04] login(LoginRequest) — punto de entrada validado por LoginRequest (identifier + password requeridos)
    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->identifier);

        // [CU1·05] User::where(...)->with('rol.permisos')->first() — busca por CI (numérico) o email
        $usuario = is_numeric($identifier)
            ? User::where('CI', (int) $identifier)->with('rol.permisos')->first()
            : User::where('email', $identifier)->with('rol.permisos')->first();

        // [CU1·06] Retorna null → [CU1·13] HTTP 401 (no se revela si es CI o email inexistente)
        if (! $usuario) {
            return response()->json(['mensaje' => 'Credenciales incorrectas.'], 401);
        }

        /* ── [CU1·07] Verificar bloqueo temporal ────────────────────────────── */
        if ($usuario->estado === 'BLOQUEADO') {
            if ($usuario->bloqueado_hasta && now()->lessThan($usuario->bloqueado_hasta)) {
                $segundos = (int) now()->diffInSeconds($usuario->bloqueado_hasta);
                // [CU1·13] HTTP 429 — cuenta aún bloqueada, devuelve segundos restantes
                return response()->json([
                    'mensaje'        => "Cuenta bloqueada por intentos fallidos. Intente en {$segundos} segundos.",
                    'bloqueado_hasta' => $usuario->bloqueado_hasta,
                    'segundos'        => $segundos,
                ], 429);
            }

            // El bloqueo expiró → actualizarEstado() desbloquea automáticamente
            $usuario->update([
                'estado'            => 'ACTIVO',
                'intentos_fallidos' => 0,
                'bloqueado_hasta'   => null,
            ]);
        }

        /* ── [CU1·07] Verificar estado de la cuenta ─────────────────────────── */
        if ($usuario->estado === 'INACTIVO') {
            // [CU1·13] HTTP 403 — cuenta inactiva (pendiente de activación)
            return response()->json([
                'mensaje' => 'Cuenta pendiente de activación. Complete su registro en la plataforma.',
                'codigo'  => 'INACTIVO',
            ], 403);
        }

        /* ── [07] verificarContraseña() con Hash::check ──────────────────── */
        if (! Hash::check($request->password, $usuario->getAuthPassword())) {
            $intentos = $usuario->intentos_fallidos + 1;

            if ($intentos >= self::MAX_INTENTOS) {
                // [CU1·07] actualizarEstado() — bloquea la cuenta por MAX_INTENTOS fallidos
                $usuario->update([
                    'intentos_fallidos' => $intentos,
                    'estado'            => 'BLOQUEADO',
                    'bloqueado_hasta'   => now()->addMinutes(self::MINUTOS_BLOQUEO),
                ]);
                // [CU1·13] HTTP 429 — recién bloqueada
                return response()->json([
                    'mensaje'        => 'Cuenta bloqueada por ' . self::MINUTOS_BLOQUEO . ' minutos por demasiados intentos fallidos.',
                    'bloqueado_hasta' => $usuario->bloqueado_hasta,
                ], 429);
            }

            $usuario->update(['intentos_fallidos' => $intentos]);
            $restantes = self::MAX_INTENTOS - $intentos;

            // [CU1·13] HTTP 401 — contraseña incorrecta, devuelve intentos_restantes
            return response()->json([
                'mensaje'            => "Contraseña incorrecta. Le queda(n) {$restantes} intento(s) antes del bloqueo.",
                'intentos_restantes' => $restantes,
            ], 401);
        }

        /* ── Login exitoso ───────────────────────────────────────────────── */
        $usuario->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta'   => null,
        ]);

        // [CU1·08] tokens()->delete() — sesión única: revoca todos los tokens anteriores
        $usuario->tokens()->delete();
        // [CU1·08] createToken('auth-token') — genera el nuevo token Sanctum
        $token = $usuario->createToken('auth-token')->plainTextToken;
        BitacoraService::log("Inicio de sesión: {$usuario->email}", $usuario->CI);

        // [CU1·09] HTTP 200 JSON con token, debe_cambiar_contrasena, usuario y rol/permisos
        return response()->json([
            'mensaje'                 => 'Inicio de sesión exitoso.',
            'token'                   => $token,
            'debe_cambiar_contrasena' => $usuario->debe_cambiar_contrasena,
            'usuario'                 => [
                'CI'              => $usuario->CI,
                'nombre_completo' => $usuario->nombre_completo,
                'email'           => $usuario->email,
                'estado'          => $usuario->estado,
                'rol'             => $usuario->rol?->nombre,
                'permisos'        => $usuario->rol?->permisos->pluck('descripcion'),
            ],
        ]);
    }

    /* ── CU2: Cerrar Sesión ─────────────────────────────────────────────── */

    // [CU2·06] logout() — punto de entrada del cierre de sesión
    public function logout(): JsonResponse
    {
        // [CU2·07] auth()->user() — obtiene el usuario autenticado via Sanctum
        $usuario = auth()->user();
        // [CU2·10] log("Cierre de sesión...", $usuario->CI) — registra la acción
        BitacoraService::log("Cierre de sesión: {$usuario->email}", $usuario->CI);
        // [CU2·08] currentAccessToken()->delete() — invalida solo el token activo actual
        $usuario->currentAccessToken()->delete();
        // [CU2·12] HTTP 200 JSON { mensaje: 'Sesión cerrada correctamente.' }
        return response()->json(['mensaje' => 'Sesión cerrada correctamente.']);
    }
}
