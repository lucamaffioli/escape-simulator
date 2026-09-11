/** 
 * Il modello di evacuazione.
 * La stanza è una griglia di caselle da 40 cm, ognuna delle quali può ospitare una persona sola. 
 * A ogni passo tutte le persone si muovono insieme di una casella, scegliendo fra le otto vicine quella che le avvicina di più all'uscita.
 * La distanza dall'uscita non viene cercata da ogni persona ma calcolata una volta sola per tutta la mappa.
 * Quando più persone vogliono la stessa casella entra in gioco l'attrito, che decide se ne passa una o se si bloccano a vicenda.
 * 
*/

/* Un passo dura 0,3 secondi, quindi il tempo per attraversare 40 cm camminando corrisponde a 1.33 m/s. */
const WALK_SPEED = 1.33;

/* Attrito: quando due persone vogliono la stessa casella, con questa probabilità si ostacolano a vicenda e non si muove nessuna delle due. */
const FRICTION = 0.70;

/**
 * Le otto direzioni delle caselle adiacenti con il costo che ne rappresenta la distanza.
 * Una diagonale è lunga 1,414 caselle, una ortogonale una.
 */
const DIRECTIONS = [
    { row: -1, col: 0, cost: 1.0 },
    { row: 1, col: 0, cost: 1.0 },
    { row: 0, col: -1, cost: 1.0 },
    { row: 0, col: 1, cost: 1.0 },
    { row: -1, col: -1, cost: 1.414 },
    { row: -1, col: 1, cost: 1.414 },
    { row: 1, col: -1, cost: 1.414 },
    { row: 1, col: 1, cost: 1.414 }
];

const sim = {
    people: [],          /* Le persone in movimento, tolte dalla mappa alla partenza. */
    distance: [],        /* Distanza di ogni casella dall'uscita più vicina. Vuoto significa da ricalcolare. */
    running: false,      /* True mentre la simulazione è in corso. */
    steps: 0,            /* Passi compiuti dalla partenza. */
    seconds: 0,          /* Tempo simulato, cioè i passi moltiplicati per la durata di uno. */
    escaped: 0,          /* Quante persone hanno raggiunto un'uscita. */
    savedCells: null,    /* Copia della mappa prima della partenza, per poterla ripristinare. */
    reaction: 3,         /* Attesa massima prima di reagire all'allarme, in secondi. */
    friction: FRICTION,  /* Probabilità che due persone in conflitto si blocchino a vicenda. */
    viewSpeed: 1         /* Velocità di riproduzione. */
};

/* Durata di attraversamento di una casella alla velocità di cammino. Vale 0,4 / 1,33 = circa 0,3 secondi. */
const STEP_SECONDS = CELL_METERS / WALK_SPEED;

/**
 * Calcola per ogni casella quanto dista dall'uscita più vicina (in caselle): una ortogonale vale 1, una diagonale 1,414. 
 * Le caselle da cui non si raggiunge nessuna uscita hanno distanza uguale a Infinity.
 * L'algoritmo parte dalle uscite, che valgono zero, ed effettua una visita a coda. 
 * La coda contiene le caselle la cui distanza è appena migliorata in quanto solo i loro vicini possono migliorare a loro volta. 
 * Così ogni casella viene riesaminata poche volte invece di ripassare ogni volta l'intera griglia.
 */
function buildDistanceField() {
    sim.distance = [];
    const queue = [];

    for (let row = 0; row < grid.rows; row++) {
        const line = [];
        for (let col = 0; col < grid.cols; col++) {
            const isExit = grid.cells[row][col] === EXIT;
            line.push(isExit ? 0 : Infinity);
            if (isExit) {
                queue.push({ row: row, col: col });
            }
        }
        sim.distance.push(line);
    }

    let index = 0;
    while (index < queue.length) {
        const cell = queue[index];
        index++;
        const here = sim.distance[cell.row][cell.col];

        for (const step of DIRECTIONS) {
            const row = cell.row + step.row;
            const col = cell.col + step.col;

            if (!isInside(row, col) || grid.cells[row][col] === WALL) {
                continue;
            }

            /* In diagonale non si passa se è presente un muro vicino. */
            if (step.row !== 0 && step.col !== 0) {
                if (grid.cells[cell.row + step.row][cell.col] === WALL || grid.cells[cell.row][cell.col + step.col] === WALL) {
                    continue;
                }
            }
            const newDist = here + step.cost;
            if (newDist < sim.distance[row][col]) {
                sim.distance[row][col] = newDist;
                queue.push({ row: row, col: col });
            }
        }
    }
}

/**
 * Toglie le persone dalla mappa e li salva come oggetti per poter gestire il movimento. 
 * Le caselle che occupavano tornano vuote e le persone vivono solo dentro sim.people.
 */
