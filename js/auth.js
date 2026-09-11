/* Gestione utente, accesso e registrazione */

/**
 * Utente collegato con le relative informazioni.
 * username = "" se ospite.
 * returnToEditor è vero quando si è arrivati al login/registrazione dall'editor in modo da poterci tornare.
 */
 const account = {
    username: "",
    isAdmin: false,
    returnToEditor: false
};

/**
 * Mostra nell'header nome e stato dell'utente collegato se presente.
 */
function showAccount() {
    const label = document.getElementById("etichetta-utente");
    const buttonLogin = document.getElementById("bottone-accedi");
    const buttonLogout = document.getElementById("bottone-esci");

    if (account.username === "") {
        label.textContent = "Ospite";
        buttonLogin.classList.remove("nascosto");
        buttonLogout.classList.add("nascosto");
    } else {
        label.textContent = account.username;
        buttonLogin.classList.add("nascosto");
        buttonLogout.classList.remove("nascosto");
    }
}

/**
 * Login utente. Mostra messaggio nel dialog in caso di errore dal server.
 * @param {Event} e Invio del modulo, viene bloccato per non ricaricare la pagina.
 */
async function doLogin(e) {
    e.preventDefault();
    const username = document.getElementById("accesso-nome").value.trim();
    const password = document.getElementById("accesso-password").value;

    if (username === "" || password === "") {
        await showMessage("Compila sia il nome utente sia la password.");
        return;
    }

    const answer = await serverLogin(username, password);
    if (!answer.ok) {
        await showMessage(answer.message);
        return;
    }

    /* Aggiorna utente collegato e label nell'header. */
    account.username = answer.username;
    account.isAdmin = answer.isAdmin;
    showAccount();

    document.getElementById("modulo-accesso").reset();

    if (account.returnToEditor) {
        account.returnToEditor = false;
        showScreen("schermata-editor");
    } else {
        showScreen("schermata-elenco");
    }

    await loadProjectList();
}

/**
 * Registrazione nuovo utente. Mostra messaggio nel dialog in caso di errore dal server o durante la compilazione dei campi.
 * @param {Event} e Invio del modulo, viene bloccato per non ricaricare la pagina.
 */
async function doRegister(e) {
    e.preventDefault();
    const username = document.getElementById("registrazione-nome").value.trim();
    const password = document.getElementById("registrazione-password").value;
    const repeatPass = document.getElementById("registrazione-conferma").value;

    if (username.length < 3) {
        await showMessage("Il nome utente deve avere almeno 3 caratteri.");
        return;
    }
    if (username.length > 50) {
        await showMessage("Il nome utente non può superare i 50 caratteri.");
        return;
    }
    if (password.length < 4) {
        await showMessage("La password deve avere almeno 4 caratteri.");
        return;
    }
    if (password !== repeatPass) {
        await showMessage("Le due password non coincidono.");
        return;
    }

    const answer = await serverRegister(username, password);
    await showMessage(answer.message);
    if (answer.ok) {
        document.getElementById("modulo-registrazione").reset();
        showScreen("schermata-accesso");
    }
}

/**
 * Logout utente.
 */
async function doLogout() {
    pauseSimulation();
    await serverLogout();
    account.username = "";
    account.isAdmin = false;
    account.returnToEditor = false;
    showAccount();
    showScreen("schermata-elenco");
    await loadProjectList();
}

document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("link-vai-a-registrazione").onclick = function (e) {
        e.preventDefault();
        showScreen("schermata-registrazione");
    };

    document.getElementById("link-vai-a-accesso").onclick = function (e) {
        e.preventDefault();
        showScreen("schermata-accesso");
    };

    document.getElementById("bottone-accedi").onclick = function () {
        /* Se la schermata editor non è nascosta viene attivato il flag. */
        account.returnToEditor = !document.getElementById("schermata-editor").classList.contains("nascosto");
        /* Si lascia l'editor la simulazione non deve continuare dietro le altre schermate. */
        pauseSimulation();
        showScreen("schermata-accesso");
    };

    document.getElementById("bottone-esci").onclick = doLogout;
    document.getElementById("modulo-accesso").onsubmit = doLogin;
    document.getElementById("modulo-registrazione").onsubmit = doRegister;

    showAccount();
});