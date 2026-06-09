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

    /* ── OPERADOR: consultar estado de un CI antes de habilitar ──────── */

    public function estadoCI(int $ci): JsonResponse
    {
        $pago = Pago::where('postulante_ci', $ci)
            ->where('estado_pago', '!=', 'rechazado')
            ->with('tipoPago:id,descripcion')
            ->orderByDesc('fecha_pago')
            ->first();

        $usuario = User::find($ci);

        $puedeHabilitar = $pago && (! $usuario || $usuario->estado !== 'ACTIVO');

        return response()->json([
            'ci'              => $ci,
            'tiene_pago'      => ! is_null($pago),
            'estado_pago'     => $pago?->estado_pago,
            'tipo_pago'       => $pago?->tipoPago?->descripcion,
            'ya_registrado'   => ! is_null($usuario),
            'estado_cuenta'   => $usuario?->estado,
            'nombre'          => $usuario?->nombre_completo,
            'puede_habilitar' => $puedeHabilitar,
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

        DB::beginTransaction();
        try {
            $usuario->update([
                'nombre_completo'         => $request->nombre_completo,
                'email'                   => $request->email,
                'contraseña'              => Hash::make($contrasenaTemp),
                'estado'                  => 'ACTIVO',
                'debe_cambiar_contrasena' => true,
                'intentos_fallidos'       => 0,
            ]);

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

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'mensaje' => 'Error al guardar los datos. Intente nuevamente.',
                'detalle' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        BitacoraService::log("Postulante CI={$request->CI} completó su registro en la plataforma");

        // Envío de correo best-effort: si falla no aborta el registro
        $mensajeCorreo = 'Contacte a la administración para obtener su contraseña temporal.';
        try {
            Mail::to($request->email)->send(
                new ContrasenaTemporalMail($request->nombre_completo, $contrasenaTemp)
            );
            $mensajeCorreo = "Se envió una contraseña temporal a {$request->email}.";
        } catch (\Exception) {
            // El correo falló pero el registro ya fue confirmado
        }

        return response()->json([
            'mensaje' => "Registro completado. {$mensajeCorreo} Úsela para su primer ingreso y cámbiela de inmediato.",
        ], 201);
    }
}
