/* Griglia della mappa, strumenti per editarla e dati su componenti disegnate. */

/* Tipi di casella. */
const EMPTY = 0;
const WALL = 1;
const EXIT = 2;
const PERSON = 3;

/* Dimensione singola casella in metri. */
const CELL_METERS = 0.4;

const grid = {
    cells: [],       /* La matrice della mappa. */
    rows: 0,         /* Righe totali (bordo compreso). */
    cols: 0,         /* Colonne totali (bordo compreso). */
    cellSize: 10,    /* Lato della casella sullo schermo, in pixel. */
    tool: "muro",    /* Strumento selezionato nella colonna di sinistra. */
    erase: false,    /* True col tasto destro premuto: scorciatoia cancella . */
    drawing: false,  /* True mentre il tasto del mouse è premuto. */
    changed: false   /* True se ci sono modifiche non salvate. */
};

/**
 * Inizializza una griglia vuota.
 * @param {Number} widthMeters Larghezza della stanza in metri, bordo escluso.
 * @param {Number} depthMeters Profondità della stanza in metri, bordo escluso.
 */
function newGrid(widthMeters, depthMeters) {
    const insideCols = Math.round(widthMeters / CELL_METERS);
    const insideRows = Math.round(depthMeters / CELL_METERS);

    /* Calcolo righe e colonne compreso il bordo. */
    grid.cols = insideCols + 2;
    grid.rows = insideRows + 2;
    grid.cells = [];

    for (let row = 0; row < grid.rows; row++) {
        const line = [];
        for (let col = 0; col < grid.cols; col++) {
            line.push(isBorder(row, col) ? WALL : EMPTY);
        }
        grid.cells.push(line);
    }

    grid.changed = false;
    /* La griglia è cambiata e le distanze verso le uscite non valgono più. */
    sim.distance = [];
    fitCanvas();
    updateMapInfo();
}

/**
 * Carica una griglia salvata in precedenza.
 * @param {Array<Array<Number>>} cells Celle della mappa.
 */
function loadGrid(cells) {
    grid.cells = cells;
    grid.rows = cells.length;
    grid.cols = cells[0].length;
    grid.changed = false;
    /* La griglia è cambiata: le distanze verso le uscite non valgono più. */
    sim.distance = [];
    fitCanvas();
    updateMapInfo();
}

/**
 * Controlla se la casella fa parte del bordo.
 * @param {Number} row Numero riga della casella.
 * @param {Number} col Numero colonna della casella.
 * @returns {Boolean} true se la casella sta sul bordo, false altrimenti.
 */
function isBorder(row, col) {
    return row === 0 || col === 0 || row === grid.rows - 1 || col === grid.cols - 1;
}

/**
 * Controlla se la casella è uno dei quattro angoli della stanza.
 * @param {Number} row Numero riga della casella.
 * @param {Number} col Numero colonna della casella.
 * @returns {Boolean} true se la casella è un angolo, false altrimenti.
 */
function isCorner(row, col) {
    return (row === 0 || row === grid.rows - 1) &&
           (col === 0 || col === grid.cols - 1);
}

/**
 * Controlla se la casella individuata dalle coordinate fa parte della griglia.
 * @param {Number} row Numero riga della casella.
 * @param {Number} col Numero colonna della casella.
 * @returns {Boolean} true se la casella è nella griglia, false altrimenti.
 */
function isInside(row, col) {
    return row >= 0 && col >= 0 && row < grid.rows && col < grid.cols;
}

/**
 * Applica lo strumento scelto a una casella.
 * @param {Number} row Numero riga della casella.
 * @param {Number} col Numero colonna della casella.
 * @returns {Boolean} true se la mappa è cambiata, false altrimenti.
 */
function useTool(row, col) {
    if (!isInside(row, col)) {
        return false;
    }

    const border = isBorder(row, col);
    let value = grid.cells[row][col];

    /* Quando il tasto destro è premuto il comportamento è uguale a quello della gomma. */
    if (grid.erase || grid.tool === "gomma") {
        value = border ? WALL : EMPTY;
    } else if (grid.tool === "uscita") {
        /* Le uscite stanno solo sul bordo ma non negli angoli. */
        value = (border && !isCorner(row, col)) ? EXIT : value;
    } else if (!border && value === EMPTY) {
        /* Non è possibile sovrascrivere un acella già occupata. */
        if (grid.tool === "muro") {
            value = WALL;
        } else if (grid.tool === "persone") {
            value = PERSON;
        }
    }

    if (value === grid.cells[row][col]) {
        return false;
    }
    grid.cells[row][col] = value;
    return true;
}

/**
 * Pulisce la griglia riportandola a come appena creata.
 */
function clearGrid() {
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
            grid.cells[row][col] = isBorder(row, col) ? WALL : EMPTY;
        }
    }
    grid.changed = true;
}

/**
 * Trova la casella sotto il puntatore del mouse.
 * @param {MouseEvent} e Evento del mouse per leggere le coordinate.
 * @returns {Object} {row: numero riga, col: numero colonna} della casella.
 */
function cellUnderMouse(e) {
    const canvas = document.getElementById("tela");

    const cellWidth = canvas.clientWidth / grid.cols;
    const cellHeight = canvas.clientHeight / grid.rows;

    return {
        row: Math.floor(e.offsetY / cellHeight),
        col: Math.floor(e.offsetX / cellWidth)
    };
}

/**
 * Modifica la griglia mentre il mouse si muove premuto.
 * @param {MouseEvent} e Evento del mouse.
 */
