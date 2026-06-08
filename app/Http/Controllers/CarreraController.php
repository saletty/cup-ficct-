<?php

namespace App\Http\Controllers;

use App\Models\Carrera;
use App\Models\Postulacion;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ============================================================
// CU7 — Gestionar Carreras
// CRUD completo de las carreras disponibles para admisión.
// ============================================================
class CarreraController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Carrera::orderBy('nombre_carrera')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id'            => ['required', 'string', 'max:10', 'unique:carrera,id'],
            'nombre_carrera' => ['required', 'string', 'max:100', 'unique:carrera,nombre_carrera'],
        ], [
            'id.unique'             => 'Ya existe una carrera con ese código.',
            'nombre_carrera.unique' => 'Ya existe una carrera con ese nombre.',
        ]);

        $carrera = Carrera::create($data);
        BitacoraService::log("Carrera creada: {$carrera->nombre_carrera} (ID: {$carrera->id})");

        return response()->json(['mensaje' => 'Carrera creada.', 'carrera' => $carrera], 201);
    }

    public function show(string $id): JsonResponse
    {
        $carrera = Carrera::findOrFail($id);
        return response()->json($carrera);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $carrera = Carrera::findOrFail($id);

        $data = $request->validate([
            'nombre_carrera' => ['required', 'string', 'max:100', "unique:carrera,nombre_carrera,{$id},id"],
        ]);

        $carrera->update($data);
        BitacoraService::log("Carrera actualizada: {$carrera->nombre_carrera}");

        return response()->json(['mensaje' => 'Carrera actualizada.', 'carrera' => $carrera]);
    }

    public function destroy(string $id): JsonResponse
    {
        $carrera = Carrera::findOrFail($id);

        // Verificar que no tenga postulantes inscritos en esta carrera
        $tieneReferencias = Postulacion::where('carrera_opcion1_id', $id)
            ->orWhere('carrera_opcion2_id', $id)
            ->exists();

        if ($tieneReferencias) {
            return response()->json(['mensaje' => 'No se puede eliminar: hay postulaciones que referencian esta carrera.'], 409);
        }

        BitacoraService::log("Carrera eliminada: {$carrera->nombre_carrera}");
        $carrera->delete();

        return response()->json(['mensaje' => 'Carrera eliminada.']);
    }
}
