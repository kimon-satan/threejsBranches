


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


scene = new THREE.Scene();

var uniforms = {
	time:       { value: 1.0 },
	resolution: { value: new THREE.Vector2() },
	mouse:  	{value: mousePos },
	scale:      {value: 2.0, gui: true, min: 1.0, max: 10.0},
	thickness:  {value: 0.01, gui: true, min: 0.001, max: 0.1, step: 0.001}
	
};

uniforms.resolution.value.x = renderer.domElement.width;
uniforms.resolution.value.y = renderer.domElement.height;



//////////////////////////////////////////////////////////////////BRANCH//////////////////////////////////////////////////////////////////

function Branch(sp, ep){

	this.numPoints = 500; 
	this.startPos = sp;
	this.endPos = ep;

	//attributes
	this.vertices = new Float32Array( this.numPoints * 6);
	this.indexes = new Uint16Array( (this.numPoints - 1)  * 6);
	this.miters = new Float32Array( this.numPoints * 2 * 2);
	this.miter_dims = new Float32Array( this.numPoints * 2);
	this.line_prog = new Float32Array( this.numPoints * 2);
	this.seed = Math.random();

	//populate the points in one go

	var c = 0;
	var d = new THREE.Vector2().subVectors(this.endPos,this.startPos);
	var incr = new THREE.Vector2().copy(d).multiplyScalar(1./this.numPoints);
	var p = new THREE.Vector2().copy(this.startPos);
	var ns = this.startPos.distanceTo(this.endPos)/this.numPoints;
	var norm = new THREE.Vector2(-d.y, d.x).normalize();


	for(var i = 0; i < this.numPoints; i++)
	{
		

		var n = noise.simplex2((i+1) * ns * 5. , this.seed) * 0.05;

		this.vertices[i * 6 + 0] = p.x + norm.x * n;
		this.vertices[i * 6 + 1] = p.y + norm.y * n;
		this.vertices[i * 6 + 2] = 0.;

		//a copy
		this.vertices[i * 6 + 3] = this.vertices[i * 6 + 0];
		this.vertices[i * 6 + 4] = this.vertices[i * 6 + 1];
		this.vertices[i * 6 + 5] = 0.;


		this.indexes[c++] = i * 2 + 2;
		this.indexes[c++] = i * 2 + 1;
		this.indexes[c++] = i * 2 + 0;
		this.indexes[c++] = i * 2 + 3;
		this.indexes[c++] = i * 2 + 1;
		this.indexes[c++] = i * 2 + 2;

		this.line_prog[i * 2] = i/this.numPoints;
		this.line_prog[i * 2 + 1] = i/this.numPoints;

		p.add(incr);

		
	}

	//now calculate the normals

	for(var i = 0; i < this.numPoints; i++)
	{

		var pi = i - 1;
		var ni = i + 1;

		var p0 = new THREE.Vector2(this.vertices[pi * 6], this.vertices[pi*6+1]);
		var p1 = new THREE.Vector2(this.vertices[i * 6], this.vertices[i*6+1]);
		var p2 = new THREE.Vector2(this.vertices[ni * 6], this.vertices[ni*6+1]);

		var a = new THREE.Vector2();
		var b = new THREE.Vector2();

		a.subVectors(p1, p0)
		a.normalize();
		b.subVectors(p2,p1);
		b.normalize();

		var normal = new THREE.Vector2(-a.y,a.x);

		//for the ends

		if(i == this.numPoints -1 )
		{
			this.miters[i * 4] = normal.x;
			this.miters[i * 4 + 1] = normal.y; 
			this.miters[i * 4 + 2] = normal.x;
			this.miters[i * 4 + 3] = normal.y; 
			this.miter_dims[i * 2] = 1.0;
			this.miter_dims[i * 2 + 1] = -1.0;
			
		}
		else if(i == 0)
		{
			//construct normal using the following segment
			
			this.miters[i * 4] = -b.y;
			this.miters[i * 4 + 1] = b.x; 
			this.miters[i * 4 + 2] = -b.y;
			this.miters[i * 4 + 3] = b.x;  
			this.miter_dims[i * 2] = 1.0;
			this.miter_dims[i * 2 + 1] = -1.0;
		
		}
		else
		{

			//all other points

			var tang = new THREE.Vector2();
			tang.addVectors(a,b);
			tang.normalize();

			var miter = new THREE.Vector2( -tang.y, tang.x );
			miter.normalize();

			//length of miter on either side
			var l = miter.dot(normal);

			this.miters[i * 4] = miter.x;
			this.miters[i * 4 + 1] = miter.y; 

			this.miters[i * 4 + 2] = miter.x;
			this.miters[i * 4 + 3] = miter.y; 

			this.miter_dims[i * 2] = l;
			this.miter_dims[i * 2 + 1] = -l; //signed to flip the vertex

		}


	}

	this.geometry = new THREE.BufferGeometry();

	//overriden attributes
	this.geometry.addAttribute( 'position', new THREE.BufferAttribute( this.vertices, 3 ) );
	this.geometry.addAttribute('index', new THREE.BufferAttribute( this.indexes, 1));
	
	//custom attributes
	this.geometry.addAttribute( 'line_prog', new THREE.BufferAttribute( this.line_prog, 1 ) );
	this.geometry.addAttribute( 'miter', new THREE.BufferAttribute( this.miters, 2 ) );
	this.geometry.addAttribute( 'miter_dims', new THREE.BufferAttribute( this.miter_dims, 1 ) );


	this.material = new THREE.ShaderMaterial( {
		uniforms: uniforms,
		vertexShader: document.getElementById( 'vertexShader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		side:  THREE.DoubleSide

	});

	this.mesh = new THREE.Mesh( this.geometry, this.material );


}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var branches = [];

for (var i = 0; i < 10; i++)
{
	var sp = new THREE.Vector2(Math.random(),Math.random()).sub(new THREE.Vector2(.5,.5)).multiplyScalar(1.5);
	var ep = new THREE.Vector2(Math.random(),Math.random()).sub(new THREE.Vector2(.5,.5)).multiplyScalar(1.5);

 	branches.push(new Branch(sp,ep));
 	scene.add(branches[i].mesh);
}



//var pts = new THREE.Points(geometry, material);
//scene.add(pts);

//var wireframe = new THREE.WireframeHelper( mesh, 0x00ff00 );
//scene.add(wireframe)

var startTime = new Date().getTime();
var ellapsedTime = 0;


function render() {

	ellapsedTime = (new Date().getTime() - startTime) * 0.001;
	uniforms.time.value = ellapsedTime;
	uniforms.mouse.value = mousePos;

	//console.log(ellapsedTime);
	
	var gl = renderer.context;
	var ext = gl.getExtension("EXT_blend_minmax");
  	gl.enable(gl.BLEND);

	gl.blendEquationSeparate(ext.MAX_EXT, ext.MAX_EXT);
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

