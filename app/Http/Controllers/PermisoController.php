<?php

namespace App\Http\Controllers;

use App\Models\Permiso;
use App\Models\Rol;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CU5 - Gestionar Permisos
 * Asignar y quitar permisos a roles.
 */
class PermisoController extends Controller
{
    // Listar todos los permisos disponibles en el sistema
    public function index(): JsonResponse
    {
        $permisos = Permiso::where('estado', 'activo')->get();

        return response()->json($permisos);
    }

    // Ver los permisos actuales de un rol
    public function permisosPorRol(int $rol): JsonResponse
    {
        $rolModel = Rol::with('permisos')->find($rol);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }

        return response()->json([
            'rol'      => $rolModel->nombre,
            'permisos' => $rolModel->permisos,
        ]);
    }

    // Asignar permisos a un rol (reemplaza los existentes)
    public function asignar(Request $request, int $rol): JsonResponse
    {
        $request->validate([
            'permisos'   => ['required', 'array'],
            'permisos.*' => ['integer', 'exists:permiso,id'],
        ], [
            'permisos.required'   => 'Debe enviar al menos un permiso.',
            'permisos.*.exists'   => 'Uno o más permisos no existen.',
        ]);

        $rolModel = Rol::find($rol);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }

        // sync() reemplaza todos los permisos actuales por los enviados
        $rolModel->permisos()->sync($request->permisos);

        return response()->json([
            'mensaje'  => 'Permisos asignados correctamente al rol.',
            'rol'      => $rolModel->nombre,
            'permisos' => $rolModel->fresh()->load('permisos')->permisos,
        ]);
    }

    // Agregar un permiso individual a un rol (sin quitar los que ya tiene)
    public function agregar(Request $request, int $rol, int $permiso): JsonResponse
    {
        $rolModel     = Rol::find($rol);
        $permisoModel = Permiso::find($permiso);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }
        if (! $permisoModel) {
            return response()->json(['mensaje' => 'Permiso no encontrado.'], 404);
        }

        // syncWithoutDetaching evita duplicados sin eliminar los permisos existentes
        $rolModel->permisos()->syncWithoutDetaching([$permiso]);

        return response()->json([
            'mensaje' => "Permiso '{$permisoModel->descripcion}' agregado al rol '{$rolModel->nombre}'.",
        ]);
    }

    // Quitar un permiso específico de un rol
    public function quitar(int $rol, int $permiso): JsonResponse
    {
        $rolModel     = Rol::find($rol);
        $permisoModel = Permiso::find($permiso);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }
        if (! $permisoModel) {
            return response()->json(['mensaje' => 'Permiso no encontrado.'], 404);
        }

        if (! $rolModel->permisos()->where('permiso_id', $permiso)->exists()) {
            return response()->json(['mensaje' => 'El rol no tiene ese permiso asignado.'], 404);
        }

        $rolModel->permisos()->detach($permiso);

        return response()->json([
            'mensaje' => "Permiso '{$permisoModel->descripcion}' quitado del rol '{$rolModel->nombre}'.",
        ]);
    }
}
