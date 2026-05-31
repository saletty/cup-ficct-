<?php

namespace Database\Seeders;

use App\Models\Permiso;
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
        ];

        foreach ($roles as $r) {
            Rol::firstOrCreate(['nombre' => $r['nombre']], ['descripcion' => $r['descripcion']]);
        }

        $admin       = Rol::where('nombre', 'Administrador')->first();
        $coordinador = Rol::where('nombre', 'Coordinador')->first();
        $docente     = Rol::where('nombre', 'Docente')->first();

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

        // ── 3. Usuarios iniciales ─────────────────────────────────
        User::firstOrCreate(
            ['CI' => 10000001],
            [
                'nombre_completo' => 'Administrador FICCT',
                'email'           => 'admin@ficct.edu.bo',
                'contraseña'      => Hash::make('Admin123'),
                'estado'          => 'ACTIVO',
                'rol_id'          => $admin->id,
            ]
        );

        User::firstOrCreate(
            ['CI' => 10000002],
            [
                'nombre_completo' => 'Coordinador FICCT',
                'email'           => 'coord@ficct.edu.bo',
                'contraseña'      => Hash::make('Coord123'),
                'estado'          => 'ACTIVO',
                'rol_id'          => $coordinador->id,
            ]
        );
    }
}
