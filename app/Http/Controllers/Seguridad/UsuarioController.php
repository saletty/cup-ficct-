<?php

namespace App\Http\Controllers\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\StoreUsuarioRequest;
use App\Http\Requests\Seguridad\UpdateUsuarioRequest;
use App\Models\User;
use App\Services\Seguridad\BitacoraService;
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
            'estado'         => $request->estado ?? 'ACTIVO',
            'rol_id'         => $request->rol_id,
        ]);

        BitacoraService::log("Usuario creado: CI={$usuario->CI} — {$usuario->nombre_completo}");

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

        BitacoraService::log("Usuario actualizado: CI={$user->CI} — {$user->nombre_completo}");

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

        if ($user->estado === 'INACTIVO') {
            return response()->json(['mensaje' => 'El usuario ya está inactivo.'], 409);
        }

        $user->update(['estado' => 'INACTIVO']);

        // Revoca todos sus tokens al desactivar
        $user->tokens()->delete();

        BitacoraService::log("Usuario desactivado: CI={$user->CI} — {$user->nombre_completo}");

        return response()->json([
            'mensaje' => 'Usuario desactivado correctamente.',
        ]);
    }
}
