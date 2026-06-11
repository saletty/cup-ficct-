<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CupoCarrera extends Model
{
    protected $table      = 'cupo_carrera';
    public    $timestamps = false;
    public    $incrementing = false;

    protected $fillable = ['carrera_id', 'convocatoria_id', 'cupo_maximo', 'cupo_ocupado'];

    protected $casts = [
        'cupo_maximo'  => 'integer',
        'cupo_ocupado' => 'integer',
    ];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }

    public function convocatoria(): BelongsTo
    {
        return $this->belongsTo(Convocatoria::class, 'convocatoria_id');
    }

    public function tieneDisponibilidad(): bool
    {
        return $this->cupo_ocupado < $this->cupo_maximo;
    }

    public function disponible(): int
    {
        return max(0, $this->cupo_maximo - $this->cupo_ocupado);
    }
}
