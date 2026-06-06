<?php

namespace App\Http\Controllers;

use App\Models\AsignacionDocente;
use App\Models\Evaluacion;
use App\Models\Grupo;
use App\Models\Postulacion;
use Illuminate\Http\JsonResponse;

// CU22 — Generar Reportes Estadísticos Obligatorios
class ReporteController extends Controller
{
    // Reporte 1 — Lista de postulantes clasificados por aprobados / reprobados
    public function postulantes(): JsonResponse
    {
        $postulaciones = Postulacion::with([
            'postulante.usuario:CI,nombre_completo,email',
            'convocatoria:id,nombre',
            'carreraOpcion1:id,nombre',
        ])
        ->whereNotIn('estado_admision', ['anulado'])
        ->orderBy('postulante_ci')
        ->get();

        // Carga evaluaciones en una sola consulta para evitar N+1
        $cis      = $postulaciones->pluck('postulante_ci')->unique();
        $evalByCI = Evaluacion::whereIn('postulante_ci', $cis)
            ->get()
            ->keyBy('postulante_ci');

        $data = $postulaciones->map(function ($p) use ($evalByCI) {
            $eval = $evalByCI->get($p->postulante_ci);
            return [
                'ci'               => $p->postulante_ci,
                'nombre'           => $p->postulante?->usuario?->nombre_completo ?? '—',
                'email'            => $p->postulante?->usuario?->email ?? '—',
                'convocatoria'     => $p->convocatoria?->nombre ?? $p->convocatoria_id,
                'carrera_opcion1'  => $p->carreraOpcion1?->nombre ?? '—',
                'estado_admision'  => $p->estado_admision,
                'nota1_computacion'   => $eval?->nota_examen1,
                'nota2_matematicas'   => $eval?->nota_examen2,
                'nota3_ingles_fisica' => $eval?->nota_examen3,
                'promedio_final'      => $eval?->promedio_final,
                'estado_resultado'    => $eval?->estado_resultado ?? 'sin evaluar',
            ];
        });

        return response()->json($data);
    }

    // Reporte 2 — Promedios generales y estadísticas por área de evaluación
    public function estadisticas(): JsonResponse
    {
        $totalInscritos = Postulacion::whereNotIn('estado_admision', ['anulado'])->count();

        $totalEvals = Evaluacion::count();

        if ($totalEvals === 0) {
            return response()->json([
                'total_inscritos'   => $totalInscritos,
                'total_evaluados'   => 0,
                'aprobados'         => 0,
                'reprobados'        => 0,
                'tasa_aprobacion'   => 0,
                'promedio_general'  => null,
                'promedio_nota1'    => null,
                'promedio_nota2'    => null,
                'promedio_nota3'    => null,
                'min_promedio'      => null,
                'max_promedio'      => null,
                'areas'             => [],
            ]);
        }

        $s = Evaluacion::selectRaw("
            COUNT(*) as total_evaluados,
            SUM(CASE WHEN estado_resultado = 'aprobado' THEN 1 ELSE 0 END)  as aprobados,
            SUM(CASE WHEN estado_resultado = 'reprobado' THEN 1 ELSE 0 END) as reprobados,
            ROUND(AVG(nota_examen1)::numeric,  2) as promedio_nota1,
            ROUND(AVG(nota_examen2)::numeric,  2) as promedio_nota2,
            ROUND(AVG(nota_examen3)::numeric,  2) as promedio_nota3,
            ROUND(AVG(promedio_final)::numeric, 2) as promedio_general,
            ROUND(MIN(promedio_final)::numeric, 2) as min_promedio,
            ROUND(MAX(promedio_final)::numeric, 2) as max_promedio
        ")->first();

        $aprobados = (int) $s->aprobados;
        $total     = (int) $s->total_evaluados;

        return response()->json([
            'total_inscritos'   => $totalInscritos,
            'total_evaluados'   => $total,
            'aprobados'         => $aprobados,
            'reprobados'        => (int) $s->reprobados,
            'tasa_aprobacion'   => $total > 0 ? round(($aprobados / $total) * 100, 1) : 0,
            'promedio_general'  => (float) $s->promedio_general,
            'promedio_nota1'    => (float) $s->promedio_nota1,
            'promedio_nota2'    => (float) $s->promedio_nota2,
            'promedio_nota3'    => (float) $s->promedio_nota3,
            'min_promedio'      => (float) $s->min_promedio,
            'max_promedio'      => (float) $s->max_promedio,
            'areas'             => [
                ['nombre' => 'Computación',    'promedio' => (float) $s->promedio_nota1],
                ['nombre' => 'Matemáticas',    'promedio' => (float) $s->promedio_nota2],
                ['nombre' => 'Inglés / Física', 'promedio' => (float) $s->promedio_nota3],
            ],
        ]);
    }

    // Reporte 3 — Docentes asignados por grupo + grupos con mayor rendimiento
    public function docentes(): JsonResponse
    {
        $grupos = Grupo::with(['convocatoria:id,nombre', 'carrera:id,nombre'])
            ->orderBy('convocatoria_id')
            ->orderBy('id')
            ->get();

        // Carga todas las asignaciones de estos grupos en una sola consulta
        $asignaciones = AsignacionDocente::with(['docente.usuario:CI,nombre_completo', 'materia:id,nombre'])
            ->whereIn('grupo_id', $grupos->pluck('id'))
            ->get()
            ->groupBy(fn($a) => $a->grupo_id . '|' . $a->convocatoria_id);

        // Estadísticas globales de evaluación (no hay FK directa grupo↔evaluacion)
        $evalGlobal = Evaluacion::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN estado_resultado = 'aprobado'  THEN 1 ELSE 0 END) as aprobados,
            SUM(CASE WHEN estado_resultado = 'reprobado' THEN 1 ELSE 0 END) as reprobados,
            ROUND(AVG(promedio_final)::numeric, 2) as promedio_global
        ")->first();

        $data = $grupos->map(function ($g) use ($asignaciones) {
            $clave   = $g->id . '|' . $g->convocatoria_id;
            $asigns  = $asignaciones->get($clave, collect());

            $docentesList = $asigns->map(fn($a) => [
                'ci'      => $a->docente_ci,
                'nombre'  => $a->docente?->usuario?->nombre_completo ?? '—',
                'materia' => $a->materia?->nombre ?? '—',
            ])->values();

            return [
                'grupo_id'       => $g->id,
                'convocatoria'   => $g->convocatoria?->nombre ?? $g->convocatoria_id,
                'carrera'        => $g->carrera?->nombre ?? '—',
                'modalidad'      => $g->modalidad,
                'cupo_maximo'    => $g->cupo_maximo,
                'estado'         => $g->estado,
                'docentes'       => $docentesList,
                'total_docentes' => $docentesList->count(),
            ];
        });

        // Ordenar grupos por estado (activos primero) como criterio de "mayor rendimiento"
        $sorted = $data->sortByDesc(fn($g) => $g['estado'] === 'activo' ? 1 : 0)->values();

        return response()->json([
            'grupos'  => $sorted,
            'resumen' => [
                'total_grupos'     => $grupos->count(),
                'grupos_activos'   => $grupos->where('estado', 'activo')->count(),
                'aprobados_global' => (int) ($evalGlobal->aprobados  ?? 0),
                'reprobados_global'=> (int) ($evalGlobal->reprobados ?? 0),
                'total_evaluados'  => (int) ($evalGlobal->total      ?? 0),
                'promedio_global'  => (float) ($evalGlobal->promedio_global ?? 0),
            ],
        ]);
    }
}
