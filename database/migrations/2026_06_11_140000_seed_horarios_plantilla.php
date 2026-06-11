<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // 21 slots por turno (63 plantillas globales)
    private array $slots = [
        'mañana' => [
            ['07:00:00', '08:30:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['08:30:00', '10:00:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['10:00:00', '11:30:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['12:30:00', '13:00:00', ['Martes','Jueves','Sábado']],
        ],
        'tarde' => [
            ['13:00:00', '14:30:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['14:30:00', '16:00:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['16:00:00', '17:30:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['17:30:00', '19:00:00', ['Martes','Jueves','Sábado']],
        ],
        'noche' => [
            ['17:30:00', '19:00:00', ['Lunes','Miércoles','Viernes']],
            ['19:00:00', '20:30:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['20:30:00', '21:30:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
            ['21:00:00', '22:30:00', ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
        ],
    ];

    // Cada turno tiene su propio piso: mañana=1er piso (11-17), tarde=2do (21-27), noche=3ro (31-37)
    private array $aulaBase = ['mañana' => 11, 'tarde' => 21, 'noche' => 31];

    public function up(): void
    {
        // ── 1. Crear aulas por pisos (11-17, 21-27, 31-37) ───────────
        $aulasNuevas = [];
        foreach ($this->aulaBase as $turno => $base) {
            for ($i = 0; $i < 7; $i++) {
                $nro = (string)($base + $i);
                $aulasNuevas[] = [
                    'nro'         => $nro,
                    'capacidad'   => 110,
                    'descripcion' => "Aula {$nro} — " . ucfirst($turno),
                    'estado'      => 'activo',
                ];
            }
        }
        DB::table('aula')->insertOrIgnore($aulasNuevas);

        // ── 2. Reemplazar horarios plantilla ─────────────────────────
        DB::table('horario')->whereNull('grupo_id')->delete();

        $plantillas = [];
        foreach ($this->slots as $turno => $bloques) {
            foreach ($bloques as [$inicio, $fin, $dias]) {
                foreach ($dias as $dia) {
                    $plantillas[] = [
                        'grupo_id'        => null,
                        'convocatoria_id' => null,
                        'dia'             => $dia,
                        'hora_inicio'     => $inicio,
                        'hora_fin'        => $fin,
                        'aula_nro'        => null,
                        'turno'           => $turno,
                    ];
                }
            }
        }
        DB::table('horario')->insert($plantillas);

        // ── 3. Actualizar H-2025 si existe ────────────────────────────
        if (!DB::table('convocatoria')->where('id', 'H-2025')->exists()) {
            return;
        }

        // Todos los grupos pasan a presencial
        DB::table('grupo')->where('convocatoria_id', 'H-2025')
            ->update(['modalidad' => 'presencial']);

        // Borrar horarios de grupo previos de H-2025
        DB::table('horario')
            ->where('convocatoria_id', 'H-2025')
            ->whereNotNull('grupo_id')
            ->delete();

        // Asignar aulas secuenciales por turno y crear horarios
        $grupos = DB::table('grupo')
            ->where('convocatoria_id', 'H-2025')
            ->orderByRaw("CASE turno WHEN 'mañana' THEN 1 WHEN 'tarde' THEN 2 WHEN 'noche' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get();

        $aulaIdx = ['mañana' => 0, 'tarde' => 0, 'noche' => 0];
        $horarios = [];

        foreach ($grupos as $grupo) {
            $turno   = $grupo->turno ?? 'mañana';
            $base    = $this->aulaBase[$turno] ?? 11;
            $aulaNro = (string)($base + ($aulaIdx[$turno] ?? 0));
            $aulaIdx[$turno]++;

            foreach ($this->slots[$turno] as [$inicio, $fin, $dias]) {
                foreach ($dias as $dia) {
                    $horarios[] = [
                        'grupo_id'        => $grupo->id,
                        'convocatoria_id' => 'H-2025',
                        'dia'             => $dia,
                        'hora_inicio'     => $inicio,
                        'hora_fin'        => $fin,
                        'aula_nro'        => $aulaNro,
                        'turno'           => $turno,
                    ];
                }
            }
        }

        foreach (array_chunk($horarios, 100) as $chunk) {
            DB::table('horario')->insert($chunk);
        }

        $total = count($horarios);
        echo "Horarios H-2025 creados: {$total} ({$grupos->count()} grupos × 21 slots)\n";
    }

    public function down(): void
    {
        DB::table('horario')->whereNull('grupo_id')->delete();
        DB::table('horario')->where('convocatoria_id', 'H-2025')->delete();

        $nros = [];
        foreach ($this->aulaBase as $base) {
            for ($i = 0; $i < 7; $i++) {
                $nros[] = (string)($base + $i);
            }
        }
        DB::table('aula')->whereIn('nro', $nros)->delete();
    }
};
