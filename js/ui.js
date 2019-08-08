var buttonTheory, buttonManual;
var buttonShuffle;
var rotateGroups;
var generatorGroup, inputText, buttonPlay, buttonReverse;
var buttonReset, buttonSolve;

function init() {

	// keyboard shortcuts
	document.onkeydown = shortcuts;

	// shuffle button
	buttonShuffle = document.getElementsByClassName("shuffle")[0];
	buttonShuffle.onclick = shuffle;

	// rotate buttons
	rotateGroups = document.getElementsByClassName("rotate-group");
	for (var i = 0; i < rotateGroups.length; i++) {
		var caption = rotateGroups[i].getElementsByClassName("caption")[0];
		var rotateR = rotateGroups[i].getElementsByClassName("rotate-right")[0];
		var rotateL = rotateGroups[i].getElementsByClassName("rotate-left")[0];

		var angle = 90;

		switch (caption.innerText.toLowerCase()) {
			case "x-axis":
				rotateL.onclick = function (event) { rotateCubeAnimation(+angle, axisX); };
				rotateR.onclick = function (event) { rotateCubeAnimation(-angle, axisX); };
				break;
			case "y-axis":
				rotateL.onclick = function (event) { rotateCubeAnimation(+angle, axisY); };
				rotateR.onclick = function (event) { rotateCubeAnimation(-angle, axisY); };
				break;
			case "z-axis":
				rotateL.onclick = function (event) { rotateCubeAnimation(+angle, axisZ); };
				rotateR.onclick = function (event) { rotateCubeAnimation(-angle, axisZ); };
				break;
			case "right":
				rotateL.onclick = function (event) { rotateFaceAnimation(+angle, faceR); };
				rotateR.onclick = function (event) { rotateFaceAnimation(-angle, faceR); };
				break;
			case "up":
				rotateL.onclick = function (event) { rotateFaceAnimation(+angle, faceU); };
				rotateR.onclick = function (event) { rotateFaceAnimation(-angle, faceU); };
				break;
			case "front":
				rotateL.onclick = function (event) { rotateFaceAnimation(+angle, faceF); };
				rotateR.onclick = function (event) { rotateFaceAnimation(-angle, faceF); };
				break;
			case "back":
				rotateL.onclick = function (event) { rotateFaceAnimation(-angle, faceB); };
				rotateR.onclick = function (event) { rotateFaceAnimation(+angle, faceB); };
				break;
			case "down":
				rotateL.onclick = function (event) { rotateFaceAnimation(-angle, faceD); };
				rotateR.onclick = function (event) { rotateFaceAnimation(+angle, faceD); };
				break;
			case "left":
				rotateL.onclick = function (event) { rotateFaceAnimation(-angle, faceL); };
				rotateR.onclick = function (event) { rotateFaceAnimation(+angle, faceL); };
				break;
		}
	}

	// generator
	generatorGroup = document.getElementsByClassName("generator-group")[0];
	inputText = generatorGroup.getElementsByClassName("input-text")[0];
	buttonPlay = generatorGroup.getElementsByClassName("play")[0];
	buttonReverse = generatorGroup.getElementsByClassName("reverse")[0];

	inputText.onfocus = function (event) {
		document.onkeydown = null;
	};

	inputText.addEventListener("focusout", function (event) {
		document.onkeydown = shortcuts;
	});

	buttonPlay.onclick = playGenerator;

	buttonReverse.onclick = function (event) {
		var generator = inputText.value;

		if (!validateGenerator(generator)) {
			alert("Invalid Generator");
			return;
		}

		inputText.value = reverseGenerator(generator);
	};

	// reset button
	buttonReset = document.getElementsByClassName("reset")[0];
	buttonReset.onclick = reset;

	// solve button
	buttonSolve = document.getElementsByClassName("solve")[0];
	buttonSolve.onclick = solve;

	// draw the Rubik's Cube
	main();
}

function validateGenerator(generator) {
	generator = generator.split("");
	if (generator.length == 0) return false;

	var moves = "xyzrufbdl";
	moves += moves.toUpperCase();

	var test = function (value) {
		return moves.includes(value);
	};

	return generator.every(test);
}

