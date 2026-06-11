<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Demo para defensa SI1 — 240 postulantes en convocatoria 1-2026:
 *   70  → SIS-P  (grupo lleno)
 *   70  → SIS-V  (grupo lleno)
 *   50  → INF-P  (grupo mediano)
 *   50  → ROB    (grupo mediano)
 *   (resto aleatorio entre NET / INF-V para tener variedad en reportes)
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $password   = Hash::make('Post123!');
        $rolId      = DB::table('rol')->where('nombre', 'Postulante')->value('id');
        $tipoPagoId = DB::table('tipo_pago')->where('descripcion', 'like', 'Inscripción%')->value('id') ?? 1;
        $cajeroCI   = 10000004;
        $convId     = '1-2026';

        // ── Nombres y apellidos bolivianos ───────────────────────────────
        $nombres = [
            'Alejandro','Valeria','Diego','Sofía','Carlos','Lucía','Andrés','Camila',
            'Fernando','Patricia','Miguel','Natalia','Roberto','Claudia','Jorge','Daniela',
            'Luis','Gabriela','Rodrigo','Verónica','Emilio','Susana','Pablo','Mariana',
            'Iván','Fernanda','Marco','Beatriz','Oscar','Andrea','Gustavo','Elena',
            'Sergio','Paola','Arturo','Silvia','Ramiro','Mónica','Álvaro','Rosa',
            'Nelson','Lorena','Hugo','Ximena','Mario','Alejandra','César','Carla',
            'Jonás','Adriana','Renato','Rebeca','Hernán','Miriam','Fabian','Tatiana',
            'Gilberto','Irene','Hector','Yolanda','Daniel','Cintia','Rolando','Alicia',
            'Byron','Estela','Kevin','Brenda','Abel','Noelia','Cristian','Tamara',
            'Erick','Lourdes','Jhon','Vanessa','Boris','Karina','Walter','Sabrina',
        ];

        $apellidos = [
            'Quispe','Mamani','Torrez','Flores','García','López','Condori','Vargas',
            'Salinas','Chávez','Rojas','Medina','Herrera','Cruz','Montaño','Soria',
            'Antelo','Pinto','Vaca','Arce','Apaza','Calizaya','Ticona','Serrano',
            'Layme','Roca','Copa','Huanca','Cuellar','Morales','Lazo','Soliz',
            'Terán','Pedraza','Coca','Villarroel','Sánchez','Luna','Marca','Heredia',
            'Gutiérrez','Castro','Rivero','Aguilar','Baptista','Cabrera','Durán',
            'Espinoza','Figueroa','Gallardo','Hidalgo','Ibáñez','Jiménez','Lara',
        ];

        // ── Distribución de carreras: 70+70+50+50 ───────────────────────
        $distribucion = array_merge(
            array_fill(0, 70, ['op1' => 'SIS-P', 'op2' => 'INF-P']),
            array_fill(0, 70, ['op1' => 'SIS-V', 'op2' => 'SIS-P']),
            array_fill(0, 50, ['op1' => 'INF-P', 'op2' => 'SIS-P']),
            array_fill(0, 50, ['op1' => 'ROB',   'op2' => 'SIS-P']),
        );

        $totalNombres   = count($nombres);
        $totalApellidos = count($apellidos);
        $usados         = []; // para evitar duplicar nombre_completo

        $usuarios  = [];
        $postulant = [];
        $postulaci = [];
        $pagosCI   = DB::table('pago')
            ->where('tipopago_id', $tipoPagoId)
            ->pluck('postulante_ci')
            ->flip()
            ->toArray();

        foreach ($distribucion as $i => $carrera) {
            $ci = 8002001 + $i;

            // Generar nombre único
            do {
                $nom = $nombres[($i + intdiv($i, $totalNombres)) % $totalNombres];
                $ap1 = $apellidos[$i % $totalApellidos];
                $ap2 = $apellidos[($i + 17) % $totalApellidos];
                $nombre = "$nom $ap1 $ap2";
            } while (isset($usados[$nombre]) && false); // siempre único por CI
            $usados[$nombre] = true;

            $email = strtolower(
                preg_replace('/[^a-z0-9]/i', '', iconv('UTF-8', 'ASCII//TRANSLIT', $nom))
                . sprintf('%03d', $ci % 1000)
                . '@gmail.com'
            );

            // 1. Usuario
            DB::table('usuario')->updateOrInsert(
                ['CI' => $ci],
                [
                    'nombre_completo'         => $nombre,
                    'email'                   => $email,
                    'contraseña'              => $password,
                    'estado'                  => 'activo',
                    'rol_id'                  => $rolId,
                    'intentos_fallidos'       => 0,
                    'bloqueado_hasta'         => null,
                    'debe_cambiar_contrasena' => false,
                ]
            );

            // 2. Perfil postulante
            DB::table('postulante')->insertOrIgnore(['CI' => $ci]);

            // 3. Postulación
            DB::table('postulacion')->insertOrIgnore([
                'postulante_ci'      => $ci,
                'convocatoria_id'    => $convId,
                'carrera_opcion1_id' => $carrera['op1'],
                'carrera_opcion2_id' => $carrera['op2'],
                'estado_admision'    => 'pendiente',
                'fecha_registro'     => now(),
            ]);

            // 4. Pago aprobado (solo si no tiene ya uno)
            if (! isset($pagosCI[$ci])) {
                DB::table('pago')->insert([
                    'postulante_ci' => $ci,
                    'tipopago_id'   => $tipoPagoId,
                    'monto'         => 700.00,
                    'estado_pago'   => 'verificado',
                    'fecha_pago'    => now(),
                    'cajero_ci'     => $cajeroCI,
                    'observacion'   => 'Pago demo — defensa SI1',
                ]);
                $pagosCI[$ci] = true;
            }
        }
    }
}
