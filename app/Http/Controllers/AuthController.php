<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Services\BitacoraService;
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

    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->identifier);

        // Buscar por CI (numérico) o por email
        $usuario = is_numeric($identifier)
            ? User::where('CI', (int) $identifier)->with('rol.permisos')->first()
            : User::where('email', $identifier)->with('rol.permisos')->first();

        // Usuario no encontrado — no revelar si es CI o email inexistente
        if (! $usuario) {
            return response()->json(['mensaje' => 'Credenciales incorrectas.'], 401);
        }

        /* ── Verificar bloqueo temporal ──────────────────────────────────── */
        if ($usuario->estado === 'BLOQUEADO') {
            if ($usuario->bloqueado_hasta && now()->lessThan($usuario->bloqueado_hasta)) {
                $segundos = (int) now()->diffInSeconds($usuario->bloqueado_hasta);
                return response()->json([
                    'mensaje'        => "Cuenta bloqueada por intentos fallidos. Intente en {$segundos} segundos.",
                    'bloqueado_hasta' => $usuario->bloqueado_hasta,
                    'segundos'        => $segundos,
                ], 429);
            }

            // El bloqueo expiró → desbloquear automáticamente
            $usuario->update([
                'estado'            => 'ACTIVO',
                'intentos_fallidos' => 0,
                'bloqueado_hasta'   => null,
            ]);
        }

        /* ── Verificar estado de la cuenta ───────────────────────────────── */
        if ($usuario->estado === 'INACTIVO') {
            return response()->json([
                'mensaje' => 'Cuenta pendiente de activación. Complete su registro en la plataforma.',
                'codigo'  => 'INACTIVO',
            ], 403);
        }

        /* ── Verificar contraseña ────────────────────────────────────────── */
        if (! Hash::check($request->password, $usuario->getAuthPassword())) {
            $intentos = $usuario->intentos_fallidos + 1;

            if ($intentos >= self::MAX_INTENTOS) {
                $usuario->update([
                    'intentos_fallidos' => $intentos,
                    'estado'            => 'BLOQUEADO',
                    'bloqueado_hasta'   => now()->addMinutes(self::MINUTOS_BLOQUEO),
                ]);
                return response()->json([
                    'mensaje'        => 'Cuenta bloqueada por ' . self::MINUTOS_BLOQUEO . ' minutos por demasiados intentos fallidos.',
                    'bloqueado_hasta' => $usuario->bloqueado_hasta,
                ], 429);
            }

            $usuario->update(['intentos_fallidos' => $intentos]);
            $restantes = self::MAX_INTENTOS - $intentos;

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

        // Sesión única: revocar tokens anteriores
        $usuario->tokens()->delete();
        $token = $usuario->createToken('auth-token')->plainTextToken;
        BitacoraService::log("Inicio de sesión: {$usuario->email}", $usuario->CI);

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

    public function logout(): JsonResponse
    {
        $usuario = auth()->user();
        BitacoraService::log("Cierre de sesión: {$usuario->email}", $usuario->CI);
        $usuario->currentAccessToken()->delete();

        return response()->json(['mensaje' => 'Sesión cerrada correctamente.']);
    }
}