function reverseGenerator(generator) {
	generator = generator.split("");

	generator = generator.map(function (value) {
		return isLowerCase(value) ? value.toUpperCase() : value.toLowerCase();
	});

	generator.reverse();

	return generator.join("");
}

// handlers

function shortcuts(event) {
	var angle = 90 * (event.shiftKey ? -1 : +1);
	switch (event.keyCode) {
		// cube rotation
		case 88:	// X
			rotateCubeAnimation(angle, axisX);
			break;
		case 89:	// Y
			rotateCubeAnimation(angle, axisY);
			break;
		case 90:	// Z
			rotateCubeAnimation(angle, axisZ);
			break;
		// face rotation
		case 82:	// R
			rotateFaceAnimation(+angle, faceR);
			break;
		case 85:	// U
			rotateFaceAnimation(+angle, faceU);
			break;
		case 70:	// F
			rotateFaceAnimation(+angle, faceF);
			break;
		case 66:	// B
			rotateFaceAnimation(-angle, faceB);
			break;
		case 68:	// D
			rotateFaceAnimation(-angle, faceD);
			break;
		case 76:	// L
			rotateFaceAnimation(-angle, faceL);
			break;
		// unassigned key
		default: return;
	}
}

function shuffle(event) {
	// restore the cube
	reset();

	var moves = "rRuUfFbBdDlL".split("");
	var generator = [];
	var len = 0;

	while ((len = generator.length) < 20) {
		// random number between 0 and 11
		var i = Math.floor(Math.random() * 12);

		if (generator.length == 0) {
			generator.push(i);
			continue;
		}

		if (i % 2 == 0) {
			if (generator[len-1] == i+1) continue;
		} else {
			if (generator[len-1] == i-1) continue;
		}

		if (len >= 2) {
			if ((generator[len-2] == generator[len-1]) && (generator[len-1] == i)) continue;
		}

		generator.push(i);
	}

	generator = generator.map(function (key) { return moves[key]; });

	// clear the stack moves
	stack = [];

	executeGenerator(generator.join(""));
}

function playGenerator(event) {
	var generator = inputText.value;

	if (!validateGenerator(generator)) {
		alert("Invalid Generator");
		return;
	}

	executeGenerator(generator);
}

function reset(event) {

	if (stack.length == 0) return;

	// normalize with respect to the cube rotations along axes x, y, z

	var dict = {
		x: { r: "r", u: "f", f: "d", b: "u", d: "b", l: "l" },
		X: { r: "r", u: "b", f: "u", b: "d", d: "f", l: "l" },
		y: { r: "b", u: "u", f: "r", b: "l", d: "d", l: "f" },
		Y: { r: "f", u: "u", f: "l", b: "r", d: "d", l: "b" },
		z: { r: "u", u: "l", f: "f", b: "b", d: "r", l: "d" },
		Z: { r: "d", u: "r", f: "f", b: "b", d: "l", l: "u" }
	};

	for (var i = 0; i < stack.length; i++) {
		if (stack[i].toLowerCase() == "x" || stack[i].toLowerCase() == "y" || stack[i].toLowerCase() == "z") {
			var key = stack.splice(i--, 1);
			for (var j = 0; j <= i; j++) {
				if (isLowerCase(stack[j])) {
					stack[j] = dict[key][stack[j]];
				} else {
					stack[j] = dict[key][stack[j].toLowerCase()].toUpperCase();
				}
			}
		}
	}

	// eliminate all the identities

	var flag = true;
	while (flag) {
		flag = false;
		for (var i = 0; i < stack.length-1; i++) {
			if (stack[i] == swapCase(stack[i+1])) {
				stack.splice(i--, 2);
				flag = true;
			}
		}
	}

	if (stack.length == 0) return;

	// clear the stack moves
	stack = [];
	// restore the cube
	// main();
	restart();
}

