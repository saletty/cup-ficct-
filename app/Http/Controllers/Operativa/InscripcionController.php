<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\AsignacionDocente;
use App\Models\Convocatoria;
use App\Models\Grupo;
use App\Models\Horario;
use App\Models\Postulacion;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU9 — Registrar Inscripción al CUP
class InscripcionController extends Controller
{
    /* ── Listar convocatorias disponibles para inscripción ─── */
    public function convocatorias(): JsonResponse
    {
        Convocatoria::where('estado', 'habilitada')
            ->where('fecha_fin', '<', now()->toDateString())
            ->update(['estado' => 'finalizada']);

        $convocatorias = Convocatoria::where('estado', 'habilitada')
            ->where('fecha_fin', '>=', now()->toDateString())
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
            'postulante_ci.exists'         => 'El postulante no existe en el sistema.',
            'convocatoria_id.exists'       => 'La convocatoria seleccionada no es válida.',
            'carrera_opcion2_id.different' => 'La segunda opción debe ser diferente a la primera.',
        ]);

        $convocatoria = Convocatoria::find($data['convocatoria_id']);
        if ($convocatoria->estado !== 'habilitada') {
            return response()->json(['mensaje' => 'La convocatoria no está habilitada para inscripciones.'], 422);
        }

        $yaInscrito = Postulacion::where('postulante_ci', $data['postulante_ci'])
            ->where('convocatoria_id', $data['convocatoria_id'])
            ->where('estado_admision', '!=', 'anulado')
            ->exists();

        if ($yaInscrito) {
            return response()->json([
                'mensaje' => 'El postulante ya tiene una inscripción activa en esta convocatoria.',
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

    /* ── Horarios del grupo del postulante autenticado ── */
    public function misHorarios(): JsonResponse
    {
        $ci = auth()->user()->getKey();

        $inscripcion = Postulacion::with([
            'convocatoria:id,nombre,estado',
            'carreraOpcion1:id,nombre_carrera',
        ])
        ->where('postulante_ci', $ci)
        ->whereNotIn('estado_admision', ['anulado'])
        ->latest('fecha_registro')
        ->first();

        if (! $inscripcion) {
            return response()->json(['inscripcion' => null, 'grupos' => []]);
        }

        $convId = $inscripcion->convocatoria_id;

        $grupos = Grupo::with(['carrera:id,nombre_carrera'])
            ->where('convocatoria_id', $convId)
            ->where('estado', 'activo')
            ->get();

        $grupoIds = $grupos->pluck('id');

        $horariosPorGrupo = Horario::with(['aula:nro,descripcion'])
            ->where('convocatoria_id', $convId)
            ->whereIn('grupo_id', $grupoIds)
            ->orderBy('grupo_id')
            ->orderBy('dia')
            ->orderBy('hora_inicio')
            ->get()
            ->groupBy('grupo_id');

        $docentesPorGrupo = AsignacionDocente::with(['docente.usuario:CI,nombre_completo', 'materia:id,nombre'])
            ->where('convocatoria_id', $convId)
            ->whereIn('grupo_id', $grupoIds)
            ->get()
            ->groupBy('grupo_id');

        $gruposData = $grupos->map(function ($g) use ($horariosPorGrupo, $docentesPorGrupo) {
            return [
                'id'          => $g->id,
                'carrera'     => $g->carrera?->nombre_carrera ?? '—',
                'modalidad'   => $g->modalidad,
                'cupo_maximo' => $g->cupo_maximo,
                'horarios'    => $horariosPorGrupo->get($g->id, collect())->map(fn($h) => [
                    'dia'        => $h->dia,
                    'hora_inicio'=> $h->hora_inicio,
                    'hora_fin'   => $h->hora_fin,
                    'aula_nro'   => $h->aula_nro,
                    'aula_desc'  => $h->aula?->descripcion ?? '',
                ])->values(),
                'docentes'    => $docentesPorGrupo->get($g->id, collect())->map(fn($a) => [
                    'nombre'  => $a->docente?->usuario?->nombre_completo ?? '—',
                    'materia' => $a->materia?->nombre ?? '—',
                ])->values(),
            ];
        });

        return response()->json([
            'inscripcion' => [
                'convocatoria'    => $inscripcion->convocatoria,
                'carrera'         => $inscripcion->carreraOpcion1,
                'estado_admision' => $inscripcion->estado_admision,
            ],
            'grupos' => $gruposData,
        ]);
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
