<?php

namespace Database\Seeders;

use App\Models\Carrera;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Permisos ─────────────────────────────────────────
        $permisos = [
            'Ver dashboard',
            'Gestionar postulantes',
            'Registrar notas',
            'Ver reportes',
            'Gestionar docentes',
            'Gestionar grupos',
            'Gestionar convocatorias',
            'Gestionar usuarios',
            'Ver carga horaria propia',
            'Registrar asistencia',
        ];

        foreach ($permisos as $desc) {
            Permiso::firstOrCreate(['descripcion' => $desc], ['estado' => 'activo']);
        }

        // ── 2. Roles ─────────────────────────────────────────────
        $roles = [
            ['nombre' => 'Administrador', 'descripcion' => 'Acceso completo al sistema'],
            ['nombre' => 'Coordinador',   'descripcion' => 'Gestión académica de grupos y convocatorias'],
            ['nombre' => 'Docente',       'descripcion' => 'Acceso a su carga horaria y registro de notas'],
            ['nombre' => 'Cajero',        'descripcion' => 'Gestión de pagos e inscripciones'],
            ['nombre' => 'Operador',      'descripcion' => 'Registro de postulantes en ventanilla'],
            ['nombre' => 'Postulante',    'descripcion' => 'Estudiante que postula a la FICCT'],
        ];

        foreach ($roles as $r) {
            Rol::firstOrCreate(['nombre' => $r['nombre']], ['descripcion' => $r['descripcion']]);
        }

        $admin       = Rol::where('nombre', 'Administrador')->first();
        $coordinador = Rol::where('nombre', 'Coordinador')->first();
        $docente     = Rol::where('nombre', 'Docente')->first();
        $cajero      = Rol::where('nombre', 'Cajero')->first();
        $operador    = Rol::where('nombre', 'Operador')->first();
        $postulante  = Rol::where('nombre', 'Postulante')->first();

        // Administrador: todos los permisos
        $admin->permisos()->sync(Permiso::pluck('id'));

        // Coordinador: dashboard, postulantes, notas, reportes, grupos, convocatorias
        $coordinador->permisos()->sync(
            Permiso::whereIn('descripcion', [
                'Ver dashboard', 'Gestionar postulantes', 'Registrar notas',
                'Ver reportes', 'Gestionar grupos', 'Gestionar convocatorias',
            ])->pluck('id')
        );

        // Docente: dashboard, carga horaria, asistencia, notas
        $docente->permisos()->sync(
            Permiso::whereIn('descripcion', [
                'Ver dashboard', 'Registrar notas',
                'Ver carga horaria propia', 'Registrar asistencia',
            ])->pluck('id')
        );

        // Cajero: dashboard, postulantes, reportes
        $cajero->permisos()->sync(
            Permiso::whereIn('descripcion', [
                'Ver dashboard', 'Gestionar postulantes', 'Ver reportes',
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
                'nombre_completo' => 'Administrador FICCT',
                'email'           => 'admin@ficct.edu.bo',
                'password'        => 'Admin123',
                'rol'             => $admin,
            ],
            [
                'CI'              => 10000002,
                'nombre_completo' => 'Coordinador FICCT',
                'email'           => 'coord@ficct.edu.bo',
                'password'        => 'Coord123',
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
                'password'        => 'Cajero123',
                'rol'             => $cajero,
            ],
            [
                'CI'              => 10000005,
                'nombre_completo' => 'Docente FICCT',
                'email'           => 'docente@ficct.edu.bo',
                'password'        => 'Docente123',
                'rol'             => $docente,
            ],
        ];

        foreach ($usuarios as $u) {
            // updateOrCreate garantiza que las credenciales son siempre correctas
            // en cada deploy, incluso si el registro existía con datos incorrectos.
            // Usamos texto plano: el cast 'hashed' del modelo lo encripta automáticamente.
            User::updateOrCreate(
                ['CI' => $u['CI']],
                [
                    'nombre_completo'         => $u['nombre_completo'],
                    'email'                   => $u['email'],
                    'contraseña'              => $u['password'],   // texto plano → hashed cast
                    'estado'                  => 'ACTIVO',
                    'rol_id'                  => $u['rol']->id,
                    'intentos_fallidos'       => 0,
                    'bloqueado_hasta'         => null,
                    'debe_cambiar_contrasena' => false,
                ]
            );
        }

        // ── 4. Carreras FICCT con modalidades ────────────────────
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
    }
}
