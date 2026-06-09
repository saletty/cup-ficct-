<?php

namespace App\Http\Controllers;

use App\Models\AsignacionExamen;
use App\Models\Aula;
use App\Models\CronogramaExamen;
use App\Models\ExamenAdmision;
use App\Models\Grupo;
use App\Models\Postulante;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// ============================================================
// CU17 — Gestionar Exámenes de Admisión
// Programación de exámenes, gestión de infraestructura (aulas)
// y asignación de postulantes respetando capacidad física.
// ============================================================
class ExamenAdmisionController extends Controller
{
    /* ─── CRUD Exámenes ─────────────────────────────────────────── */

    public function index(): JsonResponse
    {
        $examenes = ExamenAdmision::with('convocatoria:id,nombre')
            ->withCount('asignaciones')
            ->withCount('cronograma')
            ->orderByDesc('fecha')
            ->get();
        return response()->json($examenes);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'convocatoria_id' => ['required', 'string', 'exists:convocatoria,id'],
            'numero_examen'   => ['required', 'integer', 'between:1,3'],
            'descripcion'     => ['required', 'string', 'max:200'],
            'fecha'           => ['required', 'date'],
        ]);

        $data['estado'] = 'borrador';
        $examen = ExamenAdmision::create($data);
        BitacoraService::log("Examen #{$examen->id} creado: {$examen->descripcion} ({$examen->fecha})");

        return response()->json(['mensaje' => 'Examen creado.', 'examen' => $examen], 201);
    }

    public function show(int $id): JsonResponse
    {
        $examen = ExamenAdmision::withCount('asignaciones')->findOrFail($id);
        return response()->json($examen);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $examen = ExamenAdmision::findOrFail($id);

        if ($examen->estado === 'programado') {
            return response()->json(['mensaje' => 'No se puede editar un examen ya programado.'], 409);
        }

        $data = $request->validate([
            'descripcion'   => ['sometimes', 'string', 'max:200'],
            'fecha'         => ['sometimes', 'date'],
            'numero_examen' => ['sometimes', 'integer', 'between:1,3'],
        ]);

        $examen->update($data);
        BitacoraService::log("Examen actualizado: #{$id}");

        return response()->json(['mensaje' => 'Examen actualizado.', 'examen' => $examen]);
    }

    public function destroy(int $id): JsonResponse
    {
        $examen = ExamenAdmision::findOrFail($id);

        if ($examen->estado !== 'borrador') {
            return response()->json(['mensaje' => 'Solo se pueden eliminar exámenes en borrador.'], 409);
        }

        BitacoraService::log("Examen eliminado: #{$id} — {$examen->descripcion}");
        $examen->delete();

        return response()->json(['mensaje' => 'Examen eliminado.']);
    }

    // POST /v1/examenes/{id}/publicar — cambia estado a 'programado'
    public function publicar(int $id): JsonResponse
    {
        $examen = ExamenAdmision::findOrFail($id);

        if ($examen->estado !== 'borrador') {
            return response()->json(['mensaje' => 'El examen ya fue publicado o finalizado.'], 409);
        }

        if ($examen->cronograma()->count() === 0) {
            return response()->json(['mensaje' => 'El examen no tiene cronograma configurado.'], 422);
        }

        $examen->update(['estado' => 'programado']);
        BitacoraService::log("Examen #{$id} publicado — los postulantes ya pueden ver su rol.");

        return response()->json(['mensaje' => 'Examen publicado. Los postulantes pueden consultar su asignación.', 'examen' => $examen]);
    }

    /* ─── Asignaciones de postulantes ───────────────────────────── */

    // GET /v1/examenes/{id}/asignaciones
    public function asignaciones(int $id): JsonResponse
    {
        $examen = ExamenAdmision::findOrFail($id);

        $asignaciones = AsignacionExamen::with([
            'postulante.usuario:CI,nombre_completo',
            'aula:nro,capacidad,descripcion',
        ])->where('examen_id', $id)->get();

        // Agrupado por aula con contador de ocupación
        $porAula = $asignaciones->groupBy('aula_nro')->map(fn ($lista, $nro) => [
            'aula_nro'   => $nro,
            'capacidad'  => $lista->first()->aula?->capacidad,
            'ocupados'   => $lista->count(),
            'postulantes' => $lista->map(fn ($a) => [
                'id'             => $a->id,
                'postulante_ci'  => $a->postulante_ci,
                'nombre'         => $a->postulante?->usuario?->nombre_completo,
            ]),
        ])->values();

        return response()->json([
            'examen'      => $examen,
            'total'       => $asignaciones->count(),
            'por_aula'    => $porAula,
            'asignaciones' => $asignaciones,
        ]);
    }

    // POST /v1/examenes/{id}/asignaciones — asignar un postulante
    public function asignar(Request $request, int $id): JsonResponse
    {
        $examen = ExamenAdmision::findOrFail($id);

        $data = $request->validate([
            'postulante_ci' => ['required', 'integer', 'exists:postulante,CI'],
            'aula_nro'      => ['required', 'string', 'exists:aula,nro'],
        ], [
            'postulante_ci.exists' => 'El postulante no está registrado.',
            'aula_nro.exists'      => 'El aula no existe.',
        ]);

        // Verificar que el postulante no esté ya asignado a este examen
        $yaAsignado = AsignacionExamen::where('examen_id', $id)
            ->where('postulante_ci', $data['postulante_ci'])
            ->exists();
        if ($yaAsignado) {
            return response()->json(['mensaje' => 'El postulante ya está asignado a este examen.'], 409);
        }

        // Verificar capacidad del aula
        $aula     = Aula::findOrFail($data['aula_nro']);
        $ocupados = AsignacionExamen::where('examen_id', $id)->where('aula_nro', $data['aula_nro'])->count();
        if ($ocupados >= $aula->capacidad) {
            return response()->json([
                'mensaje' => "El aula {$aula->nro} está al máximo de su capacidad ({$aula->capacidad} lugares).",
            ], 422);
        }

        $asignacion = AsignacionExamen::create([
            'examen_id'     => $id,
            'postulante_ci' => $data['postulante_ci'],
            'aula_nro'      => $data['aula_nro'],
        ]);

        BitacoraService::log("Postulante CI={$data['postulante_ci']} asignado al examen #{$id}, aula {$data['aula_nro']}");

        return response()->json(['mensaje' => 'Postulante asignado.', 'asignacion' => $asignacion], 201);
    }

    // POST /v1/examenes/{id}/asignaciones/auto — distribución automática
    public function autoAsignar(Request $request, int $id): JsonResponse
    {
        $examen = ExamenAdmision::findOrFail($id);

        $data = $request->validate([
            'aulas' => ['required', 'array', 'min:1'],
            'aulas.*' => ['string', 'exists:aula,nro'],
        ]);

        // Postulantes sin asignar aún en este examen
        $asignadosCi = AsignacionExamen::where('examen_id', $id)->pluck('postulante_ci');
        $pendientes  = Postulante::whereNotIn('CI', $asignadosCi)->pluck('CI')->toArray();

        if (empty($pendientes)) {
            return response()->json(['mensaje' => 'Todos los postulantes ya están asignados.']);
        }

        $aulas = Aula::whereIn('nro', $data['aulas'])->where('estado', 'activo')->get()->keyBy('nro');

        DB::transaction(function () use ($id, $pendientes, $aulas, $examen) {
            $idx = 0;
            foreach ($aulas as $aula) {
                $ocupados = AsignacionExamen::where('examen_id', $id)->where('aula_nro', $aula->nro)->count();
                $libres   = $aula->capacidad - $ocupados;

                for ($i = 0; $i < $libres && $idx < count($pendientes); $i++, $idx++) {
                    AsignacionExamen::create([
                        'examen_id'     => $id,
                        'postulante_ci' => $pendientes[$idx],
                        'aula_nro'      => $aula->nro,
                    ]);
                }
            }
        });

        $asignados = AsignacionExamen::where('examen_id', $id)->count();
        BitacoraService::log("Auto-asignación examen #{$id}: {$asignados} postulantes distribuidos");

        return response()->json(['mensaje' => "Distribución automática completada. Total asignados: {$asignados}."]);
    }

    // DELETE /v1/examenes/{id}/asignaciones/{asignId}
    public function quitarAsignacion(int $id, int $asignId): JsonResponse
    {
        $asignacion = AsignacionExamen::where('examen_id', $id)->findOrFail($asignId);
        $asignacion->delete();
        BitacoraService::log("Asignación #{$asignId} eliminada del examen #{$id}");
        return response()->json(['mensaje' => 'Asignación eliminada.']);
    }

    /* ─── Cronograma por grupo ───────────────────────────────────── */

    // GET /v1/examenes/{id}/cronograma — grupos con su horario y aula
    public function cronograma(int $id): JsonResponse
    {
        $examen = ExamenAdmision::with('convocatoria:id,nombre')->findOrFail($id);

        // Grupos de la convocatoria
        $grupos = Grupo::where('convocatoria_id', $examen->convocatoria_id)
            ->orderBy('id')
            ->get(['id', 'convocatoria_id', 'turno', 'cupo_maximo', 'estado']);

        // Entradas de cronograma ya guardadas
        $slots = CronogramaExamen::with('aula:nro,descripcion,capacidad')
            ->where('examen_id', $id)
            ->get()
            ->keyBy('grupo_id');

        $resultado = $grupos->map(fn ($g) => [
            'grupo_id'        => $g->id,
            'convocatoria_id' => $g->convocatoria_id,
            'turno'           => $g->turno,
            'cupo'            => $g->cupo_maximo,
            'hora_inicio'     => $slots[$g->id]->hora_inicio ?? null,
            'hora_fin'        => $slots[$g->id]->hora_fin    ?? null,
            'aula_nro'        => $slots[$g->id]->aula_nro    ?? null,
            'aula'            => $slots[$g->id]->aula        ?? null,
        ]);

        return response()->json([
            'examen'     => $examen,
            'cronograma' => $resultado,
        ]);
    }

    // POST /v1/examenes/{id}/cronograma — guardar/actualizar slots por grupo
    public function guardarCronograma(Request $request, int $id): JsonResponse
    {
        $examen = ExamenAdmision::findOrFail($id);

        if ($examen->estado === 'finalizado') {
            return response()->json(['mensaje' => 'No se puede modificar un examen finalizado.'], 409);
        }

        $request->validate([
            'slots'                  => ['required', 'array', 'min:1'],
            'slots.*.grupo_id'       => ['required', 'string'],
            'slots.*.convocatoria_id'=> ['required', 'string'],
            'slots.*.hora_inicio'    => ['required', 'date_format:H:i'],
            'slots.*.hora_fin'       => ['required', 'date_format:H:i', 'after:slots.*.hora_inicio'],
            'slots.*.aula_nro'       => ['required', 'string', 'exists:aula,nro'],
        ]);

        DB::transaction(function () use ($id, $request, $examen) {
            foreach ($request->slots as $slot) {
                CronogramaExamen::updateOrCreate(
                    ['examen_id' => $id, 'grupo_id' => $slot['grupo_id'], 'convocatoria_id' => $slot['convocatoria_id']],
                    ['hora_inicio' => $slot['hora_inicio'], 'hora_fin' => $slot['hora_fin'], 'aula_nro' => $slot['aula_nro']]
                );
            }
        });

        BitacoraService::log("Cronograma del examen #{$id} actualizado ({$request->count('slots')} grupos)");

        return response()->json(['mensaje' => 'Cronograma guardado correctamente.']);
    }

    // GET /v1/mi-examen — postulante consulta su rol de examen programado
    public function miExamen(): JsonResponse
    {
        $ci = auth()->user()->getKey();

        $asignacion = AsignacionExamen::with([
            'examen:id,descripcion,fecha,hora_inicio,hora_fin,estado',
            'aula:nro,capacidad,descripcion',
        ])
            ->where('postulante_ci', $ci)
            ->whereHas('examen', fn ($q) => $q->where('estado', 'programado'))
            ->first();

        if (! $asignacion) {
            return response()->json(['mensaje' => 'No tienes un examen programado asignado.'], 404);
        }

        return response()->json($asignacion);
    }
}
