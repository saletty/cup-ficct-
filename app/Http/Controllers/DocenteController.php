<?php

namespace App\Http\Controllers;

use App\Models\Docente;
use App\Models\User;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ============================================================
// CU12 — Gestionar Docentes
// El docente hereda del CI de usuario (igual que postulante).
// Requiere que el usuario exista y tenga rol 'Docente'.
// ============================================================
class DocenteController extends Controller
{
    public function index(): JsonResponse
    {
        $docentes = Docente::with('usuario:CI,nombre_completo,email,estado')->get();
        return response()->json($docentes);
    }

    public function show(int $ci): JsonResponse
    {
        $docente = Docente::with([
            'usuario:CI,nombre_completo,email,estado',
            'asignaciones.materia',
            'asignaciones.grupo',
        ])->findOrFail($ci);

        return response()->json($docente);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'CI'                          => ['required', 'integer', 'unique:docente,CI'],
            'profesion'                   => ['required', 'string', 'max:100'],
            'maestria'                    => ['required', 'string', 'max:150'],
            'diplomado_educacion_superior' => ['required', 'string', 'max:150'],
        ], [
            'CI.unique' => 'Este docente ya está registrado.',
        ]);

        // Verificar que el usuario existe y tiene rol Docente
        $usuario = User::find($data['CI']);
        if (! $usuario) {
            return response()->json(['mensaje' => 'No existe un usuario con ese CI.'], 404);
        }

        if ($usuario->rol?->nombre !== 'Docente') {
            return response()->json(['mensaje' => 'El usuario no tiene el rol Docente asignado.'], 422);
        }

        $docente = Docente::create($data);
        BitacoraService::log("Docente registrado: CI={$data['CI']}");

        return response()->json([
            'mensaje' => 'Docente registrado correctamente.',
            'docente' => $docente->load('usuario:CI,nombre_completo,email'),
        ], 201);
    }

    public function update(Request $request, int $ci): JsonResponse
    {
        $docente = Docente::findOrFail($ci);

        $data = $request->validate([
            'profesion'                    => ['sometimes', 'string', 'max:100'],
            'maestria'                     => ['sometimes', 'string', 'max:150'],
            'diplomado_educacion_superior' => ['sometimes', 'string', 'max:150'],
        ]);

        $docente->update($data);
        BitacoraService::log("Docente actualizado: CI={$ci}");

        return response()->json([
            'mensaje' => 'Datos del docente actualizados.',
            'docente' => $docente->fresh()->load('usuario:CI,nombre_completo,email'),
        ]);
    }

    public function destroy(int $ci): JsonResponse
    {
        $docente = Docente::findOrFail($ci);

        if ($docente->asignaciones()->exists()) {
            return response()->json(['mensaje' => 'No se puede eliminar: el docente tiene asignaciones activas.'], 409);
        }

        BitacoraService::log("Docente eliminado: CI={$ci}");
        $docente->delete();

        return response()->json(['mensaje' => 'Docente eliminado.']);
    }
}
