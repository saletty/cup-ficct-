<?php

namespace App\Http\Controllers;

use App\Models\Postulante;
use App\Models\User;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// ============================================================
// CU8 — Gestionar Postulantes
// Registrar y actualizar datos personales y académicos.
//
// CU9 — Gestionar Información de Bachillerato
// Colegio, promedio, año de egreso, título de bachiller.
// ============================================================
class PostulanteController extends Controller
{
    /* ── CU8: Listar todos los postulantes ──────────────────── */
    public function index(Request $request): JsonResponse
    {
        $query = Postulante::with([
            'usuario:CI,nombre_completo,email,estado',
            'carreraOpcion1:id,nombre_carrera',
            'carreraOpcion2:id,nombre_carrera',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('usuario', fn($q) =>
                $q->where('nombre_completo', 'ilike', "%$s%")
                  ->orWhere('email', 'ilike', "%$s%")
            )->orWhere('CI', 'like', "%$s%");
        }

        if ($request->filled('estado')) {
            $query->whereHas('usuario', fn($q) =>
                $q->where('estado', $request->estado)
            );
        }

        return response()->json($query->orderBy('CI')->paginate(25));
    }

    /* ── CU8: Ver un postulante ─────────────────────────────── */
    public function show(int $ci): JsonResponse
    {
        $postulante = Postulante::with([
            'usuario:CI,nombre_completo,email,estado,rol_id',
            'carreraOpcion1', 'carreraOpcion2',
        ])->findOrFail($ci);

        return response()->json($postulante);
    }

    /* ── CU8: Actualizar datos personales ───────────────────── */
    public function update(Request $request, int $ci): JsonResponse
    {
        $postulante = Postulante::findOrFail($ci);

        $dataPostulante = $request->validate([
            'fecha_nacimiento'    => ['sometimes', 'date'],
            'sexo'                => ['sometimes', 'in:M,F'],
            'direccion'           => ['sometimes', 'string', 'max:255'],
            'telefono'            => ['sometimes', 'string', 'max:20'],
            'ciudad'              => ['sometimes', 'string', 'max:100'],
            'carrera_opcion1_id'  => ['sometimes', 'string', 'exists:carrera,id'],
            'carrera_opcion2_id'  => ['nullable', 'string', 'exists:carrera,id'],
        ]);

        // Datos del usuario (nombre, email)
        $dataUsuario = $request->validate([
            'nombre_completo' => ['sometimes', 'string', 'max:150'],
            'email'           => ['sometimes', 'email', "unique:usuario,email,{$ci},CI"],
        ]);

        DB::transaction(function () use ($postulante, $dataPostulante, $dataUsuario) {
            $postulante->update($dataPostulante);
            if ($dataUsuario) {
                $postulante->usuario->update($dataUsuario);
            }
        });

        BitacoraService::log("Postulante CI={$ci} actualizado");

        return response()->json([
            'mensaje'    => 'Datos del postulante actualizados.',
            'postulante' => $postulante->fresh()->load('usuario', 'carreraOpcion1', 'carreraOpcion2'),
        ]);
    }

    /* ── CU8: Eliminar postulante ───────────────────────────── */
    public function destroy(int $ci): JsonResponse
    {
        $usuario = User::findOrFail($ci);
        BitacoraService::log("Postulante CI={$ci} eliminado");
        $usuario->delete(); // CASCADE elimina postulante también

        return response()->json(['mensaje' => 'Postulante eliminado del sistema.']);
    }

    /* ── CU9: Ver información de bachillerato ───────────────── */
    public function bachillerato(int $ci): JsonResponse
    {
        $postulante = Postulante::select([
            'CI', 'colegio_procedencia', 'promedio_bachiller',
            'anio_egreso', 'titulo_bachiller',
        ])->findOrFail($ci);

        return response()->json($postulante);
    }

    /* ── CU9: Actualizar información de bachillerato ────────── */
    public function actualizarBachillerato(Request $request, int $ci): JsonResponse
    {
        $postulante = Postulante::findOrFail($ci);

        $data = $request->validate([
            'colegio_procedencia' => ['required', 'string', 'max:150'],
            'promedio_bachiller'  => ['required', 'numeric', 'min:0', 'max:100'],
            'anio_egreso'         => ['required', 'integer', 'min:1990', 'max:' . now()->year],
            'titulo_bachiller'    => ['required', 'string', 'max:100'],
        ], [
            'promedio_bachiller.min' => 'El promedio no puede ser negativo.',
            'promedio_bachiller.max' => 'El promedio no puede superar 100.',
        ]);

        $postulante->update($data);
        BitacoraService::log("Bachillerato CI={$ci} actualizado");

        return response()->json([
            'mensaje'    => 'Información de bachillerato actualizada.',
            'postulante' => $postulante->fresh(),
        ]);
    }
}
