<?php

namespace App\Http\Controllers\Seguridad;

use App\Http\Controllers\Controller;
use App\Models\Permiso;
use App\Models\Rol;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CU5 - Gestionar Permisos
 * Asignar y quitar permisos a roles.
 */
class PermisoController extends Controller
{
    // [CU5·A03] SELECT * FROM permisos WHERE estado = 'activo' — carga catálogo completo
    public function index(): JsonResponse
    {
        $permisos = Permiso::where('estado', 'activo')->get();
        // [CU5·A04] listaRolesYPermisos + [CU5·A05] HTTP 200 JSON
        return response()->json($permisos);
    }

    // [CU5·B09] SELECT id_permiso FROM rol_permiso WHERE rol_id = $1 — permisos del rol
    public function permisosPorRol(int $rol): JsonResponse
    {
        $rolModel = Rol::with('permisos')->find($rol);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }

        // [CU5·B10] permisosAsignadosList + [CU5·B11] HTTP 200 JSON
        return response()->json([
            'rol'      => $rolModel->nombre,
            'permisos' => $rolModel->permisos,
        ]);
    }

    // [CU5·C15] INSERT/DELETE INTO rol_permiso — sincronizar permisos del rol
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

        // [CU5·C15] sync() — INSERT/DELETE en rol_permiso para igualar la lista enviada
        $rolModel->permisos()->sync($request->permisos);

        BitacoraService::log("Permisos del rol '{$rolModel->nombre}' actualizados");

        // [CU5·C16] operacionRealizada + [CU5·C17] HTTP 200 "Permisos del rol actualizados correctamente."
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

        BitacoraService::log("Permiso '{$permisoModel->descripcion}' agregado al rol '{$rolModel->nombre}'");

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

        BitacoraService::log("Permiso '{$permisoModel->descripcion}' quitado del rol '{$rolModel->nombre}'");

        return response()->json([
            'mensaje' => "Permiso '{$permisoModel->descripcion}' quitado del rol '{$rolModel->nombre}'.",
        ]);
    }
}