function takePeopleFromMap() {
    sim.people = [];
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
            if (grid.cells[row][col] === PERSON) {
                sim.people.push({
                    row: row,
                    col: col,
                    prevRow: row,
                    prevCol: col,
                    outside: false,
                    exitStep: 0,
                    exitTime: 0,
                    /* Ognuno aspetta un tempo casuale prima di reagire all'allarme. */
                    startTime: Math.random() * sim.reaction
                });
                grid.cells[row][col] = EMPTY;
            }
        }
    }
}

/**
 * Abilita o disabilita i comandi di disegno per impedirne l'uso durante la simulazione.
 * @param {Boolean} enabled true per riabilitare i comandi.
 */
function setToolsEnabled(enabled) {
    const column = document.getElementById("colonna-strumenti");
    const controls = column.querySelectorAll(".strumento, #bottone-svuota, #campo-nome-progetto, #bottone-salva");
    for (const control of controls) {
        control.disabled = !enabled;
    }
}

/**
 * Aggiorna i comandi della simulazione in base allo stato.
 */
 function updateSimulationButtons() {
    const started = sim.people.length > 0;
    const buttonStart = document.getElementById("bottone-avvia");
    const buttonPause = document.getElementById("bottone-pausa");
    const canvas = document.getElementById("tela");

    if (started) {
        buttonStart.classList.add("nascosto");
        buttonPause.classList.remove("nascosto");
        canvas.classList.add("bloccata");
    } else {
        buttonStart.classList.remove("nascosto");
        buttonPause.classList.add("nascosto");
        canvas.classList.remove("bloccata");
    }

    buttonPause.textContent = sim.running ? "Pausa" : "Riprendi";
    document.getElementById("bottone-azzera").disabled = !started;
    setToolsEnabled(!started);
}

/**
 * Avvia la simulazione. Controlla se manca l'uscita o se non c'è nessuno da far uscire.
 */
async function startSimulation() {
    if (sim.running) {
        return;
    }
    if (sim.people.length === 0) {
        if (countExits() === 0) {
            await showMessage("Manca un'uscita. Disegnane almeno una sul bordo della stanza.");
            return;
        }
        if (countPeople() === 0) {
            await showMessage("Non c'è nessuno da far uscire. Aggiungi almeno una persona.");
            return;
        }
        /* Crea una copia della griglia per poterla ripristinare. */
        sim.savedCells = grid.cells.map(line => [...line]);
        takePeopleFromMap();
        if (sim.distance.length === 0) {
            buildDistanceField();
        }
        sim.steps = 0;
        sim.seconds = 0;
        sim.escaped = 0;
        resetAnimation();
    }
    sim.running = true;
    updateSimulationButtons();
    startAnimation();
}

/**
 * Mette in pausa senza perdere lo stato in modo da poter riprendere.
 */
function pauseSimulation() {
    sim.running = false;
    updateSimulationButtons();
    stopAnimation();
}

/**
 * Riporta la mappa com'era prima di premere Avvia e azzera i contatori della simulazione.
 */
function resetSimulation() {
    pauseSimulation();

    if (sim.savedCells !== null) {
        grid.cells = sim.savedCells;
        grid.rows = grid.cells.length;
        grid.cols = grid.cells[0].length;
        sim.savedCells = null;
    }

    sim.people = [];
    sim.distance = [];
    sim.steps = 0;
    sim.seconds = 0;
    sim.escaped = 0;
    updateSimulationButtons();

    if (grid.rows > 0) {
        drawEditor();
        updateMapInfo();
    }
}

/**
 * Segna quali caselle sono occupate all'inizio del passo. Tutti scelgono guardando questa fotografia, così il risultato non dipende
 * dall'ordine in cui le persone vengono esaminate.
 * @returns {Array<Array<boolean>>} Matrice di dimensioni della griglia, true dove c'è una persona.
 */
function buildBusyMap() {
    const busy = [];
    for (let row = 0; row < grid.rows; row++) {
        const line = [];
        for (let col = 0; col < grid.cols; col++) {
            line.push(false);
        }
        busy.push(line);
    }
    for (const person of sim.people) {
        if (!person.outside) {
            busy[person.row][person.col] = true;
        }
    }
    return busy;
}

/**
 * Decide verso quale casella vorrebbe spostarsi una persona. Considera solo le caselle libere che non allontanano dall'uscita,
 * e fra quelle sceglie la più vicina; se più caselle pareggiano ne prende una a caso.
 * @param {Object} person La persona che deve muoversi.
 * @param {Array<Array<boolean>>} busy Le caselle occupate a inizio passo.
 * @returns {Object} La casella scelta, oppure null se conviene restare fermi.
 */
function chooseCell(person, busy) {
    /* Si parte dalla propria distanza: sono ammesse le caselle che avvicinano all'uscita e quelle che lasciano la distanza invariata. */
    let bestDist = sim.distance[person.row][person.col];
    let bestCells = [];

    for (const step of DIRECTIONS) {
        const row = person.row + step.row;
        const col = person.col + step.col;

        if (!isInside(row, col) || grid.cells[row][col] === WALL || busy[row][col]) {
            continue;
        }

        /* In diagonale non si può tagliare l'angolo di un muro. */
        if (step.row !== 0 && step.col !== 0) {
            if (grid.cells[person.row + step.row][person.col] === WALL || grid.cells[person.row][person.col + step.col] === WALL) {
                continue;
            }
        }

        const cellDist = sim.distance[row][col];

        if (cellDist < bestDist) {
            bestDist = cellDist;
            bestCells = [{ row: row, col: col }];
        } else if (cellDist === bestDist) {
            bestCells.push({ row: row, col: col });
        }
    }

    if (bestCells.length === 0) {
        return null;
    }
    return bestCells[Math.floor(Math.random() * bestCells.length)];
}

