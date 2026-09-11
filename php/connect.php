<?php
/* Collegamento al database e funzioni di servizio comuni. La includono tutte le pagine che leggono o scrivono sul database. */

$dbHost = '127.0.0.1';
$dbName = 'escape_simulator';
$dbUser = 'root';
$dbPassword = '';

try {
    $pdo = new PDO(
        "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPassword,
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            /* Le righe arrivano come array senza indici numerici (es. $riga['name']). */
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        )
    );
} catch (PDOException $errore) {
    error_log($errore->getMessage());
    echo json_encode(array('ok' => false, 'message' => 'Database non raggiungibile.'));
    exit;
}

/**
 * Legge i dati inviati dal browser in formato JSON.
 * @return array I dati ricevuti, oppure un array vuoto se la richiesta non conteneva JSON valido.
 */
function readRequest() {
    $testo = file_get_contents('php://input');
    $dati = json_decode($testo, true);
    return is_array($dati) ? $dati : array();
}

/**
 * Invia la risposta al browser e termina.
 * @param array $dati Oggetto da convertire in JSON e inviare.
 */
function reply($dati) {
    echo json_encode($dati);
    exit;
}