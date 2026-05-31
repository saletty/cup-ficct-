<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CU4 - Gestionar Roles
 * Administrar roles: Administrador, Operador, Cajero, Coordinador, etc.
 */
class RolController extends Controller
{
    // Listar todos los roles con sus permisos
    public function index(): JsonResponse
    {
        $roles = Rol::with('permisos')->get();

        return response()->json($roles);
    }

    // Crear nuevo rol
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombre'      => ['required', 'string', 'max:80', 'unique:rol,nombre'],
            'descripcion' => ['nullable', 'string', 'max:200'],
        ], [
            'nombre.required' => 'El nombre del rol es obligatorio.',
            'nombre.unique'   => 'Ya existe un rol con ese nombre.',
        ]);

        $rol = Rol::create($request->only(['nombre', 'descripcion']));

        return response()->json([
            'mensaje' => 'Rol creado correctamente.',
            'rol'     => $rol,
        ], 201);
    }

    // Ver un rol con sus permisos
    public function show(int $rol): JsonResponse
    {
        $rolModel = Rol::with('permisos')->find($rol);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }

        return response()->json($rolModel);
    }

    // Editar rol
    public function update(Request $request, int $rol): JsonResponse
    {
        $rolModel = Rol::find($rol);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }

        $request->validate([
            'nombre'      => ['sometimes', 'string', 'max:80', "unique:rol,nombre,{$rol}"],
            'descripcion' => ['nullable', 'string', 'max:200'],
        ], [
            'nombre.unique' => 'Ya existe otro rol con ese nombre.',
        ]);

        $rolModel->update($request->only(['nombre', 'descripcion']));

        return response()->json([
            'mensaje' => 'Rol actualizado correctamente.',
            'rol'     => $rolModel->fresh()->load('permisos'),
        ]);
    }

    // Eliminar rol (solo si no tiene usuarios asignados)
    public function destroy(int $rol): JsonResponse
    {
        $rolModel = Rol::withCount('usuarios')->find($rol);

        if (! $rolModel) {
            return response()->json(['mensaje' => 'Rol no encontrado.'], 404);
        }

        if ($rolModel->usuarios_count > 0) {
            return response()->json([
                'mensaje' => "No se puede eliminar el rol '{$rolModel->nombre}' porque tiene {$rolModel->usuarios_count} usuario(s) asignado(s).",
            ], 409);
        }

        $rolModel->delete();

        return response()->json([
            'mensaje' => 'Rol eliminado correctamente.',
        ]);
    }
}
