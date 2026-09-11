<?php
/* Chiusura sessione dell'utente. */

session_start();
header('Content-Type: application/json');

$_SESSION = array();
session_destroy();

echo json_encode(array('ok' => true, 'message' => 'Logout effettuato.'));
