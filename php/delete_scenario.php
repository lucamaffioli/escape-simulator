<?php
/* Eliminazione di un progetto. Un utente puo' cancellare solo i propri progetti, l'amministratore puo' cancellarne uno qualsiasi. */

session_start();
header('Content-Type: application/json');
require 'connect.php';

if (!isset($_SESSION['user_id'])) {
    reply(array('ok' => false, 'message' => 'Necessario accedere per eliminare un progetto.'));
}

$idUtente = (int)$_SESSION['user_id'];
$amministratore = isset($_SESSION['is_admin']) && (int)$_SESSION['is_admin'] === 1;

$dati = readRequest();
$idProgetto = isset($dati['id']) ? (int)$dati['id'] : 0;

if ($idProgetto <= 0) {
    reply(array('ok' => false, 'message' => 'ID del progetto non valido.'));
}

try {
    if ($amministratore) {
        $cancella = $pdo->prepare('DELETE FROM scenarios WHERE id = ?');
        $cancella->execute(array($idProgetto));
    } else {
        $cancella = $pdo->prepare('DELETE FROM scenarios WHERE id = ? AND user_id = ?');
        $cancella->execute(array($idProgetto, $idUtente));
    }

    /* Nessuna riga modificata. Il progetto non esiste o non appartiene all'utente. */
    if ($cancella->rowCount() === 0) {
        reply(array('ok' => false, 'message' => 'Progetto non trovato.'));
    }

    reply(array('ok' => true, 'message' => 'Progetto eliminato.'));

} catch (PDOException $errore) {
    error_log($errore->getMessage());
    reply(array('ok' => false, 'message' => "Errore del database durante l'eliminazione."));
}