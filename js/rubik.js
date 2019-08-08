var VSHADER =
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Color;\n' +
	'attribute vec2 a_TexCoord;\n' +
	'uniform mat4 u_ViewProjMatrix;\n' +
	'uniform mat4 u_ModelMatrix;\n' +
	'varying vec4 v_Color;\n' +
	'varying vec2 v_TexCoord;\n' +
	'void main() {\n' +
	'	gl_Position = u_ViewProjMatrix * u_ModelMatrix * a_Position;\n' +
	'	v_Color = a_Color;\n' +
	'	v_TexCoord = a_TexCoord;\n' +
	'}\n';

var FSHADER =
	'precision mediump float;\n' +
	'uniform sampler2D u_Sampler;\n' +
	'uniform bool u_TexError;\n' +
	'varying vec4 v_Color;\n' +
	'varying vec2 v_TexCoord;\n' +
	'void main() {\n' +
	'	gl_FragColor = u_TexError ? v_Color : texture2D(u_Sampler, v_TexCoord);\n' +
	'}\n';


var canvas;
var gl;
var n;

var viewMatrix = new Matrix4();
var projMatrix = new Matrix4();

var texError;

var a_Position;
var a_Color;
var a_TexCoord;
var u_ViewProjMatrix;
var u_ModelMatrix;
var u_Sampler;
var u_TexError;

function main() {
	canvas = document.getElementById('webgl');
	gl = getWebGLContext(canvas);
	initShaders(gl, VSHADER, FSHADER);

	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.enable(gl.DEPTH_TEST);

	var eyeZ = 15;
	var eyeX = 3/4 * eyeZ;
	var eyeY = 3/4 * eyeZ;

	viewMatrix.setLookAt(eyeX, eyeY, eyeZ, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
	projMatrix.setPerspective(30.0, canvas.clientWidth/canvas.clientHeight, 1.0, 100.0);

	a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	a_Color = gl.getAttribLocation(gl.program, 'a_Color');

	u_ViewProjMatrix = gl.getUniformLocation(gl.program, 'u_ViewProjMatrix');
	gl.uniformMatrix4fv(u_ViewProjMatrix, false, (projMatrix.multiply(viewMatrix)).elements);

	u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');

	u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
	u_TexError = gl.getUniformLocation(gl.program, 'u_TexError');

	// texture test

	var image = new Image();
	image.onload = function () {
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
			texError = false;
			gap = 2;
		} catch (error) {
			texError = true;
			gap = 2.25;
			document.getElementsByTagName("html")[0].style.backgroundColor = "#F5F5F5";
			document.getElementsByTagName("body")[0].style.backgroundColor = "#F5F5F5";
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		} finally {

			gl.uniform1i(u_TexError, texError);
			n = initVertexBuffers();

			// draw the cube at start
			if (texError) {
				draw();
			} else {
				initTextures();
			}
		}
	};
	image.src = "../img/pantoneR.png";
}

function restart() {
	n = initVertexBuffers(gl);
	draw();
}

// drawing

function drawCube(cube) {
	var vertexBuffer = cube.vertexBuffer;
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.vertexAttribPointer(a_Position, vertexBuffer.components, vertexBuffer.type, false, 0, 0);
	gl.enableVertexAttribArray(a_Position);

	var colorBuffer = cube.colorBuffer;
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.vertexAttribPointer(a_Color, colorBuffer.components, colorBuffer.type, false, 0, 0);
	gl.enableVertexAttribArray(a_Color);

	gl.uniformMatrix4fv(u_ModelMatrix, false, (cube.rotationMatrix).elements);

	if (texError) {
		gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	} else {
		var faces = "rufbdl".split("");
		for (var i = 0; i < n / 6; i++) {
			gl.uniform1i(u_Sampler, cube.faceTextures[faces[i]]);
			gl.drawElements(gl.TRIANGLES, n/6, gl.UNSIGNED_BYTE, i*6);
		}
	}
};

