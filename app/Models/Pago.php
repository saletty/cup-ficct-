<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pago extends Model
{
    protected $table      = 'pago';
    public    $timestamps = false;
    protected $fillable   = [
        'postulante_ci',
        'tipopago_id',
        'monto',
        'estado_pago',
        'fecha_pago',
        'cajero_ci',
        'observacion',
    ];

    protected $casts = [
        'fecha_pago' => 'datetime',
        'monto'      => 'float',
    ];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_ci', 'CI');
    }

    public function tipoPago()
    {
        return $this->belongsTo(TipoPago::class, 'tipopago_id');
    }

    public function cajero()
    {
        return $this->belongsTo(User::class, 'cajero_ci', 'CI');
    }
}
