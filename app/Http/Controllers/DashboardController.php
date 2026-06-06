<?php

namespace App\Http\Controllers;

use App\Models\Evaluacion;
use App\Models\Grupo;
use App\Models\Postulacion;
use Illuminate\Http\JsonResponse;

// CU21 — Visualizar Dashboard Administrativo
// Estadísticas consolidadas en tiempo real sobre el estado del proceso de admisión.
class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        // Total postulantes confirmados (excluyendo anulados) — usa idx_postulacion_estado
        $totalInscritos = Postulacion::whereNotIn('estado_admision', ['anulado'])->count();

        // Resultados de examen (evaluaciones finalizadas)
        $aprobados  = Evaluacion::where('estado_resultado', 'aprobado')->count();
        $reprobados = Evaluacion::where('estado_resultado', 'reprobado')->count();

        // Grupos activos de la gestión vigente
        $gruposActivos = Grupo::where('estado', 'activo')->count();

        return response()->json([
            'total_inscritos' => $totalInscritos,
            'aprobados'       => $aprobados,
            'reprobados'      => $reprobados,
            'grupos_activos'  => $gruposActivos,
        ]);
    }
}
