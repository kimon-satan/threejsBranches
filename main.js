


var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var width = window.innerWidth;
var height = window.innerHeight;
var canvas;
var mousePos = new THREE.Vector2(0,0);
var cbranch = null;
var branches = [];
var numBranches;
var mousedown = false;

canvas = renderer.domElement;

canvas.addEventListener("mousedown", function (e) {

    if(!mousedown)
    {
  		mousePos.set(e.clientX * 2.0/height - width/height, -e.clientY * 2./height + 1.);
  		newBranch();
  		crawler.startAccelerate();
  	  mousedown = true;
	  }

 }, false);



canvas.addEventListener("mousemove", function (e) {

     if(mousedown){
		var np = new THREE.Vector2(e.clientX * 2.0/height - width/height, -e.clientY * 2./height + 1.);
	mousePos.set(np.x, np.y);



	}

 }, false);

canvas.addEventListener("mouseup", function (e) {
	mousePos.set(e.clientX * 2.0/height - width/height, -e.clientY * 2./height + 1.);
    mousedown = false;
     crawler.endAccelerate();


 }, false);

canvas.addEventListener("touchstart", function (e)
{
    mousePos.set(e.touches[0].clientX /width, e.touches[0].clientY / height);
}, false);

document.addEventListener("keydown", function(e) {

}, true);

document.addEventListener("keyup", function(e) {


}, true);


camera = new THREE.OrthographicCamera(
	-width/height, width/height , 1.0, -1.0, - 500, 1000);
camera.position.set = (0,0,-1);


scene = new THREE.Scene();

var uniforms = {
	time:       { value: 1.0 },
	resolution: { value: new THREE.Vector2() },
	mouse:  	{value: mousePos },
	scale:      {value: 1.0, gui: true, min: 1.0, max: 10.0}

};

uniforms.resolution.value.x = renderer.domElement.width;
uniforms.resolution.value.y = renderer.domElement.height;



//////////////////////////////////////////////////////////////////BRANCH//////////////////////////////////////////////////////////////////

