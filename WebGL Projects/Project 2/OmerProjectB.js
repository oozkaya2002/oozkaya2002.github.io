//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// BasicShapes.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		--converted from 2D to 4D (x,y,z,w) vertices
//		--extend to other attributes: color, surface normal, etc.
//		--demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//		--create several canonical 3D shapes borrowed from 'GLUT' library:
//		--Demonstrate how to make a 'stepped spiral' tri-strip,  and use it
//			to build a cylinder, sphere, and torus.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables
var ANGLE_STEP = 45.0;		// Rotation angle rate (degrees/second)
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + (r,g,b)color
													// Later, see if you can add:
													// (x,y,z) surface normal + (tx,ty) texture addr.
// Center of Projection; these vars are gonna change
var camX = 0.0; 
var camY = 6.0;
var camZ = 3.0;

// Where we're looking at; these vars are gonna change
var pointX = 0.0;
var pointY = 0.0;
var pointZ = 0.0;

var theta = 0.0;

var isRun = false;
var lastMS = Date.now();

//Time-dependent parameters:
var bird_angle = 0; //Initial rotation
var bird_angle_rate = 45.0; //Initial rotation speed (Deg/Sec)

var bird_x = 0.0;
var bird_y = 0.0;
var bird_period = 10000;

var octagon_move = 0.0;
var octagon_move_rate = 30;

var angle_2 = 0;
var angle_2_rate = 40.0;

var star_angle = 0.0;
var star_angle_rate = 30;

var angle_bounds = 20.0;

//Mouse Controls

var g_isDrag = false;
var g_xMclik = 0.0;
var g_yMclik = 0.0;
var g_xMdragTot = 0.0;
var g_yMdragTot = 0.0;
var g_digits=5;

var quatMatrix = new Matrix4();
var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)

function main() {
	//==============================================================================
	// Retrieve <canvas> element
	var canvas = document.getElementById('webgl');
	canvas.width = innerWidth;
	canvas.height = innerWidth * 0.375;

	// Get the rendering context for WebGL
	var gl = getWebGLContext(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to intialize shaders.');
		return;
	}

	// 
	var n = initVertexBuffer(gl);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	// Specify the color for clearing <canvas>
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
	gl.enable(gl.DEPTH_TEST); 	 
	 
	// Get handle to graphics system's storage location of u_ModelMatrix
	var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if (!u_ModelMatrix) { 
		console.log('Failed to get the storage location of u_ModelMatrix');
		return;
	}
	// Create a local version of our model matrix in JavaScript 
	var modelMatrix = new Matrix4();

	// Create, init current rotation angle value in JavaScript
	var currentAngle = 0.0;

	window.addEventListener("keydown", myKeyDown, false);
    window.addEventListener("keyup", myKeyUp, false);

	canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
  					// when user's mouse button goes down, call mouseDown() function
	canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
											// when the mouse moves, call mouseMove() function					
	canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, canvas)};


	//-----------------  
	// Start drawing: create 'tick' variable whose value is this function:
	var tick = function() {
		currentAngle = animate(currentAngle);  // Update the rotation angle
		// canvas.width = innerWidth;
		// canvas.height = innerWidth*0.375;

		drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix);   // Draw shapes
		// report current angle on console
		//console.log('currentAngle=',currentAngle);
		requestAnimationFrame(tick, canvas);   
											// Request that the browser re-draw the webpage
	};
	tick();							// start (and continue) animation: draw current image
		
	}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.
 
	// Make each 3D shape in its own array of vertices:
	makeCylinder();					// create, fill the cylVerts array
	makeSphere();						// create, fill the sphVerts array
	makeTorus();						// create, fill the torVerts array
	makeGroundGrid();				// create, fill the gndVerts array
	
	make3DAxes();
	makeDiamond();
	makeOctPyramid();
	makeStar1();
	makeStar2();
	makeOctPrism();
	makeSmallAxes();


	// how many floats total needed to store all shapes?
	var mySiz = (cylVerts.length + sphVerts.length + torVerts.length + gndVerts.length + axesVerts.length +
				diamondVerts.length + octPyramidVerts.length + star1Verts.length + star2Verts.length + octPrismVerts.length + 
				axesSmallVerts.length);						

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
  	var colorShapes = new Float32Array(mySiz);

	// Copy them:  remember where to start for each shape:
	cylStart = 0;							// we stored the cylinder first.
  	for(i=0,j=0; j< cylVerts.length; i++,j++) {
  		colorShapes[i] = cylVerts[j];
		}
	
	sphStart = i;						// next, we'll store the sphere;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
		}
	
	torStart = i;						// next, we'll store the torus;
	for(j=0; j< torVerts.length; i++, j++) {
		colorShapes[i] = torVerts[j];
		}
	
	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
		}
		
	diaStart = i;
	for(j = 0; j < diamondVerts.length; i++, j++){
		colorShapes[i] = diamondVerts[j];
	}

	octPyramidStart = i;
	for(j = 0; j < octPyramidVerts.length; i++, j++){
		colorShapes[i] = octPyramidVerts[j]; 
	}

	axesStart = i;
	for(j = 0; j < axesVerts.length; i++, j++){
		colorShapes[i] = axesVerts[j];
	}

	star1Start = i;
	for(j = 0; j < star1Verts.length; i++, j++){
		colorShapes[i] = star1Verts[j];
	}

	star2Start = i;
	for(j = 0; j < star2Verts.length; i++, j++){
		colorShapes[i] = star2Verts[j];
	}

	octPrismStart = i;
	for(j = 0; j< octPrismVerts.length; i++, j++){
		colorShapes[i] = octPrismVerts[j];
	}

	axesSmallStart = i;
	for(j = 0; j < axesSmallVerts.length; i++, j++){
		colorShapes[i] = axesSmallStart[j];
	}

  // Create a buffer object on the graphics hardware:
  	var shapeBufferHandle = gl.createBuffer();  
  	if (!shapeBufferHandle) {
    	console.log('Failed to create the shape buffer object');
    	return false;
  	}

	// Bind the the buffer object to target:
	gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
	// Transfer data from Javascript array colorShapes to Graphics system VBO
	// (Use sparingly--may be slow if you transfer large shapes stored in files)
	gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
		
	//Get graphics system's handle for our Vertex Shader's position-input variable: 
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
	return -1;
	}

  	var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

	// Use handle to specify how to retrieve **POSITION** data from our VBO:
	gl.vertexAttribPointer(
			a_Position, 	// choose Vertex Shader attribute to fill with data
			4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
			gl.FLOAT, 		// data type for each value: usually gl.FLOAT
			false, 				// did we supply fixed-point data AND it needs normalizing?
			FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
										// (x,y,z,w, r,g,b) * bytes/value
			0);						// Offset -- now many bytes from START of buffer to the
										// value we will actually use?
	gl.enableVertexAttribArray(a_Position);  
										// Enable assignment of vertex buffer object's position data

	// Get graphics system's handle for our Vertex Shader's color-input variable;
	var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
	if(a_Color < 0) {
		console.log('Failed to get the storage location of a_Color');
		return -1;
	}
	// Use handle to specify how to retrieve **COLOR** data from our VBO:
	gl.vertexAttribPointer(
							a_Color, 				// choose Vertex Shader attribute to fill with data
							3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
							gl.FLOAT, 			// data type for each value: usually gl.FLOAT
							false, 					// did we supply fixed-point data AND it needs normalizing?
							FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
															// (x,y,z,w, r,g,b) * bytes/value
							FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
										// value we will actually use?  Need to skip over x,y,z,w
										
	gl.enableVertexAttribArray(a_Color);  
										// Enable assignment of vertex buffer object's position data

		//--------------------------------DONE!
	// Unbind the buffer object 
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return nn;
}

// simple & quick-- 
// I didn't use any arguments such as color choices, # of verts,slices,bars, etc.
// YOU can improve these functions to accept useful arguments...
//


// function makePyramid() {
// //==============================================================================
// // Make a 4-cornered pyramid from one OpenGL TRIANGLE_STRIP primitive.
// // All vertex coords are +/1 or zero; pyramid base is in xy plane.

//   	// YOU write this one...
// }


function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]);	// dark gray
 var topColr = new Float32Array([0.4, 0.7, 0.4]);	// light green
 var botColr = new Float32Array([0.5, 0.5, 1.0]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.6;		// radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] = 1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=topColr[0]; 
				cylVerts[j+5]=topColr[1]; 
				cylVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] =-1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=botColr[0]; 
				cylVerts[j+5]=botColr[1]; 
				cylVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] =-1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = botColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
	}
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.
										
	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices; 
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphVerts[j+2] = cos0;		
				sphVerts[j+3] = 1.0;			
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
				sphVerts[j+3] = 1.0;																				// w.		
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];	
				}
			else if(s==slices-1) {
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
			}
			else {
					sphVerts[j+4]=Math.random();// equColr[0]; 
					sphVerts[j+5]=Math.random();// equColr[1]; 
					sphVerts[j+6]=Math.random();// equColr[2];					
			}
		}
	}
}

