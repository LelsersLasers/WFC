const canvas: HTMLCanvasElement = document.getElementById("mainCanvas");



function setUpContext(): CanvasRenderingContext2D {
	// Get width/height of the browser window
	console.log("Window is %d by %d", window.innerWidth, window.innerHeight);
	// Get the canvas, set the width and height from the window

	let maxW = window.innerWidth - 20;
	let maxH = window.innerHeight - 20;

	canvas.width = Math.min(maxW, maxH * 9/7);
	canvas.height = Math.min(maxH, maxW * 7/9);

	// canvas.onmousedown = () => mouseDown = true;
	// canvas.onmouseup = () => mouseDown = false;

	// Set up the context for the animation
	const context: CanvasRenderingContext2D = canvas.getContext("2d");

	// disable anti-alising to make my pixel art look 'crisp'
	context.imageSmoothingEnabled = false;       // standard
	context.mozImageSmoothingEnabled = false;    // Firefox
	context.oImageSmoothingEnabled = false;      // Opera
	context.webkitImageSmoothingEnabled = false; // Safari
	context.msImageSmoothingEnabled = false;     // IE

	context.textAlign = "center";
	context.textBaseline = "middle";
	context.lineWidth = 3;

	return context;
}