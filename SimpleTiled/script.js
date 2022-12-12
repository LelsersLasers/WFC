const canvas = document.getElementById("mainCanvas");
const context = setUpContext();

const font = "monospace";


const DIMS_X = 20;
const DIMS_Y = 20;

const TILE_SIZE_X = canvas.width / DIMS_X;
const TILE_SIZE_Y = canvas.height / DIMS_Y;


const tileOptions = [];
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
    tileOptions.length = 0;
    let filesToWaitFor = -1;

    if (window.File && window.FileReader && window.FileList && window.Blob) {
        const files = e.target.files;

        const filteredFiles = [];
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.match("image")) {
                filteredFiles.push(files[i]);
            }
        }

        filesToWaitFor = filteredFiles.length * 4;

        for (let i = 0; i < filteredFiles.length; i++) {
            const imgReader = new FileReader();
            imgReader.addEventListener("load", function (event) {
                for (r = 0; r < 4; r++) {
                    const imgFile = event.target;
                    const img = new Image();

                    img.src = imgFile.result;
                    // r * 90 = degrees rotated
                    rotate(img.src, r, (newSrc) => img.src = newSrc);

                    tileOptions.push(img);
                    filesToWaitFor--;
                    if (filesToWaitFor <= 0) {
                        swapToCanvasAndStart();
                    }
                }
            });
            imgReader.readAsDataURL(filteredFiles[i]);
        }
    }
    else {
        alert("Your browser does not support File API");
    }
});
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function swapToCanvasAndStart() {
    document.getElementById("mainCanvas").removeAttribute("hidden");
    document.getElementById("files").setAttribute("hidden", "");

    for (let x = 0; x < DIMS_X; x++) {
        grid.push([]);
        for (let y = 0; y < DIMS_Y; y++) {
            grid[x].push(randomFromList(tileOptions));
        }
    }
    console.log(tileOptions);

    window.requestAnimationFrame(draw); // starts render loop
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function rotate(src, r, callback) {
    const img = new Image()
    img.src = src;
    img.onload = function() {
        const canv = document.createElement('canvas');
        canv.width = img.height;
        canv.height = img.width;
        canv.style.position = "absolute";
        const ctx = canv.getContext("2d");

        switch (r) {
            case 0: break;   // 0 degrees
            case 1:         // 90 degrees
                ctx.translate(img.height, img.width / img.height);
                ctx.rotate(Math.PI / 2);
                break;
            case 2:         // 180 degrees
                ctx.translate(img.width, img.height);
                ctx.rotate(Math.PI);
                break;
            case 3:         // 270 degrees
                ctx.translate(img.width / img.height, img.width);
                ctx.rotate(Math.PI * 3 / 2);
                break;
        }
        
        
        ctx.drawImage(img, 0, 0);
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
    // context.mozImageSmoothingEnabled = false;    // Firefox
    // context.oImageSmoothingEnabled = false;      // Opera
    // context.webkitImageSmoothingEnabled = false; // Safari
    // context.msImageSmoothingEnabled = false;     // IE

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 3;

    return context;
}
//----------------------------------------------------------------------------//


//----------------------------------------------------------------------------//
function draw() {


    context.strokeStyle = "white";
    context.lineWidth = 2;

    for (let x = 0; x < DIMS_X; x++) {
        for (let y = 0; y < DIMS_Y; y++) {
            // const randImg = randomFromList(tileOptions);
            // context.drawImage(randImg, x * TILE_SIZE_X, y * TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y);
            context.drawImage(grid[x][y], x * TILE_SIZE_X, y * TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y);
            context.strokeRect(x * TILE_SIZE_X, y * TILE_SIZE_Y, TILE_SIZE_X, TILE_SIZE_Y);
        }
    }


    window.requestAnimationFrame(draw);
}
//----------------------------------------------------------------------------//