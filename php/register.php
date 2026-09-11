<?php
/* Crea un nuovo utente. */

header('Content-Type: application/json');
require 'connect.php';

$dati = readRequest();
$username = isset($dati['username']) ? trim($dati['username']) : '';
$password = isset($dati['password']) ? $dati['password'] : '';

if (mb_strlen($username) < 3) {
    reply(array('ok' => false, 'message' => 'Il nome utente deve avere almeno 3 caratteri.'));
}
if (mb_strlen($username) > 50) {
    reply(array('ok' => false, 'message' => 'Il nome utente è troppo lungo.'));
}
if (mb_strlen($password) < 4) {
    reply(array('ok' => false, 'message' => 'La password deve avere almeno 4 caratteri.'));
}

try {
    $cerca = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $cerca->execute(array($username));

    if ($cerca->fetch()) {
        reply(array('ok' => false, 'message' => 'Nome utente già in uso.'));
    }

    /* password_hash aggiunge da sola un sale casuale e lo include nel risultato. */
    $cifrata = password_hash($password, PASSWORD_DEFAULT);

    $inserisci = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    $inserisci->execute(array($username, $cifrata));

    reply(array('ok' => true, 'message' => 'Account creato. È possibile accedere.'));

} catch (PDOException $errore) {
    error_log($errore->getMessage());
    reply(array('ok' => false, 'message' => 'Errore del database durante la registrazione.'));
}