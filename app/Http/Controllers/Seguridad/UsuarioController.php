<?php

namespace App\Http\Controllers\Seguridad;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seguridad\StoreUsuarioRequest;
use App\Http\Requests\Seguridad\UpdateUsuarioRequest;
use App\Imports\Seguridad\DocentesImport;
use App\Imports\Seguridad\PostulantesImport;
use App\Models\User;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

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

    // Carga masiva de postulantes desde Excel/CSV (contraseña = CI)
    public function importarPostulantes(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:4096'],
        ], [
            'archivo.required' => 'Debe adjuntar un archivo.',
            'archivo.mimes'    => 'El archivo debe ser .xlsx, .xls o .csv.',
            'archivo.max'      => 'El archivo no debe superar 4 MB.',
        ]);

        $import = new PostulantesImport();
        Excel::import($import, $request->file('archivo'));

        $resultados = $import->resultados;
        $creados    = count(array_filter($resultados, fn($r) => $r['estado'] === 'creado'));
        $omitidos   = count(array_filter($resultados, fn($r) => $r['estado'] === 'omitido'));
        $errores    = count(array_filter($resultados, fn($r) => $r['estado'] === 'error'));

        BitacoraService::log("Carga masiva postulantes: {$creados} creados, {$omitidos} omitidos, {$errores} errores.");

        return response()->json([
            'mensaje' => "Importación completada: {$creados} creados, {$omitidos} omitidos, {$errores} con error.",
            'resumen' => compact('creados', 'omitidos', 'errores'),
            'detalle' => $resultados,
        ]);
    }

    // Carga masiva de docentes desde Excel/CSV (contraseña = CI)
    public function importarDocentes(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:4096'],
        ], [
            'archivo.required' => 'Debe adjuntar un archivo.',
            'archivo.mimes'    => 'El archivo debe ser .xlsx, .xls o .csv.',
            'archivo.max'      => 'El archivo no debe superar 4 MB.',
        ]);

        $import = new DocentesImport();
        Excel::import($import, $request->file('archivo'));

        $resultados = $import->resultados;
        $creados    = count(array_filter($resultados, fn($r) => $r['estado'] === 'creado'));
        $omitidos   = count(array_filter($resultados, fn($r) => $r['estado'] === 'omitido'));
        $errores    = count(array_filter($resultados, fn($r) => $r['estado'] === 'error'));

        BitacoraService::log("Carga masiva docentes: {$creados} creados, {$omitidos} omitidos, {$errores} errores.");

        return response()->json([
            'mensaje' => "Importación completada: {$creados} creados, {$omitidos} omitidos, {$errores} con error.",
            'resumen' => compact('creados', 'omitidos', 'errores'),
            'detalle' => $resultados,
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