function draw() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	cubes.forEach(drawCube);
};

// axes
const axisX = 0;	// x-axis
const axisY = 1;	// y-axis
const axisZ = 2;	// z-axis

// faces
const faceR = 0;	// right
const faceU = 1;	// up
const faceF = 2;	// front
const faceB = 3;	// back
const faceD = 4;	// down
const faceL = 5;	// left

// cube types
const typeV = 0;	// vertex (corner)
const typeE = 1;	// edge
const typeC = 2;	// center
const typeK = 3;	// kernel

// face colors
const colorB = 0;	// blue
const colorW = 1;	// white
const colorR = 2;	// red
const colorO = 3;	// orange
const colorY = 4;	// yellow
const colorG = 5;	// green

const inner = 6;	// inner

// cubes
var cubes = new Array(27);

// cube type from coord = [x, y, z]
function cubeType(coord) {
	var count = {};
	coord.forEach(function (value) { count[value] = (count[value] || 0) + 1; });
	switch (count[0]) {
		case 1: return typeE;
		case 2: return typeC;
		case 3: return typeK;
		// case undefined
		default: return typeV;
	}
};

// retrive layer from face
function getLayer(face) {
	var layer = cubes.filter(function (cube) {
		switch (face) {
			case faceR: return cube.position.x == +1;
			case faceU: return cube.position.y == +1;
			case faceF: return cube.position.z == +1;
			case faceB: return cube.position.z == -1;
			case faceD: return cube.position.y == -1;
			case faceL: return cube.position.x == -1;
		}
	});
	return layer;
}

// update cube rotation matrix, this = [angle, axis/face]
function updateRotationMatrix(cube, angle, axis) {
	var rotationMatrix = new Matrix4();
	switch (axis) {
		// x-axis
		case faceR:
		case faceL:
			rotationMatrix.setRotate(angle, 1, 0, 0);
			break;
		// y-axis
		case faceU:
		case faceD:
			rotationMatrix.setRotate(angle, 0, 1, 0);
			break;
		// z-axis
		case faceF:
		case faceB:
			rotationMatrix.setRotate(angle, 0, 0, 1);
			break;
	}
	cube.rotationMatrix = rotationMatrix.multiply(cube.rotationMatrix);
}

// update cube position, this = [angle, axis/face]
function updateCubePosition(cube, angle, axis) {
	switch (axis) {
		// x-axis
		case faceR:
		case faceL:
			if (angle > 0) {
				var tmp = cube.position.y;
				cube.position.y = -cube.position.z;
				cube.position.z = +tmp;
			} else {
				var tmp = cube.position.y;
				cube.position.y = +cube.position.z;
				cube.position.z = -tmp;
			}
			break;
		// y-axis
		case faceU:
		case faceD:
			if (angle > 0) {
				var tmp = cube.position.x;
				cube.position.x = +cube.position.z;
				cube.position.z = -tmp;
			} else {
				var tmp = cube.position.x;
				cube.position.x = -cube.position.z;
				cube.position.z = +tmp;
			}
			break;
		// z-axis
		case faceF:
		case faceB:
			if (angle > 0) {
				var tmp = cube.position.x;
				cube.position.x = -cube.position.y;
				cube.position.y = +tmp;
			} else {
				var tmp = cube.position.x;
				cube.position.x = +cube.position.y;
				cube.position.y = -tmp;
			}
			break;
	} // switch
}

// stack moves
var stack = [];

// rotation

var rotating = false;	// rotation in progress
var speed = 30;			// rotation speed

