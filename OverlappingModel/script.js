const DIMS_X = 77;
const DIMS_Y = 37;

const WRAP = false;

const SPEED = 3;

const N = 3;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
let DRAW_STATES = false;
let DRAW_EDGES = false;

let LOOP = true;
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
let uniqueColors = [];

const grid = [];
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
}

class Overlap {
    constructor(pattern, offset_x, offset_y) {
        this.pattern = pattern;
        this.offset_x = offset_x;
        this.offset_y = offset_y;
    }
    matches(other) {
        return this.pattern.matches(other.pattern) && this.offset_x === other.offset_x && this.offset_y === other.offset_y;
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

                if (!uniqueColors.some(c => c.matches(color))) {
                    uniqueColors.push(color);
                }
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

// class GridSpot {
//     constructor() {
//         this.validStates = tiles.slice();
//         this.collapsed = false;
//         this.collapsedState = null;
//     }
//     draw(x, y) {
//         if (this.collapsed) {
//             context.drawImage(this.collapsedState.img, x, y, TILE_SIZE, TILE_SIZE);
//         } else if (DRAW_STATES) {
//             const squares = Math.ceil(Math.sqrt(tiles.length));
//             const squareSize = TILE_SIZE / squares;

//             for (let i = 0; i < squares; i++) {
//                 for (let j = 0; j < squares; j++) {
//                     let idx = i * squares + j;
//                     if (idx < tiles.length) {
//                         const tile = tiles[idx];
//                         if (this.validStates.includes(tile)) {
//                             context.drawImage(tile.img, x + j * squareSize, y + i * squareSize, squareSize, squareSize);
//                         }
//                     }
//                 }
//             }
//             /*
//             context.globalAlpha = 1 / tiles.length;
//             for (let state of this.validStates) {
//                 context.drawImage(state.img, x, y, TILE_SIZE, TILE_SIZE);
//             }
//             context.globalAlpha = 1;
//             */
//         }
//     }
//     collapse() {
//         this.collapsed = true;

//         const ids = [...new Set(this.validStates.map(state => state.id))];
//         const id = randomFromList(ids);
//         this.validStates = this.validStates.filter(state => state.id === id);
        
//         this.collapsedState = randomFromList(this.validStates);
//         this.validStates = [this.collapsedState];
//     }
//     getPossibleNeighbors(side) {
//         const neighbors = [];
//         for (let i = 0; i < this.validStates.length; i++) {
//             for (let j = 0; j < this.validStates[i].validNeighbors[side].length; j++) {
//                 let tile = this.validStates[i].validNeighbors[side][j];
//                 if (!neighbors.includes(tile)) {
//                     neighbors.push(tile);
//                 }
//             }
//         }
//         return neighbors;
//     }
// }
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
document.getElementById("fileInput").addEventListener("change", (e) => {
    patterns.length = 0;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = function(){
        const dataURL = reader.result;
        sourceImg.src = dataURL;
    };
    reader.readAsDataURL(input.files[0]);
    setTimeout(() => {
        swapToCanvasAndStart()
    }, 2000);
});
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function swapToCanvasAndStart() {
    document.getElementById("mainCanvas").removeAttribute("hidden");
    document.getElementById("fileInput").setAttribute("hidden", "");

    console.log(sourceImg);

    for (let x = 0; x < sourceImg.width; x++) {
        for (let y = 0; y < sourceImg.height; y++) {
            // TODO: weighting patterns
            const pattern = new Pattern(x, y);
            if (!patterns.some(p => p.matches(pattern))) {
                patterns.push(pattern);
            }
        }
    }

    console.log(patterns);

    // precalculate valid overlaps
    patterns.forEach((pattern) => pattern.analyzePatterns());

    alert("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

    // create the grid of tiles that holds the states
    setGrid();    

    window.requestAnimationFrame(draw); // starts render loop
}
function setGrid() {
    grid.length = 0;
    for (let x = 0; x < DIMS_X; x++) {
        grid.push([]);
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x].push(new GridSpot());
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
function findLowestEntropySpots() {
    let lowestValidStates = tiles.length;
    let lowestValidStatesIds = [];
    let fullyCollapsed = true;
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            if (!grid[x][y].collapsed) {
                fullyCollapsed = false;
                if (grid[x][y].validStates.length == 0) {
                    console.log("Knotted! Unable to progress, starting over...")
                    setGrid();
                    break;
                } else if (grid[x][y].validStates.length < lowestValidStates) {
                    lowestValidStates = grid[x][y].validStates.length;
                    lowestValidStatesIds = [[x, y]];
                } else if (grid[x][y].validStates.length == lowestValidStates) {
                    lowestValidStatesIds.push([x, y]);
                }
            }
        }
    }

    if (fullyCollapsed) {
        LOOP = false;
        FORCE_NEXT = false;
        console.log("Fully collapsed!");
    }
    return lowestValidStatesIds;
}
function propagate(collapsedIdx) {
    const offsets = {
        top: [0, -1],
        right: [1, 0],
        bottom: [0, 1],
        left: [-1, 0],
    }

    let stack = [collapsedIdx];

    while (stack.length > 0) {
        let currentIdx = stack.pop();

        for (let side in offsets) {
        
            let otherIdx = [
                currentIdx[0] + offsets[side][0],
                currentIdx[1] + offsets[side][1]
            ]
        
            if (WRAP) {
                otherIdx[0] = (otherIdx[0] + DIMS_X) % DIMS_X;
                otherIdx[1] = (otherIdx[1] + DIMS_Y) % DIMS_Y;
            } else if (otherIdx[0] < 0 || otherIdx[0] >= DIMS_X || otherIdx[1] < 0 || otherIdx[1] >= DIMS_Y) {
                continue;
            }

            let otherPossibleStates = grid[otherIdx[0]][otherIdx[1]].validStates;
            let possibleNiegbors = grid[currentIdx[0]][currentIdx[1]].getPossibleNeighbors(side);

            if (otherPossibleStates.length == 0) {
                continue;
            }

            for (let otherState of otherPossibleStates) {
                if (!possibleNiegbors.includes(otherState)) {
                    grid[otherIdx[0]][otherIdx[1]].validStates = grid[otherIdx[0]][otherIdx[1]].validStates.filter(s => s != otherState);

                    let i = false;
                    for (let a = 0; a < stack.length; a++) {
                        if (stack[a][0] == otherIdx[0] && stack[a][1] == otherIdx[1]) {
                            i = true;
                        }
                    }
                    if (!i) {
                        stack.push([otherIdx[0], otherIdx[1]]);
                    }
                }
            }
        }      
    }
}
function iterate() {
    const lowestValidStatesIds = findLowestEntropySpots();
    if (LOOP || FORCE_NEXT) {
        const idxToCollapse = randomFromList(lowestValidStatesIds);
        grid[idxToCollapse[0]][idxToCollapse[1]].collapse();

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
            grid[x][y].draw(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y)
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
            setGrid();
            break;
    }
}
//----------------------------------------------------------------------------//
