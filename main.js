

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var width = window.innerWidth;
var height = window.innerHeight;
var canvas;
var mousePos = new THREE.Vector2(0,0);

canvas = renderer.domElement;

canvas.addEventListener("mousemove", function (e) {
        
    mousePos.set(e.clientX/width, e.clientY/height);

 }, false);

canvas.addEventListener("touchstart", function (e) {

    mousePos.set(e.touches[0].clientX /width, e.touches[0].clientY / height);
    //console.log(mousePos);

}, false);


camera = new THREE.Camera();
camera.position.z = 1;

var numPoints = 10;

scene = new THREE.Scene();

var mshape = new THREE.Shape();
mshape.moveTo( -200., 0 , 0);

for(var i = 0; i < numPoints; i++)
{
	var incr = 1000.0/numPoints;
	mshape.lineTo( -200 + (i + 1) * incr, Math.sin(incr * i  * Math.PI * 6.) * 30, 0);
}

var points = mshape.extractAllPoints();
numPoints = points.shape.length;

var geometry = new THREE.BufferGeometry();


var vertices = new Float32Array( numPoints * 6);
var miters = new Float32Array( numPoints * 2);
var lineDist = new Float32Array( numPoints * 2);
var normals = new Float32Array( numPoints * 2 * 2);
var indexArray = new Uint16Array( (numPoints - 1)  * 6);
var colors = new Float32Array( numPoints * 6);

var c = 0;

for(var i = 0; i < numPoints ; i++)
{


	vertices[i * 6 + 0] = points.shape[i].x;
	vertices[i * 6 + 1] = points.shape[i].y;
	vertices[i * 6 + 2] = 0.;

	//a copy
	vertices[i * 6 + 3] = vertices[i * 6 + 0];
	vertices[i * 6 + 4] = vertices[i * 6 + 1];
	vertices[i * 6 + 5] = 0.;

	colors[i * 6 + 0] = Math.random();
	colors[i * 6 + 1] = Math.random();
	colors[i * 6 + 2] = Math.random();

	colors[i * 6 + 3] = colors[i * 6 + 0];
	colors[i * 6 + 4] = colors[i * 6 + 1];
	colors[i * 6 + 5] = colors[i * 6 + 2];



	indexArray[c++] = i * 2 + 2;
	indexArray[c++] = i * 2 + 1;
	indexArray[c++] = i * 2 + 0;
	indexArray[c++] = i * 2 + 3;
	indexArray[c++] = i * 2 + 1;
	indexArray[c++] = i * 2 + 2;

	lineDist[i * 2] = i/numPoints;
	lineDist[i * 2 + 1] = i/numPoints;

}

//now calculate the normals

for(var i = 0; i < numPoints ; i++)
{

	var ni = i + 1;
	var normal = new THREE.Vector2(0,0);
	if(i == numPoints - 1)
	{
		ni = i - 1;
		normal.x = vertices[ni*6] - vertices[i*6];
		normal.y = vertices[ni*6 +1] - vertices[i*6 +1];
	}
	else
	{
		normal.x = vertices[i*6] - vertices[ni*6];
		normal.y = vertices[i*6 +1] - vertices[ni*6 +1];
	}

	//TODO optimise .. tidy up

	var p0 = new THREE.Vector2(vertices[i * 6], vertices[i*6+1]);
	var p1 = new THREE.Vector2(vertices[(i+1) * 6], vertices[(i+1)*6+1]);
	var p2 = new THREE.Vector2(vertices[(i+2) * 6], vertices[(i+2)*6+1]);

	var a = new THREE.Vector2();
	var b = new THREE.Vector2();

	a.subVectors(p2,p1);
	a.normalize();
	b.subVectors(p1, p0)
	b.normalize();

	var tang = new THREE.Vector2();
	tang.addVectors(a,b);
	tang.normalize();

	var miter = new THREE.Vector2( -tang.y, tang.x );
	miter.normalize();

	console.log(miter.dot(normal));

	//on either side 
	//we use this to make a varying
	var l = miter.dot(normal);



	miters[(i+1) * 2] = l;
	miters[(i+1) * 2 + 1] = -l; 


	normal.normalize();

	normals[i * 4 + 0] = -normal.y;
	normals[i * 4 + 1] = normal.x;
	normals[i * 4 + 2] = -normal.y;
	normals[i * 4 + 3] = normal.x;



}



