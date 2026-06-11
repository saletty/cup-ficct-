<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\CupoCarrera;
use App\Models\Postulacion;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU22 — Gestionar Admisión por Carrera
 * Permite al coordinador definir cupos por carrera/convocatoria y ejecutar
 * el algoritmo de asignación automática de carreras a postulantes aprobados.
 *
 * Algoritmo de asignación:
 *   1. Ordenar aprobados de mayor a menor promedio (prioridad por mérito).
 *   2. Intentar asignar a carrera_opcion1.  Si no hay cupo → carrera_opcion2.
 *   3. Si tampoco hay cupo → estado "no_admitido".
 *   El proceso es idempotente: puede ejecutarse varias veces sin duplicar datos.
 */
class AdmisionController extends Controller
{
    // GET /admisiones/cupos?convocatoria_id=X
    public function indexCupos(Request $request): JsonResponse
    {
        $request->validate(['convocatoria_id' => ['required', 'string', 'exists:convocatoria,id']]);

        $cupos = CupoCarrera::with('carrera')
            ->where('convocatoria_id', $request->convocatoria_id)
            ->orderBy('carrera_id')
            ->get()
            ->map(fn ($c) => [
                'carrera_id'       => $c->carrera_id,
                'nombre_carrera'   => $c->carrera?->nombre_carrera ?? $c->carrera_id,
                'convocatoria_id'  => $c->convocatoria_id,
                'cupo_maximo'      => $c->cupo_maximo,
                'cupo_ocupado'     => $c->cupo_ocupado,
                'disponible'       => $c->disponible(),
            ]);

        return response()->json($cupos);
    }

