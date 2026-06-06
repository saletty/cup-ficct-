<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoPago extends Model
{
    protected $table      = 'tipo_pago';
    public    $timestamps = false;
    protected $fillable   = ['descripcion', 'monto', 'estado'];

    public function pagos()
    {
        return $this->hasMany(Pago::class, 'tipopago_id');
    }
}
