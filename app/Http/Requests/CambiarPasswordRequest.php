<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CambiarPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password_actual'           => ['required', 'string'],
            'password_nueva'            => ['required', 'string', 'min:8', 'confirmed', 'different:password_actual'],
            'password_nueva_confirmation' => ['required'],
        ];
    }

    public function messages(): array
    {
        return [
            'password_actual.required'       => 'Ingrese su contraseña actual.',
            'password_nueva.required'        => 'Ingrese la nueva contraseña.',
            'password_nueva.min'             => 'La nueva contraseña debe tener al menos 8 caracteres.',
            'password_nueva.confirmed'       => 'La confirmación no coincide con la nueva contraseña.',
            'password_nueva.different'       => 'La nueva contraseña debe ser diferente a la actual.',
        ];
    }
}