    // POST /admisiones/cupos  — crea o actualiza el cupo de una carrera para una convocatoria
    public function upsertCupo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrera_id'      => ['required', 'string', 'exists:carrera,id'],
            'convocatoria_id' => ['required', 'string', 'exists:convocatoria,id'],
            'cupo_maximo'     => ['required', 'integer', 'min:0'],
        ], [
            'carrera_id.exists'      => 'La carrera no existe.',
            'convocatoria_id.exists' => 'La convocatoria no existe.',
            'cupo_maximo.min'        => 'El cupo no puede ser negativo.',
        ]);

        $cupo = CupoCarrera::updateOrCreate(
            ['carrera_id' => $data['carrera_id'], 'convocatoria_id' => $data['convocatoria_id']],
            ['cupo_maximo' => $data['cupo_maximo']]
        );

        BitacoraService::log(
            "Cupo actualizado: carrera={$cupo->carrera_id} conv={$cupo->convocatoria_id} max={$cupo->cupo_maximo}"
        );

        return response()->json([
            'mensaje' => 'Cupo guardado correctamente.',
            'cupo'    => $cupo,
        ]);
    }

    // DELETE /admisiones/cupos/{carrera_id}/{convocatoria_id}
    public function destroyCupo(string $carreraId, string $convocatoriaId): JsonResponse
    {
        $cupo = CupoCarrera::where('carrera_id', $carreraId)
            ->where('convocatoria_id', $convocatoriaId)
            ->first();

        if (! $cupo) {
            return response()->json(['mensaje' => 'Cupo no encontrado.'], 404);
        }

        if ($cupo->cupo_ocupado > 0) {
            return response()->json([
                'mensaje' => 'No se puede eliminar un cupo con admitidos registrados.',
            ], 409);
        }

        $cupo->delete();
        return response()->json(['mensaje' => 'Cupo eliminado.']);
    }

    // POST /admisiones/procesar  — ejecuta el algoritmo de asignación de carreras
    public function procesar(Request $request): JsonResponse
    {
        $request->validate([
            'convocatoria_id' => ['required', 'string', 'exists:convocatoria,id'],
        ]);

        $convId  = $request->convocatoria_id;
        $resumen = [];

        DB::transaction(function () use ($convId, &$resumen) {

            // ── 1. Reset: volver todo a "pendiente" (excepto anulados) ──────
            Postulacion::where('convocatoria_id', $convId)
                ->whereNotIn('estado_admision', ['anulado'])
                ->update(['estado_admision' => 'pendiente', 'carrera_admitida_id' => null]);

            // ── 2. Reset cupos ocupados ──────────────────────────────────────
            CupoCarrera::where('convocatoria_id', $convId)->update(['cupo_ocupado' => 0]);

            // ── 3. Marcar reprobados ─────────────────────────────────────────
            //    Toma el examen más reciente por postulante (DISTINCT ON examen_id DESC)
            $reprobadosCIs = DB::table('postulacion as p')
                ->joinSub(
                    DB::table('evaluacion')
                        ->selectRaw('DISTINCT ON (postulante_ci) postulante_ci, estado_resultado')
                        ->orderByRaw('postulante_ci, examen_id DESC'),
                    'e',
                    'e.postulante_ci', '=', 'p.postulante_ci'
                )
                ->where('p.convocatoria_id', $convId)
                ->where('p.estado_admision', 'pendiente')
                ->where('e.estado_resultado', 'reprobado')
                ->pluck('p.postulante_ci');

            if ($reprobadosCIs->isNotEmpty()) {
                Postulacion::where('convocatoria_id', $convId)
                    ->whereIn('postulante_ci', $reprobadosCIs)
                    ->update(['estado_admision' => 'reprobado']);
            }

            // ── 4. Obtener aprobados ordenados por promedio DESC ─────────────
            $aprobados = DB::select("
                SELECT p.postulante_ci, p.carrera_opcion1_id, p.carrera_opcion2_id, e.promedio_final
                FROM postulacion p
                JOIN (
                    SELECT DISTINCT ON (postulante_ci)
                        postulante_ci, estado_resultado, promedio_final
                    FROM evaluacion
                    ORDER BY postulante_ci, examen_id DESC
                ) e ON e.postulante_ci = p.postulante_ci
                WHERE p.convocatoria_id = ?
                  AND p.estado_admision  = 'pendiente'
                  AND e.estado_resultado = 'aprobado'
                ORDER BY e.promedio_final DESC
            ", [$convId]);

            // ── 5. Pre-cargar cupos en memoria para eficiencia ───────────────
            $cuposMap = CupoCarrera::where('convocatoria_id', $convId)
                ->get()
                ->keyBy('carrera_id');

            $admitidos = 0;
            $noAdmitidos = 0;

            // ── 6. Asignar carrera (opción1 → opción2 → no_admitido) ─────────
            foreach ($aprobados as $p) {
                $asignada = null;

                foreach ([$p->carrera_opcion1_id, $p->carrera_opcion2_id] as $carreraId) {
                    if (! $carreraId) continue;
                    $cupo = $cuposMap->get($carreraId);
                    if ($cupo && $cupo->tieneDisponibilidad()) {
                        $cupo->cupo_ocupado++;
                        $asignada = $carreraId;
                        break;
                    }
                }

                if ($asignada) {
                    Postulacion::where([
                        'postulante_ci'  => $p->postulante_ci,
                        'convocatoria_id' => $convId,
                    ])->update([
                        'estado_admision'   => 'admitido',
                        'carrera_admitida_id' => $asignada,
                    ]);
                    $admitidos++;
                } else {
                    Postulacion::where([
                        'postulante_ci'  => $p->postulante_ci,
                        'convocatoria_id' => $convId,
                    ])->update(['estado_admision' => 'no_admitido']);
                    $noAdmitidos++;
                }
            }

            // ── 7. Persistir cupos actualizados ──────────────────────────────
            foreach ($cuposMap as $cupo) {
                $cupo->save();
            }

            $resumen = [
                'admitidos'    => $admitidos,
                'no_admitidos' => $noAdmitidos,
                'reprobados'   => $reprobadosCIs->count(),
                'pendientes'   => Postulacion::where('convocatoria_id', $convId)
                                     ->where('estado_admision', 'pendiente')->count(),
            ];
        });

        BitacoraService::log(
            "Proceso de admisión ejecutado: conv={$convId} — " .
            "admitidos={$resumen['admitidos']} no_admitidos={$resumen['no_admitidos']} reprobados={$resumen['reprobados']}"
        );

        return response()->json([
            'mensaje' => 'Proceso de admisión completado.',
            'resumen' => $resumen,
        ]);
    }

    // GET /admisiones/resultados?convocatoria_id=X
    public function resultados(Request $request): JsonResponse
    {
        $request->validate(['convocatoria_id' => ['required', 'string', 'exists:convocatoria,id']]);

        $rows = DB::table('postulacion as p')
            ->leftJoin('postulante as pt', 'pt.CI', '=', 'p.postulante_ci')
            ->leftJoin('usuario as u',    'u.CI',  '=', 'p.postulante_ci')
            ->leftJoin('carrera as c1',   'c1.id', '=', 'p.carrera_opcion1_id')
            ->leftJoin('carrera as c2',   'c2.id', '=', 'p.carrera_opcion2_id')
            ->leftJoin('carrera as ca',   'ca.id', '=', 'p.carrera_admitida_id')
            ->leftJoin(
                DB::raw('(SELECT DISTINCT ON (postulante_ci) postulante_ci, promedio_final, estado_resultado FROM evaluacion ORDER BY postulante_ci, examen_id DESC) e'),
                'e.postulante_ci', '=', 'p.postulante_ci'
            )
            ->where('p.convocatoria_id', $request->convocatoria_id)
            ->whereNotIn('p.estado_admision', ['anulado'])
            ->orderByRaw("
                CASE p.estado_admision
                    WHEN 'admitido'    THEN 1
                    WHEN 'no_admitido' THEN 2
                    WHEN 'reprobado'   THEN 3
                    ELSE 4
                END
            ")
            ->orderByDesc('e.promedio_final')
            ->select([
                'p.postulante_ci                      AS ci',
                'u.nombre_completo                    AS nombre',
                'p.estado_admision',
                'e.promedio_final',
                'e.estado_resultado',
                'c1.nombre_carrera                    AS opcion1',
                'c2.nombre_carrera                    AS opcion2',
                'ca.nombre_carrera                    AS carrera_admitida',
            ])
            ->get();

        // Resumen de cupos
        $cupos = CupoCarrera::with('carrera')
            ->where('convocatoria_id', $request->convocatoria_id)
            ->get()
            ->map(fn ($c) => [
                'carrera'      => $c->carrera?->nombre_carrera ?? $c->carrera_id,
                'cupo_maximo'  => $c->cupo_maximo,
                'cupo_ocupado' => $c->cupo_ocupado,
                'disponible'   => $c->disponible(),
            ]);

        return response()->json([
            'postulantes' => $rows,
            'cupos'       => $cupos,
        ]);
    }
}
