<?php

namespace App\Imports\Seguridad;

use App\Models\Postulante;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

// CU3 — Carga masiva de postulantes desde Excel/CSV
// Contraseña por defecto: CI del usuario (se fuerza cambio en primer login)
class PostulantesImport implements ToCollection, WithHeadingRow
{
    public array $resultados = [];

    private ?int $rolPostulanteId = null;

    public function __construct()
    {
        $this->rolPostulanteId = Rol::where('nombre', 'Postulante')->value('id');
    }

    public function collection(Collection $rows): void
    {
        if (! $this->rolPostulanteId) {
            $this->resultados[] = [
                'fila'   => '-',
                'estado' => 'error',
                'ci'     => null,
                'motivo' => 'El rol "Postulante" no existe en el sistema.',
            ];
            return;
        }

        foreach ($rows as $index => $row) {
            $fila = $index + 2;
            $data = array_map(fn($v) => is_string($v) ? trim($v) : $v, $row->toArray());

            $validator = Validator::make($data, [
                'ci'                  => ['required', 'integer'],
                'nombre_completo'     => ['required', 'string', 'max:150'],
                'email'               => ['required', 'email', 'max:120'],
                'fecha_nacimiento'    => ['required', 'date'],
                'sexo'                => ['required', 'in:M,F'],
                'direccion'           => ['required', 'string', 'max:255'],
                'telefono'            => ['required', 'string', 'max:20'],
                'ciudad'              => ['required', 'string', 'max:100'],
                'colegio_procedencia' => ['required', 'string', 'max:150'],
                'anio_egreso'         => ['required', 'integer', 'min:1990', 'max:' . now()->year],
                'titulo_bachiller'    => ['required', 'string', 'max:100'],
                'carrera_opcion1_id'  => ['required', 'string', 'exists:carrera,id'],
                'carrera_opcion2_id'  => ['nullable', 'string', 'exists:carrera,id'],
            ], [
                'ci.required'                 => 'El CI es obligatorio.',
                'ci.integer'                  => 'El CI debe ser un número.',
                'nombre_completo.required'    => 'El nombre completo es obligatorio.',
                'email.required'              => 'El correo es obligatorio.',
                'email.email'                 => 'Formato de correo inválido.',
                'fecha_nacimiento.required'   => 'La fecha de nacimiento es obligatoria.',
                'fecha_nacimiento.date'       => 'Formato de fecha inválido (use AAAA-MM-DD).',
                'sexo.required'               => 'El sexo es obligatorio.',
                'sexo.in'                     => 'El sexo debe ser M o F.',
                'anio_egreso.min'             => 'El año de egreso no puede ser anterior a 1990.',
                'anio_egreso.max'             => 'El año de egreso no puede ser futuro.',
                'carrera_opcion1_id.required' => 'La carrera opción 1 es obligatoria.',
                'carrera_opcion1_id.exists'   => 'Carrera opción 1 no existe.',
                'carrera_opcion2_id.exists'   => 'Carrera opción 2 no existe.',
            ]);

            if ($validator->fails()) {
                $this->resultados[] = [
                    'fila'   => $fila,
                    'estado' => 'error',
                    'ci'     => $data['ci'] ?? null,
                    'motivo' => implode(' | ', $validator->errors()->all()),
                ];
                continue;
            }

            $ci    = (int) $data['ci'];
            $email = strtolower($data['email']);

            if (User::where('CI', $ci)->exists()) {
                $this->resultados[] = [
                    'fila'   => $fila,
                    'estado' => 'omitido',
                    'ci'     => $ci,
                    'motivo' => 'CI ya registrado en el sistema.',
                ];
                continue;
            }

            if (User::where('email', $email)->exists()) {
                $this->resultados[] = [
                    'fila'   => $fila,
                    'estado' => 'omitido',
                    'ci'     => $ci,
                    'motivo' => 'Email ya registrado en el sistema.',
                ];
                continue;
            }

            try {
                DB::transaction(function () use ($ci, $email, $data) {
                    User::create([
                        'CI'                      => $ci,
                        'nombre_completo'         => $data['nombre_completo'],
                        'email'                   => $email,
                        'contraseña'              => (string) $ci,   // cast 'hashed' encripta
                        'estado'                  => 'ACTIVO',
                        'rol_id'                  => $this->rolPostulanteId,
                        'debe_cambiar_contrasena' => true,
                        'intentos_fallidos'       => 0,
                    ]);

                    Postulante::create([
                        'CI'                  => $ci,
                        'fecha_nacimiento'    => $data['fecha_nacimiento'],
                        'sexo'                => strtoupper($data['sexo']),
                        'direccion'           => $data['direccion'],
                        'telefono'            => $data['telefono'],
                        'ciudad'              => $data['ciudad'],
                        'colegio_procedencia' => $data['colegio_procedencia'],
                        'anio_egreso'         => (int) $data['anio_egreso'],
                        'titulo_bachiller'    => $data['titulo_bachiller'],
                        'carrera_opcion1_id'  => $data['carrera_opcion1_id'],
                        'carrera_opcion2_id'  => $data['carrera_opcion2_id'] ?: null,
                    ]);
                });

                $this->resultados[] = [
                    'fila'   => $fila,
                    'estado' => 'creado',
                    'ci'     => $ci,
                    'nombre' => $data['nombre_completo'],
                ];
            } catch (\Throwable) {
                $this->resultados[] = [
                    'fila'   => $fila,
                    'estado' => 'error',
                    'ci'     => $ci,
                    'motivo' => 'Error al insertar en la base de datos.',
                ];
            }
        }
    }
}
