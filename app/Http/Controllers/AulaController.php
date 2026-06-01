<?php

namespace App\Http\Controllers;

use App\Models\Aula;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AulaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Aula::orderBy('nro')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nro'        => ['required', 'string', 'max:10', 'unique:aula,nro'],
            'capacidad'  => ['required', 'integer', 'min:1'],
            'descripcion' => ['nullable', 'string', 'max:150'],
        ], [
            'nro.unique' => 'Ya existe un aula con ese número.',
        ]);

        $aula = Aula::create($data);
        BitacoraService::log("Aula creada: {$aula->nro}");

        return response()->json(['mensaje' => 'Aula creada.', 'aula' => $aula], 201);
    }

    public function show(string $nro): JsonResponse
    {
        return response()->json(Aula::findOrFail($nro));
    }

    public function update(Request $request, string $nro): JsonResponse
    {
        $aula = Aula::findOrFail($nro);

        $data = $request->validate([
            'capacidad'   => ['sometimes', 'integer', 'min:1'],
            'descripcion' => ['nullable', 'string', 'max:150'],
        ]);

        $aula->update($data);
        BitacoraService::log("Aula actualizada: {$nro}");

        return response()->json(['mensaje' => 'Aula actualizada.', 'aula' => $aula->fresh()]);
    }

    public function destroy(string $nro): JsonResponse
    {
        $aula = Aula::findOrFail($nro);

        if ($aula->horarios()->exists()) {
            return response()->json(['mensaje' => 'No se puede eliminar: el aula tiene horarios asignados.'], 409);
        }

        BitacoraService::log("Aula eliminada: {$nro}");
        $aula->delete();

        return response()->json(['mensaje' => 'Aula eliminada.']);
    }
}
