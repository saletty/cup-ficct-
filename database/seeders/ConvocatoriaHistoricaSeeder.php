<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Carrera;
use App\Models\Convocatoria;
use App\Models\Evaluacion;
use App\Models\ExamenAdmision;
use App\Models\Grupo;
use App\Models\Rol;
use App\Models\TipoPago;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ConvocatoriaHistoricaSeeder extends Seeder
{
    // 17 grupos — todos presenciales, cupo máx 70, con turno
    private array $gruposConfig = [
        ['id' => 'H25-SISP-1', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-SISP-2', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-SISP-3', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'noche'],
        ['id' => 'H25-SISP-4', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-SISV-1', 'carrera_id' => 'SIS-V', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-SISV-2', 'carrera_id' => 'SIS-V', 'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-SISV-3', 'carrera_id' => 'SIS-V', 'modalidad' => 'presencial', 'turno' => 'noche'],
        ['id' => 'H25-INFP-1', 'carrera_id' => 'INF-P', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-INFP-2', 'carrera_id' => 'INF-P', 'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-INFP-3', 'carrera_id' => 'INF-P', 'modalidad' => 'presencial', 'turno' => 'noche'],
        ['id' => 'H25-INFV-1', 'carrera_id' => 'INF-V', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-INFV-2', 'carrera_id' => 'INF-V', 'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-INFV-3', 'carrera_id' => 'INF-V', 'modalidad' => 'presencial', 'turno' => 'noche'],
        ['id' => 'H25-ROB-1',  'carrera_id' => 'ROB',   'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-ROB-2',  'carrera_id' => 'ROB',   'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-NET-1',  'carrera_id' => 'NET',   'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-NET-2',  'carrera_id' => 'NET',   'modalidad' => 'presencial', 'turno' => 'tarde'],
    ];

    // Slots de clase por turno (21 entradas c/u = 63 plantillas globales)
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

    // Piso base por turno: mañana=1er piso (11-17), tarde=2do (21-27), noche=3ro (31-37)
    private array $aulaBase = ['mañana' => 11, 'tarde' => 21, 'noche' => 31];

    public function run(): void
    {
        // ── 0. Horarios plantilla globales (idempotente) ──────────────
        if (!DB::table('horario')->whereNull('grupo_id')->exists()) {
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
        }

        if (User::where('CI', 7000001)->exists()) {
            $this->command->warn('Ya ejecutado — saltando. Eliminá los usuarios CI 7000001-7001000 si querés volver a correrlo.');
            return;
        }

        $faker = \Faker\Factory::create('es_ES');
        $faker->seed(42);

        $rolPostulante = Rol::where('nombre', 'Postulante')->firstOrFail();

        // ── 1. Convocatoria histórica cerrada ─────────────────────────
        Convocatoria::firstOrCreate(
            ['id' => 'H-2025'],
            [
                'nombre'       => 'Segundo Semestre 2025',
                'fecha_inicio' => '2025-07-01',
                'fecha_fin'    => '2025-12-15',
                'estado'       => 'finalizada',
                'cupo_maximo'  => 1200,
            ]
        );

        // ── 2. Tipo de pago ───────────────────────────────────────────
        $tipoPago = TipoPago::first();
        if (! $tipoPago) {
            $tipoPago = TipoPago::create(['descripcion' => 'Arancel de Admisión', 'monto' => 80.00, 'estado' => 'activo']);
        }

        // ── 3. Aulas ──────────────────────────────────────────────────
        $aulaNros = [];
        for ($i = 1; $i <= 10; $i++) {
            $nro = "A{$i}";
            Aula::firstOrCreate(['nro' => $nro], ['capacidad' => 110, 'descripcion' => "Aula {$i}", 'estado' => 'activo']);
            $aulaNros[] = $nro;
        }

        // Aulas por pisos para H-2025: 1er piso (11-17), 2do (21-27), 3ro (31-37)
        foreach ($this->aulaBase as $turno => $base) {
            for ($i = 0; $i < 7; $i++) {
                $nro = (string)($base + $i);
                Aula::firstOrCreate(
                    ['nro' => $nro],
                    ['capacidad' => 110, 'descripcion' => "Aula {$nro} — " . ucfirst($turno), 'estado' => 'activo']
                );
            }
        }

        // ── 4. Carreras ───────────────────────────────────────────────
        $carrerasBase = [
            'SIS-V' => 'Ing. en Sistemas (Virtual)',
            'SIS-P' => 'Ing. en Sistemas (Presencial)',
            'INF-V' => 'Ing. en Informática (Virtual)',
            'INF-P' => 'Ing. en Informática (Presencial)',
            'ROB'   => 'Ing. en Robótica (Presencial)',
            'NET'   => 'Ing. en Redes y Telecomunicaciones (Presencial)',
        ];
        foreach ($carrerasBase as $id => $nombre) {
            Carrera::firstOrCreate(['id' => $id], ['nombre_carrera' => $nombre]);
        }

        // ── 5. Grupos (17 grupos, cupo máx 70, con turno) ─────────────
        $gruposPorCarrera = [];
        foreach ($this->gruposConfig as $g) {
            DB::table('grupo')->insertOrIgnore([
                'id'              => $g['id'],
                'convocatoria_id' => 'H-2025',
                'carrera_id'      => $g['carrera_id'],
                'modalidad'       => $g['modalidad'],
                'cupo_maximo'     => 70,
                'estado'          => 'inactivo',
                'turno'           => $g['turno'],
            ]);
            $gruposPorCarrera[$g['carrera_id']][] = $g['id'];
        }

        // ── 5b. Horarios por grupo (aula secuencial por turno/piso) ──
        $aulaIdx  = ['mañana' => 0, 'tarde' => 0, 'noche' => 0];
        $horarios = [];
        foreach ($this->gruposConfig as $g) {
            $turno   = $g['turno'];
            $aulaNro = (string)($this->aulaBase[$turno] + $aulaIdx[$turno]);
            $aulaIdx[$turno]++;

            foreach ($this->slots[$turno] as [$inicio, $fin, $dias]) {
                foreach ($dias as $dia) {
                    $horarios[] = [
                        'grupo_id'        => $g['id'],
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
            DB::table('horario')->insertOrIgnore($chunk);
        }
        $this->command->info('Horarios asignados: ' . count($horarios) . ' registros (17 grupos × 21 slots)');

        // ── 6. Tres exámenes de admisión ──────────────────────────────
        $examen1 = ExamenAdmision::firstOrCreate(
            ['convocatoria_id' => 'H-2025', 'numero_examen' => 1],
            [
                'descripcion' => 'Primer Examen de Admisión 2do Semestre 2025',
                'fecha'       => '2025-09-15',
                'hora_inicio' => '08:00:00',
                'hora_fin'    => '11:00:00',
                'estado'      => 'finalizado',
            ]
        );
        $examen2 = ExamenAdmision::firstOrCreate(
            ['convocatoria_id' => 'H-2025', 'numero_examen' => 2],
            [
                'descripcion' => 'Segundo Examen de Admisión 2do Semestre 2025',
                'fecha'       => '2025-10-20',
                'hora_inicio' => '08:00:00',
                'hora_fin'    => '11:00:00',
                'estado'      => 'finalizado',
            ]
        );
        $examen3 = ExamenAdmision::firstOrCreate(
            ['convocatoria_id' => 'H-2025', 'numero_examen' => 3],
            [
                'descripcion' => 'Tercer Examen de Admisión 2do Semestre 2025',
                'fecha'       => '2025-11-20',
                'hora_inicio' => '08:00:00',
                'hora_fin'    => '11:00:00',
                'estado'      => 'finalizado',
            ]
        );

        // ── 7. Distribución de 1000 postulantes ───────────────────────
        $distribucion = ['SIS-P' => 250, 'SIS-V' => 200, 'INF-P' => 200, 'INF-V' => 150, 'ROB' => 100, 'NET' => 100];
        $carreraFlat  = [];
        foreach ($distribucion as $carId => $count) {
            for ($i = 0; $i < $count; $i++) {
                $carreraFlat[] = $carId;
            }
        }

        $colegios = [
            'U.E. Cristo Rey', 'Colegio Nacional Simón Bolívar', 'U.E. Don Bosco',
            'Colegio Santa Ana', 'U.E. La Sagrada Familia', 'Colegio Americano',
            'U.E. Franz Tamayo', 'Colegio San Calixto', 'U.E. Técnico Humanístico',
            'Colegio Los Pinos', 'U.E. Germán Busch', 'Colegio San Ignacio',
        ];
        $ciudades      = ['Cochabamba', 'Santa Cruz', 'La Paz', 'Oruro', 'Sucre', 'Tarija', 'Potosí'];
        $titulos       = ['Bachiller en Humanidades', 'Bachiller en Ciencias', 'Bachiller Técnico Humanístico'];
        $otrasCarreras = array_keys($distribucion);
        $password      = Hash::make('Post123!');

        $users         = [];
        $postulantes   = [];
        $postulaciones = [];
        $pagos         = [];
        $asigs1        = [];
        $evals1        = [];
        $resultadosE1  = []; // [ci => 'aprobado'|'reprobado']

        // Generador de notas: $aprueba=true → todas ≥ 61; false → al menos una < 60
        $genNotas = function (bool $aprueba) use ($faker): array {
            if ($aprueba) {
                return [
                    round($faker->randomFloat(2, 62, 100), 2),
                    round($faker->randomFloat(2, 62, 100), 2),
                    round($faker->randomFloat(2, 62, 100), 2),
                    round($faker->randomFloat(2, 62, 100), 2),
                ];
            }
            $notas = [
                round($faker->randomFloat(2, 62, 100), 2),
                round($faker->randomFloat(2, 62, 100), 2),
                round($faker->randomFloat(2, 62, 100), 2),
                round($faker->randomFloat(2, 62, 100), 2),
            ];
            $notas[$faker->numberBetween(0, 3)] = round($faker->randomFloat(2, 30, 59), 2);
            return $notas;
        };

        for ($i = 0; $i < 1000; $i++) {
            $ci        = 7000001 + $i;
            $carreraId = $carreraFlat[$i];
            $sexo      = $faker->randomElement(['M', 'F']);
            $nombre    = $sexo === 'M' ? $faker->firstNameMale() : $faker->firstNameFemale();
            $email     = "cup{$ci}@demo.bo";

            // Grupo round-robin por carrera
            $gIds    = $gruposPorCarrera[$carreraId];
            $grupoId = $gIds[$i % count($gIds)];

            // Segunda opción (60%)
            $op2 = null;
            if ($faker->boolean(60)) {
                $otras = array_filter($otrasCarreras, fn($c) => $c !== $carreraId);
                $op2   = $faker->randomElement(array_values($otras));
            }

            // Examen 1: 70% aprueba
            $aprueba1 = $faker->boolean(70);
            [$n1, $n2, $n3, $n4] = $genNotas($aprueba1);
            $calc1 = Evaluacion::calcular($n1, $n2, $n3, $n4);

            $fechaInsc = $faker->dateTimeBetween('2025-07-15', '2025-09-01')->format('Y-m-d H:i:s');
            $fechaPago = $faker->dateTimeBetween('2025-07-20', '2025-09-10')->format('Y-m-d H:i:s');

            $users[] = [
                'CI'                      => $ci,
                'nombre_completo'         => "{$nombre} {$faker->lastName()} {$faker->lastName()}",
                'email'                   => $email,
                'contraseña'              => $password,
                'estado'                  => 'activo',
                'rol_id'                  => $rolPostulante->id,
                'intentos_fallidos'       => 0,
                'bloqueado_hasta'         => null,
                'debe_cambiar_contrasena' => false,
            ];

            $postulantes[] = [
                'CI'                  => $ci,
                'fecha_nacimiento'    => $faker->dateTimeBetween('2000-01-01', '2007-12-31')->format('Y-m-d'),
                'sexo'                => $sexo,
                'direccion'           => $faker->streetAddress(),
                'telefono'            => '7' . $faker->numerify('#######'),
                'ciudad'              => $faker->randomElement($ciudades),
                'carrera_opcion1_id'  => $carreraId,
                'carrera_opcion2_id'  => $op2,
                'colegio_procedencia' => $faker->randomElement($colegios),
                'promedio_bachiller'  => round($faker->randomFloat(2, 55, 98), 2),
                'anio_egreso'         => $faker->numberBetween(2020, 2025),
                'titulo_bachiller'    => $faker->randomElement($titulos),
            ];

            // postulacion con estado provisional (se actualiza al final)
            $postulaciones[] = [
                'postulante_ci'      => $ci,
                'convocatoria_id'    => 'H-2025',
                'grupo_id'           => $grupoId,
                'carrera_opcion1_id' => $carreraId,
                'carrera_opcion2_id' => $op2,
                'estado_admision'    => $calc1['estado_resultado'],
                'carrera_admitida_id'=> $calc1['estado_resultado'] === 'aprobado' ? $carreraId : null,
                'fecha_registro'     => $fechaInsc,
            ];

            $pagos[] = [
                'postulante_ci' => $ci,
                'tipopago_id'   => $tipoPago->id,
                'monto'         => 80.00,
                'estado_pago'   => 'verificado',
                'fecha_pago'    => $fechaPago,
                'cajero_ci'     => 10000004,
                'observacion'   => null,
            ];

            $asigs1[] = [
                'examen_id'     => $examen1->id,
                'postulante_ci' => $ci,
                'aula_nro'      => $aulaNros[$i % count($aulaNros)],
            ];

            $evals1[] = [
                'postulante_ci'    => $ci,
                'examen_id'        => $examen1->id,
                'nota_examen1'     => $n1,
                'nota_examen2'     => $n2,
                'nota_examen3'     => $n3,
                'nota_examen4'     => $n4,
                'promedio_final'   => $calc1['promedio_final'],
                'estado_resultado' => $calc1['estado_resultado'],
            ];

            $resultadosE1[$ci] = $calc1['estado_resultado'];
        }

        // ── 8. Bulk insert ronda 1 ────────────────────────────────────
        $this->command->info('Insertando 1000 usuarios...');
        foreach (array_chunk($users, 200) as $chunk)         DB::table('usuario')->insertOrIgnore($chunk);
        $this->command->info('Insertando postulantes...');
        foreach (array_chunk($postulantes, 200) as $chunk)   DB::table('postulante')->insertOrIgnore($chunk);
        $this->command->info('Insertando postulaciones...');
        foreach (array_chunk($postulaciones, 200) as $chunk) DB::table('postulacion')->insertOrIgnore($chunk);
        $this->command->info('Insertando pagos...');
        foreach (array_chunk($pagos, 200) as $chunk)         DB::table('pago')->insert($chunk);
        $this->command->info('Insertando asignaciones examen 1...');
        foreach (array_chunk($asigs1, 200) as $chunk)        DB::table('asignacion_examen')->insertOrIgnore($chunk);
        $this->command->info('Insertando evaluaciones examen 1...');
        foreach (array_chunk($evals1, 200) as $chunk)        DB::table('evaluacion')->insertOrIgnore($chunk);

        // ── 9. Examen 2: reprobados de examen 1 ──────────────────────
        $reprobados1 = array_keys(array_filter($resultadosE1, fn($e) => $e === 'reprobado'));
        $faker->seed(200); // nuevo seed para reproducibilidad

        $asigs2  = [];
        $evals2  = [];
        $resultadosE2 = [];

        foreach ($reprobados1 as $idx => $ci) {
            $aprueba2 = $faker->boolean(55); // 55% pasa en 2do intento
            [$n1, $n2, $n3, $n4] = $genNotas($aprueba2);
            $calc2 = Evaluacion::calcular($n1, $n2, $n3, $n4);

            $asigs2[] = [
                'examen_id'     => $examen2->id,
                'postulante_ci' => $ci,
                'aula_nro'      => $aulaNros[$idx % count($aulaNros)],
            ];
            $evals2[] = [
                'postulante_ci'    => $ci,
                'examen_id'        => $examen2->id,
                'nota_examen1'     => $n1,
                'nota_examen2'     => $n2,
                'nota_examen3'     => $n3,
                'nota_examen4'     => $n4,
                'promedio_final'   => $calc2['promedio_final'],
                'estado_resultado' => $calc2['estado_resultado'],
            ];
            $resultadosE2[$ci] = $calc2['estado_resultado'];
        }

        $this->command->info('Insertando evaluaciones examen 2 (' . count($reprobados1) . ' reprobados del exam 1)...');
        foreach (array_chunk($asigs2, 200) as $chunk)  DB::table('asignacion_examen')->insertOrIgnore($chunk);
        foreach (array_chunk($evals2, 200) as $chunk)  DB::table('evaluacion')->insertOrIgnore($chunk);

        // ── 10. Examen 3: reprobados de examen 2 ─────────────────────
        $reprobados2 = array_keys(array_filter($resultadosE2, fn($e) => $e === 'reprobado'));
        $faker->seed(300);

        $asigs3  = [];
        $evals3  = [];
        $resultadosE3 = [];

        foreach ($reprobados2 as $idx => $ci) {
            $aprueba3 = $faker->boolean(45); // 45% pasa en 3er intento
            [$n1, $n2, $n3, $n4] = $genNotas($aprueba3);
            $calc3 = Evaluacion::calcular($n1, $n2, $n3, $n4);

            $asigs3[] = [
                'examen_id'     => $examen3->id,
                'postulante_ci' => $ci,
                'aula_nro'      => $aulaNros[$idx % count($aulaNros)],
            ];
            $evals3[] = [
                'postulante_ci'    => $ci,
                'examen_id'        => $examen3->id,
                'nota_examen1'     => $n1,
                'nota_examen2'     => $n2,
                'nota_examen3'     => $n3,
                'nota_examen4'     => $n4,
                'promedio_final'   => $calc3['promedio_final'],
                'estado_resultado' => $calc3['estado_resultado'],
            ];
            $resultadosE3[$ci] = $calc3['estado_resultado'];
        }

        $this->command->info('Insertando evaluaciones examen 3 (' . count($reprobados2) . ' reprobados del exam 2)...');
        foreach (array_chunk($asigs3, 200) as $chunk) DB::table('asignacion_examen')->insertOrIgnore($chunk);
        foreach (array_chunk($evals3, 200) as $chunk) DB::table('evaluacion')->insertOrIgnore($chunk);

        // ── 11. Actualizar estado_admision final en postulacion ───────
        // Aprueba si pasó en cualquiera de los 3 exámenes
        $aprobadosFinales = array_keys(array_filter($resultadosE1, fn($e) => $e === 'aprobado'));
        $aprobadosE2      = array_keys(array_filter($resultadosE2 ?? [], fn($e) => $e === 'aprobado'));
        $aprobadosE3      = array_keys(array_filter($resultadosE3 ?? [], fn($e) => $e === 'aprobado'));
        $todosAprobados   = array_unique(array_merge($aprobadosFinales, $aprobadosE2, $aprobadosE3));

        // Quienes aprobaron en exam 2 o 3 pero no en exam 1 → actualizar postulacion
        $aprobadosTardios = array_diff($todosAprobados, $aprobadosFinales);
        foreach (array_chunk($aprobadosTardios, 200) as $chunk) {
            foreach ($chunk as $ci) {
                $carrera = DB::table('postulante')->where('CI', $ci)->value('carrera_opcion1_id');
                DB::table('postulacion')
                    ->where('postulante_ci', $ci)->where('convocatoria_id', 'H-2025')
                    ->update(['estado_admision' => 'aprobado', 'carrera_admitida_id' => $carrera]);
            }
        }

        // ── 12. Asignaciones de docentes a grupos H-2025 ─────────────
        // Usa los docentes CIs 5001001-5001020 (creados en DatabaseSeeder)
        $docentesPorMateria = DB::table('docente')->whereNotNull('materia_id')->orderBy('CI')
            ->get()->groupBy('materia_id');
        $materiaIds = DB::table('materia')->pluck('id')->toArray();

        foreach (array_column($this->gruposConfig, 'id') as $grupoId) {
            foreach ($materiaIds as $materiaId) {
                $candidatos = $docentesPorMateria[$materiaId] ?? collect();
                if ($candidatos->isEmpty()) continue;
                $elegido = null;
                $minAsig = PHP_INT_MAX;
                foreach ($candidatos as $doc) {
                    $asig = DB::table('asignacion_docente')
                        ->where('docente_ci', $doc->CI)->where('convocatoria_id', 'H-2025')->count();
                    if ($asig < 4 && $asig < $minAsig) {
                        $minAsig = $asig;
                        $elegido = $doc->CI;
                    }
                }
                if ($elegido !== null) {
                    DB::table('asignacion_docente')->insertOrIgnore([
                        'docente_ci'      => $elegido,
                        'materia_id'      => $materiaId,
                        'grupo_id'        => $grupoId,
                        'convocatoria_id' => 'H-2025',
                    ]);
                }
            }
        }

        $totalAprobados  = count($todosAprobados);
        $totalReprobados = 1000 - $totalAprobados;
        $this->command->info('');
        $this->command->info('✓ Convocatoria H-2025 creada con 1000 postulantes y 3 exámenes.');
        $this->command->info("  Aprobados finales: {$totalAprobados} | Reprobados: {$totalReprobados}");
        $this->command->info('  Grupos: 17 (cupo máx 70 c/u) — turno asignado a cada grupo');
    }
}
