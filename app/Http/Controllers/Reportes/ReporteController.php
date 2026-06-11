<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
use App\Models\AsignacionDocente;
use App\Models\Evaluacion;
use App\Models\Grupo;
use App\Models\Postulacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// CU21 — Generar Reportes Estadísticos Obligatorios
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

        $cis      = $postulaciones->pluck('postulante_ci')->unique();
        $evalByCI = Evaluacion::whereIn('postulante_ci', $cis)
            ->get()
            ->keyBy('postulante_ci');

        $data = $postulaciones->map(function ($p) use ($evalByCI) {
            $eval = $evalByCI->get($p->postulante_ci);
            return [
                'ci'                 => $p->postulante_ci,
                'nombre'             => $p->postulante?->usuario?->nombre_completo ?? '—',
                'email'              => $p->postulante?->usuario?->email ?? '—',
                'convocatoria'       => $p->convocatoria?->nombre ?? $p->convocatoria_id,
                'carrera_opcion1'    => $p->carreraOpcion1?->nombre ?? '—',
                'estado_admision'    => $p->estado_admision,
                'nota1_computacion'  => $eval?->nota_examen1,
                'nota2_matematicas'  => $eval?->nota_examen2,
                'nota3_ingles'       => $eval?->nota_examen3,
                'nota4_fisica'       => $eval?->nota_examen4,
                'promedio_final'     => $eval?->promedio_final,
                'estado_resultado'   => $eval?->estado_resultado ?? 'sin evaluar',
            ];
        });

        return response()->json($data);
    }

    // Reporte 2 — Promedios generales y estadísticas por área de evaluación
    public function estadisticas(): JsonResponse
    {
        $totalInscritos = Postulacion::whereNotIn('estado_admision', ['anulado'])->count();
        $totalEvals     = Evaluacion::count();

        if ($totalEvals === 0) {
            return response()->json([
                'total_inscritos'  => $totalInscritos,
                'total_evaluados'  => 0,
                'aprobados'        => 0,
                'reprobados'       => 0,
                'tasa_aprobacion'  => 0,
                'promedio_general' => null,
                'promedio_nota1'   => null,
                'promedio_nota2'   => null,
                'promedio_nota3'   => null,
                'promedio_nota4'   => null,
                'min_promedio'     => null,
                'max_promedio'     => null,
                'areas'            => [],
            ]);
        }

        $s = Evaluacion::selectRaw("
            COUNT(*) as total_evaluados,
            SUM(CASE WHEN estado_resultado = 'aprobado'  THEN 1 ELSE 0 END) as aprobados,
            SUM(CASE WHEN estado_resultado = 'reprobado' THEN 1 ELSE 0 END) as reprobados,
            ROUND(AVG(nota_examen1)::numeric,  2) as promedio_nota1,
            ROUND(AVG(nota_examen2)::numeric,  2) as promedio_nota2,
            ROUND(AVG(nota_examen3)::numeric,  2) as promedio_nota3,
            ROUND(AVG(nota_examen4)::numeric,  2) as promedio_nota4,
            ROUND(AVG(promedio_final)::numeric, 2) as promedio_general,
            ROUND(MIN(promedio_final)::numeric, 2) as min_promedio,
            ROUND(MAX(promedio_final)::numeric, 2) as max_promedio
        ")->first();

        $aprobados = (int) $s->aprobados;
        $total     = (int) $s->total_evaluados;

        return response()->json([
            'total_inscritos'  => $totalInscritos,
            'total_evaluados'  => $total,
            'aprobados'        => $aprobados,
            'reprobados'       => (int) $s->reprobados,
            'tasa_aprobacion'  => $total > 0 ? round(($aprobados / $total) * 100, 1) : 0,
            'promedio_general' => (float) $s->promedio_general,
            'promedio_nota1'   => (float) $s->promedio_nota1,
            'promedio_nota2'   => (float) $s->promedio_nota2,
            'promedio_nota3'   => (float) $s->promedio_nota3,
            'promedio_nota4'   => (float) $s->promedio_nota4,
            'min_promedio'     => (float) $s->min_promedio,
            'max_promedio'     => (float) $s->max_promedio,
            'areas'            => [
                ['nombre' => 'Computación', 'promedio' => (float) $s->promedio_nota1],
                ['nombre' => 'Matemáticas', 'promedio' => (float) $s->promedio_nota2],
                ['nombre' => 'Inglés',      'promedio' => (float) $s->promedio_nota3],
                ['nombre' => 'Física',      'promedio' => (float) $s->promedio_nota4],
            ],
        ]);
    }

    // Reporte 4 — Ranking de docentes o grupos por aprobados / reprobados / promedio
    // Filtros: tipo (docentes|grupos), convocatoria_id, grupo_id, docente_ci, carrera_id, ordenar, limite
    public function ranking(Request $request): JsonResponse
    {
        $tipo      = $request->input('tipo', 'docentes');
        $convId    = $request->integer('convocatoria_id') ?: null;
        $grupoId   = $request->integer('grupo_id')        ?: null;
        $docenteCi = $request->integer('docente_ci')      ?: null;
        $carreraId = $request->integer('carrera_id')      ?: null;
        $ordenar   = $request->input('ordenar', 'aprobados');
        $limite    = min(max((int) $request->input('limite', 50), 1), 200);

        $col = match ($ordenar) {
            'reprobados' => 'reprobados',
            'promedio'   => 'promedio_grupo',
            'tasa'       => 'tasa_aprobacion',
            default      => 'aprobados',
        };

        return $tipo === 'grupos'
            ? $this->rankingGrupos($convId, $grupoId, $carreraId, $col, $limite)
            : $this->rankingDocentes($convId, $grupoId, $docenteCi, $carreraId, $col, $limite);
    }

    private function rankingDocentes(
        ?int $convId, ?int $grupoId, ?int $docenteCi, ?int $carreraId,
        string $col, int $limite
    ): JsonResponse {
        $where    = ["p.estado_admision != 'anulado'"];
        $bindings = [];

        if ($convId)    { $where[] = 'ad.convocatoria_id = ?'; $bindings[] = $convId; }
        if ($grupoId)   { $where[] = 'ad.grupo_id = ?';        $bindings[] = $grupoId; }
        if ($docenteCi) { $where[] = 'ad.docente_ci = ?';      $bindings[] = $docenteCi; }
        if ($carreraId) { $where[] = 'g.carrera_id = ?';       $bindings[] = $carreraId; }

        $whereClause = implode(' AND ', $where);
        $bindings[]  = $limite;

        // DISTINCT ON garantiza un único registro de evaluación por postulante (el del examen más reciente)
        $sql = <<<SQL
            SELECT
                ad.docente_ci,
                u.nombre_completo                               AS docente_nombre,
                COUNT(DISTINCT ad.grupo_id)                     AS total_grupos,
                COUNT(DISTINCT p.postulante_ci)                 AS total_estudiantes,
                COALESCE(SUM(CASE WHEN e.estado_resultado = 'aprobado'  THEN 1 ELSE 0 END), 0) AS aprobados,
                COALESCE(SUM(CASE WHEN e.estado_resultado = 'reprobado' THEN 1 ELSE 0 END), 0) AS reprobados,
                ROUND(AVG(e.promedio_final)::numeric, 2)        AS promedio_grupo,
                ROUND(
                    (COALESCE(SUM(CASE WHEN e.estado_resultado = 'aprobado' THEN 1 ELSE 0 END), 0)::float
                     / NULLIF(COUNT(DISTINCT p.postulante_ci), 0) * 100)::numeric, 1
                )                                               AS tasa_aprobacion
            FROM  (SELECT DISTINCT docente_ci, grupo_id, convocatoria_id FROM asignacion_docente) AS ad
            JOIN  usuario u     ON u."CI"             = ad.docente_ci
            JOIN  postulacion p ON p.grupo_id         = ad.grupo_id
                               AND p.convocatoria_id  = ad.convocatoria_id
            LEFT JOIN (
                SELECT DISTINCT ON (postulante_ci)
                    postulante_ci, estado_resultado, promedio_final
                FROM evaluacion
                ORDER BY postulante_ci, examen_id DESC
            ) e ON e.postulante_ci = p.postulante_ci
            LEFT JOIN grupo g ON g.id = ad.grupo_id AND g.convocatoria_id = ad.convocatoria_id
            WHERE {$whereClause}
            GROUP BY ad.docente_ci, u.nombre_completo
            ORDER BY {$col} DESC NULLS LAST
            LIMIT ?
        SQL;

        return response()->json(DB::select($sql, $bindings));
    }

    private function rankingGrupos(
        ?int $convId, ?int $grupoId, ?int $carreraId,
        string $col, int $limite
    ): JsonResponse {
        $where    = ["p.estado_admision != 'anulado'", 'p.grupo_id IS NOT NULL'];
        $bindings = [];

        if ($convId)    { $where[] = 'p.convocatoria_id = ?'; $bindings[] = $convId; }
        if ($grupoId)   { $where[] = 'p.grupo_id = ?';        $bindings[] = $grupoId; }
        if ($carreraId) { $where[] = 'g.carrera_id = ?';      $bindings[] = $carreraId; }

        $whereClause = implode(' AND ', $where);
        $bindings[]  = $limite;

        $sql = <<<SQL
            SELECT
                p.grupo_id,
                p.convocatoria_id,
                c.nombre                                        AS carrera,
                g.cupo_maximo,
                g.estado                                        AS grupo_estado,
                COUNT(DISTINCT p.postulante_ci)                 AS total_estudiantes,
                COALESCE(SUM(CASE WHEN e.estado_resultado = 'aprobado'  THEN 1 ELSE 0 END), 0) AS aprobados,
                COALESCE(SUM(CASE WHEN e.estado_resultado = 'reprobado' THEN 1 ELSE 0 END), 0) AS reprobados,
                ROUND(AVG(e.promedio_final)::numeric, 2)        AS promedio_grupo,
                ROUND(
                    (COALESCE(SUM(CASE WHEN e.estado_resultado = 'aprobado' THEN 1 ELSE 0 END), 0)::float
                     / NULLIF(COUNT(DISTINCT p.postulante_ci), 0) * 100)::numeric, 1
                )                                               AS tasa_aprobacion
            FROM  postulacion p
            LEFT JOIN (
                SELECT DISTINCT ON (postulante_ci)
                    postulante_ci, estado_resultado, promedio_final
                FROM evaluacion
                ORDER BY postulante_ci, examen_id DESC
            ) e ON e.postulante_ci = p.postulante_ci
            LEFT JOIN grupo g   ON g.id = p.grupo_id AND g.convocatoria_id = p.convocatoria_id
            LEFT JOIN carrera c ON c.id = g.carrera_id
            WHERE {$whereClause}
            GROUP BY p.grupo_id, p.convocatoria_id, c.nombre, g.cupo_maximo, g.estado
            ORDER BY {$col} DESC NULLS LAST
            LIMIT ?
        SQL;

        return response()->json(DB::select($sql, $bindings));
    }

    // Reporte 3 — Docentes asignados por grupo + grupos con mayor rendimiento
    public function docentes(): JsonResponse
    {
        $grupos = Grupo::with(['convocatoria:id,nombre', 'carrera:id,nombre'])
            ->orderBy('convocatoria_id')
            ->orderBy('id')
            ->get();

        $asignaciones = AsignacionDocente::with(['docente.usuario:CI,nombre_completo', 'materia:id,nombre'])
            ->whereIn('grupo_id', $grupos->pluck('id'))
            ->get()
            ->groupBy(fn ($a) => $a->grupo_id . '|' . $a->convocatoria_id);

        $evalGlobal = Evaluacion::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN estado_resultado = 'aprobado'  THEN 1 ELSE 0 END) as aprobados,
            SUM(CASE WHEN estado_resultado = 'reprobado' THEN 1 ELSE 0 END) as reprobados,
            ROUND(AVG(promedio_final)::numeric, 2) as promedio_global
        ")->first();

        $data = $grupos->map(function ($g) use ($asignaciones) {
            $clave  = $g->id . '|' . $g->convocatoria_id;
            $asigns = $asignaciones->get($clave, collect());

            $docentesList = $asigns->map(fn ($a) => [
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

        $sorted = $data->sortByDesc(fn ($g) => $g['estado'] === 'activo' ? 1 : 0)->values();

        return response()->json([
            'grupos'  => $sorted,
            'resumen' => [
                'total_grupos'      => $grupos->count(),
                'grupos_activos'    => $grupos->where('estado', 'activo')->count(),
                'aprobados_global'  => (int) ($evalGlobal->aprobados       ?? 0),
                'reprobados_global' => (int) ($evalGlobal->reprobados      ?? 0),
                'total_evaluados'   => (int) ($evalGlobal->total           ?? 0),
                'promedio_global'   => (float) ($evalGlobal->promedio_global ?? 0),
            ],
        ]);
    }
}
