


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
	scale:      {value: 2.0, gui: true, min: 1.0, max: 10.0}
	
};

uniforms.resolution.value.x = renderer.domElement.width;
uniforms.resolution.value.y = renderer.domElement.height;



//////////////////////////////////////////////////////////////////BRANCH//////////////////////////////////////////////////////////////////

function Branch(sp, dir){

	
	this.maxPoints = 300;
	this.numPoints = 10; 
	this.startPos = sp;
	this.endPos = new THREE.Vector2().copy(sp);
	this.step = 0.001 + Math.random() * 0.009;
	this.incr = dir.normalize().multiplyScalar(this.step);

	//attributes
	this.vertices = new Float32Array( this.maxPoints * 6);
	this.indexes = new Uint16Array( (this.maxPoints - 1)  * 6);
	this.miters = new Float32Array( this.maxPoints * 2 * 2);
	this.miter_dims = new Float32Array( this.maxPoints * 2);
	this.line_prog = new Float32Array( this.maxPoints * 2);
	this.noise_mul = 0.01 + Math.random() * 0.04;
	this.seed = Math.random();

	this.uniforms = {
		thickness:  {value: 0.01},
		col_freq: {value: 1.0  + Math.random() * 7.0 },
		color1: {value: new THREE.Vector3(Math.random(), Math.random(), Math.random())},
		color2: {value: new THREE.Vector3(Math.random(), Math.random(), Math.random())}
	};


	this.createGeometry = function()
	{

		//only needs to be called once

		var p = new THREE.Vector2().copy(this.startPos);
		var norm = new THREE.Vector2(-this.incr.y, this.incr.x).normalize();

		for(var i = 0; i < this.maxPoints; i++)
		{
			this.indexes[i*6] = i * 2 + 2;
			this.indexes[i*6+1] = i * 2 + 1;
			this.indexes[i*6+2] = i * 2 + 0;
			this.indexes[i*6+3] = i * 2 + 3;
			this.indexes[i*6+4] = i * 2 + 1;
			this.indexes[i*6+5] = i * 2 + 2;

			//NB. will need to change if noise is variable
			var n = noise.simplex2((i+1) * this.step * 5. , this.seed * 13.35433 ) * this.noise_mul * Math.sin(i/this.maxPoints * Math.PI);

			this.vertices[i * 6 + 0] = p.x + norm.x * n;
			this.vertices[i * 6 + 1] = p.y + norm.y * n;
			this.vertices[i * 6 + 2] = 0.;

			//a copy
			this.vertices[i * 6 + 3] = this.vertices[i * 6 + 0];
			this.vertices[i * 6 + 4] = this.vertices[i * 6 + 1];
			this.vertices[i * 6 + 5] = 0.;

			p.add(this.incr);

		}

		//now calculate the mitres 

		for(var i = 0; i < this.maxPoints; i++)
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

			if(i == this.maxPoints -1 )
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

		this.endPos.set(p);

		this.geometry = new THREE.BufferGeometry();
		this.geometry.dynamic = true;

		//overriden attributes
		this.geometry.addAttribute( 'position', new THREE.BufferAttribute( this.vertices, 3 ) );
		this.geometry.addAttribute('index', new THREE.BufferAttribute( this.indexes, 1));
		
		//custom attributes
		this.geometry.addAttribute( 'line_prog', new THREE.BufferAttribute( this.line_prog, 1 ) );
		this.geometry.addAttribute( 'miter', new THREE.BufferAttribute( this.miters, 2 ) );
		this.geometry.addAttribute( 'miter_dims', new THREE.BufferAttribute( this.miter_dims, 1 ) );
	}


	this.recalLPs = function()
	{

		//calculate the line progression for all points
		//NB. might be more useful in relation to maxPoints with a uniform for the progress
		for(var i = 0; i < this.numPoints; i++)
		{
			this.line_prog[i * 2] = i/this.numPoints;
			this.line_prog[i * 2 + 1] = i/this.numPoints;
		}

		for(var i = this.numPoints; i < this.maxPoints; i++)
		{
			this.line_prog[i * 2] = 1.0;
			this.line_prog[i * 2 + 1] = 1.0;
		}

	}

	this.createGeometry();
	this.recalLPs();

	for(var u in uniforms)
	{
		this.uniforms[u] = uniforms[u]; //copy references to global uniforms
	}

	this.material = new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: document.getElementById( 'vertexShader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		side:  THREE.DoubleSide

	});

	this.mesh = new THREE.Mesh( this.geometry, this.material );



	this.update = function(){

		this.numPoints = Math.min(this.numPoints + 1, this.maxPoints);
		this.uniforms.thickness.value = Math.max(0.001 , (this.numPoints/this.maxPoints) * 0.02);
		if(this.numPoints < this.maxPoints)this.recalLPs();
		this.geometry.setDrawRange (0, this.numPoints * 6); 
		this.geometry.attributes.position.needsUpdate = true;

		this.geometry.attributes.line_prog.needsUpdate = true;
		this.geometry.attributes.miter.needsUpdate = true;
		this.geometry.attributes.miter_dims.needsUpdate = true;
	}


}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var branches = [];
var numBranches = 100;

var sp = new THREE.Vector2(0,0);

for (var i = 0; i < numBranches; i++)
{
	var l = 0.1 + Math.random() * 0.6;
	var d = new THREE.Vector2(Math.random(),Math.random()).sub(new THREE.Vector2(.5,.5)).normalize().multiplyScalar(l * 2.);

 	branches.push(new Branch(sp,d));
 	scene.add(branches[i].mesh);
}



var startTime = new Date().getTime();
var ellapsedTime = 0;


function render() {

	ellapsedTime = (new Date().getTime() - startTime) * 0.001;
	uniforms.time.value = ellapsedTime;
	uniforms.mouse.value = mousePos;

	//console.log(ellapsedTime);

	for (var i = 0; i < numBranches; i++)
	{
		branches[i].update();
	}
	
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

