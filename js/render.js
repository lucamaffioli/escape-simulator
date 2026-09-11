/* Render del canvas. Non vengono prese decisioni ma solo disegnati gli elementi.
Viene aggiunto il movimento fluido tra le celle delle persone e il loro "tremolio" quando sono bloccate.
Queste aggiunte non modificano il risultato ma rendono l'animazione più fluida e realistica. */

const COLOR_FLOOR = "#ffffff";
const COLOR_LINE = "#e6e6e6";
const COLOR_WALL = "#555555";
const COLOR_EXIT = "#2e7d32";
const COLOR_PERSON = "#c62828";
const COLOR_ARROW = "#1565c0";

/* Ampiezza dell'oscillazione di chi è bloccato, in frazione di casella. */
const WOBBLE = 0.10;

let animationId = null;    /* numero del ciclo di animazione in corso */
let lastTime = 0;          /* momento dell'ultimo fotogramma */
let stepProgress = 0;      /* da 0 a 1: quanto è stato percorso del passo in corso */

/**
 * Disegna muri, uscite e persone ferme. La stessa funzione serve sia per la tela grande sia per le anteprime nelle schede dei progetti.
 * @param {CanvasRenderingContext2D} ctx Contesto del canvas sul quale disegnare.
 * @param {Array<Array<Number>>} cells Griglia che rappresenta la mappa.
 * @param {Number} cellSize Dimensione di una cella in pixel.
 */
function drawMapOn(ctx, cells, cellSize) {
    const rows = cells.length;
    const cols = cells[0].length;

    ctx.fillStyle = COLOR_FLOOR;
    ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            const value = cells[row][col];

            if (value === WALL) {
                ctx.fillStyle = COLOR_WALL;
                ctx.fillRect(x, y, cellSize, cellSize);
            } else if (value === EXIT) {
                ctx.fillStyle = COLOR_EXIT;
                ctx.fillRect(x, y, cellSize, cellSize);
            } else if (value === PERSON) {
                drawPerson(ctx, x + cellSize / 2, y + cellSize / 2, cellSize);
            } 
            if ((value === EMPTY || value === PERSON) && cellSize >= 8) {
                /* La griglia si vede solo quando le caselle sono abbastanza grandi. */
                ctx.strokeStyle = COLOR_LINE;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
            }
        }
    }
}

/**
 * Disegna una persona: un cerchio rosso.
 * @param {CanvasRenderingContext2D} ctx Contesto del canvas sul quale disegnare. 
 * @param {Number} x Centro del cerchio in pixel.
 * @param {Number} y Centro del cerchio in pixel.
 * @param {Number} cellSize Dimensione di una cella in pixel.
 */
function drawPerson(ctx, x, y, cellSize) {
    ctx.fillStyle = COLOR_PERSON;
    ctx.beginPath();
    ctx.arc(x, y, cellSize * 0.38, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Disegna una freccia che indica la direzione verso l'uscita più vicina.
 * @param {CanvasRenderingContext2D} ctx Contesto del canvas sul quale disegnare. 
 * @param {Number} x Centro della casella in pixel.
 * @param {Number} y Centro della casella in pixel.
 * @param {Number} stepRow Componente verticale della direzione, già riportata a lunghezza uno.
 * @param {Number} stepCol Componente orizzontale della direzione, già riportata a lunghezza uno.
 * @param {Number} cellSize Dimensione di una cella in pixel.
 */
function drawArrow(ctx, x, y, stepRow, stepCol, cellSize) {
    const length = cellSize * 0.35;
    const endX = x + stepCol * length;
    const endY = y + stepRow * length;

    ctx.strokeStyle = COLOR_ARROW;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - stepCol * length, y - stepRow * length);
    ctx.lineTo(endX, endY);
    /* Le due alette. */
    ctx.lineTo(endX - (stepCol + stepRow) * length * 0.4,
                endY - (stepRow - stepCol) * length * 0.4);
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - (stepCol - stepRow) * length * 0.4,
                endY - (stepRow + stepCol) * length * 0.4);
    ctx.stroke();
}

/**
 * Disegna una freccia in ogni casella libera che punta verso l'uscita più vicina.
 * @param {CanvasRenderingContext2D} ctx Contesto del canvas sul quale disegnare. 
 */
function drawArrows(ctx) {
    if (sim.distance.length === 0) {
        buildDistanceField();
    }
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
            if (grid.cells[row][col] === WALL || grid.cells[row][col] === EXIT) {
                continue;
            }
            const here = sim.distance[row][col];
            if (here === Infinity || here === 0) {
                continue;
            }

            /* Cerca fra tutte e otto le direzioni quella che avvicina di più all'uscita. */
            let best = here;
            let bestRow = 0;
            let bestCol = 0;

            for (const step of DIRECTIONS) {
                const row2 = row + step.row;
                const col2 = col + step.col;
                if (!isInside(row2, col2) || grid.cells[row2][col2] === WALL) {
                    continue;
                }
                /* Se direzione diagonale. */
                if (step.row !== 0 && step.col !== 0) {
                    if (grid.cells[row + step.row][col] === WALL || grid.cells[row][col + step.col] === WALL) {
                        continue;
                    }
                }
                const there = sim.distance[row2][col2];
                if (there < best) {
                    best = there;
                    bestRow = step.row;
                    bestCol = step.col;
                }
            }
            const length = Math.sqrt(bestRow * bestRow + bestCol * bestCol);
            if (length === 0) {
                continue;
            }
            /* La direzione va riportata a lunghezza uno, altrimenti le frecce oblique verrebbero più lunghe delle altre. */
            drawArrow(ctx, (col + 0.5) * grid.cellSize, (row + 0.5) * grid.cellSize, bestRow / length, bestCol / length, grid.cellSize);
        }
    }
}

