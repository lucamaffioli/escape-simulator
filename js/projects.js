/* Funzioni per gestione progetti e modulo nuovo progetto */

/**
 * Rappresenta il progetto aperto in questo momento nell'area di lavoro.
 */
 const project = {
    id: null,
    isTemplate: false,
    canEdit: true
};

/* Larghezza in pixel a cui viene disegnata l'anteprima. */
const PREVIEW_WIDTH = 420;

/**
 * Disegna la mappa in piccolo e restituisce l'immagine per la scheda.
 * Usa drawMapOn, la stessa funzione di disegno della mappa definita in render.js.
 * @param {Array} cells Mappa: 0 vuoto, 1 muro, 2 uscita, 3 persona.
 * @returns {string} Immagine PNG codificata, da mettere nel src di un img.
 */
function makePreview(cells) {
    /* Il lato della casella si ricava dalla larghezza voluta. */
    const size = Math.round(PREVIEW_WIDTH / cells[0].length);
    const preview = document.createElement("canvas");
    preview.width = cells[0].length * size;
    preview.height = cells.length * size;
    drawMapOn(preview.getContext("2d"), cells, size);
    return preview.toDataURL("image/png");
}

/**
 * Costruisce la scheda di un progetto.
 * @param {Object} data Progetto.
 * @returns {HTMLElement} Elemento HTML che rappresenta il progetto.
 */
function makeCard(data) {
    const card = document.createElement("div");
    card.className = "scheda";

    const title = document.createElement("p");
    title.className = "titolo-scheda";
    title.textContent = data.name;
    card.appendChild(title);

    const image = document.createElement("img");
    image.className = "anteprima";
    image.src = makePreview(data.cells);
    image.alt = "Anteprima della mappa " + data.name;
    card.appendChild(image);

    const buttons = document.createElement("p");
    buttons.className = "azioni-scheda";

    const buttonOpen = document.createElement("button");
    buttonOpen.type = "button";
    buttonOpen.className = "bottone bottone-blu";
    buttonOpen.textContent = "Apri";
    buttonOpen.onclick = function () { openProject(data); };
    buttons.appendChild(buttonOpen);

    if (data.canEdit) {
        const buttonDelete = document.createElement("button");
        buttonDelete.type = "button";
        buttonDelete.className = "bottone bottone-rosso";
        buttonDelete.textContent = "Elimina";
        buttonDelete.onclick = function () { deleteProject(data); };
        buttons.appendChild(buttonDelete);

        const buttonCopy = document.createElement("button");
        buttonCopy.type = "button";
        buttonCopy.className = "bottone bottone-icona";
        buttonCopy.textContent = "\u29C9";
        buttonCopy.title = "Crea un duplicato di " + data.name;
        buttonCopy.setAttribute("aria-label", "Duplica " + data.name);
        buttonCopy.onclick = function () { duplicateProject(data); };
        buttons.appendChild(buttonCopy);
    }
    card.appendChild(buttons);
    return card;
}

/**
 * Chiede l'elenco al server e riempie le due griglie di schede.
 */
async function loadProjectList() {
    const answer = await serverLoadProjects();
    if (!answer.ok) {
        await showMessage(answer.message);
        return;
    }

    /* Aggiornamento utente collegato in base alla risposta del server. */
    account.username = answer.username;
    account.isAdmin = answer.isAdmin;
    showAccount();

    const projects = document.getElementById("griglia-progetti");
    const examples = document.getElementById("griglia-esempi");
    const buttonNew = document.getElementById("scheda-nuovo");

    const listTitle = document.getElementById("titolo-progetti");
    listTitle.textContent = "I miei progetti";
    if (account.username === "" || account.isAdmin) {
        listTitle.classList.add("nascosto");
    } else {
        listTitle.classList.remove("nascosto");
    }


    projects.innerHTML = "";
    examples.innerHTML = "";
    projects.appendChild(buttonNew);

    for (const data of answer.projects) {
        /* Un progetto senza mappa viene saltato per evitare errori. */
        if (!Array.isArray(data.cells) || data.cells.length === 0 ||
            !Array.isArray(data.cells[0]) || data.cells[0].length === 0) {
            continue;
        }
        if (data.isTemplate) {
            examples.appendChild(makeCard(data));
        } else {
            projects.appendChild(makeCard(data));
        }
    }

    /* I permessi sul progetto aperto vanno riletti a ogni cambio di utente. */
    if (project.id !== null) {
        const open = answer.projects.find(data => data.id === project.id);
        project.canEdit = open ? open.canEdit : false;
        if (open) {
            project.isTemplate = open.isTemplate;
        }
        showSaveButton();
    }
}

/**
 * Cambia la scritta del bottone di salvataggio in base alla situazione.
 * Il bottone è sempre lo stesso, cambia soltanto il testo.
 */
