const DIMS_X = 8;
const DIMS_Y = 8;

// const WRAP = false;

const SPEED = 1;

const N = 3;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
let DRAW_STATES = true;
let DRAW_OUTLINE = true;
let DRAW_EDGES = true;
let DRAW_H = true;

let LOOP = true;
let FORCE_NEXT = false;

let iteration = 0;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
const canvas = document.getElementById("mainCanvas");
const context = setUpContext();

const font = "monospace";

let delta = 1/60;
let lastTime = performance.now();

const TILE_SIZE = Math.floor(calcTileSize());
const TILE_OFFSET_X = (canvas.width - (TILE_SIZE * DIMS_X)) / 2;
const TILE_OFFSET_Y = (canvas.height - (TILE_SIZE * DIMS_Y)) / 2;

let sourceImg = new Image();

let patterns = [];

const W = []
const H = [];
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
class Color {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
    matches(other) {
        return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
    }
    toRgb() {
        return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }
}

class Overlap {
    constructor(pattern, offsetX, offsetY) {
        this.pattern = pattern;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
    matches(other) {
        return this.pattern.matches(other.pattern) && this.offsetX === other.offsetX && this.offsetY === other.offsetY;
    }
}

class Pattern {
    constructor(offsetX, offsetY) {

        const canv = document.createElement("canvas");
        canv.width = sourceImg.width;
        canv.height = sourceImg.height;
        const ctx = getContextFromCanvas(canv, {willReadFrequently: true});

        ctx.drawImage(sourceImg, 0, 0, sourceImg.width, sourceImg.height);

        this.colors = [];

        for (let i = 0; i < N; i++) {
            this.colors.push([]);
        }

        for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
                const spotX = (x + offsetX) % sourceImg.width;
                const spotY = (y + offsetY) % sourceImg.height;
                
                const pixel = ctx.getImageData(spotX, spotY, 1, 1).data;
                
                const color = new Color(pixel[0], pixel[1], pixel[2]);
                this.colors[x][y] = color;

                // if (!uniqueColors.some(c => c.matches(color))) {
                //     uniqueColors.push(color);
                // }
            }
        }

