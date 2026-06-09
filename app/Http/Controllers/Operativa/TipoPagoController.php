<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\TipoPago;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU14 — Gestionar Tipos de Pago
class TipoPagoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(TipoPago::orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:200', 'unique:tipo_pago,descripcion'],
            'monto'       => ['required', 'numeric', 'min:0'],
            'estado'      => ['sometimes', 'in:activo,inactivo'],
        ], [
            'descripcion.unique' => 'Ya existe un tipo de pago con esa descripción.',
            'monto.min'          => 'El monto no puede ser negativo.',
        ]);

        $data['estado'] ??= 'activo';
        $tipo = TipoPago::create($data);
        BitacoraService::log("Tipo de pago creado: {$tipo->descripcion} (Bs {$tipo->monto})");

        return response()->json(['mensaje' => 'Tipo de pago creado.', 'tipo_pago' => $tipo], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(TipoPago::findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tipo = TipoPago::findOrFail($id);

        $data = $request->validate([
            'descripcion' => ['sometimes', 'string', 'max:200', "unique:tipo_pago,descripcion,{$id}"],
            'monto'       => ['sometimes', 'numeric', 'min:0'],
            'estado'      => ['sometimes', 'in:activo,inactivo'],
        ], [
            'descripcion.unique' => 'Ya existe un tipo de pago con esa descripción.',
            'monto.min'          => 'El monto no puede ser negativo.',
        ]);

        $tipo->update($data);
        BitacoraService::log("Tipo de pago actualizado: {$tipo->descripcion}");

        return response()->json(['mensaje' => 'Tipo de pago actualizado.', 'tipo_pago' => $tipo]);
    }

    public function destroy(int $id): JsonResponse
    {
        $tipo = TipoPago::findOrFail($id);

        if ($tipo->pagos()->exists()) {
            return response()->json(['mensaje' => 'No se puede eliminar: existen pagos asociados a este tipo.'], 409);
        }

        BitacoraService::log("Tipo de pago eliminado: {$tipo->descripcion}");
        $tipo->delete();

        return response()->json(['mensaje' => 'Tipo de pago eliminado.']);
    }
}
