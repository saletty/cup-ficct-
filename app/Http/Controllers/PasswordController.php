<?php

namespace App\Http\Controllers;

use App\Http\Requests\CambiarPasswordRequest;
use App\Mail\RestablecerPasswordMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * PasswordController
 *
 * A) Cambiar contraseña (usuario autenticado o con contraseña temporal).
 * B) Solicitar restablecimiento por correo (olvidó la contraseña).
 * C) Restablecer con el token del correo.
 */
class PasswordController extends Controller
{
    /* ── A) Cambiar contraseña (requiere estar autenticado) ─────────────── */

    public function cambiar(CambiarPasswordRequest $request): JsonResponse
    {
        /** @var \App\Models\User $usuario */
        $usuario = auth()->user();

        if (! Hash::check($request->password_actual, $usuario->getAuthPassword())) {
            return response()->json([
                'mensaje' => 'La contraseña actual es incorrecta.',
                'errors'  => ['password_actual' => ['La contraseña actual no coincide.']],
            ], 422);
        }

        $usuario->update([
            'contraseña'              => Hash::make($request->password_nueva),
            'debe_cambiar_contrasena' => false,
            'intentos_fallidos'       => 0,
        ]);

        return response()->json(['mensaje' => 'Contraseña actualizada correctamente.']);
    }

    /* ── B) Solicitar restablecimiento por correo ────────────────────────── */

    public function solicitar(Request $request): JsonResponse
    {
        $request->validate(
            ['email' => ['required', 'email']],
            ['email.required' => 'El correo electrónico es obligatorio.']
        );

        $usuario = User::where('email', $request->email)->first();

        // Respuesta genérica para evitar enumeración de correos
        $respuesta = ['mensaje' => 'Si el correo está registrado, recibirá las instrucciones en breve.'];

        if (! $usuario || ! in_array($usuario->estado, ['ACTIVO', 'BLOQUEADO'])) {
            return response()->json($respuesta);
        }

        try {
            $token = Str::random(64);
            Cache::put("pwd_reset_{$usuario->CI}", Hash::make($token), now()->addMinutes(15));
            Mail::to($usuario->email)->send(
                new RestablecerPasswordMail($usuario->nombre_completo, $token, $usuario->CI)
            );
        } catch (\Throwable $e) {
            \Log::error('[password/solicitar] falló: ' . $e->getMessage());
        }

        return response()->json($respuesta);
    }

    /* ── C) Restablecer contraseña con token del correo ─────────────────── */

    public function restablecer(Request $request): JsonResponse
    {
        $request->validate([
            'CI'                       => ['required', 'integer'],
            'token'                    => ['required', 'string', 'size:64'],
            'password_nueva'           => ['required', 'string', 'min:8', 'confirmed'],
            'password_nueva_confirmation' => ['required'],
        ], [
            'password_nueva.confirmed' => 'Las contraseñas no coinciden.',
            'password_nueva.min'       => 'La contraseña debe tener al menos 8 caracteres.',
        ]);

        $tokenGuardado = Cache::get("pwd_reset_{$request->CI}");

        if (! $tokenGuardado || ! Hash::check($request->token, $tokenGuardado)) {
            return response()->json([
                'mensaje' => 'El enlace es inválido o ha expirado. Solicite uno nuevo.',
            ], 422);
        }

        $usuario = User::find((int) $request->CI);

        if (! $usuario) {
            return response()->json(['mensaje' => 'Usuario no encontrado.'], 404);
        }

        $usuario->update([
            'contraseña'              => Hash::make($request->password_nueva),
            'debe_cambiar_contrasena' => false,
            'intentos_fallidos'       => 0,
            'bloqueado_hasta'         => null,
            // Desbloquear si estaba bloqueada
            'estado' => $usuario->estado === 'BLOQUEADO' ? 'ACTIVO' : $usuario->estado,
        ]);

        Cache::forget("pwd_reset_{$request->CI}");
        $usuario->tokens()->delete(); // Invalidar sesiones activas

        return response()->json([
            'mensaje' => 'Contraseña restablecida correctamente. Ya puede iniciar sesión.',
        ]);
    }
}
