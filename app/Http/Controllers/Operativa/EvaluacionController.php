<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\Evaluacion;
use App\Models\ExamenAdmision;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// CU17 — Gestionar Resultados de Admisión
// CU18 — Consultar Resultados de Admisión (vista postulante)
class EvaluacionController extends Controller
{
    /* ─── CU17: CRUD de evaluaciones ───────────────────────────── */

    public function index(Request $request): JsonResponse
    {
        $evaluaciones = Evaluacion::with([
            'postulante.usuario:CI,nombre_completo',
            'examen:id,descripcion,fecha',
        ])
            ->when($request->examen_id,       fn ($q, $v) => $q->where('examen_id', $v))
            ->when($request->estado_resultado, fn ($q, $v) => $q->where('estado_resultado', $v))
            ->orderBy('postulante_ci')
            ->get();

        return response()->json($evaluaciones);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'postulante_ci' => ['required', 'integer', 'exists:postulante,CI'],
            'examen_id'     => ['required', 'integer', 'exists:examen_admision,id'],
            'nota_examen1'  => ['required', 'numeric', 'min:0', 'max:100'],
            'nota_examen2'  => ['required', 'numeric', 'min:0', 'max:100'],
            'nota_examen3'  => ['required', 'numeric', 'min:0', 'max:100'],
            'nota_examen4'  => ['required', 'numeric', 'min:0', 'max:100'],
        ], [
            'postulante_ci.exists' => 'El postulante no está registrado.',
            'examen_id.exists'     => 'El examen no existe.',
        ]);

        $calculado = Evaluacion::calcular(
            (float) $data['nota_examen1'],
            (float) $data['nota_examen2'],
            (float) $data['nota_examen3'],
            (float) $data['nota_examen4'],
        );

        $evaluacion = DB::transaction(function () use ($data, $calculado) {
            return Evaluacion::create(array_merge($data, $calculado));
        });

        BitacoraService::log(
            "Evaluación registrada: postulante CI={$data['postulante_ci']}, examen #{$data['examen_id']}, " .
            "promedio={$calculado['promedio_final']}, estado={$calculado['estado_resultado']}"
        );

        $evaluacion->load(['postulante.usuario:CI,nombre_completo', 'examen:id,descripcion,fecha']);
        return response()->json(['mensaje' => 'Evaluación registrada.', 'evaluacion' => $evaluacion], 201);
    }

    public function show(int $id): JsonResponse
    {
        $evaluacion = Evaluacion::with([
            'postulante.usuario:CI,nombre_completo',
            'examen:id,descripcion,fecha',
        ])->findOrFail($id);

        return response()->json($evaluacion);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $evaluacion = Evaluacion::findOrFail($id);

        $data = $request->validate([
            'nota_examen1' => ['required', 'numeric', 'min:0', 'max:100'],
            'nota_examen2' => ['required', 'numeric', 'min:0', 'max:100'],
            'nota_examen3' => ['required', 'numeric', 'min:0', 'max:100'],
            'nota_examen4' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $calculado = Evaluacion::calcular(
            (float) $data['nota_examen1'],
            (float) $data['nota_examen2'],
            (float) $data['nota_examen3'],
            (float) $data['nota_examen4'],
        );

        DB::transaction(function () use ($evaluacion, $data, $calculado) {
            $evaluacion->update(array_merge($data, $calculado));
        });

        BitacoraService::log(
            "Evaluación #{$id} actualizada: promedio={$calculado['promedio_final']}, estado={$calculado['estado_resultado']}"
        );

        $evaluacion->load(['postulante.usuario:CI,nombre_completo', 'examen:id,descripcion,fecha']);
        return response()->json(['mensaje' => 'Evaluación actualizada.', 'evaluacion' => $evaluacion]);
    }

    public function destroy(int $id): JsonResponse
    {
        $evaluacion = Evaluacion::findOrFail($id);
        BitacoraService::log("Evaluación #{$id} eliminada (postulante CI={$evaluacion->postulante_ci})");
        $evaluacion->delete();
        return response()->json(['mensaje' => 'Evaluación eliminada.']);
    }

    /* ─── CU18: Consultar Resultados de Admisión (postulante) ───── */

    public function misResultados(): JsonResponse
    {
        $ci = auth()->user()->getKey();

        $resultados = Evaluacion::with(['examen:id,descripcion,fecha'])
            ->where('postulante_ci', $ci)
            ->orderBy('examen_id')
            ->get();

        return response()->json($resultados);
    }

    public function porPostulante(int $ci): JsonResponse
    {
        $resultados = Evaluacion::with(['examen:id,descripcion,fecha'])
            ->where('postulante_ci', $ci)
            ->orderBy('examen_id')
            ->get();

        return response()->json($resultados);
    }
}
