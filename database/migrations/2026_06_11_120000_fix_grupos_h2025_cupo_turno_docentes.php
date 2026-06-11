<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $grupos = [
        ['id' => 'H25-SISP-1', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-SISP-2', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-SISP-3', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'noche'],
        ['id' => 'H25-SISP-4', 'carrera_id' => 'SIS-P', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-SISV-1', 'carrera_id' => 'SIS-V', 'modalidad' => 'virtual',    'turno' => 'mañana'],
        ['id' => 'H25-SISV-2', 'carrera_id' => 'SIS-V', 'modalidad' => 'virtual',    'turno' => 'tarde'],
        ['id' => 'H25-SISV-3', 'carrera_id' => 'SIS-V', 'modalidad' => 'virtual',    'turno' => 'noche'],
        ['id' => 'H25-INFP-1', 'carrera_id' => 'INF-P', 'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-INFP-2', 'carrera_id' => 'INF-P', 'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-INFP-3', 'carrera_id' => 'INF-P', 'modalidad' => 'presencial', 'turno' => 'noche'],
        ['id' => 'H25-INFV-1', 'carrera_id' => 'INF-V', 'modalidad' => 'virtual',    'turno' => 'mañana'],
        ['id' => 'H25-INFV-2', 'carrera_id' => 'INF-V', 'modalidad' => 'virtual',    'turno' => 'tarde'],
        ['id' => 'H25-INFV-3', 'carrera_id' => 'INF-V', 'modalidad' => 'virtual',    'turno' => 'noche'],
        ['id' => 'H25-ROB-1',  'carrera_id' => 'ROB',   'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-ROB-2',  'carrera_id' => 'ROB',   'modalidad' => 'presencial', 'turno' => 'tarde'],
        ['id' => 'H25-NET-1',  'carrera_id' => 'NET',   'modalidad' => 'presencial', 'turno' => 'mañana'],
        ['id' => 'H25-NET-2',  'carrera_id' => 'NET',   'modalidad' => 'presencial', 'turno' => 'tarde'],
    ];

    private array $nuevosDocentes = [
        ['CI' => 5001009, 'nombre' => 'Ing. Roberto Salinas Vega',    'email' => 'rsalinas@ficct.edu.bo',   'profesion' => 'Ingeniero en Sistemas',    'maestria' => 'Maestría en Informática',                 'materia_id' => 1],
        ['CI' => 5001010, 'nombre' => 'Ing. Patricia Loza Mamani',    'email' => 'ploza@ficct.edu.bo',      'profesion' => 'Ingeniera en Computación', 'maestria' => 'Maestría en Inteligencia Artificial',    'materia_id' => 1],
        ['CI' => 5001011, 'nombre' => 'Ing. Gonzalo Ríos Condori',    'email' => 'grios@ficct.edu.bo',      'profesion' => 'Ingeniero en Sistemas',    'maestria' => 'Maestría en Ciencias de la Computación', 'materia_id' => 1],
        ['CI' => 5001012, 'nombre' => 'Lic. Martha Cuellar Apaza',    'email' => 'mcuellar@ficct.edu.bo',   'profesion' => 'Licenciada en Matemáticas','maestria' => 'Maestría en Matemática Pura',             'materia_id' => 2],
        ['CI' => 5001013, 'nombre' => 'Lic. Fernando Coca Torrez',    'email' => 'fcoca@ficct.edu.bo',      'profesion' => 'Licenciado en Matemáticas','maestria' => 'Maestría en Estadística',                 'materia_id' => 2],
        ['CI' => 5001014, 'nombre' => 'Lic. Verónica Pinto Huanca',   'email' => 'vpinto@ficct.edu.bo',     'profesion' => 'Licenciada en Matemáticas','maestria' => 'Maestría en Matemática Aplicada',         'materia_id' => 2],
        ['CI' => 5001015, 'nombre' => 'Lic. Daniel Flores Quispe',    'email' => 'dflores@ficct.edu.bo',    'profesion' => 'Licenciado en Lingüística','maestria' => 'Maestría en Enseñanza del Inglés',        'materia_id' => 3],
        ['CI' => 5001016, 'nombre' => 'Lic. Carmen Rojas Villarroel', 'email' => 'crojas@ficct.edu.bo',     'profesion' => 'Licenciada en Letras',     'maestria' => 'Maestría en Lingüística Computacional',   'materia_id' => 3],
        ['CI' => 5001017, 'nombre' => 'Lic. Hernán Castro Medina',    'email' => 'hcastro@ficct.edu.bo',    'profesion' => 'Licenciado en Idiomas',    'maestria' => 'Maestría en Lingüística Aplicada',        'materia_id' => 3],
        ['CI' => 5001018, 'nombre' => 'Ing. Cecilia Vargas Ticona',   'email' => 'cvargas@ficct.edu.bo',    'profesion' => 'Ingeniera en Física',      'maestria' => 'Maestría en Física Teórica',              'materia_id' => 4],
        ['CI' => 5001019, 'nombre' => 'Ing. Mario Gutiérrez Lazo',    'email' => 'mgutierrez@ficct.edu.bo', 'profesion' => 'Ingeniero en Electrónica', 'maestria' => 'Maestría en Física Aplicada',             'materia_id' => 4],
        ['CI' => 5001020, 'nombre' => 'Ing. Elena Morales Serrano',   'email' => 'emorales@ficct.edu.bo',   'profesion' => 'Licenciada en Física',     'maestria' => 'Maestría en Física Computacional',        'materia_id' => 4],
    ];

    public function up(): void
    {
        // ── 1. Columna turno en grupo (siempre, antes del guard) ─────
        if (! Schema::hasColumn('grupo', 'turno')) {
            Schema::table('grupo', function (Blueprint $table) {
                $table->string('turno', 10)->nullable()->after('estado');
            });
            DB::statement("ALTER TABLE grupo ADD CONSTRAINT chk_grupo_turno
                CHECK (turno IS NULL OR turno IN ('mañana','tarde','noche'))");
        }

        // Guard: si no hay datos H-2025 todavía, el seeder los creará correctamente
        if (! DB::table('convocatoria')->where('id', 'H-2025')->exists()) {
            return;
        }

        // ── 2. Cupo 130 → 70 en grupos H-2025 existentes ─────────────
        DB::table('grupo')->where('convocatoria_id', 'H-2025')->update(['cupo_maximo' => 70]);

        // ── 3. Crear grupos faltantes y asignar turnos ────────────────
        foreach ($this->grupos as $g) {
            if (DB::table('grupo')->where('id', $g['id'])->where('convocatoria_id', 'H-2025')->exists()) {
                DB::table('grupo')->where('id', $g['id'])->where('convocatoria_id', 'H-2025')
                    ->update(['turno' => $g['turno']]);
            } else {
                DB::table('grupo')->insert([
                    'id'              => $g['id'],
                    'convocatoria_id' => 'H-2025',
                    'carrera_id'      => $g['carrera_id'],
                    'modalidad'       => $g['modalidad'],
                    'cupo_maximo'     => 70,
                    'estado'          => 'inactivo',
                    'turno'           => $g['turno'],
                ]);
            }
        }

        // ── 4. Redistribuir postulaciones (máx 70 por grupo) ─────────
        $gruposPorCarrera = [];
        foreach ($this->grupos as $g) {
            $gruposPorCarrera[$g['carrera_id']][] = $g['id'];
        }
        foreach ($gruposPorCarrera as $carreraId => $grupoIds) {
            $postIds = DB::table('postulacion')
                ->where('convocatoria_id', 'H-2025')
                ->where('carrera_opcion1_id', $carreraId)
                ->pluck('id')->toArray();
            foreach ($postIds as $i => $postId) {
                DB::table('postulacion')->where('id', $postId)
                    ->update(['grupo_id' => $grupoIds[$i % count($grupoIds)]]);
            }
        }

        // ── 5. Insertar 12 nuevos docentes ────────────────────────────
        $docenteRolId = DB::table('rol')->where('nombre', 'Docente')->value('id');
        if ($docenteRolId) {
            $password = Hash::make('Docente123!');
            foreach ($this->nuevosDocentes as $d) {
                if (! DB::table('usuario')->where('CI', $d['CI'])->exists()) {
                    DB::table('usuario')->insert([
                        'CI'                      => $d['CI'],
                        'nombre_completo'         => $d['nombre'],
                        'email'                   => $d['email'],
                        'contraseña'              => $password,
                        'estado'                  => 'activo',
                        'rol_id'                  => $docenteRolId,
                        'intentos_fallidos'       => 0,
                        'bloqueado_hasta'         => null,
                        'debe_cambiar_contrasena' => false,
                    ]);
                }
                if (! DB::table('docente')->where('CI', $d['CI'])->exists()) {
                    DB::table('docente')->insert([
                        'CI'                           => $d['CI'],
                        'profesion'                    => $d['profesion'],
                        'maestria'                     => $d['maestria'],
                        'diplomado_educacion_superior' => 'Diplomado en Educación Superior',
                        'materia_id'                   => $d['materia_id'],
                    ]);
                }
            }
        }

        // ── 6. Asignaciones de docentes a grupos H-2025 ───────────────
        DB::table('asignacion_docente')->where('convocatoria_id', 'H-2025')->delete();
        $docentesPorMateria = DB::table('docente')->whereNotNull('materia_id')->orderBy('CI')
            ->get()->groupBy('materia_id');
        $materiaIds = DB::table('materia')->pluck('id')->toArray();
        $grupoIds   = array_column($this->grupos, 'id');

        foreach ($grupoIds as $grupoId) {
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
                    DB::table('asignacion_docente')->insert([
                        'docente_ci'      => $elegido,
                        'materia_id'      => $materiaId,
                        'grupo_id'        => $grupoId,
                        'convocatoria_id' => 'H-2025',
                    ]);
                }
            }
        }

        // ── 7. Tres exámenes por convocatoria ─────────────────────────
        // El examen existente pasa a ser el 1er examen (fecha ajustada a sept)
        $examen1 = DB::table('examen_admision')
            ->where('convocatoria_id', 'H-2025')->where('numero_examen', 1)->first();

        if ($examen1) {
            DB::table('examen_admision')->where('id', $examen1->id)
                ->update(['fecha' => '2025-09-15', 'descripcion' => 'Primer Examen de Admisión 2do Semestre 2025']);

            // Crear examen 2 (habilitación)
            $examen2Id = DB::table('examen_admision')
                ->where('convocatoria_id', 'H-2025')->where('numero_examen', 2)->value('id');
            if (! $examen2Id) {
                $examen2Id = DB::table('examen_admision')->insertGetId([
                    'convocatoria_id' => 'H-2025',
                    'numero_examen'   => 2,
                    'descripcion'     => 'Segundo Examen de Admisión 2do Semestre 2025',
                    'fecha'           => '2025-10-20',
                    'hora_inicio'     => '08:00:00',
                    'hora_fin'        => '11:00:00',
                    'estado'          => 'finalizado',
                ]);
            }

            // Crear examen 3 (segunda habilitación)
            $examen3Id = DB::table('examen_admision')
                ->where('convocatoria_id', 'H-2025')->where('numero_examen', 3)->value('id');
            if (! $examen3Id) {
                $examen3Id = DB::table('examen_admision')->insertGetId([
                    'convocatoria_id' => 'H-2025',
                    'numero_examen'   => 3,
                    'descripcion'     => 'Tercer Examen de Admisión 2do Semestre 2025',
                    'fecha'           => '2025-11-20',
                    'hora_inicio'     => '08:00:00',
                    'hora_fin'        => '11:00:00',
                    'estado'          => 'finalizado',
                ]);
            }

            // ── 8. Evaluaciones para reprobados de examen 1 → examen 2 ──
            $calcular = fn(float $n1, float $n2, float $n3, float $n4) => [
                'promedio_final'   => round(($n1 + $n2 + $n3 + $n4) / 4, 2),
                'estado_resultado' => ($n1 < 60 || $n2 < 60 || $n3 < 60 || $n4 < 60) ? 'reprobado' : 'aprobado',
            ];

            $genNotas = function (bool $aprueba): array {
                if ($aprueba) {
                    return [
                        round(mt_rand(6200, 9800) / 100, 2),
                        round(mt_rand(6200, 9800) / 100, 2),
                        round(mt_rand(6200, 9800) / 100, 2),
                        round(mt_rand(6200, 9800) / 100, 2),
                    ];
                }
                $notas = [
                    round(mt_rand(6200, 9800) / 100, 2),
                    round(mt_rand(6200, 9800) / 100, 2),
                    round(mt_rand(6200, 9800) / 100, 2),
                    round(mt_rand(6200, 9800) / 100, 2),
                ];
                $notas[mt_rand(0, 3)] = round(mt_rand(3000, 5900) / 100, 2);
                return $notas;
            };

            mt_srand(200);

            // Reprobados examen 1 → toman examen 2
            $reprobados1 = DB::table('evaluacion')
                ->where('examen_id', $examen1->id)->where('estado_resultado', 'reprobado')
                ->pluck('postulante_ci')->toArray();

            $asigs2    = [];
            $evals2    = [];
            $reprobados2 = [];

            foreach ($reprobados1 as $idx => $ci) {
                $aula = 'A' . (($idx % 10) + 1);
                $asigs2[] = ['examen_id' => $examen2Id, 'postulante_ci' => $ci, 'aula_nro' => $aula];

                $aprueba = (mt_rand(1, 100) <= 55); // 55% aprueba en el 2do intento
                [$n1, $n2, $n3, $n4] = $genNotas($aprueba);
                $calc = $calcular($n1, $n2, $n3, $n4);
                $evals2[] = [
                    'postulante_ci'    => $ci,
                    'examen_id'        => $examen2Id,
                    'nota_examen1'     => $n1,
                    'nota_examen2'     => $n2,
                    'nota_examen3'     => $n3,
                    'nota_examen4'     => $n4,
                    'promedio_final'   => $calc['promedio_final'],
                    'estado_resultado' => $calc['estado_resultado'],
                ];
                if ($calc['estado_resultado'] === 'reprobado') {
                    $reprobados2[] = $ci;
                }
            }

            foreach (array_chunk($asigs2, 200) as $chunk) {
                DB::table('asignacion_examen')->insertOrIgnore($chunk);
            }
            foreach (array_chunk($evals2, 200) as $chunk) {
                DB::table('evaluacion')->insertOrIgnore($chunk);
            }

            // Reprobados examen 2 → toman examen 3
            $asigs3  = [];
            $evals3  = [];
            foreach ($reprobados2 as $idx => $ci) {
                $aula = 'A' . (($idx % 10) + 1);
                $asigs3[] = ['examen_id' => $examen3Id, 'postulante_ci' => $ci, 'aula_nro' => $aula];

                $aprueba = (mt_rand(1, 100) <= 45); // 45% aprueba en el 3er intento
                [$n1, $n2, $n3, $n4] = $genNotas($aprueba);
                $calc = $calcular($n1, $n2, $n3, $n4);
                $evals3[] = [
                    'postulante_ci'    => $ci,
                    'examen_id'        => $examen3Id,
                    'nota_examen1'     => $n1,
                    'nota_examen2'     => $n2,
                    'nota_examen3'     => $n3,
                    'nota_examen4'     => $n4,
                    'promedio_final'   => $calc['promedio_final'],
                    'estado_resultado' => $calc['estado_resultado'],
                ];
            }

            foreach (array_chunk($asigs3, 200) as $chunk) {
                DB::table('asignacion_examen')->insertOrIgnore($chunk);
            }
            foreach (array_chunk($evals3, 200) as $chunk) {
                DB::table('evaluacion')->insertOrIgnore($chunk);
            }

            // ── 9. Actualizar estado_admision en postulacion ─────────────
            // Un estudiante aprueba si aprobó en CUALQUIERA de los 3 exámenes
            $todosEvals = DB::table('evaluacion')
                ->join('examen_admision', 'examen_admision.id', '=', 'evaluacion.examen_id')
                ->where('examen_admision.convocatoria_id', 'H-2025')
                ->select('evaluacion.postulante_ci', 'evaluacion.estado_resultado')
                ->get();

            $resultadoFinal = [];
            foreach ($todosEvals as $e) {
                if (! isset($resultadoFinal[$e->postulante_ci])) {
                    $resultadoFinal[$e->postulante_ci] = 'reprobado';
                }
                if ($e->estado_resultado === 'aprobado') {
                    $resultadoFinal[$e->postulante_ci] = 'aprobado';
                }
            }

            foreach ($resultadoFinal as $ci => $estado) {
                $carreraOp1 = DB::table('postulacion')
                    ->where('postulante_ci', $ci)->where('convocatoria_id', 'H-2025')
                    ->value('carrera_opcion1_id');
                DB::table('postulacion')
                    ->where('postulante_ci', $ci)->where('convocatoria_id', 'H-2025')
                    ->update([
                        'estado_admision'    => $estado,
                        'carrera_admitida_id' => $estado === 'aprobado' ? $carreraOp1 : null,
                    ]);
            }
        }
    }

    public function down(): void
    {
        // Revertir exámenes 2 y 3
        $examen2Id = DB::table('examen_admision')->where('convocatoria_id', 'H-2025')->where('numero_examen', 2)->value('id');
        $examen3Id = DB::table('examen_admision')->where('convocatoria_id', 'H-2025')->where('numero_examen', 3)->value('id');
        if ($examen2Id) { DB::table('evaluacion')->where('examen_id', $examen2Id)->delete(); DB::table('asignacion_examen')->where('examen_id', $examen2Id)->delete(); }
        if ($examen3Id) { DB::table('evaluacion')->where('examen_id', $examen3Id)->delete(); DB::table('asignacion_examen')->where('examen_id', $examen3Id)->delete(); }
        DB::table('examen_admision')->where('convocatoria_id', 'H-2025')->whereIn('numero_examen', [2, 3])->delete();
        DB::table('examen_admision')->where('convocatoria_id', 'H-2025')->where('numero_examen', 1)
            ->update(['fecha' => '2025-11-20', 'descripcion' => 'Examen de Admisión 2do Semestre 2025']);

        // Revertir asignaciones y docentes
        DB::table('asignacion_docente')->where('convocatoria_id', 'H-2025')->delete();
        DB::table('docente')->whereIn('CI', array_column($this->nuevosDocentes, 'CI'))->delete();
        DB::table('usuario')->whereIn('CI', array_column($this->nuevosDocentes, 'CI'))->delete();

        // Revertir grupos
        $nuevosIds = ['H25-SISP-3','H25-SISP-4','H25-SISV-3','H25-INFP-3','H25-INFV-3','H25-ROB-2','H25-NET-2'];
        DB::table('grupo')->whereIn('id', $nuevosIds)->where('convocatoria_id', 'H-2025')->delete();
        DB::table('grupo')->where('convocatoria_id', 'H-2025')->update(['cupo_maximo' => 130, 'turno' => null]);

        // Revertir columna turno
        if (Schema::hasColumn('grupo', 'turno')) {
            DB::statement('ALTER TABLE grupo DROP CONSTRAINT IF EXISTS chk_grupo_turno');
            Schema::table('grupo', fn(Blueprint $t) => $t->dropColumn('turno'));
        }
    }
};