// itemSize = 3 because there are 3 values (components) per vertex
geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
geometry.addAttribute( 'miter', new THREE.BufferAttribute( miters, 1 ) );
geometry.addAttribute( 'line_dist', new THREE.BufferAttribute( lineDist, 1 ) );
geometry.addAttribute( 'n_normal', new THREE.BufferAttribute( normals, 2 ) );
geometry.addAttribute('index', new THREE.BufferAttribute( indexArray, 1));
geometry.addAttribute('color', new THREE.BufferAttribute( colors, 3));

var uniforms = {
	time:       { value: 1.0 },
	resolution: { value: new THREE.Vector2() },
	mouse:  	{value: mousePos },
	scale:      {value: 2.0, gui: true, min: 1.0, max: 10.0},
	thickness:  {value: 0.05, gui: true, min: 0.01, max: 1.0}
	
};

uniforms.resolution.value.x = renderer.domElement.width;
uniforms.resolution.value.y = renderer.domElement.height;

var material = new THREE.ShaderMaterial( {
	uniforms: uniforms,
	vertexShader: document.getElementById( 'vertexShader' ).textContent,
	fragmentShader: document.getElementById( 'fragmentShader' ).textContent,

} );

//var pts = new THREE.Points(geometry, material);
//scene.add(pts);

var mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

var wireframe = new THREE.WireframeHelper( mesh, 0x00ff00 );
//scene.add(wireframe)

var startTime = new Date().getTime();
var ellapsedTime = 0;



function render() {

	ellapsedTime = (new Date().getTime() - startTime) * 0.001;
	uniforms.time.value = ellapsedTime;
	uniforms.mouse.value = mousePos;

	//console.log(ellapsedTime);
	
	//var gl = renderer.context;
	//var ext = gl.getExtension("EXT_blend_minmax");
  	//gl.enable(gl.BLEND);

	//gl.blendEquation(ext.MAX_EXT);
  	//gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO);
  	
  	//gl.blendColor(0,0,0,1);


	renderer.render( scene, camera );
	requestAnimationFrame( render );
	
}

render();


/*----------------------------------------GUI----------------------------------------------*/

var ControlPanel = function() {
  
  for (var property in uniforms) {
    if (uniforms.hasOwnProperty(property)) {
        if(uniforms[property].gui){
        	if( uniforms[property].value instanceof THREE.Vector2)
        	{
				this[property + "_x"] = uniforms[property].value.x;
				this[property + "_y"] = uniforms[property].value.y;
			}
			else if(uniforms[property].type == "color")
	  		{	
	  			this[property] = "#ffffff";
        	}else{
        		this[property] = uniforms[property].value;
        	}
        	
        }
    }
  }

  
};

window.onload = function() 
{
  var controlPanel = new ControlPanel();
  var gui = new dat.GUI();
  gui.remember(controlPanel);
  var events = {};
  
  for (var property in uniforms) {
  	if (uniforms.hasOwnProperty(property)) {
  		if(uniforms[property].gui){

  			if( uniforms[property].value instanceof THREE.Vector2)
        	{	
        		var coord = ["x", "y"];

        		for(var i = 0; i < 2; i++)
        		{

	        		events[property + "_" + coord[i]] = gui.add(controlPanel, property + "_" + coord[i], uniforms[property].min, uniforms[property].max);
		  			
		  			events[property + "_" + coord[i]].onChange(function(value) {
		  				var key = this.property.substring(0, this.property.length - 2);
					 	uniforms[key].value[this.property.substring(this.property.length - 1)] = value;
					});

	  			}

	  		}
	  		else if(uniforms[property].type == "color")
	  		{
	  			events[property] = gui.addColor(controlPanel, property);

	  			events[property].onChange(function(value) {
					
	  				var col = hexToFloat(value);

					uniforms[this.property].value.x = col[0]; 
					uniforms[this.property].value.y = col[1]; 
					uniforms[this.property].value.z = col[2]; 

	  			});
        	}
        	else
        	{
	  			events[property] = gui.add(controlPanel, property, uniforms[property].min, uniforms[property].max);
	  			
	  			events[property].onChange(function(value) {
				  uniforms[this.property].value = value;
				});

  			}
  		}
  	}
  }








};


/////////////////////////////////HELPERS/////////////////////////////////

function hexToFloat(hex) {

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        [ parseInt(result[1], 16)/255.,
         parseInt(result[2], 16)/255.,
         parseInt(result[3], 16)/255.
        ]
    	: null;
}

