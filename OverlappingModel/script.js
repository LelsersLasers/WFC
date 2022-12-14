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

const W = [];
const H = [];

const rects = [];
const texts = [];

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
    createW();
    
    // run main loop (1 propagation + 1 updateSvg) as fast as possible
    // the next interval proc/tick will not start until the previous one is done
    // inbetween the ticks, changes to the browser window elements (including the svg) take effect
    // (this is just the way browser JS works)
    setInterval(mainLoop, 1);
}
function createW() {
    stack.length = 0;

    W.length = 0;
    H.length = 0;

    rects.length = 0;
    texts.length = 0;

    svg.innerHTML = '';

    for (let x = 0; x < DIMS_X; x++) {
        W.push([]);
        H.push([]);

        rects.push([]);
        texts.push([]);

        for (let y = 0; y < DIMS_Y; y++) {

            W[x].push(patterns.map(_p => true));
            H[x].push(patterns.length);


            const rect = document.createElementNS(svgns, "rect");

            rect.setAttribute("x", TILE_OFFSET_X + x * (TILE_SIZE + 1));
            rect.setAttribute("y", TILE_OFFSET_Y + y * (TILE_SIZE + 1));
            rect.setAttribute("width", TILE_SIZE);
            rect.setAttribute("height", TILE_SIZE);

            rect.setAttribute("stroke-width", 2);
            rect.style.fill = "black";

            rect.id = toId(x, y);

            svg.appendChild(rect);
            rects[x].push(rect);


            const text = document.createElementNS(svgns, "text");

            text.setAttribute("x", TILE_OFFSET_X + (x + 0.5) * (TILE_SIZE + 1));
            text.setAttribute("y", TILE_OFFSET_Y + (y + 0.5) * (TILE_SIZE + 1));
            
            text.setAttribute("text-anchor", "middle");
            text.style.textAlign = "center";
            text.style.alignmentBaseline = "middle";
            text.style.verticalAlign = "middle";

            text.style.fill = "red";

            text.setAttribute("font-size", TILE_SIZE / 3);
            text.innerHTML = "";

            svg.appendChild(text);
            texts[x].push(text);
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
function setH() {
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            H[x][y] = W[x][y].filter(valid => valid).length;
            if (DRAW_H) {
                texts[x][y].innerHTML = H[x][y];
            } else {
                texts[x][y].innerHTML = "";
            }
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
        return null;
    } else {
        return lowestEIds;
    }
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
                        // !some is !includes but with 'match' instead of '=='
                        if (overlap.offsetX == offsetX && overlap.offsetY == offsetY && !currentPossibleOverlaps.some(o => o.matches(overlap))) {
                            currentPossibleOverlaps.push(overlap);
                        }
                    }
                }
            }
            // for every still possible pattern at the other spot, the pattern is in one of the possible overlaps
            for (let i = 0; i < otherPossiblePatterns.length; i++) {
                if (otherPossiblePatterns[i]) { // if pattern is still possible
                    let otherPattern = patterns[i];
                    let overlapForOtherPattern = new Overlap(otherPattern, offsetX, offsetY);
                    // if there are no overlaps that match the pattern, remove it
                    if (!currentPossibleOverlaps.some(o => o.matches(overlapForOtherPattern))) {
                        otherPossiblePatterns[i] = false;
                        // if this spot was affected, also affect its neighbors
                        // but no need to add it to the stack if it is already there
                        if (!stack.some(idx => idx[0] == otherIdx[0] && idx[1] == otherIdx[1])) {
                            stack.push([otherIdx[0], otherIdx[1]]);
                        }

                        // H[otherIdx[0]][otherIdx[1]] = otherPossiblePatterns.filter(valid => valid).length;

                        // setColorAt(otherIdx[0], otherIdx[1]);
                    }
                }
            }
        }
    }
}
function iterate() {
    iteration++;

    setH();
    const lowestValidStatesIds = findLowestEntropySpots();
    if (lowestValidStatesIds == null) { // null when completely collapsed
        return;
    }

    const idxToCollapse = randomFromList(lowestValidStatesIds);
    
    collapse(idxToCollapse);

    stack = [idxToCollapse];
    propagate();
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
// function draw() {

//     // console.log("DRAWING");

//     //------------------------------------------------------------------------//
//     context.fillStyle = "black";
//     context.fillRect(0, 0, canvas.width, canvas.height);

//     if (DRAW_OUTLINE) {
//         context.strokeStyle = "white";
//         context.lineWidth = 2;
//         context.strokeRect(TILE_OFFSET_X, TILE_OFFSET_Y, DIMS_X * TILE_SIZE, DIMS_Y * TILE_SIZE);
//     }
//     //------------------------------------------------------------------------//

//     //------------------------------------------------------------------------//
//     if (!DRAW_ONCE) {
//         for (let i = 0; i < SPEED; i++) {
//             iterate();
//         }
//     } else {
//         DRAW_ONCE = false;
//     }
//     //------------------------------------------------------------------------//

//     //------------------------------------------------------------------------//
//     setH();

//     DRAW_LOOP: for (let x = 0; x < DIMS_X; x++) {
//         for (let y = 0; y < DIMS_Y; y++) {
//             if (H[x][y] == 0) {
//                 console.log("Knotted! Unable to progress, starting over...")
//                 createW();
//                 break DRAW_LOOP;
//             } else if (H[x][y] == 1) {
//                 let pattern;
//                 for (let i = 0; i < W[x][y].length; i++) {
//                     if (W[x][y][i]) {
//                         pattern = patterns[i];
//                         break;
//                     }
//                 }
//                 context.fillStyle = pattern.colors[0][0].toRgb();
//                 context.fillRect(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y, TILE_SIZE, TILE_SIZE);
//             } else if (DRAW_STATES) {
//                 // average colors
//                 let r = 0;
//                 let g = 0;
//                 let b = 0;
//                 let count = 0;
//                 for (let i = 0; i < W[x][y].length; i++) {
//                     if (W[x][y][i]) {
//                         r += patterns[i].colors[0][0].r;
//                         g += patterns[i].colors[0][0].g;
//                         b += patterns[i].colors[0][0].b;
//                         count++;
//                     }
//                 }
//                 r /= count;
//                 g /= count;
//                 b /= count;
//                 context.fillStyle = `rgb(${r}, ${g}, ${b})`;
//                 context.fillRect(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y, TILE_SIZE, TILE_SIZE);
//             }
//             if (DRAW_EDGES) {
//                 if (H[x][y] == 1) {
//                     context.strokeStyle = "blue";
//                 } else {
//                     context.strokeStyle = "white";
//                 }
//                 context.lineWidth = 2;
//                 context.strokeRect(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y, TILE_SIZE, TILE_SIZE);
//             }
//             if (DRAW_H) {
//                 context.fillStyle = "red";
//                 let fontSize = Math.floor(TILE_SIZE / 3);
//                 context.font = fontSize + "px " + font;
//                 context.fillText(H[x][y], (x + 0.5) * TILE_SIZE + TILE_OFFSET_X, (y + 0.5) * TILE_SIZE + TILE_OFFSET_Y);
//             }
//         }
//     }
//     //------------------------------------------------------------------------//


//     if (!FORCE_NO_DRAW) {
//         // window.requestAnimationFrame(draw);
//     } else {
//         FORCE_NO_DRAW = false;
//     }
// }

function setColorAt(x, y) {
    if (H[x][y] == 0) {
        console.log("Knotted! Unable to progress, starting over...")
        createW();
    } else if (H[x][y] == 1) {
        let pattern;
        for (let i = 0; i < W[x][y].length; i++) {
            if (W[x][y][i]) {
                pattern = patterns[i];
                break;
            }
        }
        rects[x][y].style.fill = pattern.colors[0][0].toRgb();
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
        
        rects[x][y].style.fill = `rgb(${r}, ${g}, ${b})`;
    } else {
        rects[x][y].style.fill = "black";
    }
    if (DRAW_EDGES) {
        if (H[x][y] == 1) {
            rects[x][y].style.stroke = "blue";
        } else {
            rects[x][y].style.stroke = "white";
        }
    } else {
        rects[x][y].style.stroke = rects[x][y].style.fill;
    }
}
function updateSvg() {
    setH();

    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            setColorAt(x, y);
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
            createW();
            console.log("Reseting!")
            break;
    }
}
//----------------------------------------------------------------------------//