function Branch(sp){


	this.maxPoints = 500;
	this.numPoints = 0;
	this.startPos = sp;
	this.endPos = undefined;
	this.direction = undefined;

	//attributes
	this.vertices = new Float32Array( this.maxPoints * 6);
	this.indexes = new Uint16Array( (this.maxPoints - 1)  * 6);
	this.miters = new Float32Array( this.maxPoints * 2 * 2);
	this.miter_dims = new Float32Array( this.maxPoints * 2);

	this.loc_line_prog = new Float32Array( this.maxPoints * 2);
	this.glob_line_prog = new Float32Array( this.maxPoints * 2);

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

		for(var i = 0; i < this.maxPoints; i++)
		{
			this.indexes[i*6] = i * 2 + 2;
			this.indexes[i*6+1] = i * 2 + 1;
			this.indexes[i*6+2] = i * 2 + 0;
			this.indexes[i*6+3] = i * 2 + 3;
			this.indexes[i*6+4] = i * 2 + 1;
			this.indexes[i*6+5] = i * 2 + 2;

			for(var j = 0; j < 6; j ++)
			{
				this.vertices[i * 6 + j] = 0;
			}

			this.miters[i * 4] = 0;
			this.miters[i * 4 + 1] = 0;
			this.miters[i * 4 + 2] = 0;
			this.miters[i * 4 + 3] = 0;
			this.miter_dims[i * 2] = 0;
			this.miter_dims[i * 2 + 1] = 0;

			this.glob_line_prog[i * 2] = i/this.maxPoints;
			this.glob_line_prog[i * 2 + 1] = i/this.maxPoints;

		}


		this.endPos = new THREE.Vector2().copy(this.startPos);

		this.geometry = new THREE.BufferGeometry();
		this.geometry.dynamic = true;

		//overriden attributes
		this.geometry.addAttribute( 'position', new THREE.BufferAttribute( this.vertices, 3 ) );
		this.geometry.addAttribute('index', new THREE.BufferAttribute( this.indexes, 1));

		//custom attributes
		this.geometry.addAttribute( 'loc_line_prog', new THREE.BufferAttribute( this.loc_line_prog, 1 ) );
		this.geometry.addAttribute( 'glob_line_prog', new THREE.BufferAttribute( this.glob_line_prog, 1 ) );
		this.geometry.addAttribute( 'miter', new THREE.BufferAttribute( this.miters, 2 ) );
		this.geometry.addAttribute( 'miter_dims', new THREE.BufferAttribute( this.miter_dims, 1 ) );

		this.geometry.addGroup(0, 0, 0);
	}

	this.newGroup = function(){

    var prev_g = this.geometry.groups[this.geometry.groups.length -1];
    var idx = prev_g.start + prev_g.count;
    prev_g.count -= 6;
    this.geometry.addGroup(idx , 0, 0);
		this.geometry.groupsNeedUpdate = true;

	}

	this.updateVertices = function(pos)
	{

    if(this.numPoints == this.maxPoints)return; //don't add any more if out of veritces

    this.endPos.copy(pos);

		this.numPoints = Math.min(this.numPoints + 1, this.maxPoints);

		this.uniforms.thickness.value = Math.max(0.001 , (this.numPoints/this.maxPoints) * 0.02);

		var i = this.numPoints - 1;

		this.geometry.groups[this.geometry.groups.length -1].count += 6;

		this.vertices[i * 6 + 0] = pos.x;
		this.vertices[i * 6 + 1] = pos.y;
		this.vertices[i * 6 + 2] = 0.;

		//a copy
		this.vertices[i * 6 + 3] = pos.x;
		this.vertices[i * 6 + 4] = pos.y;
		this.vertices[i * 6 + 5] = 0.;

    var groupIndex = this.geometry.groups[this.geometry.groups.length -1].count/6;

		if(groupIndex < 3)return;

		var ppi = i - 2;
		var pi = i - 1;

		var p0 = new THREE.Vector2(this.vertices[ppi * 6], this.vertices[ppi*6+1]);
		var p1 = new THREE.Vector2(this.vertices[pi * 6], this.vertices[pi*6+1]);
		var p2 = new THREE.Vector2(this.vertices[i * 6], this.vertices[i*6+1]);

		var a = new THREE.Vector2();
		var b = new THREE.Vector2();

		a.subVectors(p1, p0)
		a.normalize();
		b.subVectors(p2,p1);
		b.normalize();

		var normal = new THREE.Vector2(-a.y,a.x);

		//for the ends

		//make the most recent point the normal
		this.miters[i * 4] = normal.x;
		this.miters[i * 4 + 1] = normal.y;
		this.miters[i * 4 + 2] = normal.x;
		this.miters[i * 4 + 3] = normal.y;
	  this.miter_dims[i * 2] = 1.0;
		this.miter_dims[i * 2 + 1] = -1.0;


		if(groupIndex == 3)
		{
			//construct first normal using the following segment

			this.miters[ppi * 4] = -b.y;
			this.miters[ppi * 4 + 1] = b.x;
			this.miters[ppi * 4 + 2] = -b.y;
			this.miters[ppi * 4 + 3] = b.x;
			this.miter_dims[ppi * 2] = 1.0;
			this.miter_dims[ppi * 2 + 1] = -1.0;

		}

		//for all other points

		var tang = new THREE.Vector2();
		tang.addVectors(a,b);
		tang.normalize();

		var miter = new THREE.Vector2( -tang.y, tang.x );
		miter.normalize();

		//length of miter on either side
		var l = miter.dot(normal);

		this.miters[pi * 4] = miter.x;
		this.miters[pi * 4 + 1] = miter.y;

		this.miters[pi * 4 + 2] = miter.x;
		this.miters[pi * 4 + 3] = miter.y;

		this.miter_dims[pi * 2] = l;
		this.miter_dims[pi * 2 + 1] = -l; //signed to flip the vertex

		this.recalLPs();

		this.geometry.groupsNeedUpdate = true;
		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.loc_line_prog.needsUpdate = true;
    this.geometry.attributes.glob_line_prog.needsUpdate = true;
		this.geometry.attributes.miter.needsUpdate = true;
		this.geometry.attributes.miter_dims.needsUpdate = true;




	}

	this.growOut = function()
	{
		if(this.endPos === undefined || this.numPoints < 10 || this.numPoints == this.maxPoints )return;

		var n = noise.simplex2(this.numPoints/this.maxPoints * 10.  , this.seed );
    this.direction.normalize();
    var norm = new THREE.Vector2(-this.direction.y , this.direction.x).multiplyScalar(n * 0.05);
    this.direction.add(norm);
    this.direction.setLength(0.002);

    var np = new THREE.Vector2().copy(this.endPos).add(this.direction);
    var isNewGroup = getModulo(np);

    if(isNewGroup){
      this.newGroup();
      this.updateVertices(np);

    }
    else
    {
      this.updateVertices(np);
    }



	}


	this.recalLPs = function()
	{

		//calculate the line progression for all points
		//NB. might be more useful in relation to maxPoints with a uniform for the progress
		for(var i = 0; i < this.numPoints; i++)
		{
			this.loc_line_prog[i * 2] = i/this.numPoints;
			this.loc_line_prog[i * 2 + 1] = i/this.numPoints;
		}

		for(var i = this.numPoints; i < this.maxPoints; i++)
		{
			this.loc_line_prog[i * 2] = 1.1;
			this.loc_line_prog[i * 2 + 1] = 1.1;
		}

	}


	for(var u in uniforms)
	{
		this.uniforms[u] = uniforms[u]; //copy references to global uniforms
	}

	var m = [new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: document.getElementById( 'vertexShader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		side:  THREE.DoubleSide,
		transparent: true
	}) ];

	this.material = new THREE.MultiMaterial(m);

	this.createGeometry();
	this.recalLPs();
	this.mesh = new THREE.Mesh( this.geometry, this.material );
  //this.pmesh = new THREE.Points( this.geometry, this.material );

}

