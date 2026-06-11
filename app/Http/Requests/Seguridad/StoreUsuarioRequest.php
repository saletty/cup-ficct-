<?php

namespace App\Http\Requests\Seguridad;

use Illuminate\Foundation\Http\FormRequest;

class StoreUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'CI'             => ['required', 'integer', 'unique:usuario,CI'],
            'nombre_completo' => ['required', 'string', 'max:150'],
            'email'          => ['required', 'email', 'max:120', 'unique:usuario,email'],
            'password'       => ['required', 'string', 'min:8'],
            'estado'         => ['nullable', 'in:ACTIVO,INACTIVO'],
            'rol_id'         => ['required', 'integer', 'exists:rol,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'CI.required'              => 'El CI es obligatorio.',
            'CI.integer'               => 'El CI debe ser un número entero.',
            'CI.unique'                => 'Ya existe un usuario con ese CI.',
            'nombre_completo.required' => 'El nombre completo es obligatorio.',
            'email.required'           => 'El correo electrónico es obligatorio.',
            'email.email'              => 'Ingrese un correo electrónico válido.',
            'email.unique'             => 'Ya existe un usuario con ese correo.',
            'password.required'        => 'La contraseña es obligatoria.',
            'password.min'             => 'La contraseña debe tener al menos 8 caracteres.',
            'estado.in'                => 'El estado debe ser ACTIVO o INACTIVO.',
            'rol_id.required'          => 'El rol es obligatorio.',
            'rol_id.exists'            => 'El rol seleccionado no existe.',
        ];
    }
}
