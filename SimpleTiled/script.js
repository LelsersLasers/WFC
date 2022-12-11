const canvas = document.getElementById("mainCanvas");
const context = setUpContext();

const font = "monospace";

const tileImages = [];


document.getElementById("files").addEventListener("change", (e) => {
    tileImages.length = 0;
    let filesToWaitFor = 1;

    if (window.File && window.FileReader && window.FileList && window.Blob) {
        const files = e.target.files;

        const filteredFiles = [];
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.match("image")) {
                filteredFiles.push(files[i]);
            }
        }

        filesToWaitFor = filteredFiles.length;

        for (let i = 0; i < filteredFiles.length; i++) {
            const imgReader = new FileReader();
            imgReader.addEventListener("load", function (event) {
                const imgFile = event.target;
                let img = new Image();
                img.src = imgFile.result;
                tileImages.push(img);
                filesToWaitFor--;
                if (filesToWaitFor <= 0) {
                    swapToCanvasAndStart();
                }
            });
            imgReader.readAsDataURL(filteredFiles[i]);
        }
    }
    else {
        alert("Your browser does not support File API");
    }
});

function swapToCanvasAndStart() {
    document.getElementById("mainCanvas").removeAttribute("hidden");
    document.getElementById("files").setAttribute("hidden", "");

    window.requestAnimationFrame(draw); // starts render loop
}


function reset() {
    location.reload(); // reloads the webpage
}
function randomFromList(lst) {
    return lst[Math.floor(Math.random() * lst.length)];
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
function draw() {

    try {
        const randImg = randomFromList(tileImages);
        context.drawImage(randImg, 0, 0, canvas.width, canvas.height);
    } catch (e) {  
        console.log(e);
    }


    window.requestAnimationFrame(draw);
}



