<?php

namespace App\Http\Controllers\Seguridad;

use App\Http\Controllers\Controller;
use App\Models\Bitacora;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU6 — Administrar Bitácora del Sistema
class BitacoraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Bitacora::with('usuario:CI,nombre_completo,email')
            ->orderBy('fecha', 'desc');

        // Filtros opcionales
        if ($request->filled('usuario_ci')) {
            $query->where('usuario_ci', $request->usuario_ci);
        }
        if ($request->filled('accion')) {
            $query->where('accion', 'ilike', '%' . $request->accion . '%');
        }
        if ($request->filled('desde')) {
            $query->whereDate('fecha', '>=', $request->desde);
        }
        if ($request->filled('hasta')) {
            $query->whereDate('fecha', '<=', $request->hasta);
        }

        return response()->json($query->paginate(50));
    }
}
