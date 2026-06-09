<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\AsignacionDocente;
use App\Models\Postulacion;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU12 (ext.) — Registrar Asistencia (Docente)
class AsistenciaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'        => ['required', 'string'],
            'convocatoria_id' => ['required', 'string'],
            'fecha'           => ['required', 'date'],
        ]);

        $grupoId        = $request->grupo_id;
        $convocatoriaId = $request->convocatoria_id;
        $fecha          = $request->fecha;
        $docenteCi      = auth()->user()->getKey();

        $asignado = AsignacionDocente::where('docente_ci', $docenteCi)
            ->where('grupo_id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->exists();

        if (! $asignado) {
            return response()->json(['mensaje' => 'No tienes permiso para ver la asistencia de este grupo.'], 403);
        }

        $postulantes = Postulacion::where('grupo_id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->with('postulante.usuario:CI,nombre_completo')
            ->get()
            ->map(fn($p) => [
                'CI'              => $p->postulante_ci,
                'nombre_completo' => $p->postulante->usuario?->nombre_completo ?? "CI {$p->postulante_ci}",
            ])
            ->sortBy('nombre_completo')
            ->values();

        $registros = Asistencia::where('grupo_id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->where('fecha', $fecha)
            ->get()
            ->keyBy('postulante_ci');

        $lista = $postulantes->map(fn($p) => [
            'CI'              => $p['CI'],
            'nombre_completo' => $p['nombre_completo'],
            'estado'          => $registros->get($p['CI'])?->estado ?? 'presente',
            'observacion'     => $registros->get($p['CI'])?->observacion,
            'ya_guardado'     => $registros->has($p['CI']),
        ]);

        return response()->json([
            'grupo_id'        => $grupoId,
            'convocatoria_id' => $convocatoriaId,
            'fecha'           => $fecha,
            'total'           => $lista->count(),
            'tiene_registros' => $registros->isNotEmpty(),
            'postulantes'     => $lista->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'grupo_id'                  => ['required', 'string'],
            'convocatoria_id'           => ['required', 'string'],
            'fecha'                     => ['required', 'date'],
            'registros'                 => ['required', 'array', 'min:1'],
            'registros.*.postulante_ci' => ['required', 'integer'],
            'registros.*.estado'        => ['required', 'in:presente,ausente,justificado'],
            'registros.*.observacion'   => ['nullable', 'string', 'max:300'],
        ], [
            'registros.*.estado.in' => 'Estado inválido. Use: presente, ausente o justificado.',
        ]);

        $docenteCi = auth()->user()->getKey();

        $asignado = AsignacionDocente::where('docente_ci', $docenteCi)
            ->where('grupo_id', $data['grupo_id'])
            ->where('convocatoria_id', $data['convocatoria_id'])
            ->exists();

        if (! $asignado) {
            return response()->json(['mensaje' => 'No tienes permiso para registrar asistencia en este grupo.'], 403);
        }

        foreach ($data['registros'] as $r) {
            Asistencia::updateOrCreate(
                [
                    'postulante_ci'   => $r['postulante_ci'],
                    'grupo_id'        => $data['grupo_id'],
                    'convocatoria_id' => $data['convocatoria_id'],
                    'fecha'           => $data['fecha'],
                ],
                [
                    'docente_ci'  => $docenteCi,
                    'estado'      => $r['estado'],
                    'observacion' => $r['observacion'] ?? null,
                ]
            );
        }

        $total = count($data['registros']);
        BitacoraService::log(
            "Asistencia registrada: grupo={$data['grupo_id']}/{$data['convocatoria_id']}, fecha={$data['fecha']}, {$total} estudiantes"
        );

        return response()->json(['mensaje' => "Asistencia guardada correctamente ({$total} registros)."]);
    }
}
