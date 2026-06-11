<?php

namespace App\Imports\Seguridad;

use App\Models\Docente;
use App\Models\Materia;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

// CU3 — Carga masiva de docentes desde Excel/CSV
// Contraseña por defecto: CI del usuario (se fuerza cambio en primer login)
class DocentesImport implements ToCollection, WithHeadingRow
{
    public array $resultados = [];

    private ?int  $rolDocenteId  = null;
    private array $materiasCache = [];

    public function __construct()
    {
        $this->rolDocenteId = Rol::where('nombre', 'Docente')->value('id');
    }

    public function collection(Collection $rows): void
    {
        if (! $this->rolDocenteId) {
            $this->resultados[] = [
                'fila'   => '-',
                'estado' => 'error',
                'ci'     => null,
                'motivo' => 'El rol "Docente" no existe en el sistema.',
            ];
            return;
        }

        foreach ($rows as $index => $row) {
            $fila = $index + 2;
            $data = array_map(fn($v) => is_string($v) ? trim($v) : $v, $row->toArray());

            $validator = Validator::make($data, [
                'ci'                           => ['required', 'integer'],
                'nombre_completo'              => ['required', 'string', 'max:150'],
                'email'                        => ['required', 'email', 'max:120'],
                'profesion'                    => ['required', 'string', 'max:100'],
                'maestria'                     => ['required', 'string', 'max:150'],
                'diplomado_educacion_superior' => ['required', 'string', 'max:150'],
                'materia'                      => ['nullable', 'string'],
            ], [
                'ci.required'                           => 'El CI es obligatorio.',
                'ci.integer'                            => 'El CI debe ser un número.',
                'nombre_completo.required'              => 'El nombre completo es obligatorio.',
                'email.required'                        => 'El correo es obligatorio.',
                'email.email'                           => 'Formato de correo inválido.',
                'profesion.required'                    => 'La profesión es obligatoria.',
                'maestria.required'                     => 'La maestría es obligatoria.',
                'diplomado_educacion_superior.required' => 'El diplomado es obligatorio.',
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

            // Resolver materia por nombre (columna 'materia', opcional)
            $materiaId     = null;
            $materiaNombre = $data['materia'] ?? null;
            if (! empty($materiaNombre)) {
                $materiaId = $this->resolverMateria($materiaNombre);
                if ($materiaId === false) {
                    $this->resultados[] = [
                        'fila'   => $fila,
                        'estado' => 'error',
                        'ci'     => $ci,
                        'motivo' => "Materia '{$materiaNombre}' no existe en el sistema.",
                    ];
                    continue;
                }
            }

            try {
                DB::transaction(function () use ($ci, $email, $data, $materiaId) {
                    User::create([
                        'CI'                      => $ci,
                        'nombre_completo'         => $data['nombre_completo'],
                        'email'                   => $email,
                        'contraseña'              => (string) $ci,   // cast 'hashed' encripta
                        'estado'                  => 'ACTIVO',
                        'rol_id'                  => $this->rolDocenteId,
                        'debe_cambiar_contrasena' => true,
                        'intentos_fallidos'       => 0,
                    ]);

                    Docente::create([
                        'CI'                           => $ci,
                        'materia_id'                   => $materiaId,
                        'profesion'                    => $data['profesion'],
                        'maestria'                     => $data['maestria'],
                        'diplomado_educacion_superior' => $data['diplomado_educacion_superior'],
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

    // Retorna el id si existe, false si no existe
    private function resolverMateria(string $nombre): int|false
    {
        $key = strtolower(trim($nombre));

        if (! array_key_exists($key, $this->materiasCache)) {
            $materia                   = Materia::whereRaw('LOWER(nombre) = ?', [$key])->first();
            $this->materiasCache[$key] = $materia ? $materia->id : false;
        }

        return $this->materiasCache[$key];
    }
}