// naive solver
function solve(event) {

	if (stack.length == 0) return;

	// 1st step: normalize with respect to the cube rotations along axes x, y, z

	var dict = {
		x: { r: "r", u: "f", f: "d", b: "u", d: "b", l: "l" },
		X: { r: "r", u: "b", f: "u", b: "d", d: "f", l: "l" },
		y: { r: "b", u: "u", f: "r", b: "l", d: "d", l: "f" },
		Y: { r: "f", u: "u", f: "l", b: "r", d: "d", l: "b" },
		z: { r: "u", u: "l", f: "f", b: "b", d: "r", l: "d" },
		Z: { r: "d", u: "r", f: "f", b: "b", d: "l", l: "u" }
	};

	for (var i = 0; i < stack.length; i++) {
		if ("xyz".includes(stack[i].toLowerCase())) {
			var key = stack.splice(i--, 1);
			for (var j = 0; j <= i; j++) {
				if (isLowerCase(stack[j])) {
					stack[j] = dict[key][stack[j]];
				} else {
					stack[j] = dict[key][stack[j].toLowerCase()].toUpperCase();
				}
			}
		}
	}

	// 2nd step: eliminate all the identities

	var flag = true;
	while (flag) {
		flag = false;
		for (var i = 0; i < stack.length-1; i++) {
			if (stack[i] == swapCase(stack[i+1])) {
				stack.splice(i--, 2);
				flag = true;
			}
		}
	}

	// 3rd step: replace the sets of three moves equal with a single reverse move

	if (stack.length >= 3) {
		var flag = true;
		while (flag) {
			flag = false;
			for (var i = 0; i < stack.length-2; i++) {
				if ((stack[i] == stack[i+1]) && (stack[i+1] == stack[i+2])) {
					stack.splice(i, 3, swapCase(stack[i--]));
					flag = true;
				}
			}
		}
	}

	if (stack.length == 0) return;

	var generator = reverseGenerator(stack.join(""));

	solver = true;
	executeGenerator(generator);
}

function toggleHandlers() {

	document.onkeydown = (document.onkeydown == null) ? shortcuts : null;

	// rotate buttons
	for (var i = 0; i < rotateGroups.length; i++) {
		var caption = rotateGroups[i].getElementsByClassName("caption")[0];
		var rotateR = rotateGroups[i].getElementsByClassName("rotate-right")[0];
		var rotateL = rotateGroups[i].getElementsByClassName("rotate-left")[0];

		var angle = 90;

		switch (caption.innerText) {
			case "x-axis":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateCubeAnimation(+angle, axisX); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateCubeAnimation(-angle, axisX); } : null;
				break;
			case "y-axis":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateCubeAnimation(+angle, axisY); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateCubeAnimation(-angle, axisY); } : null;
				break;
			case "z-axis":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateCubeAnimation(+angle, axisZ); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateCubeAnimation(-angle, axisZ); } : null;
				break;
			case "right":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateFaceAnimation(+angle, faceR); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateFaceAnimation(-angle, faceR); } : null;
				break;
			case "up":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateFaceAnimation(+angle, faceU); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateFaceAnimation(-angle, faceU); } : null;
				break;
			case "front":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateFaceAnimation(+angle, faceF); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateFaceAnimation(-angle, faceF); } : null;
				break;
			case "back":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateFaceAnimation(-angle, faceB); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateFaceAnimation(+angle, faceB); } : null;
				break;
			case "down":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateFaceAnimation(-angle, faceD); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateFaceAnimation(+angle, faceD); } : null;
				break;
			case "left":
				rotateL.onclick = (rotateL.onclick == null) ? function (event) { rotateFaceAnimation(-angle, faceL); } : null;
				rotateR.onclick = (rotateR.onclick == null) ? function (event) { rotateFaceAnimation(+angle, faceL); } : null;
				break;
		}
	}

	buttonShuffle.onclick = (buttonShuffle.onclick == null) ? shuffle : null;

	buttonPlay.onclick = (buttonPlay.onclick == null) ? playGenerator : null;

	buttonReset.onclick = (buttonReset.onclick == null) ? reset : null;

	buttonSolve.onclick = (buttonSolve.onclick == null) ? solve : null;
}