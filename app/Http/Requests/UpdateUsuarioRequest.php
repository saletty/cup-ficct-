<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $ci = $this->route('usuario');

        return [
            'nombre_completo' => ['sometimes', 'string', 'max:150'],
            'email'           => ['sometimes', 'email', 'max:120', "unique:usuario,email,{$ci},CI"],
            'password'        => ['sometimes', 'string', 'min:8'],
            'estado'          => ['sometimes', 'in:activo,inactivo'],
            'rol_id'          => ['sometimes', 'integer', 'exists:rol,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'   => 'Ya existe otro usuario con ese correo.',
            'password.min'   => 'La contraseña debe tener al menos 8 caracteres.',
            'estado.in'      => 'El estado debe ser activo o inactivo.',
            'rol_id.exists'  => 'El rol seleccionado no existe.',
        ];
    }
}
