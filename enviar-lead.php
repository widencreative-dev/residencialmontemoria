<?php
/*
 * Recebe o JSON do formulario (index.html) e envia os dados do lead por e-mail via SMTP.
 * Credenciais ficam em config.php (nao versionado). Modelo: config.example.php.
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/phpmailer/Exception.php';
require __DIR__ . '/phpmailer/PHPMailer.php';
require __DIR__ . '/phpmailer/SMTP.php';

// Buffer de saida: sem FastCGI (ex.: php -S), permite mandar Content-Length e fechar a conexao
ob_start();
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function responder(int $status, array $corpo): void
{
    http_response_code($status);
    echo json_encode($corpo);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    responder(405, ['ok' => false, 'erro' => 'metodo invalido']);
    exit;
}

$arquivo_config = __DIR__ . '/config.php';
if (!is_file($arquivo_config)) {
    error_log('enviar-lead: config.php ausente');
    responder(500, ['ok' => false, 'erro' => 'configuracao ausente']);
    exit;
}
$cfg = require $arquivo_config;

$dados = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($dados)) {
    responder(400, ['ok' => false, 'erro' => 'corpo invalido']);
    exit;
}

// Campo isca (escondido no formulario): robo que preenche recebe "ok" e nada e enviado
if (trim((string)($dados['_gotcha'] ?? '')) !== '') {
    responder(200, ['ok' => true]);
    exit;
}

// Texto simples, sem quebras de linha e com tamanho limitado
$texto = function ($chave, int $max = 200) use ($dados): string {
    $v = $dados[$chave] ?? '';
    if (!is_scalar($v)) return '';
    return mb_substr(trim(preg_replace('/\s+/u', ' ', strip_tags((string)$v))), 0, $max);
};

$nome       = $texto('nome', 120);
$whatsapp   = preg_replace('/\D/', '', $texto('whatsapp', 30));
$email      = $texto('email', 160);
$interesse  = $texto('interesse', 80);
$finalidade = $texto('finalidade', 80);
$visita     = $texto('visita', 80);
$origem     = $texto('origem', 120);
$consent    = ($dados['consentimentoLGPD'] ?? false) === true;

$email_ok = $email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) !== false;

if ($nome === '' || strlen($whatsapp) < 8 || strlen($whatsapp) > 13 || $interesse === '' || !$email_ok || !$consent) {
    responder(422, ['ok' => false, 'erro' => 'dados invalidos']);
    exit;
}

$tel_fmt = $whatsapp;
if (strlen($whatsapp) === 11) {
    $tel_fmt = sprintf('(%s) %s-%s', substr($whatsapp, 0, 2), substr($whatsapp, 2, 5), substr($whatsapp, 7));
} elseif (strlen($whatsapp) === 10) {
    $tel_fmt = sprintf('(%s) %s-%s', substr($whatsapp, 0, 2), substr($whatsapp, 2, 4), substr($whatsapp, 6));
}
$link_wa = 'https://wa.me/' . (strlen($whatsapp) <= 11 ? '55' : '') . $whatsapp;
$data    = date('d/m/Y H:i');

$campos = [
    'Nome'               => $nome,
    'WhatsApp'           => $tel_fmt,
    'E-mail'             => $email !== '' ? $email : '-',
    'Interesse'          => $interesse,
    'Finalidade'         => $finalidade !== '' ? $finalidade : '-',
    'Quando quer visitar' => $visita !== '' ? $visita : '-',
    'Origem'             => $origem !== '' ? $origem : '-',
    'Consentimento LGPD' => 'Sim',
    'Recebido em'        => $data,
];

$e = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$html = '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">';
$alt  = '';
foreach ($campos as $rotulo => $valor) {
    $html .= '<tr><td style="border:1px solid #ddd;background:#f6f6f6"><b>' . $e($rotulo) . '</b></td>'
           . '<td style="border:1px solid #ddd">' . $e($valor) . '</td></tr>';
    $alt  .= "$rotulo: $valor\n";
}
$html .= '</table><p style="font-family:Arial,sans-serif;font-size:14px"><a href="' . $e($link_wa) . '">Chamar no WhatsApp</a></p>';
$alt  .= "WhatsApp (link): $link_wa\n";

// Responde ao visitante antes de falar com o SMTP, para o formulario nao esperar
ignore_user_abort(true);
responder(200, ['ok' => true]);
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    header('Connection: close');
    header('Content-Length: ' . ob_get_length());
    while (ob_get_level() > 0) ob_end_flush();
    flush();
}

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $cfg['smtp_host'];
    $mail->Port       = (int)$cfg['smtp_port'];
    $mail->SMTPAuth   = !empty($cfg['smtp_user']);
    $mail->Username   = $cfg['smtp_user'] ?? '';
    $mail->Password   = $cfg['smtp_pass'] ?? '';
    $mail->SMTPSecure = $cfg['smtp_secure'] ?? '';
    $mail->SMTPAutoTLS = ($cfg['smtp_secure'] ?? '') !== '';
    $mail->Timeout    = 15;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom($cfg['remetente'], $cfg['nome_site']);
    foreach ((array)$cfg['destino'] as $para) {
        $mail->addAddress($para);
    }
    if ($email !== '') {
        $mail->addReplyTo($email, $nome);
    }
    $mail->isHTML(true);
    $mail->Subject = 'Novo contato pelo site - ' . $cfg['nome_site'];
    $mail->Body    = $html;
    $mail->AltBody = $alt;
    $mail->send();
} catch (Exception $ex) {
    // Nao perde o lead: grava em arquivo protegido pelo .htaccess e registra o erro
    error_log('enviar-lead: falha SMTP: ' . $ex->getMessage());
    @file_put_contents(__DIR__ . '/leads-falhos.log', $alt . "---\n", FILE_APPEND | LOCK_EX);
}
