const canvas = document.getElementById("mainCanvas");
const context = setUpContext();

const font = "monospace";


const DIMS_X = 8;
const DIMS_Y = 8;

const TILE_SIZE = calcTileSize();


let tileImgOptions = [];
const grid = [];
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
class Socket {
    constructor(id) {
        this.id = id;
    }
}


class Tile {
    constructor(img) {
        this.img = img;
        this.sockets = {
            top:    Socket(-1),
            right:  Socket(-1),
            bottom: Socket(-1),
            left:   Socket(-1),
        };
        this.neighbors = {
            top:    [],
            right:  [],
            bottom: [],
            left:   [],
        }
    }
}

//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
document.getElementById("files").addEventListener("change", (e) => {
    tileImgOptions.length = 0;
    let filesToWaitFor = -1;

    if (window.File && window.FileReader && window.FileList && window.Blob) {
        const files = e.target.files;

        const filteredFiles = [];
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.match("image")) {
                filteredFiles.push(files[i]);
            }
        }

        // 4 rotations + 2 flips = 6
        filesToWaitFor = filteredFiles.length * 6;

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
                        swapToCanvasAndStart();
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

    context.setTransform(1,0,0,1,0,0);

    console.log(tileImgOptions);

    const filteredtileImgOptions = [];
    loop1: for (let i = 0; i < tileImgOptions.length; i++) {
        loop2: for (let j = 0; j < filteredtileImgOptions.length; j++) {
            if (samePixels(tileImgOptions[i], filteredtileImgOptions[j])) {
                continue loop1;
            }
        }
        filteredtileImgOptions.push(tileImgOptions[i]);
    }
    tileImgOptions = filteredtileImgOptions;
    console.log(tileImgOptions);

    for (let x = 0; x < DIMS_X; x++) {
        grid.push([]);
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x].push(randomFromList(tileImgOptions));
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

    const ctx1 = canvas1.getContext("2d");
    const ctx2 = canvas2.getContext("2d");

    ctx1.drawImage(img1, 0, 0, TILE_SIZE, TILE_SIZE);
    ctx2.drawImage(img2, 0, 0, TILE_SIZE, TILE_SIZE);

    const data1 = ctx1.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
    const data2 = ctx2.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;

    for (let i = 0; i < data1.length; i++) {
        if (data1[i] !== data2[i]) {
            return false;
        }
    }

    // for (let i = 0; i < data1.length; i++) {
    //     if (ctx1.getImageData(i, i, 1, 1).data !== ctx2.getImageData(i, i, 1, 1).data) {
    //         return false;
    //     }
    // }

    console.log("aaaa");
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
        const ctx = canv.getContext("2d");
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
        const ctx = canv.getContext("2d");
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
        const ctx = canv.getContext("2d");

        switch (r) {
            case 0: break;   // 0 degrees
            case 1:         // 90 degrees
                ctx.translate(TILE_SIZE, TILE_SIZE / TILE_SIZE);
                ctx.rotate(Math.PI / 2);
                break;
            case 2:         // 180 degrees
                ctx.translate(TILE_SIZE, TILE_SIZE);
                ctx.rotate(Math.PI);
                break;
            case 3:         // 270 degrees
                ctx.translate(TILE_SIZE / TILE_SIZE, TILE_SIZE);
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
    const context = canvas.getContext("2d");

    // disable anti-alising to make my pixel art look 'crisp'
    context.imageSmoothingEnabled = false; // standard
    context.mozImageSmoothingEnabled = false;    // Firefox
    context.oImageSmoothingEnabled = false;      // Opera
    context.webkitImageSmoothingEnabled = false; // Safari
    context.msImageSmoothingEnabled = false;     // IE

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
function draw() {

    context.strokeStyle = "white";
    context.lineWidth = 1;

    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            context.drawImage(grid[x][y], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            // context.drawImage(tileImgOptions[x % 6], x * TILE_SIZE_X, y * TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y);
            context.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }


    window.requestAnimationFrame(draw);
}
//----------------------------------------------------------------------------//


function pick(event) {
    const bounding = canvas.getBoundingClientRect();
    const x = event.clientX - bounding.left;
    const y = event.clientY - bounding.top;
    const pixel = context.getImageData(x, y, 1, 1);
    const data = pixel.data;
  
    const rgba = `${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255}`;
    console.log(rgba);
  }
  
  canvas.addEventListener("mousemove", (event) => pick(event));