////////////////////////////////////////////////Testing Crawler/////////////////////////////////////////////


function Crawler(){


	this.position = new THREE.Vector3(0.0,0.9,0);
	this.direction = new THREE.Vector3(0,1,0);

	this.arrowHelper = new THREE.ArrowHelper( this.direction, this.position, 0.25, 0xffff00 );
	this.arrowHelper.setLength(0.05,0.025,0.025);

	this.accelEnv = new Envelope2(0.25, 1., 60);

	this.velocity = 0.001;
	this.branch = null;

	this.noise_mul = 0.03;
	this.noise_step = 10.0;
	this.seed = Math.random();
	this.travelled = 0.;


	this.update = function(){

		this.accelEnv.step();

		if(this.accelEnv.z > 0.001)
		{


			var n = noise.simplex2(this.travelled * this.noise_step  , this.seed );
			n *= this.noise_mul * Math.pow(this.accelEnv.z, 0.5);

			var d_normal = new THREE.Vector3(-this.direction.y, this.direction.x , 0).multiplyScalar(n);
			this.direction.add(d_normal).normalize(); //NB. recursive use of direction

			var inc = new THREE.Vector3().copy(this.direction).multiplyScalar(this.accelEnv.z * this.velocity);
			var l = inc.length();
			this.travelled += inc.length();

			this.position.add(inc);

      var bd = this.branch.endPos.distanceTo(this.position); // how far the branch will have travelled

      var isNewGroup = getModulo(this.position);

			if(isNewGroup)
      {
        this.branch.newGroup();
        this.branch.updateVertices(this.position);

      }
      else if(bd > 0.005)
      {
        this.branch.updateVertices(this.position);
      }

			this.arrowHelper.position.set(this.position.x, this.position.y, 0);
			this.arrowHelper.setDirection(this.direction);

		}



	}

	this.startAccelerate = function(){
		this.accelEnv.targetVal = 1.0;
	}

	this.endAccelerate = function(){
		this.accelEnv.targetVal = 0.0;
	}

	this.rotate = function(dir){

		var theta = Math.PI * dir;

		this.direction.x  += Math.cos(theta) * this.direction.x - Math.sin(theta) * this.direction.y;
		this.direction.y  += Math.sin(theta) * this.direction.x + Math.cos(theta) * this.direction.y;

		this.direction.normalize();
		this.arrowHelper.setDirection(this.direction);


	}

}