function rotateCubeAnimation(angle, axis) {
	if (rotating) return;
	rotating = true;	// start rotation
	toggleHandlers();

	// var speed = 20;
	var currentAngle = angle / speed;
	var counter = 0;

	var tick = function () {

		cubes.forEach(function (cube) {
			updateRotationMatrix(cube, currentAngle, axis);
		});
		draw();

		if (++counter < speed) {
			requestAnimationFrame(tick);
		} else {
			cubes.forEach(function (cube) {
				updateCubePosition(cube, angle, axis);
				// update cube face colors ON PLACE
				// ...
			});

			// update the stack moves
			var move = getAxisName(axis);
			if (angle < 0) move = move.toUpperCase();
			stack.push(move);

			rotating = false;	// rotation complete
			toggleHandlers();
		}
	};

	tick();
};

function rotateFaceAnimation(angle, face) {
	if (rotating) return;
	rotating = true;	// start rotation
	toggleHandlers();

	var layer = getLayer(face);

	// var speed = 20;
	var currentAngle = angle / speed;
	var counter = 0;

	var tick = function () {

		layer.forEach(function (cube) {
			updateRotationMatrix(cube, currentAngle, face);
		});
		draw();

		if (++counter < speed) {
			requestAnimationFrame(tick);
		} else {
			layer.forEach(function (cube) {
				updateCubePosition(cube, angle, face);
				// update cube face colors ON PLACE
				// ...
			});

			// update the stack moves
			var move = getFaceName(face);
			if ((angle < 0 && face < 3) || (angle > 0 && face > 2)) move = move.toUpperCase();
			stack.push(move);

			rotating = false;	// rotation complete
			toggleHandlers();
		}
	};

	tick();
};

var solver = false;	// executeGenerator is call from the solver

function executeGenerator(generator) {
	if (rotating) return;
	rotating = true;	// start rotation
	toggleHandlers();

	generator = generator.split("");

	var move = generator.shift();
	var axis = undefined;
	var layer = undefined;
	var angle = 90 * (isLowerCase(move) ? +1 : -1);
	
	switch (move) {
		// cube rotation
		case "x":
		case "X":
			axis = axisX;
			break;
		case "y":
		case "Y":
			axis = axisY;
			break;
		case "z":
		case "Z":
			axis = axisZ;
			break;
		// face rotation
		case "r":
		case "R":
			axis = axisX;
			layer = getLayer(faceR);
			break;
		case "u":
		case "U":
			axis = axisY;
			layer = getLayer(faceU);
			break;
		case "f":
		case "F":
			axis = axisZ;
			layer = getLayer(faceF);
			break;
		case "b":
		case "B":
			axis = axisZ;
			layer = getLayer(faceB);
			angle = -1 * angle;
			break;
		case "d":
		case "D":
			axis = axisY;
			layer = getLayer(faceD);
			angle = -1 * angle;
			break;
		case "l":
		case "L":
			axis = axisX;
			layer = getLayer(faceL);
			angle = -1 * angle;
			break;
		// undefined move
		default:
			rotating = false;	// stop rotation
			toggleHandlers();
			return;
	} // switch

	var currentAngle = angle / speed;
	var counter = 0;

	var tick = function () {

		(layer || cubes).forEach(function (cube) {
			updateRotationMatrix(cube, currentAngle, axis);
		});
		draw();

		if (++counter < speed) {
			requestAnimationFrame(tick);
		} else {

			(layer || cubes).forEach(function (cube) {
				updateCubePosition(cube, angle, axis);
				// update cube face colors ON PLACE
				// ...
			});

			// update the stack moves
			stack.push(move);

			if (move = generator.shift()) {
				layer = undefined;
				angle = 90 * (isLowerCase(move) ? +1 : -1);

				switch (move) {
					// cube rotation
					case "x":
					case "X":
						axis = axisX;
						break;
					case "y":
					case "Y":
						axis = axisY;
						break;
					case "z":
					case "Z":
						axis = axisZ;
						break;
					// face rotation
					case "r":
					case "R":
						axis = axisX;
						layer = getLayer(faceR);
						break;
					case "u":
					case "U":
						axis = axisY;
						layer = getLayer(faceU);
						break;
					case "f":
					case "F":
						axis = axisZ;
						layer = getLayer(faceF);
						break;
					case "b":
					case "B":
						axis = axisZ;
						layer = getLayer(faceB);
						angle = -1 * angle;
						break;
					case "d":
					case "D":
						axis = axisY;
						layer = getLayer(faceD);
						angle = -1 * angle;
						break;
					case "l":
					case "L":
						axis = axisX;
						layer = getLayer(faceL);
						angle = -1 * angle;
						break;
					// undefined move
					default:
						rotating = false;	// stop rotation
						toggleHandlers();
						return;
				} // switch

				currentAngle = angle / speed;
				counter = 0;

				requestAnimationFrame(tick);
			} else {

				if (solver) {
					solver = false;

					// clean the stack moves
					stack = [];
				}

				rotating = false;	// rotation complete
				toggleHandlers();
			}

		} // else
	}; // tick

	tick();
}

