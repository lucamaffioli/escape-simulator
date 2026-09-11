/* Gestione della navigazione tra le schermate e gestione dialog personalizzato. */

/* ID dei div che rappresentano schermate diverse. Schema Single-Page. */
const SCREENS = [
    "schermata-elenco",
    "schermata-dimensioni",
    "schermata-accesso",
    "schermata-registrazione",
    "schermata-editor"
];

/**
 * Visualizza una schermata nascondendo tutte le altre.
 * @param {string} name ID della schermata da visualizzare.
 */
function showScreen(name) {
    for (const id of SCREENS) {
        document.getElementById(id).classList.add("nascosto");
    }
    document.getElementById(name).classList.remove("nascosto");
}

/**
 * Mostra un messaggio nel dialog e aspetta che l'utente prema un bottone.
 * @param {string} text Testo del dialog.
 * @param {boolean} withCancel Se true aggiunge il bottone per annullare.
 * @returns {Promise<boolean>} Si risolve alla scelta dell'utente: true con OK, false con Annulla.
 */
function showMessage(text, withCancel) {
    return new Promise(function (resolve) {
        const modalWindow = document.getElementById("finestra-messaggio");
        const buttonOk = document.getElementById("bottone-messaggio-ok");
        const buttonCancel = document.getElementById("bottone-messaggio-annulla");

        document.getElementById("testo-messaggio").textContent = text;
        modalWindow.classList.remove("nascosto");
        
        if (withCancel === true) {
            buttonCancel.classList.remove("nascosto");
        } else {
            buttonCancel.classList.add("nascosto");
        }

        function close(answer) {
            modalWindow.classList.add("nascosto");
            buttonOk.onclick = null;
            buttonCancel.onclick = null;
            resolve(answer);
        }

        buttonOk.onclick = function () { close(true); };
        buttonCancel.onclick = function () { close(false); };
    });
}

/**
 * Funzione per dialog con pulsante annulla.
 * @param {string} text Testo del dialog.
 * @returns {Promise<boolean>} Si risolve alla scelta dell'utente: true con OK, false con Annulla.
 */
function askConfirm(text) {
    return showMessage(text, true);
}


document.addEventListener("DOMContentLoaded", function () {

    /* I due bottoni per annullare delle schermate di accesso e registrazione. */
    for (const button of document.querySelectorAll(".bottone-annulla")) {
        button.onclick = function () {
            const goBack = account.returnToEditor;
            account.returnToEditor = false;
            showScreen(goBack ? "schermata-editor" : "schermata-elenco");
        };
    }

    /* Caricamento iniziale dei progetti all'apertura del sito */
    loadProjectList();
});