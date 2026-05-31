<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table      = 'usuario';
    protected $primaryKey = 'CI';
    public    $incrementing = false;
    protected $keyType    = 'integer';
    public    $timestamps = false;

    protected $fillable = [
        'CI',
        'nombre_completo',
        'email',
        'contraseña',
        'estado',
        'rol_id',
        // Seguridad
        'intentos_fallidos',
        'bloqueado_hasta',
        'debe_cambiar_contrasena',
    ];

    protected $hidden = ['contraseña'];

    protected function casts(): array
    {
        return [
            'CI'                      => 'integer',
            'rol_id'                  => 'integer',
            'contraseña'              => 'hashed',
            'intentos_fallidos'       => 'integer',
            'bloqueado_hasta'         => 'datetime',
            'debe_cambiar_contrasena' => 'boolean',
        ];
    }

    public function getAuthPassword(): string
    {
        return $this->getAttribute('contraseña') ?? '';
    }

    public function getAuthPasswordName(): string
    {
        return 'contraseña';
    }

    public function rol()
    {
        return $this->belongsTo(Rol::class, 'rol_id');
    }

    public function postulante()
    {
        return $this->hasOne(Postulante::class, 'CI', 'CI');
    }
}
