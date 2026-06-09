<?php

namespace App\Http\Controllers\Personas;

use App\Http\Controllers\Controller;
use App\Models\Convocatoria;
use App\Models\Postulacion;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// CU10 — Gestionar Convocatorias
// CU20 — Calcular Cantidad de Grupos (CEIL / 70)
class ConvocatoriaController extends Controller
{
    private const LIMITE_POR_GRUPO = 70;

    public function index(): JsonResponse
    {
        // Auto-finalizar convocatorias cuya fecha_fin ya pasó
        Convocatoria::where('estado', 'habilitada')
            ->where('fecha_fin', '<', now()->toDateString())
            ->update(['estado' => 'finalizada']);

        return response()->json(
            Convocatoria::orderBy('fecha_inicio', 'desc')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id'           => ['required', 'string', 'max:10', 'unique:convocatoria,id'],
            'nombre'       => ['required', 'string', 'max:100'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin'    => ['required', 'date', 'after:fecha_inicio'],
            'cupo_maximo'  => ['required', 'integer', 'min:1'],
            'estado'       => ['sometimes', 'in:habilitada,finalizada'],
        ], [
            'id.unique'          => 'Ya existe una convocatoria con ese ID.',
            'fecha_fin.after'    => 'La fecha de finalización debe ser posterior a la de inicio.',
        ]);

        $data['estado'] = $data['estado'] ?? 'habilitada';

        $convocatoria = Convocatoria::create($data);
        BitacoraService::log("Convocatoria creada: {$convocatoria->id} — {$convocatoria->nombre}");

        return response()->json(['mensaje' => 'Convocatoria creada.', 'convocatoria' => $convocatoria], 201);
    }

    public function show(string $id): JsonResponse
    {
        $conv = Convocatoria::with('postulaciones')->findOrFail($id);
        return response()->json($conv);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $conv = Convocatoria::findOrFail($id);

        $data = $request->validate([
            'nombre'       => ['sometimes', 'string', 'max:100'],
            'fecha_inicio' => ['sometimes', 'date'],
            'fecha_fin'    => ['sometimes', 'date', 'after:fecha_inicio'],
            'cupo_maximo'  => ['sometimes', 'integer', 'min:1'],
            'estado'       => ['sometimes', 'in:habilitada,finalizada'],
        ], [
            'fecha_fin.after' => 'La fecha de finalización debe ser posterior a la de inicio.',
        ]);

        $inicio = $data['fecha_inicio'] ?? $conv->fecha_inicio;
        $fin    = $data['fecha_fin']    ?? $conv->fecha_fin;
        if ($fin <= $inicio) {
            return response()->json(['mensaje' => 'La fecha de finalización debe ser posterior a la de inicio.'], 422);
        }

        $conv->update($data);
        BitacoraService::log("Convocatoria actualizada: {$id}");

        return response()->json(['mensaje' => 'Convocatoria actualizada.', 'convocatoria' => $conv->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $conv = Convocatoria::findOrFail($id);

        if ($conv->postulaciones()->exists()) {
            return response()->json(['mensaje' => 'No se puede eliminar: tiene postulaciones registradas.'], 409);
        }

        BitacoraService::log("Convocatoria eliminada: {$id}");
        $conv->delete();

        return response()->json(['mensaje' => 'Convocatoria eliminada.']);
    }

    // CU20 — Calcular Cantidad de Grupos (Algoritmo Techo: CEIL / 70)
    public function calcularGrupos(string $id): JsonResponse
    {
        $convocatoria = Convocatoria::findOrFail($id);

        $totalInscritos = Postulacion::where('convocatoria_id', $id)
            ->whereNotIn('estado_admision', ['anulado'])
            ->count();

        $limite           = self::LIMITE_POR_GRUPO;
        $gruposNecesarios = $totalInscritos === 0 ? 0 : (int) ceil($totalInscritos / $limite);

        BitacoraService::log(
            "CU20 cálculo de grupos — convocatoria {$id}: {$totalInscritos} inscritos → {$gruposNecesarios} grupo(s)"
        );

        return response()->json([
            'convocatoria'      => $convocatoria->only('id', 'nombre', 'estado'),
            'total_inscritos'   => $totalInscritos,
            'limite_por_grupo'  => $limite,
            'grupos_necesarios' => $gruposNecesarios,
            'formula'           => "CEIL({$totalInscritos} / {$limite}) = {$gruposNecesarios}",
        ]);
    }
}