function getAxisName(axis) {
	var axes = "XYZ".split("");
	return axes[axis].toLowerCase();
}

function getFaceName(face) {
	var faces = "RUFBDL".split("");
	return faces[face].toLowerCase();
}

function isLowerCase(string) {
	return string == string.toLowerCase();
};

function swapCase(string) {
	string = string.split("");
	string = string.map(function (value) {
		return isLowerCase(value) ? value.toUpperCase() : value.toLowerCase();
	});
	return string.join("");
};

cubes.__proto__.getCube = function (coords) {
	coords = coords.toLowerCase();

	var x = (coords.includes('l') && -1) || (coords.includes('r') && +1) || 0;
	var y = (coords.includes('d') && -1) || (coords.includes('u') && +1) || 0;
	var z = (coords.includes('b') && -1) || (coords.includes('f') && +1) || 0;

	var test = function (cube) {
		return cube.position.x == x && cube.position.y == y && cube.position.z == z;
	};

	return this.filter(test).pop();
};

cubes.__proto__.getFaceColor = function (face) {
	var faceNames = "RUFBDL".toLowerCase().split("");
	var face = faceNames[face];
	return cubes.getCube(face).faceColors[face];
}

function getPositionName(face, coord) {
	var faceNames = "RUFBDL".split("");

	var cardinals = {
		"R": {
			"U":  { x: +1, y: +1, z:  0 },	// north
			"UB": { x: +1, y: +1, z: -1 },	// north-east
			"B":  { x: +1, y:  0, z: -1 },	// east
			"DB": { x: +1, y: -1, z: -1 },	// south-east
			"D":  { x: +1, y: -1, z:  0 },	// south
			"DF": { x: +1, y: -1, z: +1 },	// south-west
			"F":  { x: +1, y:  0, z: +1 },	// west
			"UF": { x: +1, y: +1, z: +1 }	// north-west
		},
		"U": {
			"B":  { x:  0, y: +1, z: -1 },	// north
			"BR": { x: +1, y: +1, z: -1 },	// north-east
			"R":  { x: +1, y: +1, z:  0 },	// east
			"FR": { x: +1, y: +1, z: +1 },	// south-east
			"F":  { x:  0, y: +1, z: +1 },	// south
			"FL": { x: -1, y: +1, z: +1 },	// south-west
			"L":  { x: -1, y: +1, z:  0 },	// west
			"BL": { x: -1, y: +1, z: -1 }	// north-west
		},
		"F": {
			"U":  { x:  0, y: +1, z: +1 },	// north
			"UR": { x: +1, y: +1, z: +1 },	// north-east
			"R":  { x: +1, y:  0, z: +1 },	// east
			"DR": { x: +1, y: -1, z: +1 },	// south-east
			"D":  { x:  0, y: -1, z: +1 },	// south
			"DL": { x: -1, y: -1, z: +1 },	// south-west
			"L":  { x: -1, y:  0, z: +1 },	// west
			"UL": { x: -1, y: +1, z: +1 }	// north-west
		},
		"B": {
			"U":  { x:  0, y: +1, z: -1 },	// north
			"UL": { x: -1, y: +1, z: -1 },	// north-east
			"L":  { x: -1, y:  0, z: -1 },	// east
			"DL": { x: -1, y: -1, z: -1 },	// south-east
			"D":  { x:  0, y: -1, z: -1 },	// south
			"DR": { x: +1, y: -1, z: -1 },	// south-west
			"R":  { x: +1, y:  0, z: -1 },	// west
			"UR": { x: +1, y: +1, z: -1 }	// north-west
		},
		"D": {
			"F":  { x:  0, y: -1, z: +1 },	// north
			"FR": { x: +1, y: -1, z: +1 },	// north-east
			"R":  { x: +1, y: -1, z:  0 },	// east
			"BR": { x: +1, y: -1, z: -1 },	// south-east
			"B":  { x:  0, y: -1, z: -1 },	// south
			"BL": { x: -1, y: -1, z: -1 },	// south-west
			"L":  { x: -1, y: -1, z:  0 },	// west
			"FL": { x: -1, y: -1, z: +1 }	// north-west
		},
		"L": {
			"U":  { x: -1, y: +1, z:  0 },	// north
			"UF": { x: -1, y: +1, z: +1 },	// north-east
			"F":  { x: -1, y:  0, z: +1 },	// east
			"DF": { x: -1, y: -1, z: +1 },	// south-east
			"D":  { x: -1, y: -1, z:  0 },	// south
			"DB": { x: -1, y: -1, z: -1 },	// south-west
			"B":  { x: -1, y:  0, z: -1 },	// west
			"UB": { x: -1, y: +1, z: -1 }	// north-west
		}
	};

	/*
	face = faceNames[face];
	var keys = Object.keys(cardinals[face]);

	var test = function (key) {
		return this[key].x == coord.x && this[key].y == coord.y && this[key].z == coord.z;
	};

	return face + keys.find(test, cardinals[face]);
	*/

	/*
	var unique = [];

	var test = function (coord) {
		return (coord.x == this.x) && (coord.y == this.y) && (coord.z == this.z);
	};

	for (var i in cardinals) {
		for (var j in cardinals[i]) {
			var found = unique.find(test, cardinals[i][j]);
			if (!found) unique.push(cardinals[i][j]);
		}
	}

	var compare = function (a, b) {
		return (a.x - b.x) || (a.y - b.y) || (a.z - b.z);
	};

	unique.sort(compare);
	*/

	// all coordinates excluded centers and kernel
	var coords = [];
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			for (var k = -1; k <= 1; k++) {
				var count = {};
				[i, j, k].forEach(function (value) {
					count[value] = (count[value] || 0) + 1;
				});
				if (count[0] >= 2) continue;
				coords.push({x: i, y: j, z: k});
			}
		}
	}

	var compare = function (a, b) {
		return (a.x == b.x) && (a.y == b.y) && (a.z == b.z);
	};

	var transform = function (coord) {
		var tmp = (new Array(6)).fill(null);
		for (var i in cardinals) {
			for (var j in cardinals[i]) {
				if (compare(coord, cardinals[i][j])) tmp[faceNames.indexOf(i)] = j;
			}
		}
		return [coord, tmp];
	}

	// coords = [ [{x: -, y: -, z: -}, [faceR, faceU, faceF, faceB, faceD, faceL]], ... ]
	coords = coords.map(transform);

	var result = coords.find(function (value) { return compare(value[0], coord) });
	return faceNames[face] + result[1][face];
}

