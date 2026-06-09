<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use App\Models\TipoPago;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ============================================================
// CU16 — Gestionar Pagos de Admisión
// Ciclo transaccional y validación financiera de la tabla pago.
// El cajero registra el pago (700 Bs) vinculado al tipopago_id.
// estado_pago: pendiente → verificado | rechazado
// ============================================================
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

        // Efectivo en caja se marca verificado de inmediato (el cajero ya contó el dinero)
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

    // GET /v1/pagos/postulante/{ci} — historial de pagos de un postulante
    public function porPostulante(int $ci): JsonResponse
    {
        $pagos = Pago::with(['tipoPago:id,descripcion,monto', 'cajero:CI,nombre_completo'])
            ->where('postulante_ci', $ci)
            ->orderByDesc('fecha_pago')
            ->get();

        return response()->json($pagos);
    }
}