function makeTorus() {
//==============================================================================
// 		Create a torus centered at the origin that circles the z axis.  
// Terminology: imagine a torus as a flexible, cylinder-shaped bar or rod bent 
// into a circle around the z-axis. The bent bar's centerline forms a circle
// entirely in the z=0 plane, centered at the origin, with radius 'rbend'.  The 
// bent-bar circle begins at (rbend,0,0), increases in +y direction to circle  
// around the z-axis in counter-clockwise (CCW) direction, consistent with our
// right-handed coordinate system.
// 		This bent bar forms a torus because the bar itself has a circular cross-
// section with radius 'rbar' and angle 'phi'. We measure phi in CCW direction 
// around the bar's centerline, circling right-handed along the direction 
// forward from the bar's start at theta=0 towards its end at theta=2PI.
// 		THUS theta=0, phi=0 selects the torus surface point (rbend+rbar,0,0);
// a slight increase in phi moves that point in -z direction and a slight
// increase in theta moves that point in the +y direction.  
// To construct the torus, begin with the circle at the start of the bar:
//					xc = rbend + rbar*cos(phi); 
//					yc = 0; 
//					zc = -rbar*sin(phi);			(note negative sin(); right-handed phi)
// and then rotate this circle around the z-axis by angle theta:
//					x = xc*cos(theta) - yc*sin(theta) 	
//					y = xc*sin(theta) + yc*cos(theta)
//					z = zc
// Simplify: yc==0, so
//					x = (rbend + rbar*cos(phi))*cos(theta)
//					y = (rbend + rbar*cos(phi))*sin(theta) 
//					z = -rbar*sin(phi)
// To construct a torus from a single triangle-strip, make a 'stepped spiral' 
// along the length of the bent bar; successive rings of constant-theta, using 
// the same design used for cylinder walls in 'makeCyl()' and for 'slices' in 
// makeSphere().  Unlike the cylinder and sphere, we have no 'special case' 
// for the first and last of these bar-encircling rings.
//
var rbend = 1.0;										// Radius of circle formed by torus' bent bar
var rbar = 0.5;											// radius of the bar we bent to form torus
var barSlices = 23;									// # of bar-segments in the torus: >=3 req'd;
																		// more segments for more-circular torus
var barSides = 13;										// # of sides of the bar (and thus the 
																		// number of vertices in its cross-section)
																		// >=3 req'd;
																		// more sides for more-circular cross-section
// for nice-looking torus with approx square facets, 
//			--choose odd or prime#  for barSides, and
//			--choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
// EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

	// Create a (global) array to hold this torus's vertices:
 torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
//	Each slice requires 2*barSides vertices, but 1st slice will skip its first 
// triangle and last slice will skip its last triangle. To 'close' the torus,
// repeat the first 2 vertices at the end of the triangle-strip.  Assume 7

var phi=0, theta=0;										// begin torus at angles 0,0
var thetaStep = 2*Math.PI/barSlices;	// theta angle between each bar segment
var phiHalfStep = Math.PI/barSides;		// half-phi angle between each side of bar
																			// (WHY HALF? 2 vertices per step in phi)
	// s counts slices of the bar; v counts vertices within one slice; j counts
	// array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
	for(s=0,j=0; s<barSlices; s++) {		// for each 'slice' or 'ring' of the torus:
		for(v=0; v< 2*barSides; v++, j+=7) {		// for each vertex in this slice:
			if(v%2==0)	{	// even #'d vertices at bottom of slice,
				torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
																						 Math.cos((s)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
																						 Math.sin((s)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			else {				// odd #'d vertices at top of slice (s+1);
										// at same phi used at bottom of slice (v-1)
				torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
																						 Math.cos((s+1)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
																						 Math.sin((s+1)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
		}
	}
	// Repeat the 1st 2 vertices of the triangle strip to complete the torus:
			torVerts[j  ] = rbend + rbar;	// copy vertex zero;
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
			torVerts[j+1] = 0.0;
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
			j+=7; // go to next vertex:
			torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
			torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([0.5, 0.2, 0.3]);	// bright yellow
 	var yColr = new Float32Array([1.0, 0.8, 0.2]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function makeDiamond() {
//==============================================================================
	diamondVerts = new Float32Array ([
        0.0,0.0,1.0,1.0,    0.5,-0.3,0.9,
        0.5769230769230769,0.5769230769230769,0.0,1.0,  1.0,0.12,0.0,
        0.5769230769230769,-0.5769230769230769,0.0,1.0, 0.0,1.0,0.3,
        
        0.0,0.0,1.0,1.0,    0.0,0.25,1.0,
        0.5769230769230769,-0.5769230769230769,0.0,1.0, 0.0,0.3,-0.5,
        -0.5769230769230769,-0.5769230769230769,0.0,1.0,    0.0,0.25,-0.37,
        
        0.0,0.0,1.0,1.0,    1.0,0.0,-0.37,
        -0.5769230769230769,-0.5769230769230769,0.0,1.0,    0.3,1.0,-0.37,
        -0.5769230769230769,0.5769230769230769,0.0,1.0, 0.1,0.23,1.0,
        
        0.0,0.0,1.0,1.0,1.0,-0.25,-0.37,
        -0.5769230769230769,0.5769230769230769,0.0,1.0, 0.2,1.0,-0.37,
        0.5769230769230769,0.5769230769230769,0.0,1.0,  0.3,-0.25,1.0,
        
        0.0,0.0,-1.0,1.0,   1.0,0.0,0.37,
        -0.5769230769230769,0.5769230769230769,0.0,1.0,  0.25,1.0,0.37,
        -0.5769230769230769,-0.5769230769230769,0.0,1.0, 0.25,1.0,1.0,
        
        0.0,0.0,-1.0,1.0,   0.12,0.25,0.37,
        -0.5769230769230769,-0.5769230769230769,0.0,1.0, 1.0,0.25,0.37,
        0.5769230769230769,-0.5769230769230769,0.0,1.0, 0.12,1.0,0.25,
        
        0.0,0.0,-1.0,1.0,   -0.25,0.0,0.37,
        0.5769230769230769,-0.5769230769230769,0.0,1.0, -0.25,1.0,0.37,
        0.5769230769230769,0.5769230769230769,0.0,1.0,  -0.25,1.0,0.37,
        
        0.0,0.0,-1.0,1.0,   0.85,-0.85,0.0,
        0.5769230769230769,0.5769230769230769,0.0,1.0,  0.2,-0.85,0.0,
        0.0,0.0,1.0,1.0,0.5,-0.85,0.0,
        
        0.0,0.0,-1.0,1.0,   -0.85,0.65,0.0,
        0.0,0.0,-1.0,1.0,    -0.85,0.15,0.0,
        -0.5769230769230769,0.5769230769230769,0.0,1.0, 0.85,0.2,0.0,

        0.0, 0.0, -1.0, 1.0,  0.35, 0.1, 0.85,
        0.5769230769230769, 0.5769230769230769, 0.0, 1.0, 0.85, 0.35, 0.10,
        -0.5769230769230769, 0.5769230769230769, 0.0, 1.0, 0.1, 0.85, 0.35,
	]);
}

// 24 Vertices
function makeOctPyramid(){
	octPyramidVerts = new Float32Array([
		1.0, 0.0, 0.5, 1.0, 1.0, 0.32, 1.0,
        0.0, 1.0, 0.0, 1.0, 0.15, 1.0, 1.0,
        0.5, 0.0, 1.0, 1.0, 0.24, 0.2, 0.85,

        0.5, 0.0, 1.0, 1.0, 1.0, 0.23, 0.45,
        0.0, 1.0, 0.0, 1.0, 0.5, 1.0, -0.23,
        -0.5, 0.0, 1.0, 1.0, 0.78, 0.53, 1.0,

        -0.5, 0.0, 1.0, 1.0,  0.2, 0.6, -0.59,
        0.0, 1.0, 0.0, 1.0,   0.9, 0.59, 1.0,
		-1.0, 0.0, 0.5, 1.0,  0.12, 0.2, 0.43,

        -1.0, 0.0, 0.5, 1.0,  0.86, 0.53, 0.43,
        0.0, 1.0, 0.0, 1.0,   0.2, .64, 0.32,
		-1.0, 0.0, -0.5, 1.0, 0.36, 0.87, 0.58,

        -1.0, 0.0, -0.5, 1.0, 0.96, 0.78, 0.98,
        0.0, 1.0, 0.0, 1.0,   0.6, 0.54, 0.2,
		-0.5, 0.0, -1.0, 1.0, 0.0, 0.26, 0.0,
		
		-0.5, 0.0, -1.0, 1.0, 0.75, 1.0, 0.23,
        0.0, 1.0, 0.0, 1.0,   0.23, 0.85, 0.14,
		0.5, 0.0, -1.0, 1.0,  0.0, 1.0, 0.56,

        0.5, 0.0, -1.0, 1.0,  0.63, 0.50, 0.0,
        0.0, 1.0, 0.0, 1.0,   0.0, 1.0, 0.68,
		1.0, 0.0, -0.5, 1.0,  0.40, 0.8, 0.55, 

        1.0, 0.0, -0.5, 1.0,  0.53, 0.8, 0.9, 
        0.0, 1.0, 0.0, 1.0,   0.85, 0.3, 0.0,
        1.0, 0.0, 0.5, 1.0,   0.65, 0.53, 0.4,
	])
}

// 108 vertices
function makeStar1(){
	star1Verts = new Float32Array([
		
		0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,   0.4472135954999579,0.25,0.8944271909999159,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,  0.8944271909999159,0.4472135954999579,0.25,
        1.0,-0.1428571428571429,-0.1428571428571429,1.0,    0.25,0.8944271909999159,0.4472135954999579,
        
        0.1428571428571428,-0.1428571428571429,0.7142857142857142,1.0,  0.15, 0.30, 0.75,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,  0.75, 0.15, 0.30,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,   0.30, 0.75, 0.15,
        
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0, 0.90, 0.6, 0.30,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,  0.30, 0.90, 0.60,
        -0.7142857142857143,-0.1428571428571429,-0.1428571428571429,1.0,    0.60, 0.30, 0.90,
        
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,-0.0,0.4472135954999579,0.8944271909999159,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,-0.0,0.4472135954999579,0.8944271909999159,
        0.1428571428571428,0.7142857142857142,-0.1428571428571429,1.0,-0.0,0.4472135954999579,0.8944271909999159,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,-0.8944271909999159,0.0,0.4472135954999579,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,-0.8944271909999159,0.0,0.4472135954999579,
        0.1428571428571428,-0.1428571428571429,0.7142857142857142,1.0,-0.8944271909999159,0.0,0.4472135954999579,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,0.0,0.8944271909999159,0.4472135954999579,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,0.0,0.8944271909999159,0.4472135954999579,
        0.1428571428571428,-0.1428571428571429,0.7142857142857142,1.0,0.0,0.8944271909999159,0.4472135954999579,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,0.0,-0.4472135954999579,0.8944271909999159,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,0.0,-0.4472135954999579,0.8944271909999159,
        0.1428571428571428,-1.0,-0.1428571428571429,1.0,0.0,-0.4472135954999579,0.8944271909999159,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,0.0,-0.8944271909999159,0.4472135954999579,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,0.0,-0.8944271909999159,0.4472135954999579,
        0.1428571428571428,-0.1428571428571429,0.7142857142857142,1.0,0.0,-0.8944271909999159,0.4472135954999579,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.0,0.4472135954999579,-0.8944271909999159,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,0.0,0.4472135954999579,-0.8944271909999159,
        0.1428571428571428,0.7142857142857142,-0.1428571428571429,1.0,0.0,0.4472135954999579,-0.8944271909999159,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,0.0,1.0,0.0,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,0.0,1.0,0.0,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,0.0,1.0,0.0,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,-0.0,1.0,0.0,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,-0.0,1.0,0.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,-0.0,1.0,0.0,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,-0.4472135954999579,0.8944271909999159,0.0,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,-0.4472135954999579,0.8944271909999159,0.0,
        -0.7142857142857143,-0.1428571428571429,-0.1428571428571429,1.0,-0.4472135954999579,0.8944271909999159,0.0,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.0,-1.0,0.0,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,0.0,-1.0,0.0,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,0.0,-1.0,0.0,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,-0.0,-1.0,-0.0,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,-0.0,-1.0,-0.0,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,-0.0,-1.0,-0.0,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,-0.4472135954999579,0.0,-0.8944271909999159,
        -0.7142857142857143,-0.1428571428571429,-0.1428571428571429,1.0,-0.4472135954999579,0.0,-0.8944271909999159,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,-0.4472135954999579,0.0,-0.8944271909999159,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.4472135954999579,0.8944271909999159,-0.0,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,0.4472135954999579,0.8944271909999159,-0.0,
        1.0,-0.1428571428571429,-0.1428571428571429,1.0,0.4472135954999579,0.8944271909999159,-0.0,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,-0.4472135954999579,-0.8944271909999159,0.0,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,-0.4472135954999579,-0.8944271909999159,0.0,
        -0.7142857142857143,-0.1428571428571429,-0.1428571428571429,1.0,-0.4472135954999579,-0.8944271909999159,0.0,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,-0.8944271909999159,0.4472135954999579,0.0,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,-0.8944271909999159,0.4472135954999579,0.0,
        0.1428571428571428,0.7142857142857142,-0.1428571428571429,1.0,-0.8944271909999159,0.4472135954999579,0.0,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,0.0,0.0,-1.0,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,0.0,0.0,-1.0,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,0.0,0.0,-1.0,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,0.0,0.0,-1.0,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,0.0,0.0,-1.0,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,0.0,0.0,-1.0,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,0.8944271909999159,0.4472135954999581,0.0,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.8944271909999159,0.4472135954999581,0.0,
        0.1428571428571428,0.7142857142857142,-0.1428571428571429,1.0,0.8944271909999159,0.4472135954999581,0.0,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,-0.8944271909999159,-0.4472135954999579,-0.0,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,-0.8944271909999159,-0.4472135954999579,-0.0,
        0.1428571428571428,-1.0,-0.1428571428571429,1.0,-0.8944271909999159,-0.4472135954999579,-0.0,
        1.0,-0.1428571428571429,-0.1428571428571429,1.0,0.4472135954999579,0.0,-0.8944271909999159,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,0.4472135954999579,0.0,-0.8944271909999159,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.4472135954999579,0.0,-0.8944271909999159,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.8944271909999159,0.0,-0.4472135954999581,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,0.8944271909999159,0.0,-0.4472135954999581,
        0.1428571428571428,-0.1428571428571429,-1.0,1.0,0.8944271909999159,0.0,-0.4472135954999581,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,0.4472135954999579,-0.8944271909999159,0.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,0.4472135954999579,-0.8944271909999159,0.0,
        1.0,-0.1428571428571429,-0.1428571428571429,1.0,0.4472135954999579,-0.8944271909999159,0.0,
        0.1428571428571428,-1.0,-0.1428571428571429,1.0,0.8944271909999159,-0.4472135954999581,0.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,0.8944271909999159,-0.4472135954999581,0.0,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,0.8944271909999159,-0.4472135954999581,0.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,-0.0,-0.8944271909999159,-0.4472135954999579,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,-0.0,-0.8944271909999159,-0.4472135954999579,
        0.1428571428571428,-0.1428571428571429,-1.0,1.0,-0.0,-0.8944271909999159,-0.4472135954999579,
        0.1428571428571428,-0.1428571428571429,-1.0,1.0,-0.8944271909999159,0.0,-0.4472135954999579,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,-0.8944271909999159,0.0,-0.4472135954999579,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,-0.8944271909999159,0.0,-0.4472135954999579,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,0.0,0.8944271909999159,-0.4472135954999579,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.0,0.8944271909999159,-0.4472135954999579,
        0.1428571428571428,-0.1428571428571429,-1.0,1.0,0.0,0.8944271909999159,-0.4472135954999579,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,0.0,-0.4472135954999579,-0.8944271909999159,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,0.0,-0.4472135954999579,-0.8944271909999159,
        0.1428571428571428,-1.0,-0.1428571428571429,1.0,0.0,-0.4472135954999579,-0.8944271909999159,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,1.0,0.0,0.0,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,1.0,0.0,0.0,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,1.0,0.0,0.0,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,1.0,0.0,-0.0,
        -0.1428571428571429,0.1428571428571428,0.1428571428571428,1.0,1.0,0.0,-0.0,
        -0.1428571428571429,-0.4285714285714286,0.1428571428571428,1.0,1.0,0.0,-0.0,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,-1.0,-0.0,-0.0,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,-1.0,-0.0,-0.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,-1.0,-0.0,-0.0,
        0.4285714285714286,0.1428571428571428,0.1428571428571428,1.0,-1.0,-0.0,0.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,-1.0,-0.0,0.0,
        0.4285714285714286,-0.4285714285714286,0.1428571428571428,1.0,-1.0,-0.0,0.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,0.0,-0.0,1.0,
        0.4285714285714286,0.1428571428571428,-0.4285714285714286,1.0,0.0,-0.0,1.0,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,0.0,-0.0,1.0,
        0.4285714285714286,-0.4285714285714286,-0.4285714285714286,1.0,0.0,0.0,1.0,
        -0.1428571428571429,0.1428571428571428,-0.4285714285714286,1.0,0.0,0.0,1.0,
        -0.1428571428571429,-0.4285714285714286,-0.4285714285714286,1.0,0.0,0.0,1.0,
	])
}

// 348 vertices
function makeStar2(){
	star2Verts = new Float32Array ([
		// 348 vertices
		0.18454445442864698,-1.0,0.8320414521696045,1.0,    0.35,0.12,0.98,
        0.18448398935142807,-0.9993617575182445,0.8320414521696045, 1.0, 0.98,0.35,0.12,
        0.18416654769602858,-0.9993617575182445,0.8320414521696045, 1.0,0.12,0.98,0.35,
        
        -0.15422793654526057,-1.0,0.8320414521696045,1.0,   0.15,0.55,1.0,
        -0.15385002981264229,-0.9993617575182445,0.8320414521696045,1.0,    1.0,0.15,0.55,
        -0.15416747146804166,-0.9993617575182445,0.8320414521696045,1.0,    0.55,1.0,0.15,

        -0.15416747146804166,-0.9993617575182445,0.8320414521696045,1.0,    0.8112613281846207,0.07685633635430401,0.5796103526976716,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,   0.5796103526976716,0.8112613281846207,0.07685633635430401,
        -0.15422793654526057,-1.0,0.8320414521696045,1.0,                   0.07685633635430401,0.5796103526976716,0.8112613281846207,
        
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.3239325010569709,0.7478969302027099,-0.5794116986671383,
        -0.4283026948949,-0.15649537694097104,0.8320414521696045,1.0,0.3239325010569709,0.7478969302027099,-0.5794116986671383,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,0.3239325010569709,0.7478969302027099,-0.5794116986671383,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.323999356400435,0.7479051482511367,-0.5793637081070482,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,0.323999356400435,0.7479051482511367,-0.5793637081070482,
        -0.1227693005366276,-0.2888299167765396,0.8320414521696045,1.0,0.323999356400435,0.7479051482511367,-0.5793637081070482,
        0.18416654769602858,-0.9993617575182445,0.8320414521696045,1.0,-0.7004340369793172,-0.4147306797903959,-0.58085335763982,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.7004340369793172,-0.4147306797903959,-0.58085335763982,
        0.18454445442864698,-1.0,0.8320414521696045,1.0,-0.7004340369793172,-0.4147306797903959,-0.58085335763982,
        -0.4283026948949,-0.15649537694097104,0.8320414521696045,1.0,-0.6112295245878543,-0.5393201687539987,-0.5792514340485175,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.6112295245878543,-0.5393201687539987,-0.5792514340485175,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,-0.6112295245878543,-0.5393201687539987,-0.5792514340485175,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.8112613281845883,0.07685633635428782,-0.579610352697719,
        0.18448398935142807,-0.9993617575182445,0.8320414521696045,1.0,0.8112613281845883,0.07685633635428782,-0.579610352697719,
        0.18454445442864698,-1.0,0.8320414521696045,1.0,0.8112613281845883,0.07685633635428782,-0.579610352697719,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.8114591771459692,-0.077015261788597,-0.5793122243464406,
        -0.1227693005366276,-0.2888299167765396,0.8320414521696045,1.0,-0.8114591771459692,-0.077015261788597,-0.5793122243464406,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,-0.8114591771459692,-0.077015261788597,-0.5793122243464406,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.8113933767955601,-0.0769607916308824,-0.5794116193552266,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,-0.8113933767955601,-0.0769607916308824,-0.5794116193552266,
        -0.15422793654526057,0.04263627736674591,0.8320414521696045,1.0,-0.8113933767955601,-0.0769607916308824,-0.5794116193552266,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.7004340369795055,-0.4147306797903941,-0.5808533576395943,
        -0.15385002981264229,-0.9993617575182445,0.8320414521696045,1.0,0.7004340369795055,-0.4147306797903941,-0.5808533576395943,
        -0.15422793654526057,-1.0,0.8320414521696045,1.0,0.7004340369795055,-0.4147306797903941,-0.5808533576395943,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.15422793654526057,0.04263627736674591,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.009044567800666758,-0.24336353787885145,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.7017247376806323,0.41465103315210305,-0.579350423520119,
        0.015158258941693203,-0.24401857621539003,0.8320414521696045,1.0,-0.7017247376806323,0.41465103315210305,-0.579350423520119,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,-0.7017247376806323,0.41465103315210305,-0.579350423520119,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.70163272565347,0.4146570849976886,-0.5794575223028019,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,-0.70163272565347,0.4146570849976886,-0.5794575223028019,
        0.18454445442864698,0.04263627736674591,0.8320414521696045,1.0,-0.70163272565347,0.4146570849976886,-0.5794575223028019,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.6112126131383361,-0.5392568732801395,-0.5793282024558568,
        0.4586192127782862,-0.15649537694097104,0.8320414521696045,1.0,0.6112126131383361,-0.5392568732801395,-0.5793282024558568,
        0.23834157729872274,-0.4061657582908538,0.8320414521696045,1.0,0.6112126131383361,-0.5392568732801395,-0.5793282024558568,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.7017212130081937,0.41465305365558863,0.5793532465675884,
        0.009044567800666758,-0.24336353787885145,0.8320414521696045,1.0,0.7017212130081937,0.41465305365558863,0.5793532465675884,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,0.7017212130081937,0.41465305365558863,0.5793532465675884,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.7017741312458556,0.41464958305441385,0.5792916294811495,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,0.7017741312458556,0.41464958305441385,0.5792916294811495,
        -0.160341627686287,0.04329131570328437,0.8320414521696045,1.0,0.7017741312458556,0.41464958305441385,0.5792916294811495,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.323933416930189,0.7478980117821072,-0.5794097905354235,
        0.1530858184200139,-0.2888299167765396,0.8320414521696045,1.0,-0.323933416930189,0.7478980117821072,-0.5794097905354235,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,-0.323933416930189,0.7478980117821072,-0.5794097905354235,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.3239668701034173,0.7479192189140238,-0.57936371050872,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,-0.3239668701034173,0.7479192189140238,-0.57936371050872,
        0.4586192127782862,-0.15649537694097104,0.8320414521696045,1.0,-0.3239668701034173,0.7479192189140238,-0.57936371050872,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.3239915916307218,0.7479351971158555,0.5793292582529024,
        -0.12888299167765405,-0.2881916742947841,0.8320414521696045,1.0,0.3239915916307218,0.7479351971158555,0.5793292582529024,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,0.3239915916307218,0.7479351971158555,0.5793292582529024,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.32398721803430364,0.7479324137659062,0.5793352975511658,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,0.32398721803430364,0.7479324137659062,0.5793352975511658,
        -0.43441638603592636,-0.15584033860443247,0.8320414521696045,1.0,0.32398721803430364,0.7479324137659062,0.5793352975511658,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.4586192127782862,-0.8008851415470661,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.23834157729872274,-0.5511979643424002,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.23834157729872274,-0.5511979643424002,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.2322278861576963,-0.5505597218606448,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.5633077756409719,-0.47869025924401865,0.8320414521696045,1.0,0.1775315395175469,0.7954794410804752,-0.5793919323694666,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.1775315395175469,0.7954794410804752,-0.5793919323694666,
        0.23834157729872274,-0.4061657582908538,0.8320414521696045,1.0,0.1775315395175469,0.7954794410804752,-0.5793919323694666,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.1775315395175469,0.7954794410804753,-0.5793919323694666,
        -0.5329912577575855,-0.47869025924401865,0.8320414521696045,1.0,-0.1775315395175469,0.7954794410804753,-0.5793919323694666,
        -0.20802505941533633,-0.4061657582908538,0.8320414521696045,1.0,-0.1775315395175469,0.7954794410804753,-0.5793919323694666,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.18454445442864698,0.04263627736674591,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.14697212727898767,-0.2881916742947841,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        0.17843076328762075,0.04329131570328437,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        0.015158258941693203,-0.24401857621539003,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.8114566849945667,-0.07701212495614276,-0.5793161321656491,
        0.18454445442864698,0.04263627736674591,0.8320414521696045,1.0,0.8114566849945667,-0.07701212495614276,-0.5793161321656491,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,0.8114566849945667,-0.07701212495614276,-0.5793161321656491,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.8115131426133332,-0.07713549714208269,-0.579220626744659,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,0.8115131426133332,-0.07713549714208269,-0.579220626744659,
        0.1530858184200139,-0.2888299167765396,0.8320414521696045,1.0,0.8115131426133332,-0.07713549714208269,-0.579220626744659,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.6111939781221714,0.5391871475234349,-0.5794127553417653,
        -0.4283026948949,-0.8008851415470661,0.8320414521696045,1.0,-0.6111939781221714,0.5391871475234349,-0.5794127553417653,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,-0.6111939781221714,0.5391871475234349,-0.5794127553417653,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.6111998623066344,0.539209722005252,-0.5793855400433896,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,-0.6111998623066344,0.539209722005252,-0.5793855400433896,
        -0.20802505941533633,-0.5511979643424002,0.8320414521696045,1.0,-0.6111998623066344,0.539209722005252,-0.5793855400433896,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.7017210603695819,0.41465240112582286,-0.5793538984717191,
        -0.15422793654526057,0.04263627736674591,0.8320414521696045,1.0,0.7017210603695819,0.41465240112582286,-0.5793538984717191,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,0.7017210603695819,0.41465240112582286,-0.5793538984717191,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.701762709240407,0.41462926484892915,-0.5793200088469245,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,0.701762709240407,0.41462926484892915,-0.5793200088469245,
        0.015158258941693203,-0.24401857621539003,0.8320414521696045,1.0,0.701762709240407,0.41462926484892915,-0.5793200088469245,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.160341627686287,0.04329131570328437,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.15313284681340644,0.03109080678888465,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.1227693005366276,-0.2888299167765396,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.15416747146804166,-0.9993617575182445,0.8320414521696045,1.0,-0.8113995924838668,0.0769685485786162,-0.5794018845729758,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,-0.8113995924838668,0.0769685485786162,-0.5794018845729758,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.8113995924838668,0.0769685485786162,-0.5794018845729758,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.8114556211720008,0.07701506169849737,-0.5793172318686362,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,-0.8114556211720008,0.07701506169849737,-0.5793172318686362,
        -0.1227693005366276,-0.6685338058567145,0.8320414521696045,1.0,-0.8114556211720008,0.07701506169849737,-0.5793172318686362,
        0.18416654769602858,-0.9993617575182445,0.8320414521696045,1.0,-0.7018932400144701,-0.41465316589876194,-0.579144741521602,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,-0.7018932400144701,-0.41465316589876194,-0.579144741521602,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.7018932400144701,-0.41465316589876194,-0.579144741521602,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.7017373998200215,-0.41466339939304914,-0.5793262352920295,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,-0.7017373998200215,-0.41466339939304914,-0.5793262352920295,
        0.015158258941693203,-0.7133451464178642,0.8320414521696045,1.0,-0.7017373998200215,-0.41466339939304914,-0.5793262352920295,
        0.4586192127782862,-0.15649537694097104,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.23834157729872274,-0.4061657582908538,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.20802505941533633,-0.4061657582908538,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.21413875055636267,-0.4055107199543153,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.5391049488986117,-0.4780352209074801,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.5329912577575855,-0.47869025924401865,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.21413875055636267,-0.5505597218606448,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.8115186936794688,0.07715560471351796,0.5792101712418904,
        -0.12888299167765405,-0.667878767520176,0.8320414521696045,1.0,-0.8115186936794688,0.07715560471351796,0.5792101712418904,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,-0.8115186936794688,0.07715560471351796,0.5792101712418904,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.8114508823987999,0.07700741955189867,0.579324885352051,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,-0.8114508823987999,0.07700741955189867,0.579324885352051,
        -0.160341627686287,-0.9993617575182445,0.8320414521696045,1.0,-0.8114508823987999,0.07700741955189867,0.579324885352051,
        -0.43441638603592636,-0.15584033860443247,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.21413875055636267,-0.4055107199543153,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.20802505941533633,-0.4061657582908538,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.5329912577575855,-0.47869025924401865,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.21413875055636267,-0.4055107199543153,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.5391049488986117,-0.4780352209074801,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        -0.21413875055636267,-0.4055107199543153,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        -0.5329912577575855,-0.47869025924401865,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.7017711526228925,-0.41462442411846845,0.5793132453783234,
        0.009044567800666758,-0.7127069039361085,0.8320414521696045,1.0,-0.7017711526228925,-0.41462442411846845,0.5793132453783234,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,-0.7017711526228925,-0.41462442411846845,0.5793132453783234,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.7017207644462442,-0.4146524168309059,0.5793542456574107,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,-0.7017207644462442,-0.4146524168309059,0.5793542456574107,
        0.17843076328762075,-0.9993617575182445,0.8320414521696045,1.0,-0.7017207644462442,-0.4146524168309059,0.5793542456574107,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.32410387697919363,-0.7479473377216258,0.579250772051439,
        0.14697212727898767,-0.667878767520176,0.8320414521696045,1.0,-0.32410387697919363,-0.7479473377216258,0.579250772051439,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,-0.32410387697919363,-0.7479473377216258,0.579250772051439,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.32398835283300437,-0.7479331496171953,0.5793337129256841,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,-0.32398835283300437,-0.7479331496171953,0.5793337129256841,
        0.45250552163726,-0.8002301032105278,0.8320414521696045,1.0,-0.32398835283300437,-0.7479331496171953,0.5793337129256841,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.7016808554107254,-0.41469581350917273,-0.5793715210536657,
        0.015158258941693203,-0.7133451464178642,0.8320414521696045,1.0,0.7016808554107254,-0.41469581350917273,-0.5793715210536657,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,0.7016808554107254,-0.41469581350917273,-0.5793715210536657,
        -0.15385002981264229,-0.9993617575182445,0.8320414521696045,1.0,0.7017428268255643,-0.41466126165534295,-0.5793211916383391,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.7017428268255643,-0.41466126165534295,-0.5793211916383391,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,0.7017428268255643,-0.41466126165534295,-0.5793211916383391,
        0.5571940844999452,-0.4780352209074801,0.8320414521696045,1.0,0.17753153951754688,-0.7954794410804761,0.5793919323694656,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.17753153951754688,-0.7954794410804761,0.5793919323694656,
        0.2322278861576963,-0.5505597218606448,0.8320414521696045,1.0,0.17753153951754688,-0.7954794410804761,0.5793919323694656,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.3239403254136869,-0.747929649585464,-0.5793650876967302,
        -0.1227693005366276,-0.6685338058567145,0.8320414521696045,1.0,0.3239403254136869,-0.747929649585464,-0.5793650876967302,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,0.3239403254136869,-0.747929649585464,-0.5793650876967302,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.3239929547349619,-0.7479361336603843,-0.5793272868139949,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,0.3239929547349619,-0.7479361336603843,-0.5793272868139949,
        -0.4283026948949,-0.8008851415470661,0.8320414521696045,1.0,0.3239929547349619,-0.7479361336603843,-0.5793272868139949,
        0.18416654769602858,-0.9993617575182445,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.18448398935142807,-0.9993617575182445,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.17753153951754685,-0.7954794410804761,0.5793919323694655,
        -0.5391049488986117,-0.4780352209074801,0.8320414521696045,1.0,-0.17753153951754685,-0.7954794410804761,0.5793919323694655,
        -0.21413875055636267,-0.5505597218606448,0.8320414521696045,1.0,-0.17753153951754685,-0.7954794410804761,0.5793919323694655,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.1775055195829155,-0.7955470912416625,-0.5793070137108035,
        -0.20802505941533633,-0.5511979643424002,0.8320414521696045,1.0,-0.1775055195829155,-0.7955470912416625,-0.5793070137108035,
        -0.5329912577575855,-0.47869025924401865,0.8320414521696045,1.0,-0.1775055195829155,-0.7955470912416625,-0.5793070137108035,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.18448398935142807,-0.9993617575182445,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.14697212727898767,-0.667878767520176,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.6112126131383362,-0.53925687328014,0.5793282024558561,
        -0.43441638603592636,-0.15584033860443247,0.8320414521696045,1.0,-0.6112126131383362,-0.53925687328014,0.5793282024558561,
        -0.21413875055636267,-0.4055107199543153,0.8320414521696045,1.0,-0.6112126131383362,-0.53925687328014,0.5793282024558561,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.611212725047144,-0.5392563386990852,-0.5793285819923802,
        -0.20802505941533633,-0.4061657582908538,0.8320414521696045,1.0,-0.611212725047144,-0.5392563386990852,-0.5793285819923802,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,-0.611212725047144,-0.5392563386990852,-0.5793285819923802,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.8114554741301995,-0.07701114304331862,0.579317958768149,
        -0.160341627686287,0.04329131570328437,0.8320414521696045,1.0,-0.8114554741301995,-0.07701114304331862,0.579317958768149,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,-0.8114554741301995,-0.07701114304331862,0.579317958768149,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.8113191928805529,-0.07671126983960658,0.5795485728938027,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,-0.8113191928805529,-0.07671126983960658,0.5795485728938027,
        -0.12888299167765405,-0.2881916742947841,0.8320414521696045,1.0,-0.8113191928805529,-0.07671126983960658,0.5795485728938027,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.323987218034298,-0.7479324137659025,-0.5793352975511739,
        0.4586192127782862,-0.8008851415470661,0.8320414521696045,1.0,-0.323987218034298,-0.7479324137659025,-0.5793352975511739,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,-0.323987218034298,-0.7479324137659025,-0.5793352975511739,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,-0.3239915916307217,-0.7479351971158552,-0.5793292582529026,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,-0.3239915916307217,-0.7479351971158552,-0.5793292582529026,
        0.1530858184200139,-0.6685338058567145,0.8320414521696045,1.0,-0.3239915916307217,-0.7479351971158552,-0.5793292582529026,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.17753153951754685,0.7954794410804761,0.5793919323694654,
        -0.21413875055636267,-0.4055107199543153,0.8320414521696045,1.0,-0.17753153951754685,0.7954794410804761,0.5793919323694654,
        -0.5391049488986117,-0.4780352209074801,0.8320414521696045,1.0,-0.17753153951754685,0.7954794410804761,0.5793919323694654,
        0.009044567800666758,-0.7127069039361085,0.8320414521696045,1.0,-0.0,0.0,1.0,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,-0.0,0.0,1.0,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,-0.0,0.0,1.0,
        -0.15385002981264229,-0.9993617575182445,0.8320414521696045,1.0,0.0,-0.0,1.0,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,0.0,-0.0,1.0,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,0.0,-0.0,1.0,
        -0.15416747146804166,-0.9993617575182445,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.15385002981264229,-0.9993617575182445,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.1775055195829155,-0.7955470912416625,-0.5793070137108035,
        0.5633077756409719,-0.47869025924401865,0.8320414521696045,1.0,0.1775055195829155,-0.7955470912416625,-0.5793070137108035,
        0.23834157729872274,-0.5511979643424002,0.8320414521696045,1.0,0.1775055195829155,-0.7955470912416625,-0.5793070137108035,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.6111999280716742,0.5392094078205301,-0.5793857630655191,
        0.23834157729872274,-0.5511979643424002,0.8320414521696045,1.0,0.6111999280716742,0.5392094078205301,-0.5793857630655191,
        0.4586192127782862,-0.8008851415470661,0.8320414521696045,1.0,0.6111999280716742,0.5392094078205301,-0.5793857630655191,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.701724008938645,0.41465224463582606,0.579350439110516,
        0.17843076328762075,0.04329131570328437,0.8320414521696045,1.0,-0.701724008938645,0.41465224463582606,0.579350439110516,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,-0.701724008938645,0.41465224463582606,0.579350439110516,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.7016733943189206,0.41468046354029126,0.5793915436584949,
        0.011908261041174928,-0.2385179337739446,0.8320414521696045,1.0,-0.7016733943189206,0.41468046354029126,0.5793915436584949,
        0.009044567800666758,-0.24336353787885145,0.8320414521696045,1.0,-0.7016733943189206,0.41468046354029126,0.5793915436584949,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,-0.0,0.0,1.0,
        -0.4283026948949,-0.8008851415470661,0.8320414521696045,1.0,-0.0,0.0,1.0,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,-0.0,0.0,1.0,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.12888299167765405,-0.667878767520176,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.811302437015073,0.0766739782962933,-0.579576963608478,
        0.1530858184200139,-0.6685338058567145,0.8320414521696045,1.0,0.811302437015073,0.0766739782962933,-0.579576963608478,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,0.811302437015073,0.0766739782962933,-0.579576963608478,
        0.18448398935142807,-0.9993617575182445,0.8320414521696045,1.0,0.8114577620566801,0.07701577077701609,-0.579314138831072,
        0.015158258941693203,-0.47869025924401865,0.6640829043392091,1.0,0.8114577620566801,0.07701577077701609,-0.579314138831072,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,0.8114577620566801,0.07701577077701609,-0.579314138831072,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.8115217968724128,-0.07706493034506938,0.579217894847768,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,0.8115217968724128,-0.07706493034506938,0.579217894847768,
        0.17843076328762075,0.04329131570328437,0.8320414521696045,1.0,0.8115217968724128,-0.07706493034506938,0.579217894847768,
        0.5633077756409719,-0.47869025924401865,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.23834157729872274,-0.4061657582908538,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.5571940844999452,-0.4780352209074801,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.2322278861576963,-0.5505597218606448,0.8320414521696045,1.0,-0.0,0.0,1.0,
        0.23834157729872274,-0.5511979643424002,0.8320414521696045,1.0,-0.0,0.0,1.0,
        0.5571940844999452,-0.4780352209074801,0.8320414521696045,1.0,-0.0,0.0,1.0,
        0.5633077756409719,-0.47869025924401865,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.5571940844999452,-0.4780352209074801,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.23834157729872274,-0.5511979643424002,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.1227693005366276,-0.6685338058567145,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.160341627686287,-0.9993617575182445,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        -0.12921051084592317,-0.6713235973361774,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.2322278861576963,-0.4055107199543153,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.23834157729872274,-0.4061657582908538,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.2322278861576963,-0.4055107199543153,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.5571940844999452,-0.4780352209074801,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.23834157729872274,-0.4061657582908538,0.8320414521696045,1.0,-0.0,-0.0,1.0,
        0.015158258941693203,-0.7133451464178642,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        0.17843076328762075,-0.9993617575182445,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.012289526944750051,-0.7181991484501626,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.45250552163726,-0.15584033860443247,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.1530858184200139,-0.2888299167765396,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,0.0,0.0,-1.0,
        -0.5329912577575855,-0.47869025924401865,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        -0.20802505941533633,-0.5511979643424002,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        -0.21413875055636267,-0.5505597218606448,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        -0.43441638603592636,-0.8002301032105278,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        -0.21413875055636267,-0.5505597218606448,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,0.0,-0.0,-1.0,
        -0.20802505941533633,-0.5511979643424002,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        -0.21413875055636267,-0.5505597218606448,0.8320414521696045,1.0,-0.0,0.0,-1.0,
        0.1530858184200139,-0.6685338058567145,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,-0.0,-0.0,-1.0,
        0.45250552163726,-0.8002301032105278,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.15328232992097557,-0.6706131326788549,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,0.0,0.0,-1.0,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.6112295245878557,0.5393201687540028,0.579251434048512,
        0.45250552163726,-0.8002301032105278,0.8320414521696045,1.0,0.6112295245878557,0.5393201687540028,0.579251434048512,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,0.6112295245878557,0.5393201687540028,0.579251434048512,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.6112127250471442,0.5392563386990848,0.5793285819923802,
        0.4496586242515346,-0.7970036195067057,0.8320414521696045,1.0,0.6112127250471442,0.5392563386990848,0.5793285819923802,
        0.2322278861576963,-0.5505597218606448,0.8320414521696045,1.0,0.6112127250471442,0.5392563386990848,0.5793285819923802,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.8113706303124094,0.07694234992653391,0.579445920733097,
        0.17843076328762075,-0.9993617575182445,0.8320414521696045,1.0,0.8113706303124094,0.07694234992653391,0.579445920733097,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,0.8113706303124094,0.07694234992653391,0.579445920733097,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.8114539384998098,0.07701131307297036,0.579320087129666,
        0.17733399397028804,-0.9877961319146434,0.8320414521696045,1.0,0.8114539384998098,0.07701131307297036,0.579320087129666,
        0.14697212727898767,-0.667878767520176,0.8320414521696045,1.0,0.8114539384998098,0.07701131307297036,0.579320087129666,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.4283026948949,-0.15649537694097104,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.12908118276409375,-0.2860955516178608,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.42545579750917484,-0.15972186064479288,0.8320414521696045,1.0,0.0,0.0,1.0,
        -0.12888299167765405,-0.2881916742947841,0.8320414521696045,1.0,0.0,0.0,1.0,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.701752998194556,-0.414650705585471,0.5793164263875334,
        -0.160341627686287,-0.9993617575182445,0.8320414521696045,1.0,0.701752998194556,-0.414650705585471,0.5793164263875334,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,0.701752998194556,-0.414650705585471,0.5793164263875334,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.7017217167837705,-0.41465276486960667,0.5793528430758139,
        -0.15298672287679405,-0.9869143495385339,0.8320414521696045,1.0,0.7017217167837705,-0.41465276486960667,0.5793528430758139,
        0.009044567800666758,-0.7127069039361085,0.8320414521696045,1.0,0.7017217167837705,-0.41465276486960667,0.5793528430758139,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.3239668701034387,-0.747919218914038,0.57936371050869,
        -0.43441638603592636,-0.8002301032105278,0.8320414521696045,1.0,0.3239668701034387,-0.747919218914038,0.57936371050869,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,0.3239668701034387,-0.747919218914038,0.57936371050869,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.3239921768785303,-0.7479352604294432,0.5793288492107502,
        -0.42358641887182247,-0.7955390209696247,0.8320414521696045,1.0,0.3239921768785303,-0.7479352604294432,0.5793288492107502,
        -0.12888299167765405,-0.667878767520176,0.8320414521696045,1.0,0.3239921768785303,-0.7479352604294432,0.5793288492107502,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.6112126131383362,0.5392568732801398,0.5793282024558564,
        -0.21413875055636267,-0.5505597218606448,0.8320414521696045,1.0,-0.6112126131383362,0.5392568732801398,0.5793282024558564,
        -0.43441638603592636,-0.8002301032105278,0.8320414521696045,1.0,-0.6112126131383362,0.5392568732801398,0.5793282024558564,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.3239904246541938,0.7479344930673233,0.5793308198365777,
        0.45250552163726,-0.15584033860443247,0.8320414521696045,1.0,-0.3239904246541938,0.7479344930673233,0.5793308198365777,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,-0.3239904246541938,0.7479344930673233,0.5793308198365777,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,-0.32402897185291174,0.7479392402673198,0.5793031315885399,
        0.15341165800280487,-0.2854018828153212,0.8320414521696045,1.0,-0.32402897185291174,0.7479392402673198,0.5793031315885399,
        0.14697212727898767,-0.2881916742947841,0.8320414521696045,1.0,-0.32402897185291174,0.7479392402673198,0.5793031315885399,
        0.5571940844999452,-0.4780352209074801,0.8320414521696045,1.0,0.17753153951754688,0.795479441080476,0.5793919323694656,
        0.2322278861576963,-0.4055107199543153,0.8320414521696045,1.0,0.17753153951754688,0.795479441080476,0.5793919323694656,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.17753153951754688,0.795479441080476,0.5793919323694656,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.6112124071073584,-0.5392578574726401,0.5793275037075718,
        0.2322278861576963,-0.4055107199543153,0.8320414521696045,1.0,0.6112124071073584,-0.5392578574726401,0.5793275037075718,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,0.6112124071073584,-0.5392578574726401,0.5793275037075718,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.6111939781221762,-0.5391871475234518,0.5794127553417444,
        0.4477892456141823,-0.1611864591818739,0.8320414521696045,1.0,0.6111939781221762,-0.5391871475234518,0.5794127553417444,
        0.45250552163726,-0.15584033860443247,0.8320414521696045,1.0,0.6111939781221762,-0.5391871475234518,0.5794127553417444,
        0.009044567800666758,-0.4780352209074801,1.0,1.0,0.8114519880228139,-0.0770069678911477,0.579323396756971,
        0.14697212727898767,-0.2881916742947841,0.8320414521696045,1.0,0.8114519880228139,-0.0770069678911477,0.579323396756971,
        0.17718619044819728,0.030185510216078626,0.8320414521696045,1.0,0.8114519880228139,-0.0770069678911477,0.579323396756971,
	]);
}

function makeOctPrism(){
	octPrismVerts = new Float32Array([
		1.0, 0.0, 0.5, 1.0,   0.1, 0.7, 0.35,
		0.5, 0.0, 1.0, 1.0,   0.35, 0.1, 0.7,
		0.5, 2.0, 1.0, 1.0,   0.7, 0.0, 0.1,
		
		0.5, 2.0, 1.0, 1.0,   0.78, 0.13, 0.47,
		1.0, 2.0, 0.5,1.0,	  0.47, 0.78, 0.13, 
		1.0, 0.0, 0.5, 1.0,   0.13, 0.47, 0.78,
		
		0.5, 0.0, 1.0, 1.0,	  0.25, 0.19, 0.93,
		-0.5, 0.0, 1.0, 1.0,  0.93, 0.25, 0.19,
		-0.5, 2.0, 1.0, 1.0,  0.19, 0.93, 0.25,
		
		-0.5, 2.0, 1.0, 1.0,  0.38, 0.21, 0.87,
		0.5, 2.0, 1.0, 1.0,	  0.87, 0.38, 0.21,
		0.5, 0.0, 1.0, 1.0,	  0.21, 0.87, 0.38,

		-0.5, 0.0, 1.0, 1.0,  0.94, 0.34, 0.15,
		-1.0, 0.0, 0.5, 1.0,  0.15, 0.94, 0.34,
		-1.0, 2.0, 0.5, 1.0,  0.34, 0.15, 0.94,

		-1.0, 2.0, 0.5, 1.0,  0.5, 0.35, 0.78,
		-0.5, 2.0, 1.0, 1.0,  0.78, 0.5, 0.35,
		-0.5, 0.0, 1.0, 1.0,  0.35, 0.78, 0.5,

		-1.0, 0.0, 0.5, 1.0,  0.63, 0.21, 0.09,
		-1.0, 0.0, -0.5, 1.0, 0.09, 0.63, 0.21,
		-1.0, 2.0, -0.5, 1.0, 0.21, 0.09, 0.63,
		
		-1.0, 2.0, -0.5, 1.0, 0.37, 0.51, 0.89,
		-1.0, 2.0, 0.5, 1.0,  0.89, 0.37, 0.51,
		-1.0, 0.0, 0.5, 1.0,  0.51, 0.89, 0.37,
		
		-1.0, 0.0, -0.5, 1.0, 0.1, 0.47, 0.87,
		-0.5, 0.0, -1.0, 1.0, 0.87, 0.1, 0.47,
		-0.5, 2.0, -1.0, 1.0, 0.47, 0.87, 0.1,

		-0.5, 2.0, -1.0, 1.0, 1.0, 0.14, 0.43,
		-1.0, 2.0, -0.5, 1.0, 0.43, 1.0, 0.14,
		-1.0, 0.0, -0.5, 1.0, 0.14, 0.43, 1.0,

		-0.5, 0.0, -1.0, 1.0, 0.33, 0.79, 1.0,
		0.5, 0.0, -1.0, 1.0,  1.0, 0.33, 0.79,
		0.5, 2.0, -1.0, 1.0,  0.79, 1.0, 0.33,
		
		0.5, 2.0, -1.0, 1.0,  0.19, 0.45, 0.87,
		-0.5, 2.0, -1.0, 1.0, 0.87, 0.19, 0.45,
		-0.5, 0.0, -1.0, 1.0, 0.45, 0.87, 0.19,
			
		0.5, 0.0, -1.0, 1.0,  1.0, 0.12, 0.33,
		1.0, 0.0, -0.5, 1.0,  0.33, 1.0, 0.12,
		1.0, 2.0, -0.5, 1.0,  0.12, 0.33, 1.0,
		
		1.0, 2.0, -0.5, 1.0,  0.87, 0.33, 1.0,
		0.5, 2.0, -1.0, 1.0,  0.33, 1.0, 0.87,
		0.5, 0.0, -1.0, 1.0,  1.0, 0.87, 0.33,

        1.0, 0.0, -0.5, 1.0,  0.58, 0.90, 0.123,
		1.0, 0.0, 0.5, 1.0,   0.90, 0.123, 0.58,
        1.0, 2.0, 0.5, 1.0,   0.123, 0.58, 0.90, 

        1.0, 2.0, 0.5, 1.0,   0.67, 0.13, 1.0, 
        1.0, 2.0, -0.5, 1.0,  1.0, 0.67, 0.13,
        1.0, 0.0, -0.5, 1.0,  0.13, 1.0, 0.67,
	]);
}

function make3DAxes(){
	axesVerts = new Float32Array ([
		-2, 0, 0,	1,	5, 0, 0,
		 2, 0, 0, 1,	5, 0, 0,
		
		0, -2, 0, 1,	0, 5, 0,
		0,  2, 0, 1,	0, 5, 0,

		0, 0, -2, 1,	0, 0, 5,
		0, 0,  2, 1,	0, 0, 5,
	]);
}

function makeSmallAxes(){
	axesSmallVerts = new Float32Array([
		0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// X axis line (origin: gray)
		1.3,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// 						 (endpoint: red)
		
		0.0,  0.0,  0.0, 1.0,    0.3,  0.3,  0.3,	// Y axis line (origin: white)
		0.0,  1.3,  0.0, 1.0,		0.3,  1.0,  0.3,	//						 (endpoint: green)

		0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// Z axis line (origin:white)
		0.0,  0.0,  1.3, 1.0,		0.3,  0.3,  1.0,	//						 (endpoint: blue)
	])
}


function drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
//==============================================================================
  	// Clear <canvas>  colors AND the depth buffer

	// ===========General vars for drawing different views=========== 
	var width_of_window = innerWidth*0.5;
	var height_of_window = innerWidth*0.375;
	var FOV = 35.0;
	var Aspect_Ratio = width_of_window/height_of_window;
	var z_near = 1.0;
	var z_far = 30.0;

	// ===========Ortho Vars===========
	var top = ((z_far - z_near)/3) * Math.tan(FOV/2 * (Math.PI/180));
	var right = ((z_far - z_near)/3) * Math.tan(FOV/2 * (Math.PI/180)) * Aspect_Ratio;
	var bottom = -((z_far - z_near)/3) * Math.tan(FOV/2 * (Math.PI/180));
	var left = -((z_far - z_near)/3) * Math.tan(FOV/2 * (Math.PI/180)) * Aspect_Ratio;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
	pushMatrix(modelMatrix);

	// ===========Perspective View===========
	modelMatrix.setPerspective(	FOV,   // FOVY: top-to-bottom vertical image angle, in degrees
								Aspect_Ratio,   // Image Aspect Ratio: camera lens width/height
								z_near,   // camera z-near distance (always positive; frustum begins at z = -znear)
								z_far);  // camera z-far distance (always positive; frustum ends at z = -zfar)

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

	gl.viewport(0, 0, width_of_window, height_of_window);
	modelMatrix.lookAt( camX, camY, camZ,	// center of projection
						pointX, pointY, pointZ,	// look-at point 
  						0, 0, 1);	// View UP vector.

	drawScene(gl, n, currentAngle, modelMatrix, u_ModelMatrix)
	
	// ===========Ortho View===========
	modelMatrix = popMatrix();
	gl.viewport(width_of_window, 0, width_of_window, height_of_window);
	modelMatrix.setOrtho(left, right, bottom, top, z_near, z_far);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

	
	modelMatrix.lookAt(camX, camY, camZ,	// center of projection
						pointX, pointY, pointZ,	// look-at point 
  						0, 0, 1);	// View UP vector.

	drawScene(gl, n, currentAngle, modelMatrix, u_ModelMatrix)
}

function drawScene(gl, n, currentAngle, modelMatrix, u_ModelMatrix){
	// Axes
	//===========================================================
  pushMatrix(modelMatrix);
	
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES, axesStart/floatsPerVertex, axesVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();

  //===========================================================
  // Worm 
  pushMatrix(modelMatrix);     // SAVE world coord system;
    	//-------Draw Spinning Cylinder:
    modelMatrix.translate(-0.4,-0.4, 0.3);  // 'set' means DISCARD old matrix,
    						// (drawing axes centered in CVV), and then make new
    						// drawing axes moved to the lower-left corner of CVV. 
    modelMatrix.scale(0.2, 0.2, 0.2);
    						// if you DON'T scale, cyl goes outside the CVV; clipped!
    modelMatrix.rotate(-120, 0, 1, 1);  // spin around y axis.
	
	modelMatrix.rotate(currentAngle*2, 1, 1, 0);
  	// Drawing:
    // Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw the cylinder's vertices, and no other vertices:
    gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
    							cylStart/floatsPerVertex, // start at this vertex number, and
    							cylVerts.length/floatsPerVertex);	// draw this many vertices.

	modelMatrix.translate(0, 0, 1);
	modelMatrix.scale(0.95, 0.95, 0.95);
	modelMatrix.rotate(currentAngle*2, 1, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

	modelMatrix.translate(0, 0, 1);
	modelMatrix.scale(0.95, 0.95, 0.95);
	modelMatrix.rotate(currentAngle*2, 1, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

	modelMatrix.translate(0, 0, 1);
	modelMatrix.scale(0.95, 0.95, 0.95);
	modelMatrix.rotate(currentAngle*2, 1, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

	modelMatrix.translate(0, 0, 1);
	modelMatrix.scale(0.95, 0.95, 0.95);
	modelMatrix.rotate(currentAngle*2, 1, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

	modelMatrix.translate(0, 0, 1);
	modelMatrix.scale(0.95, 0.95, 0.95);
	modelMatrix.rotate(currentAngle*2, 1, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cylStart/floatsPerVertex, cylVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

  //===========================================================
  // Grid
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  	//---------Draw Ground Plane, without spinning.
  	// position it.
  	modelMatrix.translate( 0.4, -0.4, 0.0);	
  	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:

  	// Drawing:
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
    						  gndStart/floatsPerVertex,	// start at this vertex number, and
    						  gndVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  pushMatrix(modelMatrix);
	// draw some weird assembly
	modelMatrix.translate( 0.9, -0.3, 0.3);
	modelMatrix.scale(0.5, 0.5, 0.5);
	
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

	gl.drawArrays(gl.TRIANGLES, diaStart/floatsPerVertex, diamondVerts.length/floatsPerVertex);

	 // Octagonal Prism
    modelMatrix.scale(0.3, 0.3, 0.3);
    modelMatrix.translate(0.0, 1.8, 0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, octPrismStart/floatsPerVertex, octPrismVerts.length/floatsPerVertex);
    

    // Octagonal Pyramid
    modelMatrix.translate(0.0, 2.0 , 0.0);
    // modelMatrix.scale(1.0, 1.0, 1.0);
    // modelMatrix.rotate(-octagon_move*2, 1, 1, 0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, octPyramidStart/floatsPerVertex, octPyramidVerts.length/floatsPerVertex);
	
  modelMatrix = popMatrix();
  //===========================================================
  // Draw some weird assembly pt 2  
  pushMatrix(modelMatrix);
	modelMatrix.translate(-1, 1.5, -0.7);
	modelMatrix.scale(1, 1, 1);

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, star2Start/floatsPerVertex, star2Verts.length/floatsPerVertex);

	// modelMatrix.translate(0.0, 2.0, 0.0);
	modelMatrix.scale(0.3, 0.3, 0.3);
	modelMatrix.translate(0,-1.5,4);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

	gl.drawArrays(gl.TRIANGLE_STRIP, sphStart/floatsPerVertex, sphVerts.length/floatsPerVertex);
	
  modelMatrix = popMatrix();
  //===========================================================
  pushMatrix(modelMatrix);
	modelMatrix.translate(1, 1.5, 0.3);
	modelMatrix.scale(0.5, 0.5, 0.5);

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, star1Start/floatsPerVertex, star1Verts.length/floatsPerVertex);

	// modelMatrix.translate(0.0, 2.0, 0.0);
	modelMatrix.scale(0.7, 0.7, 0.7);
	modelMatrix.translate(0.2,-0.2,-0.4);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

	gl.drawArrays(gl.TRIANGLE_STRIP, torStart/floatsPerVertex, torVerts.length/floatsPerVertex);

  modelMatrix = popMatrix();
  //===========================================================
  pushMatrix(modelMatrix);
	modelMatrix.translate(2.5, 0, 0);
	modelMatrix.scale(0.5, 0.5, 0.5);
	modelMatrix.rotate(90, 1, 0, 0);

	// Octagonal Prism
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, octPrismStart/floatsPerVertex, octPrismVerts.length/floatsPerVertex);
    

    // Octagonal Pyramid
    modelMatrix.translate(0.0, 2.0 , 0.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, octPyramidStart/floatsPerVertex, octPyramidVerts.length/floatsPerVertex);
  
  modelMatrix = popMatrix();
  //===========================================================
  pushMatrix(modelMatrix);
	modelMatrix.translate(0, 2, 0.3);
	modelMatrix.scale(0.3, 0.3, 0.3);

	quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Quaternion-->Matrix
	modelMatrix.concat(quatMatrix);	// apply that matrix.

	// Star 1 Model
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, star1Start/floatsPerVertex, star1Verts.length/floatsPerVertex);

	// Axes on model
	modelMatrix.scale(.7, 1, .5);
	modelMatrix.translate(0.2, -0.15, -0.25);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES, axesStart/floatsPerVertex, axesVerts.length/floatsPerVertex);
  modelMatrix = popMatrix();
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
	// Calculate the elapsed time
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;    
	// Update the current rotation angle (adjusted by the elapsed time)
	//  limit the angle to move smoothly between +20 and -85 degrees:
	 if(angle >  angle_bounds && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
	 if(angle < -angle_bounds && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  


	var newAngle = angle + (ANGLE_STEP * elapsed/3) / 1000.0;
	return newAngle %= 360;
}


//==================HTML Button Callbacks
function angleSubmit(){
    //Read HTML edit-box contents:
    var UsrTxt = document.getElementById('usrAngle').value;

    // the HTML 'div' element with id='editBoxOut':
    document.getElementById('EditBoxOut').innerHTML ='You Typed: '+UsrTxt;
    //console.log('angleSubmit: UsrTxt:', UsrTxt); 
    angle_bounds = parseFloat(UsrTxt);
}

// function spinDown() {
//  ANGLE_STEP -= 25; 
// }

function spinUp() {
  ANGLE_STEP += 25; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}

function myMouseDown(ev, gl, canvas) {
	//==============================================================================
	// Called when user PRESSES down any mouse button;
	// 									(Which button?    console.log('ev.button='+ev.button);   )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
	
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							   (canvas.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								 (canvas.height/2);
	//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
		
		g_isDrag = true;											// set our mouse-dragging flag
		g_xMclik = x;													// record where mouse-dragging began
		g_yMclik = y;
	};

function myMouseMove(ev, gl, canvas) {
	//==============================================================================
	// Called when user MOVES the mouse with a button already pressed down.
	// 									(Which button?   console.log('ev.button='+ev.button);    )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
	
		if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'
	
		// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
		var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							   (canvas.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								 (canvas.height/2);
	
		// find how far we dragged the mouse:
		g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
		g_yMdragTot += (y - g_yMclik);
		// AND use any mouse-dragging we found to update quaternions qNew and qTot.
		dragQuat(x - g_xMclik, y - g_yMclik);
		
		g_xMclik = x;													// Make NEXT drag-measurement from here.
		g_yMclik = y;
		
		// Show it on our webpage, in the <div> element named 'MouseText':
		// document.getElementById('MouseText').innerHTML=
		// 		'Mouse Drag totals (CVV x,y coords):\t'+
		// 		 g_xMdragTot.toFixed(5)+', \t'+
		// 		 g_yMdragTot.toFixed(5);	
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
	
	g_isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	g_xMdragTot += (x - g_xMclik);
	g_yMdragTot += (y - g_yMclik);
//	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);

	// AND use any mouse-dragging we found to update quaternions qNew and qTot;
	dragQuat(x - g_xMclik, y - g_yMclik);

	// Show it on our webpage, in the <div> element named 'MouseText':
	// document.getElementById('MouseText').innerHTML=
	// 		'Mouse Drag totals (CVV x,y coords):\t'+
	// 		 g_xMdragTot.toFixed(5)+', \t'+
	// 		 g_yMdragTot.toFixed(5);	
};

function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
// We find a rotation axis perpendicular to the drag direction, and convert the 
// drag distance to an angular rotation amount, and use both to set the value of 
// the quaternion qNew.  We then combine this new rotation with the current 
// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
// 'draw()' function converts this current 'qTot' quaternion to a rotation 
// matrix for drawing. 
	var res = 5;
	var qTmp = new Quaternion(0,0,0,1);
	
	var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
	// console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
	qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*150.0);
	// (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
							// why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
							// -- to rotate around +x axis, drag mouse in -y direction.
							// -- to rotate around +y axis, drag mouse in +x direction.
							
	qTmp.multiply(qNew,qTot);			// apply new rotation to current rotation. 
	//--------------------------
	// IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
	// ANSWER: Because 'duality' governs ALL transformations, not just matrices. 
	// If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
	// first by qTot, and then by qNew--we would apply mouse-dragging rotations
	// to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
	// rotations FIRST, before we apply rotations from all the previous dragging.
	//------------------------
	// IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store 
	// them with finite precision. While the product of two (EXACTLY) unit-length
	// quaternions will always be another unit-length quaternion, the qTmp length
	// may drift away from 1.0 if we repeat this quaternion multiply many times.
	// A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
	// Matrix4.prototype.setFromQuat().
//	qTmp.normalize();						// normalize to ensure we stay at length==1.0.
	qTot.copy(qTmp);
};


function myKeyDown(key){
	var xdist = camX - pointX;
	var ydist = camY - pointY;
	var zdist = camZ - pointZ;

	var xy_len = Math.sqrt(xdist * xdist + ydist * ydist);
	var xyz_len = Math.sqrt(xdist * xdist + ydist * ydist + zdist * zdist);

	switch(key.code){
//---------------------Camera Direction---------------------
		case "KeyI":
			pointZ += 0.1;
			break;
		
		case "KeyK":
			pointZ -= 0.1;
			break;

		case "KeyJ":
			if (!isRun){
				theta = -Math.acos(xdist/xy_len) + 0.1;
			}
			else{
				theta += 0.1;
			}
			pointX = camX + xy_len * Math.cos(theta);
			pointY = camY + xy_len * Math.sin(theta);
			isRun = true;
			break;

		case "KeyL":
			if (!isRun){
				theta = -Math.acos(xdist/xy_len) - 0.1;
			}
			else{
				theta -= 0.1;
			}
			pointX = camX + xy_len * Math.cos(theta);
			pointY = camY + xy_len * Math.sin(theta);
			isRun = true;
			break;
		
//---------------------Camera Position---------------------
		case "KeyW":
			pointX -= 0.1 * (xdist/xyz_len);
			pointY -= 0.1 * (ydist/xyz_len);
			pointZ -= 0.1 * (zdist/xyz_len);

			camX -= 0.1 * (xdist/xyz_len);
			camY -= 0.1 * (ydist/xyz_len);
			camZ -= 0.1 * (zdist/xyz_len);
			break;

		// Move forward
		case "KeyS":
			pointX += 0.1 * (xdist/xyz_len);
			pointY += 0.1 * (ydist/xyz_len);
			pointZ += 0.1 * (zdist/xyz_len);

			camX += 0.1 * (xdist/xyz_len);
			camY += 0.1 * (ydist/xyz_len);
			camZ += 0.1 * (zdist/xyz_len);
			break;

		// Straight left
		case "KeyA":
			camX += 0.1 * (ydist/xy_len);
			camY -= 0.1 * (xdist/xy_len);

			pointX += 0.1 * (ydist/xy_len);
			pointY -= 0.1 * (xdist/xy_len);
			break;

		// Strafe right
		case "KeyD":
			camX -= 0.1 * (ydist/xy_len);
			camY += 0.1 * (xdist/xy_len);

			pointX -= 0.1 * (ydist/xy_len);
			pointY += 0.1 * (xdist/xy_len);
			break;

		// Move downwards
		case "KeyQ":
			pointZ -= 0.1 * (zdist/xyz_len);
			
			camZ -= 0.1 * (zdist/xyz_len);
			break;

		// Move upwards
		case "KeyE":
			pointZ += 0.1 * (zdist/xyz_len);
			
			camZ += 0.1 * (zdist/xyz_len);
			break;

	}
}

function myKeyUp(kev) {
    // Called when user releases ANY key on the keyboard; captures scancodes well
    
    console.log('myKeyUp()--keyCode='+kev.keyCode+' released.');
}