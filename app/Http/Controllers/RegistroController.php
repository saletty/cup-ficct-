<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompletarRegistroRequest;
use App\Mail\ContrasenaTemporalMail;
use App\Models\Carrera;
use App\Models\Pago;
use App\Models\Postulante;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\BitacoraService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

// ============================================================
// CU8 — Gestionar Postulantes (flujo transicional en 2 pasos)
//
// Paso 1 (ventanilla / Operador):
//   POST /v1/registro/operador → registrarCI()
//   El operador registra solo el CI, dejando el usuario INACTIVO
//   con datos nulos hasta que el estudiante complete en la web.
//
// Paso 2 (web pública / Postulante):
//   POST /v1/registro/verificar-ci → verificarCI()   ← comprueba que el CI fue habilitado
//   POST /v1/registro/completar    → completar()     ← actualiza datos y activa la cuenta
//
// Relacionado con CU9: completar() también graba colegio_procedencia,
// anio_egreso y titulo_bachiller en la tabla postulante.
// ============================================================
class RegistroController extends Controller
{
    /* ── ENDPOINT PÚBLICO: listado de carreras ─────────────────────────── */

    public function carreras(): JsonResponse
    {
        return response()->json(Carrera::orderBy('nombre_carrera')->get());
    }

    /* ── PASO 1 (operador): registrar sólo el CI ──────────────────────── */

    public function registrarCI(Request $request): JsonResponse
    {
        $request->validate(
            ['CI' => ['required', 'integer']],
            ['CI.required' => 'El CI es obligatorio.']
        );

        $ci = (int) $request->CI;

        // Verificar que existe un pago válido (no rechazado) para este CI
        $tienePago = Pago::where('postulante_ci', $ci)
            ->where('estado_pago', '!=', 'rechazado')
            ->exists();

        if (! $tienePago) {
            return response()->json([
                'mensaje' => 'El CI no tiene un pago registrado. Diríjase a caja primero.',
            ], 402);
        }

        $usuario = User::find($ci);

        // Caso: nuevo postulante (nunca estuvo en el sistema)
        if (! $usuario) {
            $rolPostulante = \App\Models\Rol::where('nombre', 'Postulante')->firstOrFail();
            $usuario = User::create(['CI' => $ci, 'rol_id' => $rolPostulante->id, 'estado' => 'INACTIVO']);
            Postulante::create(['CI' => $ci]);
            BitacoraService::log("CI {$ci} habilitado para registro de postulante (pago verificado)");
            return response()->json([
                'mensaje' => 'CI habilitado correctamente. El postulante puede completar su registro en la plataforma web.',
                'CI'      => $ci,
            ], 201);
        }

        // Caso: aplazado (ya tenía cuenta pero fue desactivada/bloqueada)
        if ($usuario->estado !== 'ACTIVO') {
            $usuario->update(['estado' => 'INACTIVO']);
            BitacoraService::log("CI {$ci} reactivado para repostulación (pago verificado)");
            return response()->json([
                'mensaje' => 'Cuenta reactivada. El postulante puede completar su re-registro en la plataforma web.',
                'CI'      => $ci,
            ]);
        }

        // Caso: ya tiene cuenta activa
        return response()->json([
            'mensaje' => 'Este CI ya tiene una cuenta activa en el sistema.',
            'CI'      => $ci,
            'codigo'  => 'YA_REGISTRADO',
        ]);
    }

    /* ── PASO 2a (estudiante): verificar CI antes del formulario ─────── */

    public function verificarCI(Request $request): JsonResponse
    {
        $request->validate(
            ['CI' => ['required', 'integer']],
            ['CI.required' => 'Ingrese su Cédula de Identidad.']
        );

        $usuario = User::find((int) $request->CI);

        if (! $usuario) {
            return response()->json([
                'mensaje' => 'CI no habilitado. Acérquese a ventanilla para registrar su postulación.',
            ], 404);
        }

        if ($usuario->estado === 'ACTIVO') {
            return response()->json([
                'mensaje' => 'Este CI ya tiene una cuenta activa. Ingrese con sus credenciales.',
                'codigo'  => 'YA_REGISTRADO',
            ], 409);
        }

        if ($usuario->estado === 'BLOQUEADO') {
            return response()->json([
                'mensaje' => 'Esta cuenta está bloqueada. Contacte a la administración.',
            ], 403);
        }

        // INACTIVO → el estudiante puede completar el registro
        return response()->json([
            'mensaje' => 'CI verificado. Complete sus datos personales.',
            'CI'      => $usuario->CI,
        ]);
    }

    /* ── PASO 2b (estudiante): completar datos personales ────────────── */

    public function completar(CompletarRegistroRequest $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $usuario = User::find($request->CI);

            if (! $usuario || $usuario->estado !== 'INACTIVO') {
                return response()->json([
                    'mensaje' => 'Operación no permitida. Verifique su CI o contacte a la administración.',
                ], 409);
            }

            // Contraseña temporal segura: 4 letras + guion + 4 dígitos + guion + 4 letras
            $contrasenaTemp = strtoupper(Str::random(4))
                . '-' . rand(1000, 9999)
                . '-' . strtoupper(Str::random(4));

            // Actualizar usuario
            $usuario->update([
                'nombre_completo'         => $request->nombre_completo,
                'email'                   => $request->email,
                'contraseña'              => Hash::make($contrasenaTemp),
                'estado'                  => 'ACTIVO',
                'debe_cambiar_contrasena' => true,
                'intentos_fallidos'       => 0,
            ]);

            // Actualizar datos del postulante
            Postulante::updateOrCreate(
                ['CI' => $request->CI],
                [
                    'fecha_nacimiento'    => $request->fecha_nacimiento,
                    'sexo'                => $request->sexo,
                    'direccion'           => $request->direccion,
                    'telefono'            => $request->telefono,
                    'colegio_procedencia' => $request->colegio_procedencia,
                    'ciudad'              => $request->ciudad,
                    'anio_egreso'         => $request->anio_egreso,
                    'titulo_bachiller'    => $request->titulo_bachiller,
                    'carrera_opcion1_id'  => $request->carrera_opcion1_id,
                    'carrera_opcion2_id'  => $request->carrera_opcion2_id,
                ]
            );

            // Enviar correo con contraseña temporal
            Mail::to($request->email)->send(
                new ContrasenaTemporalMail($request->nombre_completo, $contrasenaTemp)
            );

            DB::commit();

            BitacoraService::log("Postulante CI={$request->CI} completó su registro en la plataforma");

            return response()->json([
                'mensaje' => 'Registro completado. Se envió una contraseña temporal a ' . $request->email . '. Úsela para su primer ingreso y cámbiela de inmediato.',
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'mensaje' => 'Error al completar el registro. Intente nuevamente.',
                'detalle' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
