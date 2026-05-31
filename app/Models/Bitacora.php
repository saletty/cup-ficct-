<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bitacora extends Model
{
    protected $table    = 'bitacora';
    public $timestamps  = false;

    protected $fillable = ['accion', 'fecha', 'ip', 'usuario_ci'];

    protected function casts(): array
    {
        return ['fecha' => 'datetime'];
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_ci', 'CI');
    }
}