function drawWithMouse(e) {
    /* Con una simulazione in corso, anche solo in pausa, la griglia non si tocca:
       per rimetterla mano occorre prima azzerare. */
    if (sim.people.length > 0) {
        return;
    }
    const cell = cellUnderMouse(e);
    if (useTool(cell.row, cell.col)) {
        grid.changed = true;
        sim.distance = [];  /* Le distanze sono da ricalcolare in quanto potrebbero essere cambiate. */
        drawEditor();
        updateMapInfo();
    }
}

/**
 * Conta le persone.
 * @returns {Number} Quante persone ci sono.
 */
function countPeople() {
    let people = 0;
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
            if (grid.cells[row][col] === PERSON) {
                people++;
            }
        }
    }
    return people;
}

/**
 * Conta le porte. Due caselle di uscita che si toccano solo nell'angolo stanno su pareti perpendicolari, quindi sono due porte diverse.
 * @returns {Number} Quante porte ci sono.
 */
function countExits() {
    return countGroups(EXIT, false, false);
}

/**
 * Conta gli ostacoli. Due muri a contatto d'angolo contano come un ostacolo solo. Il bordo non è un ostacolo.
 * @returns {Number} Quanti ostacoli ci sono.
 */
function countObstacles() {
    return countGroups(WALL, true, true);
}

/**
 * Visita in ampiezza per contare i gruppi di caselle dello stesso tipo attaccate fra loro, per poter mostrare il numero di porte e 
 * il numero di ostacoli reali invece di contare quanti quadretti sono stati disegnati.
 * @param {Number} value Tipo di casella da cercare: EXIT oppure WALL.
 * @param {Boolean} diagonals Se true considera attaccate anche le caselle che si toccano solo in diagonale.
 * @param {Boolean} skipBorder Se true ignora la cornice esterna.
 * @returns {Number} Quanti gruppi distinti sono stati trovati.
 */
function countGroups(value, diagonals, skipBorder) {

    /* Le otto caselle attorno a una casella. Le prime quattro condividono un lato, le altre si toccano solo nell'angolo. */
    const near = [
        { row: -1, col: 0 }, { row: 1, col: 0 },
        { row: 0, col: -1 }, { row: 0, col: 1 },
        { row: -1, col: -1 }, { row: -1, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 1 }
    ];

    /* Con diagonals = true si guardano tutte e otto le vicine, altrimenti solo le prime quattro dell'elenco. */
    const howMany = diagonals ? near.length : 4;

    /* Matrice di booleani per ricordare le caselle già contate. Le caselle da ignorare vengono segnate subito come se fossero già state viste. */
    const seen = [];
    for (let row = 0; row < grid.rows; row++) {
        const line = [];
        for (let col = 0; col < grid.cols; col++) {
            /* True solo se vanno skippati i bordi e sono su un bordo. */
            line.push(skipBorder && isBorder(row, col));
        }
        seen.push(line);
    }

    let groups = 0;
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
            if (seen[row][col] || grid.cells[row][col] !== value) {
                continue;
            }

            /* Casella che indica l'inizio di un gruppo. Da qui si segnano tutte quelle attaccate, così non verranno ricontate.
               La coda contiene le caselle del gruppo ancora da esplorare con index che avanza fino a raggiungere la fine. */
            groups++;
            const queue = [{ row: row, col: col }];
            seen[row][col] = true;
            let index = 0;

            while (index < queue.length) {
                const cell = queue[index];
                index++;
                for (let i = 0; i < howMany; i++) {
                    const nextRow = cell.row + near[i].row;
                    const nextCol = cell.col + near[i].col;
                    if (isInside(nextRow, nextCol) && !seen[nextRow][nextCol] && grid.cells[nextRow][nextCol] === value) {
                        seen[nextRow][nextCol] = true;
                        queue.push({ row: nextRow, col: nextCol });
                    }
                }
            }
        }
    }
    return groups;
}

/**
 * Aggiorna il riquadro che riassume l'ambiente disegnato. Chiamata solo durante l'editing e non durante la simulazione.
 */
function updateMapInfo() {
    document.getElementById("dato-totale").textContent = countPeople();
    document.getElementById("dato-uscite").textContent = countExits();
    document.getElementById("dato-ostacoli").textContent = countObstacles();
}

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("tela");

    /* Il tasto destro per cancellare, rimuoviamo comportamento di default. */
    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    canvas.onmousedown = function (e) {
        grid.drawing = true;
        /* Button vale 2 per il tasto destro: scorciatoia per la gomma. */
        grid.erase = (e.button === 2);
        drawWithMouse(e);
    };

    canvas.onmousemove = function (e) {
        if (grid.drawing) {
            drawWithMouse(e);
        }
    };

    canvas.onmouseup = function () { 
        grid.drawing = false; 
        grid.erase = false;
    };

    canvas.onmouseleave = function () { 
        grid.drawing = false;
        grid.erase = false; 
    };

    for (const button of document.querySelectorAll(".strumento")) {
        button.onclick = function () {
            for (const other of document.querySelectorAll(".strumento")) {
                other.classList.remove("attivo");
            }
            button.classList.add("attivo");
            grid.tool = button.getAttribute("data-strumento");
        };
    }
   
    document.getElementById("bottone-svuota").onclick = async function () {
        const confirmed = await askConfirm("Vuoi cancellare tutto il disegno?");
        if (confirmed) {
            resetSimulation();
            clearGrid();
            drawEditor();
            updateMapInfo();
        }
    };

    /* Se la finestra cambia dimensione ricalcoliamo quanto è grande una casella per evitare comportamenti errati. */
    window.onresize = function () {
        if (grid.rows > 0) {
            fitCanvas();
        }
    };
});