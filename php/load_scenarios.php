<?php
/* Restituisce l'utente collegato e l'elenco dei progetti che puo' visualizzare. Un ospite vede solo le mappe di esempio. */

session_start();
header('Content-Type: application/json');
require 'connect.php';

$idUtente = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
$amministratore = isset($_SESSION['is_admin']) && (int)$_SESSION['is_admin'] === 1;

try {
    /* Prima i progetti privati (is_template = 0) e poi le mappe di esempio. */
    if ($idUtente > 0) {
        $cerca = $pdo->prepare(
            'SELECT id, user_id, name, grid_data, is_template FROM scenarios
             WHERE user_id = ? OR is_template = 1
             ORDER BY is_template, id DESC'
        );
        $cerca->execute(array($idUtente));
    } else {
        $cerca = $pdo->prepare(
            'SELECT id, user_id, name, grid_data, is_template FROM scenarios
             WHERE is_template = 1
             ORDER BY id DESC'
        );
        $cerca->execute();
    }

    $progetti = array();
    foreach ($cerca->fetchAll() as $riga) {
        $proprietario = ((int)$riga['user_id'] === $idUtente);
        $esempio = ((int)$riga['is_template'] === 1);

        $progetti[] = array(
            'id' => (int)$riga['id'],
            'name' => $riga['name'],
            'cells' => json_decode($riga['grid_data'], true),
            'isTemplate' => $esempio,
            'canEdit' => ($proprietario || $amministratore)
        );
    }

    reply(array(
        'ok' => true,
        'username' => isset($_SESSION['username']) ? $_SESSION['username'] : '',
        'isAdmin' => $amministratore,
        'projects' => $progetti
    ));

} catch (PDOException $errore) {
    error_log($errore->getMessage());
    reply(array('ok' => false, 'message' => 'Errore del database durante il caricamento.'));
}