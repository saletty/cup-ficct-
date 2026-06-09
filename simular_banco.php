<?php
// =============================================================
// simular_banco.php — Simulador de webhook Libélula (sandbox)
// =============================================================
// Uso: php simular_banco.php <pago_id> [url_base]
//
// Ejemplos:
//   php simular_banco.php 5
//   php simular_banco.php 5 http://localhost:8000
//
// Este script actúa como si fuera el servidor de Libélula
// notificando que el pago QR de 700 Bs fue exitoso.
// =============================================================

$pagoId  = $argv[1] ?? null;
$baseUrl = rtrim($argv[2] ?? 'http://localhost:8000', '/');

if (!$pagoId || !is_numeric($pagoId)) {
    echo "\n  USO: php simular_banco.php <pago_id> [url_base]\n";
    echo "  EJ:  php simular_banco.php 5\n\n";
    exit(1);
}

$webhookUrl    = $baseUrl . '/api/v1/pagos/webhook';
$tokenSecreto  = 'libelula_sandbox_2026';

$payload = json_encode([
    'pago_id'    => (int) $pagoId,
    'estado'     => 'COMPLETED',
    'monto'      => 700.00,
    'moneda'     => 'BOB',
    'referencia' => 'LIB-SIM-' . time(),
    'timestamp'  => date('c'),
]);

echo "\n  [Libélula Sandbox] Enviando notificación de pago...\n";
echo "  URL:     $webhookUrl\n";
echo "  Pago ID: $pagoId\n";
echo "  Monto:   700.00 BOB\n";
echo "  Estado:  COMPLETED\n\n";

$ch = curl_init($webhookUrl);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Libelula-Token: ' . $tokenSecreto,
    ],
]);

$response   = curl_exec($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo "  [ERROR cURL] $curlError\n\n";
    exit(1);
}

$decoded = json_decode($response, true);
$mensaje = $decoded['mensaje'] ?? $decoded['error'] ?? $response;

echo "  HTTP $httpStatus — $mensaje\n\n";

if ($httpStatus === 200) {
    echo "  ✓ Pago #$pagoId confirmado. El frontend debería detectarlo en ~3 segundos.\n\n";
} else {
    echo "  ✗ El servidor respondió con error. Verifica que el servidor esté corriendo.\n\n";
}
