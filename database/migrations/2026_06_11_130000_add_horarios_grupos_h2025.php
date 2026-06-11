<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // 3 clases por semana (Lunes, Miércoles, Viernes) por grupo
    private array $dias = ['Lunes', 'Miércoles', 'Viernes'];

    private array $turnos = [
        'mañana' => ['inicio' => '07:00:00', 'fin' => '09:00:00'],
        'tarde'  => ['inicio' => '14:00:00', 'fin' => '16:00:00'],
        'noche'  => ['inicio' => '18:00:00', 'fin' => '20:00:00'],
    ];

    // Aulas para grupos presenciales (A1-A10 de la convocatoria histórica)
    private array $aulasPresencial = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10'];

    public function up(): void
    {
        if (! DB::table('convocatoria')->where('id', 'H-2025')->exists()) {
            return; // fresh install: el seeder lo creará
        }

        if (DB::table('horario')->where('convocatoria_id', 'H-2025')->exists()) {
            return; // ya tiene horarios
        }

        $grupos = DB::table('grupo')
            ->where('convocatoria_id', 'H-2025')
            ->get();

        $aulIdx = 0;
        $horarios = [];

        foreach ($grupos as $g) {
            $turno = $g->turno ?? 'mañana';
            $horas = $this->turnos[$turno] ?? $this->turnos['mañana'];

            if ($g->modalidad === 'presencial') {
                $aula = $this->aulasPresencial[$aulIdx % count($this->aulasPresencial)];
                $aulIdx++;
            } else {
                $aula = 'VIRT';
            }

            foreach ($this->dias as $dia) {
                $horarios[] = [
                    'grupo_id'        => $g->id,
                    'convocatoria_id' => 'H-2025',
                    'dia'             => $dia,
                    'hora_inicio'     => $horas['inicio'],
                    'hora_fin'        => $horas['fin'],
                    'aula_nro'        => $aula,
                    'turno'           => $turno,
                ];
            }
        }

        foreach (array_chunk($horarios, 50) as $chunk) {
            DB::table('horario')->insert($chunk);
        }
    }

    public function down(): void
    {
        DB::table('horario')->where('convocatoria_id', 'H-2025')->delete();
    }
};