        this.overlaps = [];
    }
    matches(other) {
        for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
                if (!this.colors[x][y].matches(other.colors[x][y])) {
                    return false;
                }
            }
        }
        return true;
    }
    analyzePatterns() {
        // for every pattern, put it in all possible positions and see if it can overlap
        for (let i = 0; i < patterns.length; i++) {
            let pattern = patterns[i];

            // put the other pattern in all possible positions
            for (let offsetX = -N + 1; offsetX < N; offsetX++) {
                for (let offsetY = -N + 1; offsetY < N; offsetY++) {

                    
                    if (offsetX === 0 && offsetY === 0) {
                        continue;
                    }

                    let validPattern = true;
                    // compares pixels in this vs the shifted pattern
                    PER_SPOT: for (let patternX = 0; patternX < N; patternX++) {
                        for (let patternY = 0; patternY < N; patternY++) {

                            const otherPatternX = patternX + offsetX;
                            const otherPatternY = patternY + offsetY;

                            // only check valid spots (overlap will only be complete of offsets = 0)
                            if (otherPatternX < 0 || otherPatternX >= N || otherPatternY < 0 || otherPatternY >= N) {
                                continue;
                            }
                            if (!this.colors[patternX][patternY].matches(pattern.colors[otherPatternX][otherPatternY])) {
                                validPattern = false;
                                break PER_SPOT;
                            }

                        }
                    }
                    // no problems found with the overlap
                    if (validPattern) {
                        this.overlaps.push(new Overlap(pattern, offsetX, offsetY));
                    }

                }
            }

        }
    }
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
document.getElementById("fileInput").addEventListener("change", (e) => {
    patterns.length = 0;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = function(event){

        const img = new Image();
        img.src = event.target.result;

        img.onload = function() {
            img.height = this.height;
            img.width = this.width;
            sourceImg = img;

            setTimeout(() => {
                swapToCanvasAndStart()
            }, 2000);
        }
    };
    reader.readAsDataURL(input.files[0]);
});
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function swapToCanvasAndStart() {
    document.getElementById("mainCanvas").removeAttribute("hidden");
    document.getElementById("fileInput").setAttribute("hidden", "");

    for (let x = 0; x < sourceImg.width; x++) {
        for (let y = 0; y < sourceImg.height; y++) {
            // TODO: weighting patterns
            const pattern = new Pattern(x, y);
            if (!patterns.some(p => p.matches(pattern))) {
                patterns.push(pattern);
            }
        }
    }

    // precalculate valid overlaps
    patterns.forEach((pattern) => pattern.analyzePatterns());

    // create the grids that hold the states of patterns per pixel and their entropies
    createW();    

    window.requestAnimationFrame(draw); // starts render loop
}
function createW() {
    W.length = 0;
    H.length = 0;
    for (let x = 0; x < DIMS_X; x++) {
        W.push([]);
        H.push([]);
        for (let y = 0; y < DIMS_Y; y++) {
            W[x].push(patterns.map(_p => true));
            H[x].push(patterns.length);
        }
    }
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function reset() {
    location.reload(); // reloads the webpage
}
function randomFromList(lst) {
    return lst[Math.floor(Math.random() * lst.length)];
}
function setDelta() {
    delta = performance.now() - lastTime;
    lastTime = performance.now();
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function getContextFromCanvas(canv, options = {}) {
    const ctx = canv.getContext("2d", options);

    // disable anti-alising to make it look 'crisp'
    ctx.imageSmoothingEnabled = false; // standard
    ctx.mozImageSmoothingEnabled = false;    // Firefox
    ctx.oImageSmoothingEnabled = false;      // Opera
    ctx.webkitImageSmoothingEnabled = false; // Safari
    ctx.msImageSmoothingEnabled = false;     // IE

    return ctx;
}
function setUpContext() {
    console.log("Window is " + window.innerWidth +" by " + window.innerHeight);

    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;

    // canvas.width = Math.min(maxW, maxH * 9/7);
    // canvas.height = Math.min(maxH, maxW * 7/9);
    canvas.width = maxW;
    canvas.height = maxH;

    const context = getContextFromCanvas(canvas);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 3;

    return context;
}
function calcTileSize() {
    // Calculate the tile size
    const tileW = canvas.width / DIMS_X;
    const tileH = canvas.height / DIMS_Y;
    const tileSize = Math.min(tileW, tileH);

    return tileSize;
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function setH() {
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            H[x][y] = W[x][y].filter(valid => valid).length;
        }
    }
}

function findLowestEntropySpots() {
    let lowestE = patterns.length;
    let lowestEIds = [];
    let fullyCollapsed = true;

    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            if (H[x][y] > 1) {
                fullyCollapsed = false;
                if (H[x][y] < lowestE) {
                    lowestE = H[x][y];
                    lowestEIds = [[x, y]];
                }
                else if (H[x][y] == lowestE) {
                    lowestEIds.push([x, y]);
                }
            }
        }
    }

    if (fullyCollapsed) {
        LOOP = false;
        FORCE_NEXT = false;
        console.log("Fully collapsed!");
    }
    return lowestEIds;
}
function collapse(idx) {
    H[idx[0]][idx[1]] = 1;

    let patternPicked = false;
    while (!patternPicked) {
        let patternIdx = Math.floor(Math.random() * patterns.length);
        if (W[idx[0]][idx[1]][patternIdx]) {
            W[idx[0]][idx[1]] = W[idx[0]][idx[1]].map(_valid => false);
            W[idx[0]][idx[1]][patternIdx] = true;
            patternPicked = true;
        }
    }

}
function propagate(collapsedIdx) {
    const stack = [collapsedIdx];

    while (stack.length > 0) {

        let currentIdx = stack.pop();

        for (let offsetX = -N + 1; offsetX < N; offsetX++) {
            for (let offsetY = -N + 1; offsetY < N; offsetY++) {

                // console.log({ iteration, stack, offsetX, offsetY });

                if (offsetX == 0 && offsetY == 0) {
                    continue;
                }
                
                let otherIdx = [
                    (currentIdx[0] + offsetX + DIMS_X) % DIMS_X,
                    (currentIdx[1] + offsetY + DIMS_Y) % DIMS_Y
                ];

                let otherPossiblePatterns = W[otherIdx[0]][otherIdx[1]];
                let currentPossiblePatterns = W[currentIdx[0]][currentIdx[1]];

                // for every still possible pattern at the current spot, get the overlaps for the matching offset
                let currentPossibleOverlaps = [];
                for (let i = 0; i < currentPossiblePatterns.length; i++) {
                    if (currentPossiblePatterns[i]) { // if pattern is still possible
                        let pattern = patterns[i];
                        for (let j = 0; j < pattern.overlaps.length; j++) { // for every overlap
                            let overlap = pattern.overlaps[j];
                            // if overlap matches offset and is not already added
                            // !some should be !includes but with match instead of ==
                            if (overlap.offsetX == offsetX && overlap.offsetY && !currentPossibleOverlaps.some(o => o.matches(overlap))) {
                                currentPossibleOverlaps.push(overlap);
                            }
                        }
                    }
                }

                // for every still possible pattern at the other spot, the pattern is in one of the possible overlaps
                for (let i = 0; i < otherPossiblePatterns.length; i++) {
                    if (otherPossiblePatterns[i]) { // if pattern is still possible
                        let otherPattern = patterns[i];

                        // if there are no overlaps that match the pattern, remove it
                        if (!currentPossibleOverlaps.some(o => o.pattern.matches(otherPattern))) {
                            otherPossiblePatterns[i] = false;
                            // H[otherIdx[0]][otherIdx[1]]--; // TODO

                            // if this spot was affected, also affect its neighbors
                            // but no need to add it to the stack if it is already there
                            let inStack = false;
                            for (let a = 0; a < stack.length; a++) {
                                if (stack[a][0] == otherIdx[0] && stack[a][1] == otherIdx[1]) {
                                    inStack = true;
                                }
                            }
                            if (!inStack) {
                                stack.push([otherIdx[0], otherIdx[1]]);
                            }
                        }
                    }
                }
            }
        }
    }
}
function iterate() {
    setH();
    const lowestValidStatesIds = findLowestEntropySpots();

    if (LOOP || FORCE_NEXT) {

        iteration++;

        const idxToCollapse = randomFromList(lowestValidStatesIds);
        collapse(idxToCollapse);

        console.log("Starting Propagation (iteration " + iteration + ")");

        propagate(idxToCollapse);

        setH();

        console.log("Propagation Done (iteration " + iteration + ")");

        FORCE_NEXT = false;
    }
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function draw() {

    //------------------------------------------------------------------------//
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (DRAW_OUTLINE) {
        context.strokeStyle = "white";
        context.lineWidth = 2;
        context.strokeRect(TILE_OFFSET_X, TILE_OFFSET_Y, DIMS_X * TILE_SIZE, DIMS_Y * TILE_SIZE);
    }
    //------------------------------------------------------------------------//

    //------------------------------------------------------------------------//
    for (let i = 0; i < SPEED; i++) {
        iterate();
    }
    //------------------------------------------------------------------------//

    //------------------------------------------------------------------------//
    DRAW_LOOP: for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            if (H[x][y] == 0) {
                console.log("Knotted! Unable to progress, starting over...")
                createW();
                break DRAW_LOOP;
            } else if (H[x][y] == 1) {
                let pattern;
                for (let i = 0; i < W[x][y].length; i++) {
                    if (W[x][y][i]) {
                        pattern = patterns[i];
                        break;
                    }
                }
                context.fillStyle = pattern.colors[0][0].toRgb();
                context.fillRect(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y, TILE_SIZE, TILE_SIZE);
                
                context.strokeStyle = "blue";
                context.lineWidth = 4;
                context.strokeRect(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y, TILE_SIZE, TILE_SIZE);

                context.strokeStyle = "white";
                context.lineWidth = 2;

            } else if (DRAW_STATES) {
                // average colors
                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;
                for (let i = 0; i < W[x][y].length; i++) {
                    if (W[x][y][i]) {
                        r += patterns[i].colors[0][0].r;
                        g += patterns[i].colors[0][0].g;
                        b += patterns[i].colors[0][0].b;
                        count++;
                    }
                }
                r /= count;
                g /= count;
                b /= count;
                context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                context.fillRect(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y, TILE_SIZE, TILE_SIZE);
            }
            if (DRAW_EDGES) {
                context.lineWidth = 1;
                context.strokeRect(
                    x * TILE_SIZE + TILE_OFFSET_X,
                    y * TILE_SIZE + TILE_OFFSET_Y,
                    TILE_SIZE,
                    TILE_SIZE
                );
            }
            if (DRAW_H) {
                context.fillStyle = "red";
                let fontSize = Math.floor(TILE_SIZE / 3);
                context.font = fontSize + "px " + font;
                for (let x = 0; x < DIMS_X; x++) {
                    for (let y = 0; y < DIMS_Y; y++) {
                        context.fillText(H[x][y], (x + 0.5) * TILE_SIZE + TILE_OFFSET_X, (y + 0.5) * TILE_SIZE + TILE_OFFSET_Y);
                    }
                }
            }
        }
    }
    //------------------------------------------------------------------------//

    // const maxX = DIMS_X * TILE_SIZE;
    // const maxY = DIMS_Y * TILE_SIZE;
    // context.drawImage(sourceImg, TILE_OFFSET_X, TILE_OFFSET_Y, maxX, maxY);
    
    // context.strokeStyle = "red";

    // let stepX = maxX / sourceImg.width;
    // let stepY = maxY / sourceImg.height;

    // for (let x = 0; x < sourceImg.width; x++) {
    //     for (let y = 0; y < sourceImg.height; y++) {
    //         context.strokeRect(x * stepX + TILE_OFFSET_X, y * stepY + TILE_OFFSET_Y, stepX, stepY);
    //     }
    // }


    setDelta();

    // const fps = (1000 / delta).toFixed(0);
    // console.log("FPS: " + fps);

    window.requestAnimationFrame(draw);
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//

document.addEventListener("keydown", keyDownHandle, false);

function keyDownHandle(e) {
    switch (e.key.toLowerCase()) {
        case "enter":
            LOOP = !LOOP;
            break;    
        case " ":
            FORCE_NEXT = true;
            break;
        case "escape":
            LOOP = false;
            break;
        case "d":
            DRAW_STATES = !DRAW_STATES;
            break;
        case "o":
            DRAW_OUTLINE = !DRAW_OUTLINE;
            break;
        case "e":
            DRAW_EDGES = !DRAW_EDGES;
            break;
        case "h":
            DRAW_H = !DRAW_H;
            break;
        case "r":
            createW();
            iteration = 0;
            console.log("Reseting!")
            break;
    }
}
//----------------------------------------------------------------------------//