function showSaveButton() {
    const buttonSave = document.getElementById("bottone-salva");
    if (project.id === null) {
        buttonSave.textContent = "Salva";
    } else if (project.canEdit) {
        buttonSave.textContent = "Salva le modifiche";
    } else {
        buttonSave.textContent = "Salva una copia mia";
    }
}

/**
 * Apre un progetto salvato nella schermata editor.
 * @param {Object} data Progetto da aprire.
 */
function openProject(data) {
    project.id = data.id;
    project.isTemplate = data.isTemplate;
    project.canEdit = data.canEdit;

    document.getElementById("campo-nome-progetto").value = data.name;

    /* La schermata va mostrata prima di caricare la griglia. */
    showScreen("schermata-editor");
    showSaveButton();
    resetSimulation();
    loadGrid(data.cells);
}

/**
 * Prepara l'area di lavoro per una mappa nuova, già dimensionata.
 * @param {number} widthMeters Larghezza dell'ambiente in metri.
 * @param {number} depthMeters Profondità dell'ambiente in metri.
 */
function openNewProject(widthMeters, depthMeters) {
    project.id = null;
    project.isTemplate = false;
    project.canEdit = true;

    /* La schermata va mostrata prima di caricare la griglia. */
    showScreen("schermata-editor");
    showSaveButton();
    resetSimulation();
    newGrid(widthMeters, depthMeters);
}

/**
 * Manda il progetto al server per salvarlo o aggiornarlo. Apre un dialog con messaggio di conferma o di errore.
 * @param {string} action Vale "create" oppure "update".
 */
async function saveProject(action) {
    if (account.username === "") {
        await showMessage("Per salvare un progetto è necessario accedere.");
        /* Necessario per tornare all'area di lavoro dopo l'accesso. */
        account.returnToEditor = true;
        showScreen("schermata-accesso");
        return;
    }

    const name = document.getElementById("campo-nome-progetto").value.trim();
    if (name === "") {
        await showMessage("Dai un nome al progetto prima di salvarlo.");
        return;
    }

    const answer = await serverSaveProject(name, grid.cells, action, project.id);
    await showMessage(answer.message);
    if (!answer.ok) {
        return;
    }

    project.id = answer.id;
    project.canEdit = true;
    project.isTemplate = answer.isTemplate;
    grid.changed = false;
    showSaveButton();
}

/**
 * Salva una copia del progetto con la stessa griglia e il nome seguito da " - copia".
 * @param {Object} data Progetto da duplicare.
 */
async function duplicateProject(data) {
    const name = data.name.substring(0, 92) + " - copia";
    const answer = await serverSaveProject(name, data.cells, "create", null);
    if (!answer.ok) {
        await showMessage(answer.message);
        return;
    }
    await loadProjectList();
}

/**
 * Rimuove il progetto. Mostra dialog con messaggio in caso di errore.
 * @param {Object} data Progetto da eliminare.
 */
async function deleteProject(data) {
    const confirmed = await askConfirm("Vuoi eliminare il progetto \"" + data.name + "\"?");
    if (!confirmed) {
        return;
    }
    const answer = await serverDeleteProject(data.id);
    if (!answer.ok) {
        await showMessage(answer.message);
        return;
    }
    if (project.id === data.id) {
        project.id = null;
        showSaveButton();
    }
    await loadProjectList();
}

document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("scheda-nuovo").onclick = function () {
        document.getElementById("campo-nome-progetto").value = "Simulazione senza nome";
        showScreen("schermata-dimensioni");
    };

    document.getElementById("bottone-annulla-dimensioni").onclick = function () {
        showScreen("schermata-elenco");
    };

    document.getElementById("modulo-dimensioni").onsubmit = async function (e) {
        e.preventDefault();
        const width = Number(document.getElementById("campo-larghezza").value);
        const depth = Number(document.getElementById("campo-profondita").value);

        /* Controllo input dell'utente. */
        if (!Number.isInteger(width) || !Number.isInteger(depth) ||
            width < 4 || width > 40 || depth < 4 || depth > 40) {
            await showMessage("Larghezza e profondità devono essere numeri interi da 4 a 40 metri.");
            return;
        }
        openNewProject(width, depth);
    };

    document.getElementById("bottone-salva").onclick = function () {
        saveProject(project.id !== null && project.canEdit ? "update" : "create");
    };

    document.getElementById("bottone-chiudi-editor").onclick = async function () {
        if (grid.changed) {
            const wasRunning = sim.running;
            pauseSimulation();
            const leave = await askConfirm("Il progetto non è salvato. Vuoi uscire lo stesso?");
            if (!leave) {
                if (wasRunning) {
                    startSimulation();
                }
                return;
            }
        }
        resetSimulation();
        await loadProjectList();
        showScreen("schermata-elenco");
    };
});