function updateFaceColorsOnPlace(cube, bfr, aft) {
	// console.log(bfr + " -> " + aft);
	switch (cube.type) {
		// coners
		case typeV:
			// before
			bfr = bfr.toLowerCase().split("");
			var b0 = bfr[0], b1 = bfr[1], b2 = bfr[2];
			bfr = bfr.join("");
			// after
			aft = aft.toLowerCase().split("");
			var a0 = aft[0], a1 = aft[1], a2 = aft[2];
			aft = aft.join("");

			cube.faceColors[a0] = cube.faceColors[b0];	// unnecessary because a0 == b0
			if (a1 == b1) {
				cube.faceColors[a2] = cube.faceColors[b1];
				cube.faceColors[a1] = cube.faceColors[b2];
				cube.faceColors[b2] = null;
			}
			if (a2 == b2) {
				cube.faceColors[a1] = cube.faceColors[b2];
				cube.faceColors[a2] = cube.faceColors[b1];
				cube.faceColors[b1] = null;
			}
			break;
		// edges
		case typeE:
			// before
			bfr = bfr.toLowerCase().split("");
			var b0 = bfr[0], b1 = bfr[1];
			bfr = bfr.join("");
			// after
			aft = aft.toLowerCase().split("");
			var a0 = aft[0], a1 = aft[1];
			aft = aft.join("");

			cube.faceColors[a0] = cube.faceColors[b0];	// unnecessary because a0 == b0
			cube.faceColors[a1] = cube.faceColors[b1];
			cube.faceColors[b1] = null;
			break;
	} // switch
}

