<?php
/* Salva un progetto nuovo oppure sovrascrive uno esistente. I progetti salvati dall'amministratore diventano mappe di esempio. */

session_start();
header('Content-Type: application/json');
require 'connect.php';

if (!isset($_SESSION['user_id'])) {
    reply(array('ok' => false, 'message' => "Effettuare l'accesso per salvare un progetto."));
}

$idUtente = (int)$_SESSION['user_id'];
$amministratore = isset($_SESSION['is_admin']) && (int)$_SESSION['is_admin'] === 1;

$dati = readRequest();
$nome = isset($dati['name']) ? trim($dati['name']) : '';
$celle = isset($dati['cells']) ? $dati['cells'] : null;
$azione = isset($dati['action']) ? $dati['action'] : 'create';
$idProgetto = isset($dati['id']) ? (int)$dati['id'] : 0;

if ($nome === '' || mb_strlen($nome) > 100) {
    reply(array('ok' => false, 'message' => 'Il nome deve avere da 1 a 100 caratteri.'));
}

/* La mappa deve essere una matrice rettangolare di numeri da 0 a 3. Una stanza va da 4 a 40 metri: da 12 a 102 caselle bordo compreso. */
$valida = is_array($celle) && count($celle) >= 12 && 
    count($celle) <= 102 && isset($celle[0]) && 
    is_array($celle[0]) && count($celle[0]) >= 12 && count($celle[0]) <= 102;

if ($valida) {
    $larghezza = count($celle[0]);
    foreach ($celle as $riga) {
        if (!is_array($riga) || count($riga) !== $larghezza) {
            $valida = false;
            break;
        }
        foreach ($riga as $valore) {
            if (!is_int($valore) || $valore < 0 || $valore > 3) {
                $valida = false;
                break 2;
            }
        }
    }
}
if (!$valida) {
    reply(array('ok' => false, 'message' => 'La mappa da salvare non è in un formato valido.'));
}

$mappa = json_encode($celle);

try {
    if ($azione === 'update' && $idProgetto > 0) {
        $cerca = $pdo->prepare('SELECT user_id, is_template FROM scenarios WHERE id = ?');
        $cerca->execute(array($idProgetto));
        $esistente = $cerca->fetch();

        if (!$esistente) {
            reply(array('ok' => false, 'message' => 'Progetto non trovato.'));
        }

        $proprietario = ((int)$esistente['user_id'] === $idUtente);
        $esempio = ((int)$esistente['is_template'] === 1);

        /* Si puo' sovrascrivere solo un progetto proprio, l'amministratore non ha limitazioni. */
        if (!$proprietario && !$amministratore) {
            reply(array('ok' => false, 'message' => 'Non puoi modificare questo progetto.'));
        }

        $aggiorna = $pdo->prepare('UPDATE scenarios SET name = ?, grid_data = ? WHERE id = ?');
        $aggiorna->execute(array($nome, $mappa, $idProgetto));

        reply(array(
            'ok' => true,
            'message' => 'Modifiche salvate.',
            'id' => $idProgetto,
            'isTemplate' => $esempio
        ));
    }

    /* Progetto nuovo, oppure copia di una mappa. */
    $esempio = $amministratore ? 1 : 0;
    $inserisci = $pdo->prepare(
        'INSERT INTO scenarios (user_id, name, grid_data, is_template) VALUES (?, ?, ?, ?)'
    );
    $inserisci->execute(array($idUtente, $nome, $mappa, $esempio));

    reply(array(
        'ok' => true,
        'message' => 'Progetto salvato.',
        'id' => (int)$pdo->lastInsertId(),
        'isTemplate' => ($esempio === 1)
    ));

} catch (PDOException $errore) {
    error_log($errore->getMessage());
    reply(array('ok' => false, 'message' => 'Errore del database durante il salvataggio.'));
}