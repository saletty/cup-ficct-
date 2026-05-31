<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUsuarioRequest;
use App\Http\Requests\UpdateUsuarioRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * CU3 - Gestionar Usuarios
 * Registrar, editar y desactivar usuarios del sistema.
 */
class UsuarioController extends Controller
{
    // Listar todos los usuarios con su rol
    public function index(): JsonResponse
    {
        $usuarios = User::with('rol')
            ->select('CI', 'nombre_completo', 'email', 'estado', 'rol_id')
            ->get();

        return response()->json($usuarios);
    }

    // Registrar nuevo usuario
    public function store(StoreUsuarioRequest $request): JsonResponse
    {
        $usuario = User::create([
            'CI'             => $request->CI,
            'nombre_completo' => $request->nombre_completo,
            'email'          => $request->email,
            'contraseña'     => $request->password, // el cast 'hashed' lo encripta automáticamente
            'estado'         => $request->estado ?? 'activo',
            'rol_id'         => $request->rol_id,
        ]);

        return response()->json([
            'mensaje'  => 'Usuario registrado correctamente.',
            'usuario'  => $usuario->load('rol'),
        ], 201);
    }

    // Ver un usuario
    public function show(int $usuario): JsonResponse
    {
        $user = User::with('rol.permisos')->find($usuario);

        if (! $user) {
            return response()->json(['mensaje' => 'Usuario no encontrado.'], 404);
        }

        return response()->json($user->makeVisible(['rol']));
    }

    // Editar datos del usuario
    public function update(UpdateUsuarioRequest $request, int $usuario): JsonResponse
    {
        $user = User::find($usuario);

        if (! $user) {
            return response()->json(['mensaje' => 'Usuario no encontrado.'], 404);
        }

        $data = $request->only(['nombre_completo', 'email', 'estado', 'rol_id']);

        if ($request->filled('password')) {
            $data['contraseña'] = $request->password; // cast 'hashed' encripta automáticamente
        }

        $user->update($data);

        return response()->json([
            'mensaje'  => 'Usuario actualizado correctamente.',
            'usuario'  => $user->fresh()->load('rol'),
        ]);
    }

    // Desactivar usuario (no se elimina físicamente)
    public function destroy(int $usuario): JsonResponse
    {
        $user = User::find($usuario);

        if (! $user) {
            return response()->json(['mensaje' => 'Usuario no encontrado.'], 404);
        }

        if ($user->estado === 'inactivo') {
            return response()->json(['mensaje' => 'El usuario ya está inactivo.'], 409);
        }

        $user->update(['estado' => 'inactivo']);

        // Revoca todos sus tokens al desactivar
        $user->tokens()->delete();

        return response()->json([
            'mensaje' => 'Usuario desactivado correctamente.',
        ]);
    }
}
