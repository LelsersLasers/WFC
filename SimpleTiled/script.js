const canvas = document.getElementById("mainCanvas");
const context = setUpContext();

const font = "monospace";


const DIMS_X = 60;
const DIMS_Y = 60;

const TILE_SIZE = Math.floor(calcTileSize());
const TILE_OFFSET_X = (canvas.width - (TILE_SIZE * DIMS_X)) / 2;
const TILE_OFFSET_Y = (canvas.height - (TILE_SIZE * DIMS_Y)) / 2;

let tileImgOptions = [];
let tiles = [];
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

class Socket {
    // clockwise labeled
    // id: list of Color
    constructor(ids) {
        this.ids = ids;
    }
    matches(other) {
        const otherIds = other.ids.slice().reverse();
        for (let i = 0; i < this.ids.length; i++) {
            if (!this.ids[i].matches(otherIds[i])) {
                return false;
            }
        }
        return true;
    }
}

class Tile {
    constructor(img, socketsPerSide) {
        this.img = img;
        this.sockets = {
            top:    new Socket([]),
            right:  new Socket([]),
            bottom: new Socket([]),
            left:   new Socket([]),
        };
        this.setSockets(socketsPerSide);
        this.validNeighbors = {
            top:    [],
            right:  [],
            bottom: [],
            left:   [],
        }
    }
    setSockets(socketsPerSide) {
        const middle = Math.ceil(TILE_SIZE / 2);

        const canv = document.createElement("canvas");
        canv.width = TILE_SIZE;
        canv.height = TILE_SIZE;

        const ctx = getContextFromCanvas(canv, {willReadFrequently: true});
        ctx.drawImage(this.img, 0, 0, TILE_SIZE, TILE_SIZE);

        if (socketsPerSide === 1) {
            const spots = {
                top:    [middle, 0],
                right:  [TILE_SIZE - 1, middle],
                bottom: [middle, TILE_SIZE - 1],
                left:   [0, middle],
            }
            for (let side in spots) {
                const x = spots[side][0];
                const y = spots[side][1];
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                this.sockets[side] = new Socket([new Color(pixel[0], pixel[1], pixel[2])]);
            }
        } else {
            alert("TODO!")
        }
    }
    analyzeTiles() {
        // uses global tiles

        const oppositeSide =  {
            top:    "bottom",
            right:  "left",
            bottom: "top",
            left:   "right",
        }

        for (let i = 0; i < tiles.length; i++) {
            for (let side in this.sockets) {
                const thisSocket = this.sockets[side];
                const oppositeSocket = oppositeSide[side];
                const otherSocket = tiles[i].sockets[oppositeSocket];

                if (thisSocket.matches(otherSocket)) {
                    this.validNeighbors[side].push(tiles[i]);
                }
            }
        }
    }
}

