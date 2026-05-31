<?php

namespace App\Services;

use App\Models\Bitacora;

/**
 * Registra automáticamente las acciones de los usuarios
 * en la bitácora del sistema (CU6).
 */
class BitacoraService
{
    public static function log(string $accion, int|null $usuarioCi = null): void
    {
        try {
            Bitacora::create([
                'accion'      => $accion,
                'fecha'       => now(),
                'ip'          => request()->ip(),
                // auth()->id() retorna el valor del PK (CI) gracias a getKey()
                'usuario_ci'  => $usuarioCi ?? (auth()->check() ? auth()->user()->getKey() : null),
            ]);
        } catch (\Throwable) {
            // Silencioso: la bitácora nunca debe cortar una petición
        }
    }
}
