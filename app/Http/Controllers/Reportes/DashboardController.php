<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\Postulacion;
use Illuminate\Http\JsonResponse;

// CU20 — Visualizar Dashboard Administrativo
// Estadísticas consolidadas en tiempo real sobre el estado del proceso de admisión.
class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $counts = Postulacion::selectRaw('estado_admision, COUNT(*) as total')
            ->groupBy('estado_admision')
            ->pluck('total', 'estado_admision');

        $totalInscritos = $counts->except(['anulado'])->sum();
        $aprobados      = (int) ($counts['aprobado']  ?? 0);
        $reprobados     = (int) ($counts['reprobado'] ?? 0);

        $gruposActivos = Grupo::where('estado', 'activo')->count();

        return response()->json([
            'total_inscritos' => $totalInscritos,
            'aprobados'       => $aprobados,
            'reprobados'      => $reprobados,
            'grupos_activos'  => $gruposActivos,
        ]);
    }
}
