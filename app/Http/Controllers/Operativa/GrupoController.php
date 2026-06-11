<?php

namespace App\Http\Controllers\Operativa;

use App\Http\Controllers\Controller;
use App\Models\Aula;
use App\Models\Grupo;
use App\Models\Horario;
use App\Models\Postulacion;
use App\Models\AsignacionDocente;
use App\Services\Seguridad\BitacoraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// CU13 — Gestionar Grupos y Horarios
// Límite por grupo: 70 estudiantes (CEIL/70 — CU19)
const LIMITE_GRUPO = 70;

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
            'id'              => ['required', 'string', 'max:10'],
            'convocatoria_id' => ['required', 'string', 'exists:convocatoria,id'],
            'cupo_maximo'     => ['required', 'integer', 'min:1', 'max:70'],
            'estado'          => ['sometimes', 'in:activo,inactivo'],
        ], [
            'cupo_maximo.max' => 'El cupo máximo por grupo es 70 estudiantes.',
        ]);

        $data['modalidad'] = 'presencial';
        $data['carrera_id'] = null;

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
            'cupo_maximo' => ['sometimes', 'integer', 'min:1', 'max:70'],
            'estado'      => ['sometimes', 'in:activo,inactivo'],
        ], [
            'cupo_maximo.max' => 'El cupo máximo por grupo es 70 estudiantes.',
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
        $grupo = Grupo::where('id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->firstOrFail();

        $data = $request->validate([
            'dia'         => ['required', 'in:' . implode(',', self::DIAS_VALIDOS)],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin'    => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'aula_nro'    => ['nullable', 'string', 'exists:aula,nro'],
        ], [
            'dia.in'          => 'Día inválido. Valores permitidos: ' . implode(', ', self::DIAS_VALIDOS) . '.',
            'hora_fin.after'  => 'La hora de fin debe ser posterior a la hora de inicio.',
            'aula_nro.exists' => 'El aula especificada no existe.',
        ]);

        if ($grupo->modalidad === 'presencial' && empty($data['aula_nro'])) {
            return response()->json([
                'mensaje' => 'Los grupos presenciales deben tener un aula asignada.',
            ], 422);
        }

        if (! empty($data['aula_nro'])) {
            $aula = Aula::find($data['aula_nro']);
            if ($grupo->cupo_maximo > $aula->capacidad) {
                return response()->json([
                    'mensaje' => "El cupo del grupo ({$grupo->cupo_maximo}) supera la capacidad del aula {$aula->nro} ({$aula->capacidad} estudiantes).",
                ], 422);
            }

            $colision = Horario::where('aula_nro', $data['aula_nro'])
                ->where('dia', $data['dia'])
                ->where(function ($q) use ($data) {
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
            'grupo_id'        => $grupoId,
            'convocatoria_id' => $convocatoriaId,
            ...$data,
        ]);

        BitacoraService::log("Horario agregado al grupo {$grupoId}: {$data['dia']} {$data['hora_inicio']}-{$data['hora_fin']}");

        return response()->json([
            'mensaje' => 'Horario registrado.',
            'horario' => $horario->load('aula'),
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

    /* ── Aplicar turno completo al grupo ────────────────────── */
    public function aplicarTurno(Request $request, string $grupoId, string $convocatoriaId): JsonResponse
    {
        Grupo::where('id', $grupoId)->where('convocatoria_id', $convocatoriaId)->firstOrFail();

        $data = $request->validate([
            'turno' => ['required', 'in:mañana,tarde,noche'],
        ], [
            'turno.in' => 'Turno inválido. Use: mañana, tarde o noche.',
        ]);

        Horario::where('grupo_id', $grupoId)
            ->where('convocatoria_id', $convocatoriaId)
            ->delete();

        $plantillas = Horario::whereNull('grupo_id')
            ->where('turno', $data['turno'])
            ->get();

        if ($plantillas->isEmpty()) {
            return response()->json(['mensaje' => 'No existen horarios plantilla para ese turno.'], 404);
        }

        $nuevos = $plantillas->map(fn($p) => [
            'grupo_id'        => $grupoId,
            'convocatoria_id' => $convocatoriaId,
            'dia'             => $p->dia,
            'hora_inicio'     => $p->hora_inicio,
            'hora_fin'        => $p->hora_fin,
            'aula_nro'        => $p->aula_nro,
            'turno'           => $p->turno,
        ])->toArray();

        Horario::insert($nuevos);

        BitacoraService::log("Turno '{$data['turno']}' aplicado al grupo {$grupoId}/{$convocatoriaId} ({$plantillas->count()} horarios)");

        return response()->json([
            'mensaje'  => "Turno '{$data['turno']}' aplicado: {$plantillas->count()} horarios asignados.",
            'horarios' => $plantillas->count(),
        ], 201);
    }

    /* ── Generación automática de grupos (CU19) ──────────────── */
    public function generarGrupos(Request $request): JsonResponse
    {
        $data = $request->validate([
            'convocatoria_id'  => ['required', 'string', 'exists:convocatoria,id'],
            'turnos'           => ['required', 'array'],
            'turnos.mañana'    => ['required', 'integer', 'min:0'],
            'turnos.tarde'     => ['required', 'integer', 'min:0'],
            'turnos.noche'     => ['required', 'integer', 'min:0'],
        ]);

        $convId = $data['convocatoria_id'];

        if (Grupo::where('convocatoria_id', $convId)->exists()) {
            return response()->json(['mensaje' => 'Ya existen grupos para esta convocatoria.'], 409);
        }

        $totalInscritos = Postulacion::where('convocatoria_id', $convId)
            ->whereNotIn('estado_admision', ['anulado'])
            ->count();

        $gruposNecesarios = $totalInscritos === 0 ? 0 : (int) ceil($totalInscritos / LIMITE_GRUPO);
        $totalTurnos = ($data['turnos']['mañana'] ?? 0)
                     + ($data['turnos']['tarde']  ?? 0)
                     + ($data['turnos']['noche']  ?? 0);

        if ($totalTurnos !== $gruposNecesarios) {
            return response()->json([
                'mensaje' => "La suma de turnos ({$totalTurnos}) debe ser igual a los grupos necesarios ({$gruposNecesarios}).",
            ], 422);
        }

        $prefijos = ['mañana' => 'M', 'tarde' => 'T', 'noche' => 'N'];
        $gruposACrear = [];
        foreach ($prefijos as $turno => $prefijo) {
            $cantidad = $data['turnos'][$turno] ?? 0;
            for ($i = 1; $i <= $cantidad; $i++) {
                $gruposACrear[] = ['id' => sprintf('%s%03d', $prefijo, $i), 'turno' => $turno];
            }
        }

        DB::transaction(function () use ($gruposACrear, $convId) {
            foreach ($gruposACrear as $def) {
                Grupo::create([
                    'id'              => $def['id'],
                    'convocatoria_id' => $convId,
                    'carrera_id'      => null,
                    'modalidad'       => 'presencial',
                    'cupo_maximo'     => LIMITE_GRUPO,
                    'estado'          => 'activo',
                ]);

                $plantillas = Horario::whereNull('grupo_id')->where('turno', $def['turno'])->get();
                if ($plantillas->isNotEmpty()) {
                    Horario::insert($plantillas->map(fn($p) => [
                        'grupo_id'        => $def['id'],
                        'convocatoria_id' => $convId,
                        'dia'             => $p->dia,
                        'hora_inicio'     => $p->hora_inicio,
                        'hora_fin'        => $p->hora_fin,
                        'aula_nro'        => $p->aula_nro,
                        'turno'           => $p->turno,
                    ])->toArray());
                }
            }

            $postulaciones = Postulacion::where('convocatoria_id', $convId)
                ->whereNotIn('estado_admision', ['anulado'])
                ->pluck('id')
                ->toArray();

            $grupoIds = array_column($gruposACrear, 'id');
            foreach ($postulaciones as $i => $postId) {
                Postulacion::where('id', $postId)->update(['grupo_id' => $grupoIds[$i % count($grupoIds)]]);
            }

            $docentes = DB::table('docente')->pluck('CI')->toArray();
            $materias  = DB::table('materia')->pluck('id')->toArray();

            if (!empty($docentes) && !empty($materias)) {
                foreach ($grupoIds as $gi => $grupoId) {
                    foreach ($materias as $mi => $materiaId) {
                        $docenteIdx = ($gi + $mi) % count($docentes);
                        DB::table('asignacion_docente')->insert([
                            'docente_ci'      => $docentes[$docenteIdx],
                            'materia_id'      => $materiaId,
                            'grupo_id'        => $grupoId,
                            'convocatoria_id' => $convId,
                        ]);
                    }
                }
            }
        });

        BitacoraService::log('Grupos generados automáticamente para convocatoria ' . $convId . ': ' . count($gruposACrear) . ' grupos, ' . $totalInscritos . ' postulantes distribuidos.');

        return response()->json([
            'mensaje'        => count($gruposACrear) . ' grupos generados correctamente.',
            'grupos_creados' => count($gruposACrear),
            'postulantes'    => $totalInscritos,
        ], 201);
    }
}
