<?php

namespace App\Http\Controllers;

use App\Models\Convocatoria;
use App\Models\Postulacion;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ============================================================
// CU10 — Registrar Inscripción al CUP
// Permite inscribir a un postulante en una convocatoria.
// ============================================================
class InscripcionController extends Controller
{
    /* ── Listar convocatorias activas ───────────────────────── */
    public function convocatorias(): JsonResponse
    {
        $convocatorias = Convocatoria::where('estado', 'activa')
            ->orderBy('fecha_inicio', 'desc')
            ->get();

        return response()->json($convocatorias);
    }

    /* ── Listar todas las inscripciones ────────────────────── */
    public function index(Request $request): JsonResponse
    {
        $query = Postulacion::with([
            'postulante.usuario:CI,nombre_completo,email',
            'convocatoria:id,nombre,estado',
            'carreraOpcion1:id,nombre_carrera',
            'carreraOpcion2:id,nombre_carrera',
        ]);

        if ($request->filled('convocatoria_id')) {
            $query->where('convocatoria_id', $request->convocatoria_id);
        }
        if ($request->filled('estado')) {
            $query->where('estado_admision', $request->estado);
        }
        if ($request->filled('ci')) {
            $query->where('postulante_ci', $request->ci);
        }

        return response()->json($query->orderBy('fecha_registro', 'desc')->paginate(25));
    }

    /* ── Ver inscripciones de un postulante ─────────────────── */
    public function porPostulante(int $ci): JsonResponse
    {
        $inscripciones = Postulacion::with([
            'convocatoria', 'carreraOpcion1', 'carreraOpcion2',
        ])->where('postulante_ci', $ci)->get();

        return response()->json($inscripciones);
    }

    /* ── Registrar nueva inscripción ────────────────────────── */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'postulante_ci'      => ['required', 'integer', 'exists:postulante,CI'],
            'convocatoria_id'    => ['required', 'string', 'exists:convocatoria,id'],
            'carrera_opcion1_id' => ['required', 'string', 'exists:carrera,id'],
            'carrera_opcion2_id' => ['nullable', 'string', 'exists:carrera,id', 'different:carrera_opcion1_id'],
        ], [
            'postulante_ci.exists'   => 'El postulante no existe en el sistema.',
            'convocatoria_id.exists' => 'La convocatoria seleccionada no es válida.',
            'carrera_opcion2_id.different' => 'La segunda opción debe ser diferente a la primera.',
        ]);

        // Verificar que la convocatoria esté activa
        $convocatoria = Convocatoria::find($data['convocatoria_id']);
        if ($convocatoria->estado !== 'activa') {
            return response()->json(['mensaje' => 'La convocatoria ya no está activa.'], 422);
        }

        // Verificar que no esté ya inscrito en esta convocatoria
        $yaInscrito = Postulacion::where('postulante_ci', $data['postulante_ci'])
            ->where('convocatoria_id', $data['convocatoria_id'])
            ->exists();

        if ($yaInscrito) {
            return response()->json([
                'mensaje' => 'El postulante ya está inscrito en esta convocatoria.',
            ], 409);
        }

        $inscripcion = Postulacion::create([
            ...$data,
            'estado_admision' => 'pendiente',
            'fecha_registro'  => now(),
        ]);

        BitacoraService::log(
            "Inscripción registrada: CI={$data['postulante_ci']} → {$data['convocatoria_id']}"
        );

        return response()->json([
            'mensaje'     => 'Inscripción registrada correctamente.',
            'inscripcion' => $inscripcion->load('convocatoria', 'carreraOpcion1', 'carreraOpcion2'),
        ], 201);
    }

    /* ── Cancelar / cambiar estado de inscripción ───────────── */
    public function update(Request $request, int $id): JsonResponse
    {
        $inscripcion = Postulacion::findOrFail($id);

        $data = $request->validate([
            'estado_admision' => ['required', 'in:pendiente,aprobado,reprobado,anulado'],
        ]);

        $inscripcion->update($data);
        BitacoraService::log("Inscripción #{$id} actualizada a: {$data['estado_admision']}");

        return response()->json(['mensaje' => 'Estado de inscripción actualizado.', 'inscripcion' => $inscripcion]);
    }
}
