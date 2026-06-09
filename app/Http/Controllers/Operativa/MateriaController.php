<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\Materia;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU13 (catálogo) — Gestionar Materias
class MateriaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Materia::orderBy('nombre')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'      => ['required', 'string', 'max:100', 'unique:materia,nombre'],
            'descripcion' => ['nullable', 'string', 'max:200'],
        ], [
            'nombre.unique' => 'Ya existe una materia con ese nombre.',
        ]);

        $materia = Materia::create($data);
        BitacoraService::log("Materia creada: {$materia->nombre}");

        return response()->json(['mensaje' => 'Materia creada.', 'materia' => $materia], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Materia::findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $materia = Materia::findOrFail($id);

        $data = $request->validate([
            'nombre'      => ['sometimes', 'string', 'max:100', "unique:materia,nombre,{$id}"],
            'descripcion' => ['nullable', 'string', 'max:200'],
        ]);

        $materia->update($data);
        BitacoraService::log("Materia actualizada: {$materia->nombre}");

        return response()->json(['mensaje' => 'Materia actualizada.', 'materia' => $materia->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $materia = Materia::findOrFail($id);

        if ($materia->asignaciones()->exists()) {
            return response()->json(['mensaje' => 'No se puede eliminar: la materia tiene asignaciones activas.'], 409);
        }

        BitacoraService::log("Materia eliminada: {$materia->nombre}");
        $materia->delete();

        return response()->json(['mensaje' => 'Materia eliminada.']);
    }
}
