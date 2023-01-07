const DIMS_X = 20;
const DIMS_Y = 20;

// const WRAP = false; // TODO

const SPEED = 1;

const N = 3;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
let DRAW_STATES = true;
let DRAW_OUTLINE = true; // TODO
let DRAW_EDGES = false;
let DRAW_H = false;

let LOOP = true;
let FORCE_NEXT = false;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
const svgns = "http://www.w3.org/2000/svg";

const svg = document.getElementById("mainSvg");
setupSvg();

let delta = 1/60;
let lastTime = performance.now();

const TILE_SIZE = Math.floor(calcTileSize());
const TILE_OFFSET_X = Math.floor((svg.getAttribute("width") - ((TILE_SIZE + 1) * DIMS_X)) / 2);
const TILE_OFFSET_Y = Math.floor((svg.getAttribute("height") - ((TILE_SIZE + 1) * DIMS_Y)) / 2);

let iteration = 0;

let sourceImg = new Image();

let patterns = [];

const grid = [];

// const rects = [];
// const texts = [];

let stack = [];
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

        const flippedCoords = {};
        for (let i = 0; i < N; i++) {
            this.colors.push([]);
            flippedCoords[i] = N - i - 1;
        }

        for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
                const spotX = (x + offsetX + sourceImg.width) % sourceImg.width;
                const spotY = (y + offsetY + sourceImg.height) % sourceImg.height;
                
                const pixel = ctx.getImageData(spotX, spotY, 1, 1).data;
                
                const color = new Color(pixel[0], pixel[1], pixel[2]);

                const flippedY = flippedCoords[y];

                this.colors[x][flippedY] = color;
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
                    for (let patternX = 0; patternX < N; patternX++) {
                        for (let patternY = 0; patternY < N; patternY++) {

                            const otherPatternX = patternX + offsetX;
                            const otherPatternY = patternY + offsetY;

                            // only check valid spots (overlap will only be complete of offsets = 0)
                            if (otherPatternX < 0 || otherPatternX >= N || otherPatternY < 0 || otherPatternY >= N) {
                                continue;
                            }
                            if (!this.colors[patternX][patternY].matches(pattern.colors[otherPatternX][otherPatternY])) {
                                validPattern = false;
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
class GridSpot {
    constructor(x, y) {
        this.rect = document.createElementNS(svgns, "rect");

        this.rect.setAttribute("x", TILE_OFFSET_X + x * (TILE_SIZE + 1));
        this.rect.setAttribute("y", TILE_OFFSET_Y + y * (TILE_SIZE + 1));
        this.rect.setAttribute("width", TILE_SIZE);
        this.rect.setAttribute("height", TILE_SIZE);

        this.rect.setAttribute("stroke-width", 2);
        this.rect.style.fill = "black";

        this.rect.id = toId(x, y);

        svg.appendChild(this.rect);


        this.text = document.createElementNS(svgns, "text");

        this.text.setAttribute("x", TILE_OFFSET_X + (x + 0.5) * (TILE_SIZE + 1));
        this.text.setAttribute("y", TILE_OFFSET_Y + (y + 0.5) * (TILE_SIZE + 1));
        
        this.text.setAttribute("text-anchor", "middle");
        this.text.style.textAlign = "center";
        this.text.style.alignmentBaseline = "middle";
        this.text.style.verticalAlign = "middle";

        this.text.style.fill = "red";

        this.text.setAttribute("font-size", TILE_SIZE / 3);
        this.text.innerHTML = "";

        svg.appendChild(this.text);


        this.x = x;
        this.y = y;

        this.validPatterns = patterns.slice();
    }
    collapse() {
        const pattern = randomFromList(this.validPatterns);
        this.validPatterns = [pattern];
    }
    setColor() {
        if (this.validPatterns.length == 0) {
            console.log("Knotted! Unable to progress, starting over...")
            createGrid();
        } else if (this.validPatterns.length == 1) {
            const pattern = this.validPatterns[0];
            this.rect.style.fill = pattern.colors[0][0].toRgb();
        } else if (DRAW_STATES) {
            // average colors
            let r = 0, g = 0, b = 0;
            let count = 0;
            for (let i = 0; i < this.validPatterns.length; i++) {
                const pattern = this.validPatterns[i];
                r += pattern.colors[0][0].r;
                g += pattern.colors[0][0].g;
                b += pattern.colors[0][0].b;
                count++;
            }
            r /= count;
            g /= count;
            b /= count;
            
            this.rect.style.fill = `rgb(${r}, ${g}, ${b})`;
        } else {
            this.rect.style.fill = "black";
        }

        if (DRAW_EDGES) {
            if (this.validPatterns.length == 1) {
                this.rect.style.stroke = "blue";
            } else {
                this.rect.style.stroke = "white";
            }
        } else {
            this.rect.style.stroke = this.rect.style.fill;
        }

        if (DRAW_H) {
            this.text.innerHTML = this.validPatterns.length;
        } else {
            this.text.innerHTML = "";
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
                swapToSvgAndStart()
            }, 2000);
        }
    };
    reader.readAsDataURL(input.files[0]);
});
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function setupSvg() {
    console.log("Window is " + window.innerWidth +" by " + window.innerHeight);

    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;

    svg.setAttribute("width", maxW);
    svg.setAttribute("height", maxH);

    svg.setAttribute("viewBox", "0 0 " + maxW + " " + maxH);
    
    return svg;
}
function swapToSvgAndStart() {
    document.getElementById("mainSvg").removeAttribute("hidden");
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
    createGrid();
    
    // run main loop (1 propagation + 1 updateSvg) as fast as possible
    // the next interval proc/tick will not start until the previous one is done
    // inbetween the ticks, changes to the browser window elements (including the svg) take effect
    // (this is just the way browser JS works)
    setInterval(mainLoop, 1);
}
function createGrid() {
    svg.innerHTML = '';
    grid.length = 0;
    stack.length = 0;

    for (let x = 0; x < DIMS_X; x++) {
        grid.push([]);
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x].push(new GridSpot(x, y));
        }
    }

    updateSvg();

    iteration = 0;
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
// function reset() {
//     location.reload(); // reloads the webpage
// }
function randomFromList(lst) {
    return lst[Math.floor(Math.random() * lst.length)];
}
function setDelta() {
    delta = performance.now() - lastTime;
    lastTime = performance.now();
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function toId(x, y) {
    return x + "_" + y;
}
// function fromId(id) {
//     const split = id.split("_");
//     return {x: parseInt(split[0]), y: parseInt(split[1])};
// }
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
function calcTileSize() {
    // Calculate the tile size
    const tileW = svg.getAttribute("width") / DIMS_X;
    const tileH = svg.getAttribute("height") / DIMS_Y;
    const tileSize = Math.min(tileW, tileH) - 1;

    return tileSize;
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function findLowestEntropySpots() {
    let lowestE = patterns.length;
    let lowestEIds = [];
    let fullyCollapsed = true;

    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            if (grid[x][y].validPatterns.length > 1) {
                fullyCollapsed = false;
                if (grid[x][y].validPatterns.length < lowestE) {
                    lowestE = grid[x][y].validPatterns.length;
                    lowestEIds = [[x, y]];
                }
                else if (grid[x][y].validPatterns.length == lowestE) {
                    lowestEIds.push([x, y]);
                }
            }
        }
    }

    if (fullyCollapsed) {
        LOOP = false;
        FORCE_NEXT = false;
        console.log("Fully collapsed!");
        return null;
    } else {
        return lowestEIds;
    }
}
function propagate() {
    let currentIdx = stack.pop();

    for (let offsetX = -N + 1; offsetX < N; offsetX++) {
        for (let offsetY = -N + 1; offsetY < N; offsetY++) {

            if (offsetX == 0 && offsetY == 0) {
                continue;
            }

            let otherIdx = [
                (currentIdx[0] + offsetX + DIMS_X) % DIMS_X,
                (currentIdx[1] + offsetY + DIMS_Y) % DIMS_Y
            ];

            let otherPossiblePatterns = grid[otherIdx[0]][otherIdx[1]].validPatterns;
            let currentPossiblePatterns = grid[currentIdx[0]][currentIdx[1]].validPatterns;

            // for every still possible pattern at the current spot, get the overlaps for the matching offset
            let currentPossibleOverlaps = [];
            for (let i = 0; i < currentPossiblePatterns.length; i++) {
                let pattern = currentPossiblePatterns[i];
                for (let j = 0; j < pattern.overlaps.length; j++) { // for every overlap
                    let overlap = pattern.overlaps[j];
                    // if overlap matches offset and is not already added
                    // !some is !includes but with 'match' instead of '=='
                    if (overlap.offsetX == offsetX && overlap.offsetY == offsetY && !currentPossibleOverlaps.some(o => o.matches(overlap))) {
                        currentPossibleOverlaps.push(overlap);
                    }
                }
            }
            // for every still possible pattern at the other spot, the pattern is in one of the possible overlaps
            for (let i = otherPossiblePatterns.length - 1; i >= 0 ; i--) {
                let otherPattern = otherPossiblePatterns[i];
                let overlapForOtherPattern = new Overlap(otherPattern, offsetX, offsetY);
                // if there are no overlaps that match the pattern, remove it
                if (!currentPossibleOverlaps.some(o => o.matches(overlapForOtherPattern))) {
                    
                    // remove 1 element, starting from index i
                    otherPossiblePatterns.splice(i, 1);
                    // grid[otherIdx[0]][otherIdx[1]].validPatterns = grid[otherIdx[0]][otherIdx[1]].validPatterns.filter(p => p != otherPattern);


                    // if this spot was affected, also affect its neighbors
                    // but no need to add it to the stack if it is already there
                    if (!stack.some(idx => idx[0] == otherIdx[0] && idx[1] == otherIdx[1])) {
                        stack.push([otherIdx[0], otherIdx[1]]);
                    }
                }
            }
        }
    }
}
function iterate() {
    iteration++;

    const lowestValidStatesIds = findLowestEntropySpots();
    if (lowestValidStatesIds == null) { // null when completely collapsed
        return;
    }

    const idxToCollapse = randomFromList(lowestValidStatesIds);
    grid[idxToCollapse[0]][idxToCollapse[1]].collapse();

    stack = [idxToCollapse];
    propagate();
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function updateSvg() {
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x][y].setColor();
        }
    }
}
function mainLoop() {
    // imagine that this function is wrapped in a `while (true)`

    if (stack.length > 0) { // in the middle of propagating
        propagate();
    } else {
        if (LOOP || FORCE_NEXT) {
            iterate();   
            FORCE_NEXT = false;
        }
    }

    updateSvg();
    
    setDelta();
    const fps = parseInt((1000 / delta).toFixed(0));
    console.log({ fps, iteration, stack});
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

            updateSvg();

            break;
        case "h":
            DRAW_H = !DRAW_H;
            break;
        case "r":
            createGrid();
            console.log("Reseting!")
            break;
    }
}
//----------------------------------------------------------------------------//
