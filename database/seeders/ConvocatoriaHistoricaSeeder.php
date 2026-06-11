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
    public function run(): void
    {
        if (User::where('CI', 7000001)->exists()) {
            $this->command->warn('Ya ejecutado — saltando. Eliminá los usuarios CI 7000001-7001000 si querés volver a correrlo.');
            return;
        }

        $faker = \Faker\Factory::create('es_ES');
        $faker->seed(42);

        $rolPostulante = Rol::where('nombre', 'Postulante')->firstOrFail();

        // ── 1. Convocatoria histórica cerrada ─────────────────
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

        // ── 2. Tipo de pago ────────────────────────────────────
        $tipoPago = TipoPago::first();
        if (!$tipoPago) {
            $tipoPago = TipoPago::create(['descripcion' => 'Arancel de Admisión', 'monto' => 80.00, 'estado' => 'activo']);
        }

        // ── 3. Aulas ───────────────────────────────────────────
        $aulaNros = [];
        for ($i = 1; $i <= 10; $i++) {
            $nro = "A{$i}";
            Aula::firstOrCreate(
                ['nro' => $nro],
                ['capacidad' => 110, 'descripcion' => "Aula {$i}", 'estado' => 'activo']
            );
            $aulaNros[] = $nro;
        }

        // ── 4. Carreras (crea si no existen) ──────────────────
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

        // ── 5. Distribución por carrera ────────────────────────
        $distribucion = [
            'SIS-P' => 250,
            'SIS-V' => 200,
            'INF-P' => 200,
            'INF-V' => 150,
            'ROB'   => 100,
            'NET'   => 100,
        ];

        // ── 6. Grupos (2 por carrera si hay más de 120 alumnos) ─
        $gruposPorCarrera = [];
        foreach ($distribucion as $carreraId => $count) {
            $nGrupos  = (int) ceil($count / 130);
            $modalidad = str_contains($carreraId, '-V') ? 'virtual' : 'presencial';
            for ($g = 1; $g <= $nGrupos; $g++) {
                $carreraCorta = str_replace('-', '', $carreraId);
                $grupoId = "H25-{$carreraCorta}-{$g}";
                Grupo::firstOrCreate(
                    ['id' => $grupoId, 'convocatoria_id' => 'H-2025'],
                    [
                        'carrera_id'  => $carreraId,
                        'modalidad'   => $modalidad,
                        'cupo_maximo' => 130,
                        'estado'      => 'inactivo',
                    ]
                );
                $gruposPorCarrera[$carreraId][] = $grupoId;
            }
        }

        // ── 6. Examen de admisión ──────────────────────────────
        $examen = ExamenAdmision::firstOrCreate(
            ['convocatoria_id' => 'H-2025', 'numero_examen' => 1],
            [
                'descripcion' => 'Examen de Admisión 2do Semestre 2025',
                'fecha'       => '2025-11-20',
                'hora_inicio' => '08:00:00',
                'hora_fin'    => '11:00:00',
                'estado'      => 'finalizado',
            ]
        );

        // ── 7. Generar datos ───────────────────────────────────
        $password = Hash::make('Post123!');

        $carreraFlat = [];
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

        $ciudades = ['Cochabamba', 'Santa Cruz', 'La Paz', 'Oruro', 'Sucre', 'Tarija', 'Potosí'];
        $titulos  = ['Bachiller en Humanidades', 'Bachiller en Ciencias', 'Bachiller Técnico Humanístico'];
        $otrasCarreras = array_keys($distribucion);

        $users         = [];
        $postulantes   = [];
        $postulaciones = [];
        $pagos         = [];
        $asignaciones  = [];
        $evaluaciones  = [];

        for ($i = 0; $i < 1000; $i++) {
            $ci        = 7000001 + $i;
            $carreraId = $carreraFlat[$i];
            $sexo      = $faker->randomElement(['M', 'F']);
            $nombre    = $sexo === 'M' ? $faker->firstNameMale() : $faker->firstNameFemale();
            $apellido1 = $faker->lastName();
            $apellido2 = $faker->lastName();
            $email     = "cup{$ci}@demo.bo";

            // Grupo round-robin dentro de la carrera
            $gIds    = $gruposPorCarrera[$carreraId];
            $grupoId = $gIds[$i % count($gIds)];

            // Segunda carrera (60% la tienen)
            $op2 = null;
            if ($faker->boolean(60)) {
                $otras = array_filter($otrasCarreras, fn($c) => $c !== $carreraId);
                $op2   = $faker->randomElement(array_values($otras));
            }

            // Aula round-robin
            $aulaNro = $aulaNros[$i % count($aulaNros)];

            // Notas: 70% aprueban (todas las notas ≥ 60)
            if ($faker->boolean(70)) {
                $n1 = round($faker->randomFloat(2, 61, 100), 2);
                $n2 = round($faker->randomFloat(2, 61, 100), 2);
                $n3 = round($faker->randomFloat(2, 61, 100), 2);
                $n4 = round($faker->randomFloat(2, 61, 100), 2);
            } else {
                $n1 = round($faker->randomFloat(2, 45, 100), 2);
                $n2 = round($faker->randomFloat(2, 45, 100), 2);
                $n3 = round($faker->randomFloat(2, 45, 100), 2);
                $n4 = round($faker->randomFloat(2, 45, 100), 2);
                // Al menos una nota reprobada
                $cual = $faker->numberBetween(0, 3);
                if ($cual === 0) $n1 = round($faker->randomFloat(2, 30, 59), 2);
                if ($cual === 1) $n2 = round($faker->randomFloat(2, 30, 59), 2);
                if ($cual === 2) $n3 = round($faker->randomFloat(2, 30, 59), 2);
                if ($cual === 3) $n4 = round($faker->randomFloat(2, 30, 59), 2);
            }

            $calc = Evaluacion::calcular($n1, $n2, $n3, $n4);

            $fechaInsc = $faker->dateTimeBetween('2025-07-15', '2025-09-30')->format('Y-m-d H:i:s');
            $fechaPago = $faker->dateTimeBetween('2025-08-01', '2025-10-15')->format('Y-m-d H:i:s');

            $users[] = [
                'CI'                      => $ci,
                'nombre_completo'         => "{$nombre} {$apellido1} {$apellido2}",
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

            $postulaciones[] = [
                'postulante_ci'      => $ci,
                'convocatoria_id'    => 'H-2025',
                'grupo_id'           => $grupoId,
                'carrera_opcion1_id' => $carreraId,
                'carrera_opcion2_id' => $op2,
                'estado_admision'    => $calc['estado_resultado'],
                'fecha_registro'     => $fechaInsc,
            ];

            $pagos[] = [
                'postulante_ci' => $ci,
                'tipopago_id'   => $tipoPago->id,
                'monto'         => 80.00,
                'estado_pago'   => 'aprobado',
                'fecha_pago'    => $fechaPago,
                'cajero_ci'     => 10000004,
                'observacion'   => null,
            ];

            $asignaciones[] = [
                'examen_id'     => $examen->id,
                'postulante_ci' => $ci,
                'aula_nro'      => $aulaNro,
            ];

            $evaluaciones[] = [
                'postulante_ci'    => $ci,
                'examen_id'        => $examen->id,
                'nota_examen1'     => $n1,
                'nota_examen2'     => $n2,
                'nota_examen3'     => $n3,
                'nota_examen4'     => $n4,
                'promedio_final'   => $calc['promedio_final'],
                'estado_resultado' => $calc['estado_resultado'],
            ];
        }

        // ── 8. Bulk insert ─────────────────────────────────────
        $this->command->info('Insertando 1000 usuarios...');
        foreach (array_chunk($users, 200) as $chunk) {
            DB::table('usuario')->insertOrIgnore($chunk);
        }

        $this->command->info('Insertando postulantes...');
        foreach (array_chunk($postulantes, 200) as $chunk) {
            DB::table('postulante')->insertOrIgnore($chunk);
        }

        $this->command->info('Insertando postulaciones...');
        foreach (array_chunk($postulaciones, 200) as $chunk) {
            DB::table('postulacion')->insertOrIgnore($chunk);
        }

        $this->command->info('Insertando pagos...');
        foreach (array_chunk($pagos, 200) as $chunk) {
            DB::table('pago')->insert($chunk);
        }

        $this->command->info('Insertando asignaciones de examen...');
        foreach (array_chunk($asignaciones, 200) as $chunk) {
            DB::table('asignacion_examen')->insertOrIgnore($chunk);
        }

        $this->command->info('Insertando evaluaciones...');
        foreach (array_chunk($evaluaciones, 200) as $chunk) {
            DB::table('evaluacion')->insertOrIgnore($chunk);
        }

        $this->command->info('');
        $this->command->info('✓ Convocatoria H-2025 creada con 1000 postulantes.');
        $this->command->info('  Distribución: SIS-P(250) SIS-V(200) INF-P(200) INF-V(150) ROB(100) NET(100)');
        $this->command->info('  Grupos: ' . collect($gruposPorCarrera)->flatten()->count() . ' grupos formados');
        $this->command->info('  Resultados: ~70% aprobados, ~30% reprobados');
    }
}
