<?php
/* Controlla nome utente e password e apre la sessione. */

session_start();
header('Content-Type: application/json');
require 'connect.php';

$dati = readRequest();
$username = isset($dati['username']) ? trim($dati['username']) : '';
$password = isset($dati['password']) ? $dati['password'] : '';

if ($username === '' || $password === '') {
    reply(array('ok' => false, 'message' => 'Compila sia il nome utente sia la password.'));
}

try {
    $cerca = $pdo->prepare('SELECT id, username, password_hash, is_admin FROM users WHERE username = ?');
    $cerca->execute(array($username));
    $utente = $cerca->fetch();

    /* Il messaggio e' lo stesso sia se l'utente non esiste sia se la password e' sbagliata. */
    if (!$utente || !password_verify($password, $utente['password_hash'])) {
        reply(array('ok' => false, 'message' => 'Nome utente o password non corretti.'));
    }

    /* Nuovo identificatore di sessione dopo l'accesso. */
    session_regenerate_id(true);

    $_SESSION['user_id'] = (int)$utente['id'];
    $_SESSION['username'] = $utente['username'];
    $_SESSION['is_admin'] = (int)$utente['is_admin'];

    reply(array(
        'ok' => true,
        'message' => 'Accesso effettuato.',
        'username' => $utente['username'],
        'isAdmin' => ((int)$utente['is_admin'] === 1)
    ));

} catch (PDOException $errore) {
    error_log($errore->getMessage());
    reply(array('ok' => false, 'message' => "Errore del database durante l'accesso."));
}

