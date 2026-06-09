<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\Pago;
use App\Models\Postulacion;
use App\Models\TipoPago;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// CU15 — Gestionar Pagos de Admisión
class PagoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $pagos = Pago::with([
            'postulante.usuario:CI,nombre_completo,email',
            'tipoPago:id,descripcion,monto',
            'cajero:CI,nombre_completo',
        ])
            ->when($request->postulante_ci, fn ($q, $ci) => $q->where('postulante_ci', $ci))
            ->when($request->estado_pago,   fn ($q, $e)  => $q->where('estado_pago', $e))
            ->orderByDesc('fecha_pago')
            ->get();

        return response()->json($pagos);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'postulante_ci' => ['required', 'integer'],
            'tipopago_id'   => ['required', 'integer', 'exists:tipo_pago,id'],
            'observacion'   => ['nullable', 'string', 'max:500'],
        ], [
            'tipopago_id.exists' => 'El tipo de pago seleccionado no existe.',
        ]);

        $tipoPago = TipoPago::findOrFail($data['tipopago_id']);
        if ($tipoPago->estado !== 'activo') {
            return response()->json(['mensaje' => 'El tipo de pago seleccionado está inactivo.'], 422);
        }

        $estadoInicial = ($tipoPago->nombre === 'Efectivo') ? 'verificado' : 'pendiente';

        $pago = Pago::create([
            'postulante_ci' => $data['postulante_ci'],
            'tipopago_id'   => $data['tipopago_id'],
            'monto'         => $tipoPago->monto,
            'estado_pago'   => $estadoInicial,
            'fecha_pago'    => now(),
            'cajero_ci'     => auth()->user()->getKey(),
            'observacion'   => $data['observacion'] ?? null,
        ]);

        BitacoraService::log(
            "Pago registrado: postulante CI={$data['postulante_ci']}, monto=Bs {$tipoPago->monto}, tipo={$tipoPago->descripcion}"
        );

        $pago->load([
            'postulante.usuario:CI,nombre_completo,email',
            'tipoPago:id,descripcion,monto',
            'cajero:CI,nombre_completo',
        ]);

        return response()->json(['mensaje' => 'Pago registrado.', 'pago' => $pago], 201);
    }

    public function show(int $id): JsonResponse
    {
        $pago = Pago::with([
            'postulante.usuario:CI,nombre_completo,email',
            'tipoPago:id,descripcion,monto',
            'cajero:CI,nombre_completo',
        ])->findOrFail($id);

        return response()->json($pago);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $pago = Pago::findOrFail($id);

        $data = $request->validate([
            'estado_pago' => ['required', 'in:pendiente,verificado,rechazado'],
            'observacion' => ['nullable', 'string', 'max:500'],
        ], [
            'estado_pago.in' => 'Estado no válido. Use: pendiente, verificado o rechazado.',
        ]);

        $pago->update($data);
        BitacoraService::log("Pago #{$id} actualizado a estado: {$data['estado_pago']}");

        $pago->load([
            'postulante.usuario:CI,nombre_completo,email',
            'tipoPago:id,descripcion,monto',
            'cajero:CI,nombre_completo',
        ]);

        return response()->json(['mensaje' => 'Pago actualizado.', 'pago' => $pago]);
    }

    public function destroy(int $id): JsonResponse
    {
        $pago = Pago::findOrFail($id);

        if ($pago->estado_pago === 'verificado') {
            return response()->json(['mensaje' => 'No se puede eliminar un pago verificado.'], 409);
        }

        BitacoraService::log("Pago #{$id} eliminado (postulante CI={$pago->postulante_ci})");
        $pago->delete();

        return response()->json(['mensaje' => 'Pago eliminado.']);
    }

    public function iniciarQR(Request $request): JsonResponse
    {
        $data = $request->validate([
            'postulante_ci' => ['required', 'integer'],
        ]);

        $pago = DB::transaction(function () use ($data) {
            return Pago::create([
                'postulante_ci' => $data['postulante_ci'],
                'tipopago_id'   => 2,
                'monto'         => 700.00,
                'estado_pago'   => 'pendiente',
                'fecha_pago'    => now(),
                'cajero_ci'     => auth()->user()->getKey(),
                'observacion'   => 'Pago QR — pendiente de confirmación Libélula',
            ]);
        });

        BitacoraService::log(
            "Pago QR iniciado: CI={$data['postulante_ci']}, pago_id={$pago->id}, monto=700 Bs"
        );

        return response()->json([
            'pago_id' => $pago->id,
            'monto'   => 700.00,
            'estado'  => 'pendiente',
            'mensaje' => 'Intención de pago QR registrada. Esperando confirmación de Libélula.',
        ], 201);
    }

    // POST /v1/pagos/webhook — endpoint público, validado por token secreto
    public function webhookLibelula(Request $request): JsonResponse
    {
        $secretEsperado = config('services.libelula.webhook_secret', 'libelula_sandbox_2026');

        if ($request->header('X-Libelula-Token') !== $secretEsperado) {
            return response()->json(['error' => 'Token de webhook inválido.'], 401);
        }

        $data = $request->validate([
            'pago_id' => ['required', 'integer', 'exists:pago,id'],
            'estado'  => ['required', 'string'],
        ]);

        if ($data['estado'] !== 'COMPLETED') {
            return response()->json(['mensaje' => "Estado '{$data['estado']}' recibido — sin acción."]);
        }

        try {
            DB::transaction(function () use ($data) {
                $pago = Pago::lockForUpdate()->findOrFail($data['pago_id']);

                if ($pago->estado_pago === 'verificado') {
                    return;
                }

                $pago->update(['estado_pago' => 'verificado']);

                Postulacion::where('postulante_ci', $pago->postulante_ci)
                    ->whereNotIn('estado_admision', ['anulado'])
                    ->latest('fecha_registro')
                    ->limit(1)
                    ->update(['estado_admision' => 'pendiente']);
            });

            BitacoraService::log(
                "Webhook Libélula: pago_id={$data['pago_id']} → COMPLETED → verificado"
            );

            return response()->json(['mensaje' => 'Pago verificado y postulación actualizada.']);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Error interno al procesar el webhook.'], 500);
        }
    }

    public function estadoPago(int $id): JsonResponse
    {
        $pago = Pago::select('id', 'estado_pago', 'fecha_pago', 'postulante_ci')
            ->findOrFail($id);

        return response()->json($pago);
    }

    public function porPostulante(int $ci): JsonResponse
    {
        $pagos = Pago::with(['tipoPago:id,descripcion,monto', 'cajero:CI,nombre_completo'])
            ->where('postulante_ci', $ci)
            ->orderByDesc('fecha_pago')
            ->get();

        return response()->json($pagos);
    }
}
