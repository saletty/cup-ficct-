<?php

namespace App\Mail\Seguridad\Transport;

use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;

class BrevoTransport extends AbstractTransport
{
    public function __construct(private string $apiKey)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());

        $from = $email->getFrom()[0];

        $payload = [
            'sender' => [
                'email' => $from->getAddress(),
                'name'  => $from->getName() ?: $from->getAddress(),
            ],
            'to' => array_map(fn ($a) => [
                'email' => $a->getAddress(),
                'name'  => $a->getName() ?: $a->getAddress(),
            ], $email->getTo()),
            'subject'     => $email->getSubject() ?? '(sin asunto)',
            'htmlContent' => $email->getHtmlBody() ?? $email->getTextBody() ?? '',
        ];

        if ($email->getTextBody()) {
            $payload['textContent'] = $email->getTextBody();
        }

        $context = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => "Content-Type: application/json\r\nAccept: application/json\r\napi-key: {$this->apiKey}",
                'content'       => json_encode($payload),
                'ignore_errors' => true,
                'timeout'       => 15,
            ],
        ]);

        $body = @file_get_contents('https://api.brevo.com/v3/smtp/email', false, $context);

        if ($body === false) {
            throw new \RuntimeException('No se pudo conectar con la API de Brevo');
        }

        $data = json_decode($body, true) ?? [];
        if (isset($data['code'])) {
            throw new \RuntimeException('Brevo API error: ' . ($data['message'] ?? 'Error desconocido'));
        }
    }

    public function __toString(): string
    {
        return 'brevo';
    }
}
