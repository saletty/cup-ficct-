<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\AsignacionDocente;
use App\Models\Docente;
use App\Models\Grupo;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU12 — Asignar Carga Horaria Docente
// Regla de negocio: un docente puede tener máximo 4 grupos por convocatoria.
class AsignacionDocenteController extends Controller
{
    private const MAX_GRUPOS = 4;

    public function index(Request $request): JsonResponse
    {
        $query = AsignacionDocente::with([
            'docente.usuario:CI,nombre_completo',
            'materia:id,nombre',
            'grupo',
        ]);

        if ($request->filled('convocatoria_id')) {
            $query->where('convocatoria_id', $request->convocatoria_id);
        }
        if ($request->filled('docente_ci')) {
            $query->where('docente_ci', $request->docente_ci);
        }

        return response()->json($query->get());
    }

    /* ── Carga horaria de un docente específico ─────────────── */
    public function cargaHoraria(int $ci): JsonResponse
    {
        $usuario = auth()->user();
        $permisosRol = $usuario->rol?->permisos->pluck('descripcion')->toArray() ?? [];
        $esAdmin     = $usuario->rol?->nombre === 'Administrador';

        if (! $esAdmin && ! in_array('Gestionar docentes', $permisosRol, true)) {
            if ($usuario->CI !== $ci) {
                return response()->json([
                    'mensaje' => 'Solo puedes consultar tu propia carga horaria.',
                    'codigo'  => 'SIN_PERMISO',
                ], 403);
            }
        }

        Docente::findOrFail($ci);

        $asignaciones = AsignacionDocente::with([
            'materia:id,nombre',
            'grupo.horarios.aula',
            'grupo.carrera',
        ])
        ->where('docente_ci', $ci)
        ->get();

        return response()->json(['docente_ci' => $ci, 'asignaciones' => $asignaciones]);
    }

    /* ── Asignar un docente a un grupo ──────────────────────── */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'docente_ci'      => ['required', 'integer', 'exists:docente,CI'],
            'materia_id'      => ['required', 'integer', 'exists:materia,id'],
            'grupo_id'        => ['required', 'string', 'max:10'],
            'convocatoria_id' => ['required', 'string', 'max:10'],
        ], [
            'docente_ci.exists' => 'El docente no está registrado en el sistema.',
            'materia_id.exists' => 'La materia no existe.',
        ]);

        $grupo = Grupo::where('id', $data['grupo_id'])
            ->where('convocatoria_id', $data['convocatoria_id'])
            ->first();

        if (! $grupo) {
            return response()->json([
                'mensaje' => "El grupo '{$data['grupo_id']}' no existe en la convocatoria '{$data['convocatoria_id']}'.",
            ], 404);
        }

        $yaAsignado = AsignacionDocente::where('docente_ci', $data['docente_ci'])
            ->where('grupo_id', $data['grupo_id'])
            ->where('convocatoria_id', $data['convocatoria_id'])
            ->exists();

        if ($yaAsignado) {
            return response()->json(['mensaje' => 'El docente ya está asignado a este grupo.'], 409);
        }

        $gruposActuales = AsignacionDocente::where('docente_ci', $data['docente_ci'])
            ->where('convocatoria_id', $data['convocatoria_id'])
            ->count();

        if ($gruposActuales >= self::MAX_GRUPOS) {
            return response()->json([
                'mensaje'         => "El docente ya tiene " . self::MAX_GRUPOS . " grupos asignados en esta convocatoria (máximo permitido).",
                'grupos_actuales' => $gruposActuales,
            ], 422);
        }

        $asignacion = AsignacionDocente::create($data);
        BitacoraService::log(
            "Asignación docente CI={$data['docente_ci']} → grupo {$data['grupo_id']} ({$data['convocatoria_id']})"
        );

        return response()->json([
            'mensaje'    => 'Docente asignado correctamente al grupo.',
            'asignacion' => $asignacion->load('docente.usuario:CI,nombre_completo', 'materia', 'grupo'),
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $asignacion = AsignacionDocente::findOrFail($id);
        BitacoraService::log("Asignación #{$id} eliminada");
        $asignacion->delete();

        return response()->json(['mensaje' => 'Asignación eliminada.']);
    }
}