/**
 * Calcola quanto deve essere grande una casella perché la mappa entri tutta nello spazio disponibile, poi ridisegna.
 */
function fitCanvas() {
    const canvas = document.getElementById("tela");
    const area = document.getElementById("area-disegno");

    const freeWidth = area.clientWidth - 32;
    const freeHeight = area.clientHeight - 32;

    grid.cellSize = Math.floor(Math.min(freeWidth / grid.cols, freeHeight / grid.rows));
    if (grid.cellSize < 3) {
        grid.cellSize = 3;
    }

    canvas.width = grid.cols * grid.cellSize;
    canvas.height = grid.rows * grid.cellSize;
    drawEditor();
}

/**
 * Ridisegna la mappa ferma, con le frecce se sono state richieste.
 */
function drawEditor() {
    const canvas = document.getElementById("tela");
    if (grid.rows === 0) {
        return;
    }
    const ctx = canvas.getContext("2d");
    drawMapOn(ctx, grid.cells, grid.cellSize);

    if (document.getElementById("spunta-frecce").checked) {
        drawArrows(ctx);
    }
}

/**
 * Disegna le persone durante l'animazione, interpolate fra la casella di partenza e quella di arrivo.
 * @param {CanvasRenderingContext2D} ctx Contesto del canvas sul quale disegnare. 
 * @param {Number} progress Va da 0 a 1 e dice a che punto si trova la persona tra la casella di partenza e quella di arrivo.
 * @param {Number} now Momento del fotogramma in millisecondi, usato per far oscillare chi è bloccato.
 */
function drawMovingPeople(ctx, progress, now) {
    const wobble = grid.cellSize * WOBBLE;

    for (let i = 0; i < sim.people.length; i++) {
        const person = sim.people[i];

        /* Chi è già uscito da più di un passo non si disegna più. */
        if (person.outside && person.exitStep < sim.steps) {
            continue;
        }

        let x = (person.prevCol + (person.col - person.prevCol) * progress + 0.5) * grid.cellSize;
        let y = (person.prevRow + (person.row - person.prevRow) * progress + 0.5) * grid.cellSize;

        /* Trema solo chi è bloccato e ha già reagito all'allarme. */
        const stuck = (person.row === person.prevRow && person.col === person.prevCol);
        if (stuck && sim.seconds >= person.startTime) {
            /* i vale come sfasamento, così ognuno oscilla per conto suo */
            x += Math.sin(now / 90 + i) * wobble;
            y += Math.cos(now / 110 + i * 2) * wobble;
        }
        drawPerson(ctx, x, y, grid.cellSize);
    }
}

/**
 * Ciclo di animazione.
 * @param {Number} now Momento del fotogramma in millisecondi, passato da requestAnimationFrame.
 */
function animationFrame(now) {
    if (!sim.running) {
        return;
    }

    let seconds = (now - lastTime) / 1000;
    lastTime = now;
    /* Se la finestra è rimasta nascosta a lungo non recuperiamo tutto il tempo perduto in un colpo solo. */
    if (seconds > 0.25) {
        seconds = 0.25;
    }

    stepProgress += (seconds * sim.viewSpeed) / STEP_SECONDS;
    while (stepProgress >= 1) {
        stepProgress -= 1;
        simulationStep();
    }

    const ctx = document.getElementById("tela").getContext("2d");
    drawMapOn(ctx, grid.cells, grid.cellSize);
    if (document.getElementById("spunta-frecce").checked) {
        drawArrows(ctx);
    }
    drawMovingPeople(ctx, stepProgress, now);

    if (isEvacuationOver()) {
        pauseSimulation();
        drawEditor();
        showReport();
        return;
    }
    animationId = requestAnimationFrame(animationFrame);
}

/**
 * Inizia animazione.
 */
function startAnimation() {
    if (animationId === null) {
        /* Tempo trascorso dall'apertura della pagina con precisione maggiore del millisecondo. Usata anche da requestAnimationFrame(). */
        lastTime = performance.now();
        animationId = requestAnimationFrame(animationFrame);
    }
}

/**
 * Ferma animazione.
 */
function stopAnimation() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

/**
 *  Riporta a zero la frazione di tragitto percorsa fra una casella e l'altra.
 */
function resetAnimation() {
    stepProgress = 0;
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("spunta-frecce").onchange = drawEditor;
});