<?php

namespace App\Console\Commands;

use App\Models\Convocatoria;
use App\Services\BitacoraService;
use Illuminate\Console\Command;

class ExpirarConvocatorias extends Command
{
    protected $signature   = 'convocatorias:expirar';
    protected $description = 'Finaliza automáticamente las convocatorias cuya fecha_fin ya pasó';

    public function handle(): int
    {
        $actualizadas = Convocatoria::where('estado', 'habilitada')
            ->where('fecha_fin', '<', now()->toDateString())
            ->get();

        if ($actualizadas->isEmpty()) {
            $this->info('No hay convocatorias vencidas pendientes de finalizar.');
            return 0;
        }

        foreach ($actualizadas as $conv) {
            $conv->update(['estado' => 'finalizada']);
            BitacoraService::log("Convocatoria {$conv->id} finalizada automáticamente por vencimiento de fecha.");
            $this->line("  ✓ {$conv->id} — {$conv->nombre} → finalizada");
        }

        $this->info("Se finalizaron {$actualizadas->count()} convocatoria(s).");
        return 0;
    }
}
