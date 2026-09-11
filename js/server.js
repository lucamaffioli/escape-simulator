/* La comunicazione con il server avviene solo in questo file. */

/**
 * Invia dati a una pagina PHP in formato JSON.
 * @param {string} page Nome della pagina php.
 * @param {Object} data Oggetto da inviare.
 * @returns {Promise<Object>} Risposta del server, oppure ok = false con il messaggio di errore.
 */
 async function sendToServer(page, data) {
    try {
        const answer = await fetch("php/" + page, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return await answer.json();
    } catch (errore) {
        /* Errore che ha interrotto la richiesta. */
        console.error("Errore chiamando " + page + ":", errore);
        return { ok: false, message: "Il server non risponde." };
    }
}

/**
 * Legge da una pagina PHP.
 * @param {string} page Nome della pagina php.
 * @returns {Promise<Object>} Risposta del server, oppure ok = false con il messaggio di errore.
 */
async function readFromServer(page) {
    try {
        /* no-store evita che il browser riusi una risposta passata presente in cache. */
        const answer = await fetch("php/" + page, { cache: "no-store" });
        return await answer.json();
    } catch (errore) {
        /* Errore che ha interrotto la richiesta. */
        console.error("Errore chiamando " + page + ":", errore);
        return { ok: false, message: "Il server non risponde." };
    }
}

/* Funzioni per tutti gli endpoint. */

/**
 * Login utente.
 * @param {string} username Nome utente.
 * @param {string} password Password in chiaro.
 * @returns {Promise<Object>} ok, message e, se l'accesso riesce, username e isAdmin.
 */
function serverLogin(username, password) {
    return sendToServer("login.php", { username: username, password: password });
}

/**
 * Registrazione di un nuovo utente.
 * @param {string} username Nome utente scelto.
 * @param {string} password Password in chiaro.
 * @returns {Promise<Object>} ok e message.
 */
function serverRegister(username, password) {
    return sendToServer("register.php", { username: username, password: password });
}

/**
 * Chiude la sessione sul server.
 * @returns {Promise<Object>} ok.
 */
function serverLogout() {
    return readFromServer("logout.php");
}

/**
 * Richiesta dei progetti visibili all'utente.
 * @returns {Promise<Object>} ok, chi è collegato (username, isAdmin) e projects. 
 * Un ospite riceve solo i progetti di esempio.
 */
function serverLoadProjects() {
    return readFromServer("load_scenarios.php");
}

/**
 * Salvataggio di un progetto.
 * @param {string} name Nome del progetto.
 * @param {Array} cells Griglia mappa.
 * @param {string} action "create" per un progetto nuovo, "update" per sovrascriverne uno esistente.
 * @param {number} id Id da sovrascrivere, viene ignorato con "create".
 * @returns {Promise<Object>} ok, message e l'id assegnato.
 */
function serverSaveProject(name, cells, action, id) {
    return sendToServer("save_scenario.php", {
        name: name,
        cells: cells,
        action: action,
        id: id
    });
}

/**
 * Eliminazione di un progetto.
 * @param {number} id Id del progetto da eliminare.
 * @returns {Promise<Object>} ok e message.
 */
function serverDeleteProject(id) {
    return sendToServer("delete_scenario.php", { id: id });
}