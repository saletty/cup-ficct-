<?php

namespace App\Mail\Seguridad;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RestablecerPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $nombre,
        public readonly string $token,
        public readonly int    $ci
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Restablecimiento de contraseña — Sistema CUP FICCT'
        );
    }

    public function content(): Content
    {
        $urlReset = config('app.frontend_url', 'http://localhost:5174')
            . "/restablecer?ci={$this->ci}&token={$this->token}";

        return new Content(
            markdown: 'emails.restablecer-password',
            with: [
                'nombre'   => $this->nombre,
                'urlReset' => $urlReset,
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
