<?php

namespace App\Http\Controllers\Personas;

use App\Http\Controllers\Controller;
use App\Models\Docente;
use App\Models\User;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU11 — Gestionar Docentes
class DocenteController extends Controller
{
    public function index(): JsonResponse
    {
        $docentes = Docente::with('usuario:CI,nombre_completo,email,estado', 'materia:id,nombre')->get();
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
            'materia_id'                  => ['nullable', 'integer', 'exists:materia,id'],
            'profesion'                   => ['required', 'string', 'max:100'],
            'maestria'                    => ['required', 'string', 'max:150'],
            'diplomado_educacion_superior' => ['required', 'string', 'max:150'],
        ], [
            'CI.unique' => 'Este docente ya está registrado.',
        ]);

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
            'docente' => $docente->load('usuario:CI,nombre_completo,email', 'materia:id,nombre'),
        ], 201);
    }

    public function update(Request $request, int $ci): JsonResponse
    {
        $docente = Docente::findOrFail($ci);

        $data = $request->validate([
            'materia_id'                   => ['sometimes', 'nullable', 'integer', 'exists:materia,id'],
            'profesion'                    => ['sometimes', 'string', 'max:100'],
            'maestria'                     => ['sometimes', 'string', 'max:150'],
            'diplomado_educacion_superior' => ['sometimes', 'string', 'max:150'],
            'estado'                       => ['sometimes', 'in:ACTIVO,INACTIVO,BLOQUEADO,activo,inactivo,bloqueado'],
        ]);

        if (isset($data['estado'])) {
            $docente->usuario->update(['estado' => strtoupper($data['estado'])]);
            unset($data['estado']);
        }
        $docente->update($data);
        BitacoraService::log("Docente actualizado: CI={$ci}");

        return response()->json([
            'mensaje' => 'Datos del docente actualizados.',
            'docente' => $docente->fresh()->load('usuario:CI,nombre_completo,email', 'materia:id,nombre'),
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
