<?php

namespace App\Http\Controllers;

use App\Models\Aula;
use App\Models\Grupo;
use App\Models\Horario;
use App\Services\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ============================================================
// CU14 — Gestionar Grupos
// PK compuesta: (id, convocatoria_id)  ej: 'M001', '1-2026'
//
// Incluye sub-recurso de horarios con:
//   - Validación de días permitidos
//   - Validación hora_fin > hora_inicio
//   - Detección de colisiones de aula (mismo día + horario solapado)
// ============================================================
class GrupoController extends Controller
{
    private const DIAS_VALIDOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    /* ── GRUPOS ─────────────────────────────────────────────── */

    public function index(Request $request): JsonResponse
    {
        $query = Grupo::with(['convocatoria:id,nombre,estado', 'carrera:id,nombre_carrera']);

        if ($request->filled('convocatoria_id')) {
            $query->where('convocatoria_id', $request->convocatoria_id);
        }
        if ($request->filled('carrera_id')) {
            $query->where('carrera_id', $request->carrera_id);
        }

        return response()->json($query->orderBy('id')->get());
    }

    public function show(string $grupoId, string $convocatoriaId): JsonResponse
    {
        $grupo = Grupo::with([
            'convocatoria:id,nombre',
            'carrera:id,nombre_carrera',
            'horarios.aula',
            'asignaciones.docente.usuario:CI,nombre_completo',
            'asignaciones.materia:id,nombre',
        ])
        ->where('id', $grupoId)
        ->where('convocatoria_id', $convocatoriaId)
        ->firstOrFail();

        return response()->json($grupo);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id'             => ['required', 'string', 'max:10'],
            'convocatoria_id' => ['required', 'string', 'exists:convocatoria,id'],
            'carrera_id'     => ['nullable', 'string', 'exists:carrera,id'],
            'modalidad'      => ['required', 'in:virtual,presencial'],
            'cupo_maximo'    => ['required', 'integer', 'min:1'],
            'estado'         => ['sometimes', 'in:activo,inactivo'],
        ]);

        // Verificar que el grupo no exista ya
        if (Grupo::where('id', $data['id'])->where('convocatoria_id', $data['convocatoria_id'])->exists()) {
            return response()->json([
                'mensaje' => "Ya existe el grupo '{$data['id']}' en la convocatoria '{$data['convocatoria_id']}'.",
            ], 409);
        }

        $grupo = Grupo::create($data);
        BitacoraService::log("Grupo creado: {$grupo->id} / {$grupo->convocatoria_id}");

        return response()->json([
            'mensaje' => 'Grupo creado.',
            'grupo'   => $grupo->load('convocatoria:id,nombre', 'carrera:id,nombre_carrera'),
        ], 201);
    }

    public function update(Request $request, string $grupoId, string $convocatoriaId): JsonResponse
    {
        $grupo = Grupo::where('id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->firstOrFail();

        $data = $request->validate([
            'carrera_id'  => ['nullable', 'string', 'exists:carrera,id'],
            'modalidad'   => ['sometimes', 'in:virtual,presencial'],
            'cupo_maximo' => ['sometimes', 'integer', 'min:1'],
            'estado'      => ['sometimes', 'in:activo,inactivo'],
        ]);

        $grupo->update($data);
        BitacoraService::log("Grupo actualizado: {$grupoId} / {$convocatoriaId}");

        return response()->json([
            'mensaje' => 'Grupo actualizado.',
            'grupo'   => $grupo->fresh()->load('convocatoria:id,nombre', 'carrera:id,nombre_carrera'),
        ]);
    }

    public function destroy(string $grupoId, string $convocatoriaId): JsonResponse
    {
        $grupo = Grupo::where('id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->firstOrFail();

        BitacoraService::log("Grupo eliminado: {$grupoId} / {$convocatoriaId}");
        $grupo->delete();

        return response()->json(['mensaje' => 'Grupo eliminado.']);
    }

    /* ── HORARIOS (sub-recurso) ──────────────────────────────── */

    public function horarios(string $grupoId, string $convocatoriaId): JsonResponse
    {
        Grupo::where('id', $grupoId)->where('convocatoria_id', $convocatoriaId)->firstOrFail();

        $horarios = Horario::with('aula')
            ->where('grupo_id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->orderBy('dia')
            ->orderBy('hora_inicio')
            ->get();

        return response()->json($horarios);
    }

    public function agregarHorario(Request $request, string $grupoId, string $convocatoriaId): JsonResponse
    {
        // Verificar que el grupo existe
        $grupo = Grupo::where('id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->firstOrFail();

        $data = $request->validate([
            'dia'        => ['required', 'in:' . implode(',', self::DIAS_VALIDOS)],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin'    => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'aula_nro'    => ['nullable', 'string', 'exists:aula,nro'],
        ], [
            'dia.in'           => 'Día inválido. Valores permitidos: ' . implode(', ', self::DIAS_VALIDOS) . '.',
            'hora_fin.after'   => 'La hora de fin debe ser posterior a la hora de inicio.',
            'aula_nro.exists'  => 'El aula especificada no existe.',
        ]);

        // Para grupos presenciales, el aula es obligatoria
        if ($grupo->modalidad === 'presencial' && empty($data['aula_nro'])) {
            return response()->json([
                'mensaje' => 'Los grupos presenciales deben tener un aula asignada.',
            ], 422);
        }

        // Validar capacidad: cupo_maximo del grupo ≤ capacidad del aula
        if (! empty($data['aula_nro'])) {
            $aula = Aula::find($data['aula_nro']);
            if ($grupo->cupo_maximo > $aula->capacidad) {
                return response()->json([
                    'mensaje' => "El cupo del grupo ({$grupo->cupo_maximo}) supera la capacidad del aula {$aula->nro} ({$aula->capacidad} estudiantes).",
                ], 422);
            }

            // Detección de colisiones de aula (mismo día + horario solapado)
            $colision = Horario::where('aula_nro', $data['aula_nro'])
                ->where('dia', $data['dia'])
                ->where(function ($q) use ($data) {
                    // Solapamiento: inicio_nuevo < fin_existente AND fin_nuevo > inicio_existente
                    $q->where('hora_inicio', '<', $data['hora_fin'])
                      ->where('hora_fin',    '>', $data['hora_inicio']);
                })
                ->first();

            if ($colision) {
                return response()->json([
                    'mensaje'  => "Colisión de aula: '{$data['aula_nro']}' ya está ocupada el {$data['dia']} de {$colision->hora_inicio} a {$colision->hora_fin} (grupo {$colision->grupo_id}).",
                    'colision' => $colision,
                ], 409);
            }
        }

        $horario = Horario::create([
            'grupo_id'       => $grupoId,
            'convocatoria_id' => $convocatoriaId,
            ...$data,
        ]);

        BitacoraService::log("Horario agregado al grupo {$grupoId}: {$data['dia']} {$data['hora_inicio']}-{$data['hora_fin']}");

        return response()->json([
            'mensaje'  => 'Horario registrado.',
            'horario'  => $horario->load('aula'),
        ], 201);
    }

    public function quitarHorario(string $grupoId, string $convocatoriaId, int $horarioId): JsonResponse
    {
        $horario = Horario::where('id', $horarioId)
            ->where('grupo_id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->firstOrFail();

        BitacoraService::log("Horario #{$horarioId} eliminado del grupo {$grupoId}");
        $horario->delete();

        return response()->json(['mensaje' => 'Horario eliminado.']);
    }
}
