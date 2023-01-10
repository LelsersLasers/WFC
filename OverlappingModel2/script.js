const DIMS_X = 30;
const DIMS_Y = 20;

const WRAP = false;

const ROTATE_AND_FLIP = false;

const FLOOR = 1;
const CEILING = 1;
const SIDE = 1;

const N = 3;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
let DRAW_STATES = true;
let DRAW_EDGES = false;
let DRAW_H = true;

let LOOP = false;
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
const svgns = "http://www.w3.org/2000/svg";

const svg = document.getElementById("mainSvg");
setupSvg();

let delta = 1/60;
let lastTime = performance.now();

const TILE_SIZE = calcTileSize();
const TILE_OFFSET_X = (svg.getAttribute("width") - ((TILE_SIZE + 1) * DIMS_X)) / 2;
const TILE_OFFSET_Y = (svg.getAttribute("height") - ((TILE_SIZE + 1) * DIMS_Y)) / 2;

let iteration = 0;
let percentDone = 0;

let sourceImg = new Image();

const patterns = [];

const grid = [];

const stack = [];
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
class Color {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
    matches(other) {
        return this.r === other.r && this.g === other.g && this.b === other.b;
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

        for (let x = 0; x < N; x++) {
            this.colors.push([]);
            for (let y = 0; y < N; y++) {

                let spotX = x + offsetX;
                let spotY = y + offsetY;

                if (WRAP) {
                    spotX = (spotX + sourceImg.width) % sourceImg.width;
                    spotY = (spotY + sourceImg.height) % sourceImg.height;
                }

                let color = new Color(-1, -1, -1);

                if (spotX >= 0 && spotX < sourceImg.width && spotY >= 0 && spotY < sourceImg.height) {                
                    const pixel = ctx.getImageData(spotX, spotY, 1, 1).data;
                    color = new Color(pixel[0], pixel[1], pixel[2]);
                }

                this.colors[x][y] = color;
            }
        }

        this.overlaps = [];

        this.r = 0;

        this.srcX = offsetX;
        this.srcY = offsetY;

        this.floor = sourceImg.height - offsetY;
        this.ceiling = offsetY + 1;
        this.left = offsetX + 1;
        this.right = sourceImg.width - offsetX;
    }
    displayColor() {
        return this.colors[0][0];
    }
    isNotOutOfBounds() {
        return !this.displayColor().matches(new Color(-1, -1, -1));
    }
    rotateOnce() {
        function rotate90(matrix) {
            const n = matrix.length;
            const x = Math.floor(n/ 2);
            const y = n - 1;
            for (let i = 0; i < x; i++) {
                for (let j = i; j < y - i; j++) {
                    let k = matrix[i][j];
                    matrix[i][j] = matrix[y - j][i];
                    matrix[y - j][i] = matrix[y - i][y - j];
                    matrix[y - i][y - j] = matrix[j][y - i];
                    matrix[j][y - i] = k;
                }
            }
        }
        rotate90(this.colors);
    }
    rotate(r) {
        for (let i = 0; i < r; i++) {
            this.rotateOnce();
        }
        this.r = r;
    }
    flipX() {
        for (let x = 0; x < N; x++) {
            this.colors[x].reverse();
        }
        this.r = 4;
    }
    flipY() {
        this.colors.reverse();
        this.r = 5;
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

                            const otherPatternX = patternX - offsetX;
                            const otherPatternY = patternY - offsetY;

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
        //--------------------------------------------------------------------//
        this.rect = document.createElementNS(svgns, "rect");

        this.rect.setAttribute("x", TILE_OFFSET_X + x * (TILE_SIZE + 1));
        this.rect.setAttribute("y", TILE_OFFSET_Y + y * (TILE_SIZE + 1));
        this.rect.setAttribute("width", TILE_SIZE);
        this.rect.setAttribute("height", TILE_SIZE);

        this.rect.setAttribute("stroke-width", 2);
        this.rect.style.fill = "black";

        this.rect.id = toId(x, y);

        svg.appendChild(this.rect);
        //--------------------------------------------------------------------//

        //--------------------------------------------------------------------//
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
        //--------------------------------------------------------------------//

        //--------------------------------------------------------------------//
        this.floor = DIMS_Y - y;
        this.ceiling = y + 1;
        this.left = x + 1;
        this.right = DIMS_X - x;
        //--------------------------------------------------------------------//

        //--------------------------------------------------------------------//
        this.validPatterns = patterns.slice(); // all possible patterns

        if (this.floor <= FLOOR) {
            this.validPatterns = this.validPatterns.filter((pattern) => pattern.floor == this.floor);
            addToStack([x, y]);
        }
        if (this.ceiling <= CEILING) {
            this.validPatterns = this.validPatterns.filter((pattern) => pattern.ceiling == this.ceiling);
            addToStack([x, y]);
        }
        if (this.left <= SIDE) {
            this.validPatterns = this.validPatterns.filter((pattern) => pattern.left == this.left);
            addToStack([x, y]);
        }
        if (this.right <= SIDE) {
            this.validPatterns = this.validPatterns.filter((pattern) => pattern.right == this.right);
            addToStack([x, y]);
        }
        //--------------------------------------------------------------------//

        //--------------------------------------------------------------------//
        // do this after filtering validPatterns
        this.validStates = []; // validPatterns but no duplicate pattern color data
        for (const pattern of this.validPatterns) {
            if (!this.validStates.some(p => p.matches(pattern))) {
                this.validStates.push(pattern);
            }
        }
        //--------------------------------------------------------------------//
    }
    collapse() {
        const pattern = randomFromList(this.validPatterns);
        this.validPatterns = [pattern];
        this.validStates = [pattern];
    }
    updateValidPatterns() {
        if (this.validStates.length == 1) {
            this.validPatterns = [this.validStates[0]];
        } else {
            this.validPatterns = this.validPatterns.filter((pattern) => this.validStates.some((p) => p.matches(pattern)));
        }
    }
    setColor() {
        if (this.validStates.length == 0) {
            console.log("Knotted! Unable to progress, starting over...")
            createGrid();
        } else if (this.validStates.length == 1) {
            const pattern = this.validStates[0];
            this.rect.style.fill = pattern.displayColor().toRgb();
        } else if (DRAW_STATES) {
            // average colors
            let r = 0, g = 0, b = 0;
            let count = 0;
            for (let i = 0; i < this.validPatterns.length; i++) {
                const pattern = this.validPatterns[i];
                const color = pattern.displayColor();
                r += color.r;
                g += color.g;
                b += color.b;
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
            if (this.validStates.length == 1) {
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
function resize() {
    const maxWidth = (window.innerWidth) * 0.75;
    const maxHeight = window.innerHeight - 32;

    const width = Math.min(maxWidth, (maxHeight * DIMS_X) / DIMS_Y);
    const height = Math.min(maxHeight, (maxWidth * DIMS_Y) / DIMS_X);

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
}
function setupSvg() {
    resize();

    svg.setAttribute("viewBox", "0 0 " + svg.getAttribute("width") + " " + svg.getAttribute("height"));
}
function swapToSvgAndStart() {

    const rMax = ROTATE_AND_FLIP ? 6 : 1;

    for (let x = 0; x < sourceImg.width; x++) {
        for (let y = 0; y < sourceImg.height; y++) {

            for (let r = 0; r < rMax; r++) {
                const pattern = new Pattern(x, y);
                if (r < 4) {
                    pattern.rotate(r);
                } else if (r == 4) {
                    pattern.flipX();
                } else if (r == 5) {
                    pattern.flipY();
                }
                if (pattern.isNotOutOfBounds()) {
                    patterns.push(pattern);
                }
            }

        }
    }

    // precalculate valid overlaps
    patterns.forEach((pattern) => pattern.analyzePatterns());

    // create the grids that hold the states of patterns per pixel and their entropies
    createGrid();
    
    // mainUpdateLoop() calls itself, but with setTimeout(mainUpdateLoop, 0)
    // using setTimeout puts the mainUpdateLoop() call at the end of the event queue
    // allowing the browser to render/update the svg elements before the next call to mainUpdateLoop()

    if (LOOP) {
        mainUpdateLoop();
    }
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
    const tileW = (svg.getAttribute("width") - 20) / DIMS_X;
    const tileH = (svg.getAttribute("height") - 20) / DIMS_Y;
    const tileSize = Math.min(tileW, tileH) - 1;

    return tileSize;
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function addToStack(idx) {
    if (!stack.some(stackIdx => stackIdx[0] == idx[0] && stackIdx[1] == idx[1])) {
        stack.push(idx);
    }
}
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
                currentIdx[0] + offsetX,
                currentIdx[1] + offsetY
            ];

            if (WRAP) {
                otherIdx[0] = (otherIdx[0] + DIMS_X) % DIMS_X;
                otherIdx[1] = (otherIdx[1] + DIMS_Y) % DIMS_Y;
            } else if (otherIdx[0] < 0 || otherIdx[0] >= DIMS_X || otherIdx[1] < 0 || otherIdx[1] >= DIMS_Y) {
                continue;
            }

            // use versions without duplicates
            let otherPossiblePatterns = grid[otherIdx[0]][otherIdx[1]].validStates;
            let currentPossiblePatterns = grid[currentIdx[0]][currentIdx[1]].validStates;

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
                    otherPossiblePatterns.splice(i, 1); // remove 1 element, starting from index i
                    grid[otherIdx[0]][otherIdx[1]].updateValidPatterns();

                    addToStack(otherIdx);
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

    addToStack(idxToCollapse);
    propagate();
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function updateSvg() {
    percentDone = DIMS_X * DIMS_Y * (patterns.length - 1);
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x][y].setColor();
            percentDone -= grid[x][y].validPatterns.length - 1;
        }
    }
    percentDone /= DIMS_X * DIMS_Y * (patterns.length - 1);
    percentDone = parseFloat((percentDone * 100).toFixed(2));
}
function mainUpdateLoop() {

    if (stack.length > 0) {
        propagate();
    } else {
        iterate();
    }

    updateSvg();

    setDelta();
    const fps = parseInt((1000 / delta).toFixed(0));
    console.log({ fps, percentDone, iteration, stack});

    if (LOOP) {
        setTimeout(mainUpdateLoop, 0);
    }
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
document.addEventListener("keydown", keyDownHandle, false);

function keyDownHandle(e) {
    switch (e.key.toLowerCase()) {
        case "enter":
            LOOP = !LOOP;
            if (LOOP) {
                mainUpdateLoop();
            }
            break;    
        case " ":
            if (!LOOP) {
                mainUpdateLoop();
            }
            break;
        case "escape":
            LOOP = false;
            break;
        case "d":
            DRAW_STATES = !DRAW_STATES;
            updateSvg();
            break;
        case "e":
            DRAW_EDGES = !DRAW_EDGES;
            updateSvg();
            break;
        case "h":
            DRAW_H = !DRAW_H;
            updateSvg();
            break;
        case "r":
            createGrid();
            console.log("Reseting!")
            break;
    }
}
//----------------------------------------------------------------------------//
