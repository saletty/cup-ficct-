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
            'password_actual'             => ['required', 'string'],
            'password_nueva'              => [
                'required', 'string', 'confirmed', 'different:password_actual',
                \Illuminate\Validation\Rules\Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
            'password_nueva_confirmation' => ['required'],
        ];
    }

    public function messages(): array
    {
        return [
            'password_actual.required'   => 'Ingrese su contraseña actual.',
            'password_nueva.required'    => 'Ingrese la nueva contraseña.',
            'password_nueva.confirmed'   => 'La confirmación no coincide con la nueva contraseña.',
            'password_nueva.different'   => 'La nueva contraseña debe ser diferente a la actual.',
            'password_nueva.password'    => 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (ej: @$!%*?&-).',
        ];
    }
}