/**
 * Avanza la simulazione di un passo.
 * È strutturata in due giri. Nel primo nessuno si muove ma ognuno dichiara soltanto dove vorrebbe andare,
 * e le richieste per la stessa casella finiscono nello stesso gruppo. Nel secondo si risolvono i conflitti:
 * dove due o più persone vogliono lo stesso posto, o ne passa una sola oppure si bloccano a vicenda.
 */
function simulationStep() {
    sim.steps++;
    sim.seconds += STEP_SECONDS;
    const busy = buildBusyMap();

    const requests = new Map();
    for (const person of sim.people) {
        if (person.outside) {
            continue;
        }
        person.prevRow = person.row;
        person.prevCol = person.col;

        /* Chi non ha ancora reagito all'allarme resta fermo. */
        if (sim.seconds < person.startTime) {
            continue;
        }

        const target = chooseCell(person, busy);
        if (target === null) {
            continue;
        }

        const key = target.row + "," + target.col;
        if (!requests.has(key)) {
            requests.set(key, { row: target.row, col: target.col, group: [] });
        }
        requests.get(key).group.push(person);
    }

    for (const request of requests.values()) {
        let person = request.group[0];
        if (request.group.length > 1) {
            /* Attrito: le persone in conflitto si ostacolano e nessuna passa. */
            if (Math.random() < sim.friction) {
                continue;
            }
            person = request.group[Math.floor(Math.random() * request.group.length)];
        }

        person.row = request.row;
        person.col = request.col;

        if (grid.cells[request.row][request.col] === EXIT) {
            person.outside = true;
            person.exitStep = sim.steps;
            person.exitTime = sim.seconds;
            sim.escaped++;
        }
    }
}

/**
 * L'evacuazione è finita quando chi resta dentro non ha più nessuna strada per raggiungere un'uscita.
 * @returns {Boolean} true se non c'è più niente da simulare.
 */
function isEvacuationOver() {
    if (sim.people.length === 0) {
        return false;
    }
    for (const person of sim.people) {
        if (!person.outside && sim.distance[person.row][person.col] !== Infinity) {
            return false;
        }
    }
    return true;
}

/**
 * Mostra il report quando l'evacuazione finisce.
 */
async function showReport() {
    const total = sim.people.length;
    let stuck = 0;
    let sumOfTimes = 0;

    for (const person of sim.people) {
        if (person.outside) {
            sumOfTimes += person.exitTime;
        } else {
            stuck++;
        }
    }

    const escaped = total - stuck;
    let text = "Evacuazione terminata.\n\n";
    text += "Persone: " + total + "\n";
    text += "Uscite dalla stanza: " + escaped + "\n";
    text += "Tempo totale: " + sim.seconds.toFixed(1).replace(".", ",") + " s\n";

    if (escaped > 0) {
        const average = sumOfTimes / escaped;
        text += "Tempo medio per persona: " + average.toFixed(1).replace(".", ",") + " s\n";
    }
    if (stuck > 0) {
        text += "\nAttenzione: " + stuck + (stuck > 1 ? " persone sono chiuse " : " persona è chiusa " ) + "in una zona senza via d'uscita.";
    }
    await showMessage(text);
    resetSimulation();
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("bottone-avvia").onclick = startSimulation;
    document.getElementById("bottone-pausa").onclick = function () {
        if (sim.running) {
            pauseSimulation();
        } else {
            startSimulation();
        }
    };
    document.getElementById("bottone-azzera").onclick = resetSimulation;

    const reactionSlider = document.getElementById("cursore-ritardo");
    reactionSlider.oninput = function () {
        sim.reaction = Number(reactionSlider.value);
        document.getElementById("valore-ritardo").textContent = reactionSlider.value + " s";
    };

    const frictionSlider = document.getElementById("cursore-panico");
    frictionSlider.oninput = function () {
        sim.friction = Number(frictionSlider.value) / 100;
        document.getElementById("valore-panico").textContent = frictionSlider.value + "%";
    };

    const speedSlider = document.getElementById("cursore-velocita");
    speedSlider.oninput = function () {
        sim.viewSpeed = Number(speedSlider.value);
        document.getElementById("valore-velocita").textContent = speedSlider.value + "x";
    };

    reactionSlider.value = sim.reaction;
    frictionSlider.value = sim.friction * 100;
    speedSlider.value = sim.viewSpeed;

    reactionSlider.oninput();
    frictionSlider.oninput();
    speedSlider.oninput();
});