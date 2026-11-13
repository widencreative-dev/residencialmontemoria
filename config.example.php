<?php
/*
 * Copie este arquivo para config.php (mesma pasta) e preencha.
 * config.php NAO vai para o git (esta no .gitignore) e fica bloqueado pelo .htaccess.
 *
 * Servidor SMTP: o dominio ainda nao tinha DNS publicado quando este arquivo foi
 * criado, entao vale o padrao do cPanel (mail.<dominio>, 465, ssl). Se as caixas
 * de e-mail ficarem em outro provedor, conferir o MX do dominio e trocar
 * (ex.: Titan = smtp.titan.email, 465, ssl).
 */
return [
    'smtp_host'   => 'mail.residencialmontemoria.com.br',
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',                                   // 'ssl' (465), 'tls' (587) ou '' (sem criptografia, so teste local)
    'smtp_user'   => 'contato@residencialmontemoria.com.br',
    'smtp_pass'   => 'COLOQUE_A_SENHA_AQUI',

    'remetente'   => 'contato@residencialmontemoria.com.br',  // precisa ser a conta autenticada acima
    'nome_site'   => 'Residencial Monte Moriá',
    'destino'     => ['widencreative@gmail.com'],             // TESTE. Depois de validar, trocar para o e-mail do cliente. Varios: ['a@x.com', 'b@y.com']
];