var gap;	// cubes interspace

function initVertexBuffers() {

	var initBuffer = function (data, components, type) {
		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		buffer.components = components;
		buffer.type = type;
		return buffer;
	};

	//		  v6---------v5		v0 = ( 1.0, -1.0,  1.0)
	//		 /|         /|		v1 = ( 1.0, -1.0, -1.0)
	//		v7---------v4|		v2 = (-1.0, -1.0, -1.0)
	//		| |        | |		v3 = (-1.0, -1.0,  1.0)
	//		| |        | |		v4 = ( 1.0,  1.0,  1.0)
	//		| v2-------|-v1		v5 = ( 1.0,  1.0, -1.0)
	//		|/         |/ 		v6 = (-1.0,  1.0, -1.0)
	//		v3---------v0 		v7 = (-1.0,  1.0,  1.0)

	var offsets = new Float32Array([
		 1.0, -1.0,  1.0,	 1.0, -1.0, -1.0,	 1.0,  1.0,  1.0,	 1.0,  1.0, -1.0,	// right	v0, v1, v4, v5
		 1.0,  1.0,  1.0,	 1.0,  1.0, -1.0,	-1.0,  1.0, -1.0,	-1.0,  1.0,  1.0,	// up		v4, v5, v6, v7
		 1.0, -1.0,  1.0,	-1.0, -1.0,  1.0,	 1.0,  1.0,  1.0,	-1.0,  1.0,  1.0,	// front	v0, v3, v4, v7
		 1.0, -1.0, -1.0,	-1.0, -1.0, -1.0,	 1.0,  1.0, -1.0,	-1.0,  1.0, -1.0,	// back		v1, v2, v5, v6
		 1.0, -1.0,  1.0,	 1.0, -1.0, -1.0,	-1.0, -1.0, -1.0,	-1.0, -1.0,  1.0,	// down		v0, v1, v2, v3
		-1.0, -1.0, -1.0,	-1.0, -1.0,  1.0,	-1.0,  1.0, -1.0,	-1.0,  1.0,  1.0,	// left		v2, v3, v6, v7
	]);
	
	var cB = { r:   0/255, g:  61/255, b: 165/255 };	// blue
	var cW = { r: 255/255, g: 255/255, b: 255/255 };	// white
	var cR = { r: 186/255, g:  12/255, b:  47/255 };	// red
	var cO = { r: 254/255, g:  80/255, b:   0/255 };	// orange
	var cY = { r: 255/255, g: 215/255, b:   0/255 };	// yellow
	var cG = { r:   0/255, g: 154/255, b:  68/255 };	// green
	
	var faceColors = new Float32Array([
		cB.r, cB.g, cB.b,  cB.r, cB.g, cB.b,  cB.r, cB.g, cB.b,  cB.r, cB.g, cB.b,	// right	blue
		cW.r, cW.g, cW.b,  cW.r, cW.g, cW.b,  cW.r, cW.g, cW.b,  cW.r, cW.g, cW.b,	// up		white
		cR.r, cR.g, cR.b,  cR.r, cR.g, cR.b,  cR.r, cR.g, cR.b,  cR.r, cR.g, cR.b,	// front	red
		cO.r, cO.g, cO.b,  cO.r, cO.g, cO.b,  cO.r, cO.g, cO.b,  cO.r, cO.g, cO.b,	// back		orange
		cY.r, cY.g, cY.b,  cY.r, cY.g, cY.b,  cY.r, cY.g, cY.b,  cY.r, cY.g, cY.b,	// down		yellow
		cG.r, cG.g, cG.b,  cG.r, cG.g, cG.b,  cG.r, cG.g, cG.b,  cG.r, cG.g, cG.b,	// left		green
	]);

	var textureCoords = new Float32Array([
		0.0, 0.0,  1.0, 0.0,  0.0, 1.0,  1.0, 1.0,	// right	v0, v1, v4, v5
		1.0, 0.0,  1.0, 1.0,  0.0, 1.0,  0.0, 0.0,	// up		v4, v5, v6, v7
		1.0, 0.0,  0.0, 0.0,  1.0, 1.0,  0.0, 1.0,	// front	v0, v3, v4, v7
		0.0, 0.0,  1.0, 0.0,  0.0, 1.0,  1.0, 1.0,	// back		v1, v2, v5, v6
		1.0, 1.0,  1.0, 0.0,  0.0, 0.0,  0.0, 1.0,	// down		v0, v1, v2, v3
		0.0, 0.0,  1.0, 0.0,  0.0, 1.0,  1.0, 1.0	// left		v2, v3, v6, v7
	]);

	var textureBuffer = initBuffer(textureCoords, 2, gl.FLOAT);

	a_TexCoord = gl.getAttribLocation(gl.program, "a_TexCoord");
	gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(a_TexCoord);

	var t = 0;	// cubes array index
	var innerColor = 0.1;

	var cubeColors = new Object({
		r: null, u: null, f: null,	// right, up, front
		b: null, d: null, l: null	// back, down, left
	});
	
	var cubeTextures = new Object({
		r: inner, u: inner, f: inner,	// right, up, front
		b: inner, d: inner, l: inner	// back, down, left
	});

	cubeColors.__proto__.toString = function () {
		var entries = Object.entries(this);
		entries = entries.map(function (obj) {
			return obj[0] + ": " + (obj[1] == null ? "-" : obj[1]);
		});
		return entries.join(", ");
	};

	// x-axis
	for (var i = -1; i <= 1; i++) {
		var colors = faceColors.slice();

		switch (i) {
			case -1:
				colors.fill(innerColor,  0*3+0,  3*3+2+1);	// right
				break;
			case 0:
				colors.fill(innerColor,  0*3+0,  3*3+2+1);	// right
				colors.fill(innerColor, 20*3+0, 23*3+2+1);	// left
				break;
			case +1:
				colors.fill(innerColor, 20*3+0, 23*3+2+1);	// left
				break;
		}

		var backup1 = colors.slice();

		switch (i) {
			case -1:
				cubeColors.l = colorG;
				cubeTextures.l = colorG;
				break;
			case 0:
				cubeColors.f = null;
				cubeColors.u = null;
				cubeColors.l = null;
				cubeTextures.f = inner;
				cubeTextures.u = inner;
				cubeTextures.l = inner;
				break;
			case +1:
				cubeColors.f = null;
				cubeColors.u = null;
				cubeColors.r = colorB;
				cubeTextures.f = inner;
				cubeTextures.u = inner;
				cubeTextures.r = colorB;
				break;
		}

		// y-axis
		for (var j = -1; j <= 1; j++) {
			colors = backup1.slice();

			switch (j) {
				case -1:
					colors.fill(innerColor,  4*3+0,  7*3+2+1);	// up
					break;
				case 0:
					colors.fill(innerColor,  4*3+0,  7*3+2+1);	// up
					colors.fill(innerColor, 16*3+0, 19*3+2+1);	// down
					break;
				case +1:
					colors.fill(innerColor, 16*3+0, 19*3+2+1);	// down
					break;
			}

			var backup2 = colors.slice();

			switch (j) {
				case -1:
					cubeColors.d = colorY;
					cubeTextures.d = colorY;
					break;
				case 0:
					cubeColors.f = null;
					cubeColors.d = null;
					cubeTextures.f = inner;
					cubeTextures.d = inner;
					break;
				case +1:
					cubeColors.f = null;
					cubeColors.u = colorW;
					cubeTextures.f = inner;
					cubeTextures.u = colorW;
					break;
			}

			// z-axis
			for (var k = -1; k <= 1; k++) {
				colors = backup2.slice();

				switch (k) {
					case -1:
						colors.fill(innerColor,  8*3+0, 11*3+2+1);	// front
						break;
					case 0:
						colors.fill(innerColor,  8*3+0, 11*3+2+1);	// front
						colors.fill(innerColor, 12*3+0, 15*3+2+1);	// back
						break;
					case +1:
						colors.fill(innerColor, 12*3+0, 15*3+2+1);	// back
						break;
				}

				switch (k) {
					case -1:
						cubeColors.b = colorO;
						cubeTextures.b = colorO;
						break;
					case 0:
						cubeColors.b = null;
						cubeTextures.b = inner;
						break;
					case +1:
						cubeColors.f = colorR;
						cubeTextures.f = colorR;
						break;
				}

				var vertices = offsets.map(function (value, index) {
					switch (index % 3) {
						case 0: return i*gap + value;
						case 1: return j*gap + value;
						case 2: return k*gap + value;
					}
				});

				// register cube information
				cubes[t++] = new Object({
					vertexBuffer: initBuffer(vertices, 3, gl.FLOAT),
					colorBuffer: initBuffer(colors, 3, gl.FLOAT),
					rotationMatrix: (new Matrix4()).setIdentity(),
					position: {x: i, y: j, z: k},
					type: cubeType([i, j, k]),
					// orientation: {x: 0, y: 0, z: 0},
					faceColors: Object.assign({}, cubeColors),
					faceTextures: Object.assign({}, cubeTextures)
				});

			} // z-axis
		} // y-axis
	} // x-axis

	var indices = new Uint8Array([
		 0,  1,  2,   1,  2,  3,	// right
		 4,  5,  6,   4,  6,  7,	// up
		 8,  9, 10,   9, 10, 11,	// front
		12, 13, 14,  13, 14, 15,	// back
		16, 17, 18,  16, 18, 19,	// down
		20, 21, 22,  21, 22, 23		// left
	]);

	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	return indices.length;
}

function initTextures() {
	var images = "BWROYG".split("");
	images = images.map(function (face) { return "../img/pantone" + face + ".png"; });
	images.push("../img/inner.png");

	var textureUnits = (new Array(images.length)).fill(null);
	textureUnits = textureUnits.map(function (value, index) { return gl["TEXTURE" + index]; });

	// gl.TEXTURE0 -> blue
	// gl.TEXTURE1 -> white
	// gl.TEXTURE2 -> red
	// gl.TEXTURE3 -> orange
	// gl.TEXTURE4 -> yellow
	// gl.TEXTURE5 -> green
	// gl.TEXTURE6 -> inner

	var textureReady = (new Array(images.length)).fill(false);

	var initTexture = function (source, index) {
		var texture = gl.createTexture();

		var image = new Image();
		image.onload = function () {
			gl.activeTexture(textureUnits[index]);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
			textureReady[index] = true;

			var ready = textureReady.every(function (value) { return value; });
			if (ready) draw();
		};
		image.src = source;
	};

	images.forEach(initTexture);
}