/////////////////////////

var crawler = new Crawler();
scene.add( crawler.arrowHelper );
newBranch();

function newBranch(){

  if(crawler.branch !== null){
    crawler.branch.direction = new THREE.Vector2(crawler.direction.x, crawler.direction.y);
  }
	crawler.branch = new Branch(crawler.position);
	branches.push(crawler.branch);
	scene.add(crawler.branch.mesh);
  //scene.add(crawler.branch.pmesh);

}

function getModulo(p)
{
  var isMod = false;
  //modulo the position to make a wrapped space
  var w = width/height + 0.05;
  var h = 1.05;

  if(p.x < -w)
  {
    p.x += w * 2.0;
    isMod = true;
  }
  else if(p.x > w)
  {
    p.x -= w * 2.0;
    isMod = true;
  }

  if(p.y < -h)
  {
    p.y += h * 2.0;
    isMod = true;

  }
  else if(p.y > h)
  {
    p.y -= h * 2.0;
    isMod = true;
  }

  return isMod;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




var startTime = new Date().getTime();
var ellapsedTime = 0;


function render() {

	ellapsedTime = (new Date().getTime() - startTime) * 0.001;
	uniforms.time.value = ellapsedTime;
	uniforms.mouse.value = mousePos;

	crawler.update();

	for(var i =0; i < branches.length; i++)
	{
		if(crawler.branch !== branches[i])branches[i].growOut();
	}

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

/*------------------------------------------------ONE POLE -----------------------------------*/

//for enveloping

function Envelope(time, sampleRate)
{
  this.a  = 0;
  this.b = 0;
  this.z = 0.0;
  this.time = time;
  this.targetVal = 0.0;
  this.sampleRate = sampleRate;


  this.step = function()
  {
    this.z = this.targetVal * this.a + this.z * this.b;
    return this.z;
  }

  this.setTime = function()
  {
    this.b = Math.exp(-1.0/(this.time * this.sampleRate));
    this.a = 1.0 - this.b;
  }

  this.setTime(this.time);

}

//////////////////////Different attacks and decays/////////////////////////

function Envelope2(attTime, decTime, sampleRate)
{
  this.a_att  = 0;
  this.b_att = 0;
  this.a_dec  = 0;
  this.b_dec = 0;

  this.z = 0.0;

  this.targetVal = 0.0;
  this.sampleRate = sampleRate;


  this.step = function()
  {
    if(this.targetVal == this.z)
    {
      return
    }
    else if(this.targetVal < this.z)
    {
      this.z = this.targetVal * this.a_dec + this.z * this.b_dec;
    }
    else
    {
      this.z = this.targetVal * this.a_att + this.z * this.b_att;
    }

  }

  this.setAttDel = function(attTime, decTime)
  {
    this.attTime = attTime;
    this.decTime = decTime;

    this.b_att = Math.exp(-1.0/(attTime * this.sampleRate));
    this.a_att = 1.0 - this.b_att;
    this.b_dec = Math.exp(-1.0/(decTime * this.sampleRate));
    this.a_dec = 1.0 - this.b_dec;
  }

  this.setAttDel(attTime, decTime);

}
