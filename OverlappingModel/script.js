const DIMS_X = 5;
const DIMS_Y = 5;

// const WRAP = false;

const SPEED = 3;

const N = 3;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
let DRAW_STATES = true;
let DRAW_OUTLINE = true;
let DRAW_EDGES = false;

let LOOP = false;
let FORCE_NEXT = true;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
const canvas = document.getElementById("mainCanvas");
const context = setUpContext();

// const font = "monospace";

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
        for (let i = 0; i < patterns.length; i++) {
            for (let offsetX = -N + 1; offsetX < N; offsetX++) {
                for (let offsetY = -N + 1; offsetY < N; offsetY++) {
                    if (offsetX === 0 && offsetY === 0) {
                        continue;
                    }
                    let validPattern = true;
                    PER_SPOT: for (let patternX = 0; patternX < N; patternX++) {
                        for (let patternY = 0; patternY < N; patternY++) {
                            const otherPatternX = patternX + offsetX;
                            const otherPatternY = patternY + offsetY;
                            if (otherPatternX < 0 || otherPatternX >= N || otherPatternY < 0 || otherPatternY >= N) {
                                continue;
                            }
                            if (!this.colors[patternX][patternY].matches(patterns[i].colors[otherPatternX][otherPatternY])) {
                                validPattern = false;
                                break PER_SPOT;
                            }
                        }
                    }
                    if (validPattern) {
                        this.overlaps.push(new Overlap(patterns[i], offsetX, offsetY));
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
    console.log("Window is ".concat(window.innerWidth, " by ").concat(window.innerHeight));

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
    setH();

    let lowestE = patterns.length;
    let lowestEIds = [];
    let fullyCollapsed = true;

    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            if (H[x][y] > 1) {
                fullyCollapsed = false;

                // TODO: knotted!

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
    // const offsets = {
    //     top: [0, -1],
    //     right: [1, 0],
    //     bottom: [0, 1],
    //     left: [-1, 0],
    // }

    // let stack = [collapsedIdx];

    // while (stack.length > 0) {
    //     let currentIdx = stack.pop();

    //     for (let side in offsets) {
        
    //         let otherIdx = [
    //             currentIdx[0] + offsets[side][0],
    //             currentIdx[1] + offsets[side][1]
    //         ]
        
    //         if (WRAP) {
    //             otherIdx[0] = (otherIdx[0] + DIMS_X) % DIMS_X;
    //             otherIdx[1] = (otherIdx[1] + DIMS_Y) % DIMS_Y;
    //         } else if (otherIdx[0] < 0 || otherIdx[0] >= DIMS_X || otherIdx[1] < 0 || otherIdx[1] >= DIMS_Y) {
    //             continue;
    //         }

    //         let otherPossibleStates = wave[otherIdx[0]][otherIdx[1]].validStates;
    //         let possibleNiegbors = wave[currentIdx[0]][currentIdx[1]].getPossibleNeighbors(side);

    //         if (otherPossibleStates.length == 0) {
    //             continue;
    //         }

    //         for (let otherState of otherPossibleStates) {
    //             if (!possibleNiegbors.includes(otherState)) {
    //                 wave[otherIdx[0]][otherIdx[1]].validStates = wave[otherIdx[0]][otherIdx[1]].validStates.filter(s => s != otherState);

    //                 let i = false;
    //                 for (let a = 0; a < stack.length; a++) {
    //                     if (stack[a][0] == otherIdx[0] && stack[a][1] == otherIdx[1]) {
    //                         i = true;
    //                     }
    //                 }
    //                 if (!i) {
    //                     stack.push([otherIdx[0], otherIdx[1]]);
    //                 }
    //             }
    //         }
    //     }      
    // }

    const stack = [collapsedIdx];
    while (stack.length > 0) {
        let currentIdx = stack.pop();

        for (let offsetX = -N + 1; offsetX < N; offsetX++) {
            for (let offsetY = -N + 1; offsetY < N; offsetY++) {
                
                let otherIdx = [
                    (currentIdx[0] + offsetX + DIMS_X) % DIMS_X,
                    (currentIdx[1] + offsetY + DIMS_Y) % DIMS_Y
                ];

                let otherPossibleStates = W[otherIdx[0]][otherIdx[1]];

                let currentPossibleOverlaps = [];
                for (let i = 0; i < W[currentIdx[0]][currentIdx[1]].length; i++) {
                    let pattern = patterns[i];
                    if (W[currentIdx[0]][currentIdx[1]][i]) {
                        for (let j = 0; j < pattern.overlaps.length; j++) {
                            let overlap = pattern.overlaps[j];
                            if (overlap.offsetX == offsetX && overlap.offsetY && !currentPossibleOverlaps.includes(overlap)) {
                                currentPossibleOverlaps.push(overlap);
                            }
                        }
                    }
                }

                for (let i = 0; i < otherPossibleStates.length; i++) {
                    if (W[otherIdx[0]][otherIdx[1]][i]) {
                        let pattern = patterns[i];

                        if (!currentPossibleOverlaps.includes(pattern.overlap)) {
                            W[otherIdx[0]][otherIdx[1]][i] = false;
                        }

                        

                    }
                }
                
            }
        }


    }

    // stack = {emin}
    // while stack:
    //     idC = stack.pop() 
    //     for dir, t in enumerate(directions):
    //         x = (idC%w + t[0])%w
    //         y = (idC/w + t[1])%h
    //         idN = x + y * w 
    //         if idN in H: 
    //             possible = {n for idP in W[idC] for n in A[idP][dir]}
    //             if not W[idN].issubset(possible):
    //                 intersection = possible & W[idN] 
                
    //                 if not intersection:
    //                     print 'contradiction'
    //                     noLoop()
    //                     return
                        
    //                 W[idN] = intersection
    //                 H[idN] = len(W[idN]) - random(.1)
    //                 stack.add(idN)
}
function iterate() {
    const lowestValidStatesIds = findLowestEntropySpots();
    if (LOOP || FORCE_NEXT) {
        const idxToCollapse = randomFromList(lowestValidStatesIds);
        collapse(idxToCollapse);

        propagate(idxToCollapse);

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
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            if (H[x][y] == 1) {
                let pattern;
                for (let i = 0; i < W[x][y].length; i++) {
                    if (W[x][y][i]) {
                        pattern = patterns[i];
                        break;
                    }
                }
                context.fillStyle = pattern.colors[0][0].toRgb();
                context.fillRect(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y, TILE_SIZE, TILE_SIZE);
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
        }
    }
    //------------------------------------------------------------------------//


    // setDelta();

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
        case "r":
            createW();
            break;
    }
}
//----------------------------------------------------------------------------//