class GridSpot {
    constructor() {
        this.validStates = tiles.slice();
        this.collapsed = false;
        this.collapsedState = null;
    }
    draw(x, y) {
        if (this.collapsed) {
            context.drawImage(this.collapsedState.img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
            // const squares = Math.ceil(Math.sqrt(tiles.length));
            // const squareSize = TILE_SIZE / squares;

            // for (let i = 0; i < squares; i++) {
            //     for (let j = 0; j < squares; j++) {
            //         let idx = i * squares + j;
            //         if (idx < tiles.length) {
            //             const tile = tiles[idx];
            //             if (this.validStates.includes(tile)) {
            //                 context.drawImage(tile.img, x + j * squareSize, y + i * squareSize, squareSize, squareSize);
            //             }
            //         }
            //     }
            // }
        }
    }
    collapse() {
        this.collapsed = true;
        this.collapsedState = randomFromList(this.validStates);
        this.validStates = [this.collapsedState];
    }
    getPossibleNeighbors(side) {
        const neighbors = [];
        for (let i = 0; i < this.validStates.length; i++) {
            for (let j = 0; j < this.validStates[i].validNeighbors[side].length; j++) {
                let tile = this.validStates[i].validNeighbors[side][j];
                if (!neighbors.includes(tile)) {
                    neighbors.push(tile);
                }
            }
        }
        return neighbors;
    }
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
document.getElementById("files").addEventListener("change", (e) => {
    tileImgOptions.length = 0;

    if (window.File && window.FileReader && window.FileList && window.Blob) {
        const files = e.target.files;

        const filteredFiles = [];
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.match("image")) {
                filteredFiles.push(files[i]);
            }
        }

        // 4 rotations + 2 flips = 6
        let = filesToWaitFor = filteredFiles.length * 6;

        for (let i = 0; i < filteredFiles.length; i++) {
            const imgReader = new FileReader();
            imgReader.addEventListener("load", function (event) {
                for (r = 0; r < 6; r++) {
                    const imgFile = event.target;
                    const img = new Image();

                    img.src = imgFile.result;
                    if (r < 4) {
                        // r * 90 = degrees rotated
                        rotate(img.src, r, (newSrc) => img.src = newSrc);
                    } else if (r === 4) {
                        flipX(img.src, (newSrc) => img.src = newSrc);
                    } else if (r === 5) {
                        flipY(img.src, (newSrc) => img.src = newSrc);
                    }

                    tileImgOptions.push(img);
                    filesToWaitFor--;
                    if (filesToWaitFor <= 0) {
                        // TODO: better solution
                        // 2 sec delay to wait for files to load
                        setTimeout(() => {
                            swapToCanvasAndStart()
                        }, 2000);
                    }
                }
            });
            imgReader.readAsDataURL(filteredFiles[i]);
        }
    } else {
        alert("Your browser does not support File API");
    }
});
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function swapToCanvasAndStart() {
    document.getElementById("mainCanvas").removeAttribute("hidden");
    document.getElementById("files").setAttribute("hidden", "");

    // remove duplicate images
    const filteredtileImgOptions = [];
    for (let i = 0; i < tileImgOptions.length; i++) {
        let inList = false;
        for (let j = 0; j < filteredtileImgOptions.length; j++) {
            if (samePixels(tileImgOptions[i], filteredtileImgOptions[j])) {
                inList = true;
            }
        }
        if (!inList) {
            filteredtileImgOptions.push(tileImgOptions[i]);
        }
    }
    tileImgOptions = filteredtileImgOptions;
    console.log(tileImgOptions);

    // create tiles
    for (let i = 0; i < tileImgOptions.length; i++) {
        tiles.push(new Tile(tileImgOptions[i], 1));
    }

    // set valid neighbors for tiles
    tiles.forEach((tile) => tile.analyzeTiles());


    for (let x = 0; x < DIMS_X; x++) {
        grid.push([]);
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x].push(new GridSpot());
        }
    }

    window.requestAnimationFrame(draw); // starts render loop
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function samePixels(img1, img2) {
    const canvas1 = document.createElement("canvas");
    const canvas2 = document.createElement("canvas");

    canvas1.width = TILE_SIZE;
    canvas1.height = TILE_SIZE;
    
    canvas2.width = TILE_SIZE;
    canvas2.height = TILE_SIZE;

    const ctx1 = getContextFromCanvas(canvas1, {willReadFrequently: true});
    const ctx2 = getContextFromCanvas(canvas2, {willReadFrequently: true});

    ctx1.drawImage(img1, 0, 0, TILE_SIZE, TILE_SIZE);
    ctx2.drawImage(img2, 0, 0, TILE_SIZE, TILE_SIZE);

    const data1 = ctx1.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
    const data2 = ctx2.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;

    for (let i = 0; i < data1.length; i++) {
        if (data1[i] !== data2[i]) {
            return false;
        }
    }

    return true;
}


