<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación estricta: ningún campo de negocio puede quedar nulo
 * tras el Paso 2 del registro del postulante.
 */
class CompletarRegistroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Identidad
            'CI'                  => ['required', 'integer', 'exists:usuario,CI'],

            // Datos del usuario (cup.usuario)
            'nombre_completo'     => ['required', 'string', 'max:150'],
            'email'               => ['required', 'email', 'max:120', 'unique:usuario,email'],
            'email_confirmation'  => ['required', 'same:email'],

            // Datos del postulante (cup.postulante)
            'fecha_nacimiento'    => ['required', 'date', 'before:-14 years'],
            'sexo'                => ['required', 'in:M,F'],
            'direccion'           => ['required', 'string', 'max:255'],
            'telefono'            => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{6,20}$/'],
            'colegio_procedencia' => ['required', 'string', 'max:150'],
            'ciudad'              => ['required', 'string', 'max:100'],
            'anio_egreso'         => ['required', 'integer', 'min:1990', 'max:' . now()->year],
            'titulo_bachiller'    => ['required', 'string', 'max:100'],

            // Preferencias de carrera
            'carrera_opcion1_id'  => ['required', 'string', 'exists:carrera,id'],
            'carrera_opcion2_id'  => ['nullable', 'string', 'exists:carrera,id', 'different:carrera_opcion1_id'],
        ];
    }

    public function messages(): array
    {
        return [
            'CI.exists'                  => 'El CI no está habilitado en el sistema.',
            'nombre_completo.required'   => 'El nombre completo es obligatorio.',
            'email.required'             => 'El correo electrónico es obligatorio.',
            'email.unique'               => 'Este correo ya está registrado.',
            'email_confirmation.same'    => 'Los correos no coinciden.',
            'fecha_nacimiento.before'    => 'Debe ser mayor de 14 años para postular.',
            'sexo.in'                    => 'Seleccione M (Masculino) o F (Femenino).',
            'telefono.regex'             => 'Ingrese un número de teléfono válido.',
            'anio_egreso.min'            => 'El año de egreso no puede ser anterior a 1990.',
            'anio_egreso.max'            => 'El año de egreso no puede ser futuro.',
            'titulo_bachiller.required'  => 'El título de bachiller es obligatorio.',
            'carrera_opcion1_id.exists'  => 'Seleccione una carrera válida.',
            'carrera_opcion2_id.different' => 'La segunda opción debe ser diferente a la primera.',
        ];
    }
}
