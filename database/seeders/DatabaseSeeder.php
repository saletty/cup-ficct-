<?php

namespace Database\Seeders;

use App\Models\Carrera;
use App\Models\Convocatoria;
use App\Models\Docente;
use App\Models\Permiso;
use App\Models\Postulacion;
use App\Models\Postulante;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Permisos ─────────────────────────────────────────
        $permisos = [
            'Ver dashboard',
            'Gestionar usuarios',       // Admin: usuarios, roles, permisos, bitácora
            'Gestionar postulantes',    // Operador + Cajero: registro y consulta
            'Gestionar carreras',       // Coordinador: catálogo de carreras
            'Gestionar convocatorias',  // Coordinador: periodos de admisión
            'Gestionar grupos',         // Coordinador: grupos y horarios
            'Gestionar docentes',       // Coordinador: docentes y asignaciones
            'Ver carga horaria propia', // Docente: solo su propio horario
            'Registrar asistencia',     // Docente: registrar asistencia a clases
            'Ver reportes',             // Coordinador + Cajero: reportes del sistema
            'Registrar notas',          // (reservado — no asignado a ningún rol actualmente)
            'Gestionar tipos de pago',  // Coordinador: catálogo de aranceles (CU15)
            'Gestionar pagos',          // Cajero: registrar y validar pagos (CU16)
            'Gestionar exámenes',       // Coordinador: exámenes y asignaciones (CU17)
        ];

        foreach ($permisos as $desc) {
            Permiso::firstOrCreate(['descripcion' => $desc], ['estado' => 'activo']);
        }

        // ── 2. Roles ─────────────────────────────────────────────
        $roles = [
            ['nombre' => 'Administrador', 'descripcion' => 'Acceso completo al sistema'],
            ['nombre' => 'Coordinador',   'descripcion' => 'Gestión académica de grupos y convocatorias'],
            ['nombre' => 'Docente',       'descripcion' => 'Acceso a su carga horaria y registro de asistencia'],
            ['nombre' => 'Cajero',        'descripcion' => 'Registro y validación de pagos de admisión'],
            ['nombre' => 'Operador',      'descripcion' => 'Registro de postulantes en ventanilla'],
            ['nombre' => 'Postulante',    'descripcion' => 'Estudiante que postula a la FICCT'],
        ];

        foreach ($roles as $r) {
            Rol::firstOrCreate(['nombre' => $r['nombre']], ['descripcion' => $r['descripcion']]);
        }

        // Eliminar usuario docente genérico (CI=10000005) reemplazado por docentes reales
        User::where('CI', 10000005)->delete();

        $admin       = Rol::where('nombre', 'Administrador')->first();
        $coordinador = Rol::where('nombre', 'Coordinador')->first();
        $docente     = Rol::where('nombre', 'Docente')->first();
        $cajero      = Rol::where('nombre', 'Cajero')->first();
        $operador    = Rol::where('nombre', 'Operador')->first();
        $postulante  = Rol::where('nombre', 'Postulante')->first();

        // Administrador: todos los permisos
        $admin->permisos()->sync(Permiso::pluck('id'));

        // Coordinador: gestión académica + aranceles + exámenes + notas
        $coordinador->permisos()->sync(
            Permiso::whereIn('descripcion', [
                'Ver dashboard',
                'Gestionar carreras',
                'Gestionar convocatorias',
                'Gestionar grupos',
                'Gestionar docentes',
                'Gestionar postulantes',
                'Gestionar tipos de pago',
                'Gestionar exámenes',
                'Registrar notas',
                'Ver reportes',
            ])->pluck('id')
        );

        // Docente: SOLO su carga horaria y asistencia (NO registrar notas)
        $docente->permisos()->sync(
            Permiso::whereIn('descripcion', [
                'Ver dashboard',
                'Ver carga horaria propia',
                'Registrar asistencia',
            ])->pluck('id')
        );

        // Cajero: solo dashboard y pagos
        $cajero->permisos()->sync(
            Permiso::whereIn('descripcion', [
                'Ver dashboard',
                'Gestionar pagos',
            ])->pluck('id')
        );

        // Operador: dashboard, gestionar postulantes
        $operador->permisos()->sync(
            Permiso::whereIn('descripcion', [
                'Ver dashboard', 'Gestionar postulantes',
            ])->pluck('id')
        );

        // Postulante: solo ver dashboard
        $postulante->permisos()->sync(
            Permiso::whereIn('descripcion', ['Ver dashboard'])->pluck('id')
        );

        // ── 3. Usuarios institucionales ─────────────────────────
        $usuarios = [
            [
                'CI'              => 10000001,
                'nombre_completo' => 'Administrador',
                'email'           => 'admin@ficct.edu.bo',
                'password'        => 'Admin123!',
                'rol'             => $admin,
            ],
            [
                'CI'              => 10000002,
                'nombre_completo' => 'Coordinador',
                'email'           => 'coord@ficct.edu.bo',
                'password'        => 'Coord123!',
                'rol'             => $coordinador,
            ],
            [
                'CI'              => 10000003,
                'nombre_completo' => 'Operador FICCT',
                'email'           => 'operador@ficct.edu.bo',
                'password'        => 'Operador123',
                'rol'             => $operador,
            ],
            [
                'CI'              => 10000004,
                'nombre_completo' => 'Cajero FICCT',
                'email'           => 'cajero@ficct.edu.bo',
                'password'        => 'Cajero123!',
                'rol'             => $cajero,
            ],
            // Docentes
            [
                'CI'              => 5001001,
                'nombre_completo' => 'Dr. Carlos Mendoza',
                'email'           => 'cmendoza@ficct.edu.bo',
                'password'        => 'Docente123!',
                'rol'             => $docente,
            ],
            [
                'CI'              => 5001002,
                'nombre_completo' => 'Mg. Ana Torrico',
                'email'           => 'atorrico@ficct.edu.bo',
                'password'        => 'Docente123!',
                'rol'             => $docente,
            ],
            [
                'CI'              => 5001003,
                'nombre_completo' => 'Mg. Luis Vaca',
                'email'           => 'lvaca@ficct.edu.bo',
                'password'        => 'Docente123!',
                'rol'             => $docente,
            ],
            [
                'CI'              => 5001004,
                'nombre_completo' => 'Lic. Sandra Pedraza',
                'email'           => 'spedraza@ficct.edu.bo',
                'password'        => 'Docente123!',
                'rol'             => $docente,
            ],
        ];

        foreach ($usuarios as $u) {
            User::updateOrCreate(
                ['CI' => $u['CI']],
                [
                    'nombre_completo'         => $u['nombre_completo'],
                    'email'                   => $u['email'],
                    'contraseña'              => Hash::make($u['password']),
                    'estado'                  => 'activo',
                    'rol_id'                  => $u['rol']->id,
                    'intentos_fallidos'       => 0,
                    'bloqueado_hasta'         => null,
                    'debe_cambiar_contrasena' => false,
                ]
            );
        }

        // ── 3b. Perfiles de docente ──────────────────────────────
        $docentesData = [
            ['CI' => 5001001, 'profesion' => 'Ingeniero en Sistemas',    'maestria' => 'Maestría en Ingeniería de Software',   'diplomado_educacion_superior' => 'Diplomado en Educación Superior'],
            ['CI' => 5001002, 'profesion' => 'Ingeniera en Informática', 'maestria' => 'Maestría en Gestión de TI',            'diplomado_educacion_superior' => 'Diplomado en Educación Superior'],
            ['CI' => 5001003, 'profesion' => 'Ingeniero en Sistemas',    'maestria' => 'Maestría en Ingeniería de Software',   'diplomado_educacion_superior' => 'Diplomado en Educación Superior'],
            ['CI' => 5001004, 'profesion' => 'Licenciada en Informática','maestria' => 'Maestría en Docencia Universitaria',   'diplomado_educacion_superior' => 'Diplomado en Educación Superior'],
        ];

        foreach ($docentesData as $d) {
            Docente::updateOrCreate(['CI' => $d['CI']], $d);
        }

        // ── 3c. Usuarios postulantes ─────────────────────────────
        $postulantes = [
            ['CI' => 8001001, 'nombre_completo' => 'Diego García Mamani',    'email' => 'dgarcia01@gmail.com'],
            ['CI' => 8001002, 'nombre_completo' => 'Laura Rodríguez Quispe', 'email' => 'lrodriguez02@gmail.com'],
            ['CI' => 8001003, 'nombre_completo' => 'Miguel Torres Condori',  'email' => 'mtorres03@gmail.com'],
            ['CI' => 8001004, 'nombre_completo' => 'Sofía Flores Apaza',     'email' => 'sflores04@gmail.com'],
            ['CI' => 8001005, 'nombre_completo' => 'Carlos López Huanca',    'email' => 'clopez05@gmail.com'],
            ['CI' => 8001006, 'nombre_completo' => 'Valeria Chávez Copa',    'email' => 'vchavez06@gmail.com'],
            ['CI' => 8001007, 'nombre_completo' => 'Andrés Mendoza Layme',   'email' => 'amendoza07@gmail.com'],
            ['CI' => 8001008, 'nombre_completo' => 'Natalia Ríos Calizaya',  'email' => 'nrios08@gmail.com'],
            ['CI' => 8001009, 'nombre_completo' => 'Roberto Vargas Ticona',  'email' => 'rvargas09@gmail.com'],
            ['CI' => 8001010, 'nombre_completo' => 'Claudia Morales Marca',  'email' => 'cmorales10@gmail.com'],
        ];

        foreach ($postulantes as $p) {
            User::updateOrCreate(
                ['CI' => $p['CI']],
                [
                    'nombre_completo'         => $p['nombre_completo'],
                    'email'                   => $p['email'],
                    'contraseña'              => Hash::make('Post123!'),
                    'estado'                  => 'activo',
                    'rol_id'                  => $postulante->id,
                    'intentos_fallidos'       => 0,
                    'bloqueado_hasta'         => null,
                    'debe_cambiar_contrasena' => false,
                ]
            );
            Postulante::firstOrCreate(['CI' => $p['CI']]);
        }

        // ── 4. Convocatorias ─────────────────────────────────────
        Convocatoria::firstOrCreate(
            ['id' => '1-2026'],
            ['nombre' => 'Primer Semestre 2026', 'fecha_inicio' => '2026-01-15', 'fecha_fin' => '2026-06-30', 'estado' => 'habilitada', 'cupo_maximo' => 200]
        );
        Convocatoria::firstOrCreate(
            ['id' => '2-2026'],
            ['nombre' => 'Segundo Semestre 2026', 'fecha_inicio' => '2026-07-01', 'fecha_fin' => '2026-12-15', 'estado' => 'habilitada', 'cupo_maximo' => 200]
        );

        // ── 5. Carreras FICCT con modalidades ────────────────────
        $carreras = [
            ['id' => 'SIS-V', 'nombre_carrera' => 'Ing. en Sistemas (Virtual)'],
            ['id' => 'SIS-P', 'nombre_carrera' => 'Ing. en Sistemas (Presencial)'],
            ['id' => 'INF-V', 'nombre_carrera' => 'Ing. en Informática (Virtual)'],
            ['id' => 'INF-P', 'nombre_carrera' => 'Ing. en Informática (Presencial)'],
            ['id' => 'ROB',   'nombre_carrera' => 'Ing. en Robótica (Presencial)'],
            ['id' => 'NET',   'nombre_carrera' => 'Ing. en Redes y Telecomunicaciones (Presencial)'],
        ];

        foreach ($carreras as $c) {
            Carrera::firstOrCreate(['id' => $c['id']], ['nombre_carrera' => $c['nombre_carrera']]);
        }

        // ── 6. Inscripciones de prueba (convocatoria 2-2026) ─────
        $inscripcionesSeed = [
            ['ci' => 8001001, 'op1' => 'SIS-P', 'op2' => null,    'estado' => 'pendiente'],
            ['ci' => 8001003, 'op1' => 'SIS-V', 'op2' => 'NET',   'estado' => 'pendiente'],
            ['ci' => 8001004, 'op1' => 'ROB',   'op2' => 'SIS-P', 'estado' => 'pendiente'],
            ['ci' => 8001005, 'op1' => 'NET',   'op2' => null,    'estado' => 'pendiente'],
            ['ci' => 8001006, 'op1' => 'SIS-P', 'op2' => 'ROB',   'estado' => 'aprobado'],
            ['ci' => 8001007, 'op1' => 'SIS-V', 'op2' => 'NET',   'estado' => 'pendiente'],
            ['ci' => 8001008, 'op1' => 'ROB',   'op2' => null,    'estado' => 'reprobado'],
            ['ci' => 8001009, 'op1' => 'NET',   'op2' => 'SIS-P', 'estado' => 'anulado'],
        ];

        foreach ($inscripcionesSeed as $ins) {
            Postulacion::firstOrCreate(
                ['postulante_ci' => $ins['ci'], 'convocatoria_id' => '2-2026'],
                [
                    'carrera_opcion1_id' => $ins['op1'],
                    'carrera_opcion2_id' => $ins['op2'],
                    'estado_admision'    => $ins['estado'],
                    'fecha_registro'     => now(),
                ]
            );
        }

        // Datos históricos H-2025 (1000 postulantes para reportes y demo)
        $this->call(ConvocatoriaHistoricaSeeder::class);
    }
}