function flipX(src, callback) {
    const img = new Image()
    img.src = src;
    img.onload = function() {
        const canv = document.createElement('canvas');
        canv.width = TILE_SIZE;
        canv.height = TILE_SIZE;
        canv.style.position = "absolute";
        const ctx = getContextFromCanvas(canv);
        ctx.translate(TILE_SIZE, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
        callback(canv.toDataURL());
    }
}
function flipY(src, callback) {
    const img = new Image()
    img.src = src;
    img.onload = function() {
        const canv = document.createElement('canvas');
        canv.width = TILE_SIZE;
        canv.height = TILE_SIZE;
        canv.style.position = "absolute";
        const ctx = getContextFromCanvas(canv);
        ctx.translate(0, TILE_SIZE);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
        callback(canv.toDataURL());
    }
}
function rotate(src, r, callback) {
    const img = new Image()
    img.src = src;
    img.onload = function() {
        const canv = document.createElement('canvas');
        canv.width = TILE_SIZE;
        canv.height = TILE_SIZE;
        canv.style.position = "absolute";
        const ctx = getContextFromCanvas(canv);

        switch (r) {
            case 0: break;   // 0 degrees
            case 1:         // 90 degrees
                ctx.translate(TILE_SIZE, 0);
                ctx.rotate(Math.PI / 2);
                break;
            case 2:         // 180 degrees
                ctx.translate(TILE_SIZE, TILE_SIZE);
                ctx.rotate(Math.PI);
                break;
            case 3:         // 270 degrees
                ctx.translate(0, TILE_SIZE);
                ctx.rotate(Math.PI * 3 / 2);
                break;
        }
        
        ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
        callback(canv.toDataURL());
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
    // Get width/height of the browser window
    console.log("Window is ".concat(window.innerWidth, " by ").concat(window.innerHeight));

    // Get the canvas, set the width and height from the window
    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;

    // canvas.width = Math.min(maxW, maxH * 9/7);
    // canvas.height = Math.min(maxH, maxW * 7/9);
    canvas.width = maxW;
    canvas.height = maxH;

    // canvas.onmousedown = () => mouseDown = true;
    // canvas.onmouseup = () => mouseDown = false;

    // Set up the context for the animation
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
        
            // TODO: wrap?
            if (otherIdx[0] < 0 || otherIdx[0] >= DIMS_X || otherIdx[1] < 0 || otherIdx[1] >= DIMS_Y) {
                continue;
            }

            let otherPossibleStates = grid[otherIdx[0]][otherIdx[1]].validStates;
            let possibleNiegbors = grid[currentIdx[0]][currentIdx[1]].getPossibleNeighbors(side);

            if (otherPossibleStates.length == 0) {
                console.log("aaaaa");
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


//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function draw() {

    //------------------------------------------------------------------------//
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.strokeRect(TILE_OFFSET_X, TILE_OFFSET_Y, DIMS_X * TILE_SIZE, DIMS_Y * TILE_SIZE);
    //------------------------------------------------------------------------//

    //------------------------------------------------------------------------//
    let lowestValidStates = tiles.length;
    let lowestValidStatesIds = [];
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            if (!grid[x][y].collapsed) {
                if (grid[x][y].validStates.length == 0) {
                    console.log("TODO: - reset or all are collapsed");
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
    //------------------------------------------------------------------------//

    //------------------------------------------------------------------------//
    const idxToCollapse = randomFromList(lowestValidStatesIds);
    grid[idxToCollapse[0]][idxToCollapse[1]].collapse();

    propagate(idxToCollapse);
    //------------------------------------------------------------------------//

    //------------------------------------------------------------------------//
    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x][y].draw(x * TILE_SIZE + TILE_OFFSET_X, y * TILE_SIZE + TILE_OFFSET_Y)
            // context.strokeRect(
            //     x * TILE_SIZE + TILE_OFFSET_X,
            //     y * TILE_SIZE + TILE_OFFSET_Y,
            //     TILE_SIZE,
            //     TILE_SIZE
            // );
        }
    }
    //------------------------------------------------------------------------//


    window.requestAnimationFrame(draw);
}
//----------------------------------------------------------------------------//


// document.addEventListener("keydown", keyDownHandle, false);

// function keyDownHandle(e) {
// 	switch (e.key.toLowerCase()) {
//         case "s":
//             window.requestAnimationFrame(draw);
//             break;       
//     }
// }