/* Gemma Reina Lara - u1987712 */
//Angles per calcular la posició central
var theta = Math.PI;
var phi = -Math.PI/2.0;
//Variables dels angles anteriors
var lastTheta = 0.0;
var lastPhi = 0.0;

var poiArray = [];
var select = document.getElementById('choosePOI');

var isMouseDown = false;

// Inicialitzem el RayTracing
function inicialitzar(Scene) {
	Screen.canvas = document.getElementById("glcanvas");
	if (Screen.canvas == null)	{
		alert("Invalid element: " + id);
		return;
	}

	//Obtenim el contexte del canvas
	Screen.context = Screen.canvas.getContext("2d");
	if(Screen.context == null){
		alert("Could not get context");
		return;
	}
	//Configuració del tamany i del buffer del canvas
	Screen.width = Screen.canvas.width;
	Screen.height = Screen.canvas.height;
	Screen.buffer = Screen.context.createImageData(Screen.width,Screen.height);

	// Calculem els eixos de la càmera
	calcularEixos(Scene);

	// Calculem els increments en X i Y
	incX = calcularIncrementX(Scene.Camera,Screen);
	incY = calcularIncrementY(Scene.Camera,Screen);
	P0 = calcularP0(incX,incY,Scene.Camera,Screen);
	
	
	// Executem el RayTracing
	rayTracing(Scene, Screen);
	Screen.context.putImageData(Screen.buffer, 0, 0);
};

// Calculem increment del eix X de la càmera
function calcularIncrementX(Cam,Scr) {
	var rati = (Scr.height/Scr.width);

	var theta = (Cam.fov * Math.PI / 180);
	var w = 2*Math.tan(theta/2); // Calculem w' = 2*tg(theta/2)
	var h = w*rati; // Calculem h' = w'*rati

	var aux = w/Scr.width; // w'/W
	var incX = vec3.scale(Cam.X,aux); // Calculem increment de X (X * 2*tg(theta/2)/W)

	return incX;
}


// Calculem increment del eix Y de la càmera
function calcularIncrementY(Cam,Scr) {
	var rati = (Scr.height/Scr.width);

	var theta = (Cam.fov * Math.PI / 180);
	var w = 2*Math.tan(theta/2); // Calculem w' = 2*tg(theta/2)
	var h = w*rati; // Calculem h' = w'*rati

	var aux = rati*w/Scr.height; // rati*w'/H
	var incY = vec3.scale(Cam.Y,aux); // Calculem increment de Y (Y * 2*tg(theta/2)/W)

	return incY;
}


// Calculem P0 - punt inicial del raig
function calcularP0(incX,incY,Cam,Scr) {

	var P = vec3.subtract(Cam.position,Cam.Z); // Calculem P (O - Z)
	var aux = vec3.scale(incX,((Scr.width-1)/2)); // Increment de X * (W-1)/2
	var aux2 = vec3.scale(incY,((Scr.height-1)/2)); // Increment de Y * (H-1)/2
	var aux3 = vec3.subtract(P,aux); // P - Increment de X * (W-1)/2
	var P0 = vec3.add(aux3,aux2); // Calculem P0 (P - Increment de X * (W-1)/2 + Increment de Y * (H-1)/2)

	return P0;
}


// Calculem els eixos de la càmera
function calcularEixos(Scene) {
	Scene.Camera.Z = vec3.normalize(vec3.subtract(Scene.Camera.position, Scene.Camera.centre)); // |O - C|
	Scene.Camera.X = vec3.normalize(vec3.cross(Scene.Camera.up, Scene.Camera.Z)); // |up x Z|
	Scene.Camera.Y = vec3.cross(Scene.Camera.Z, Scene.Camera.X); // Z x X
}


function plot(x,y,color){
	var index = (x+y*Screen.buffer.width)*4;
	Screen.buffer.data[index+0] = color[0] * 255;
	Screen.buffer.data[index+1] = color[1] * 255;
	Screen.buffer.data[index+2] = color[2] * 255;
	Screen.buffer.data[index+3] = 255;
	return index;
}

// Pintem cada píxel
function rayTracing(Scene, Screen) {;
	for(var x = 0; x < Screen.width; x++){
		for (y = 0; y < Screen.height; y++){
			var rDirection = computeRay(incX,incY,P0,Scene.Camera,x,y);
			var color = [0.3,0.4,1];
			color = IntersectScene(Scene, rDirection, Scene.Camera.position, 0);
			plot(x,y,color);
		}
	}
	console.log("Done");
}

var hitInfo = {
	t: 0,
	normal: 0,
	point: 0,
	surfaceId: "",
	type : "",
	material : 0,
	specular : false,
	specularCoeff : null
};

//Calculem la intersecció del raig amb els objectes
function IntersectScene(scene, ray, origin, depth){
	var hit = computeFirstHit(scene, ray, origin);
	if (hit){
		if (hit.t !== null){
			var light = computeLight(scene, hit, ray, depth);
			if (hit.specular && depth < 4){
				var d1 = computeReflectionDirection(hit, ray);	//The new ray will be the vector d1 and origin hit.point
				var newHitPoint = vec3.add(hit.point, vec3.multiply(vec3.fromValues(0.01, 0.01, 0.01), d1));
				var color = IntersectScene(scene, d1, newHitPoint, depth + 1);
				var colorVec3 = vec3.fromValues(color[0], color[1], color[2]);
				light = vec3.add(light, vec3.multiply(vec3.fromValues(hit.specularCoeff, hit.specularCoeff, hit.specularCoeff), colorVec3));
			}
			return [light[0], light[1], light[2]];
		}
	}
	return [0.3, 0.4, 1.0];
}

//Càlcul de la llum
function computeLight(scene, hit, ray, depth){
	var matAmbient = vec3.fromValues(hit.material.mat_ambient[0], hit.material.mat_ambient[1], hit.material.mat_ambient[2]);
	var ambientComponent = vec3.multiply(vec3.fromValues(1.0, 1.0, 1.0), matAmbient);
	var res = ambientComponent;
	var i = 0;
	
	for (var light of scene.Lights){
		var l = vec3.normalize(vec3.subtract(light.position, hit.point)); //Vector entre punt i llum
		var n = vec3.normalize(hit.normal);
		var partR = vec3.dot(n, l) * 2;
		var r = vec3.add(vec3.multiply(l, vec3.fromValues(-1, -1, -1)), vec3.multiply(vec3.fromValues(partR, partR, partR), n));
		
		var matDiffuse = vec3.fromValues(hit.material.mat_diffuse[0], hit.material.mat_diffuse[1], hit.material.mat_diffuse[2]);
		var matSpecular = vec3.fromValues(hit.material.mat_specular[0], hit.material.mat_specular[1], hit.material.mat_specular[2]);
		
		var aux1 = Math.max(0, vec3.dot(n, l));
		var diffuseComponent = vec3.multiply(matDiffuse, vec3.fromValues(aux1, aux1, aux1));
		
		var ray2 = vec3.normalize(vec3.multiply(vec3.fromValues(-1, -1, -1), ray));
		var aux2 = Math.pow(Math.max(0, vec3.dot(ray2, vec3.normalize(r))), 1.5);
		var specularComponent = vec3.multiply(matSpecular, vec3.fromValues(aux2, aux2, aux2));
		
		var newHitPoint = vec3.add(hit.point, vec3.multiply(vec3.fromValues(0.01, 0.01, 0.01), l));
		var l2 = vec3.subtract(light.position, hit.point);
		var hit2 = computeShadowing(scene, vec3.normalize(l2), newHitPoint, hit.surfaceId);
		var vi = 1;
		if (hit2){
			if (hit2.t !== null && (hit2.t > 0 && hit2.t < vec3.length(l2))){
				vi = 0.5;
			}
		}

		var aux3 = vec3.multiply(light.color, vec3.fromValues(vi, vi, vi));
		var aux4 = vec3.multiply(vec3.add(diffuseComponent, specularComponent), aux3);
		res = vec3.add(res, aux4);
		
	}
	
	return res;
}

//Càlcul de la direcció del reflexe del raig
function computeReflectionDirection(hit, ray){
	var n = vec3.normalize(hit.normal);

	var term1 = vec3.multiply(vec3.fromValues(2, 2, 2), n);
	var term2 = vec3.dot(ray, n);
	var term3 = vec3.multiply(term1, vec3.fromValues(term2, term2, term2));
	return vec3.normalize(vec3.subtract(ray, term3));
}

function computeReflectedVector(n, l){
	var aux1 = vec3.dot(n, l) * 2;
	var aux2 = vec3.multiply(vec3.fromValues(aux1, aux1, aux1), n);
	var aux3 = vec3.subtract(aux2, l);
	return aux3;
}

function computeShadowing(scene, ray, center, surfaceId){
	var hit = null;
	for (var primitive of scene.Shapes){
		hit = intersect(primitive, ray, center, true);
		if (hit && hit.t !== null)
			break;
		if (primitive.id !== surfaceId || primitive.tipus === "esfera" || primitive.tipus === "triangle"){
			hit = intersect(primitive, ray, center, true);
			if (hit && hit.t !== null){
				break;
			}
		}
	}
	return hit;
}

function computeFirstHit(scene, ray, centre){
	var lowestT = null;
	for(var primitive of scene.Shapes){
		
		var hit = intersect(primitive, ray, centre);
		if (hit !== null && hit.t !== null){
			if ((!lowestT || hit.t < lowestT.t))
				lowestT = hit;
		}
	}
	return lowestT;
}

function intersect(primitive, ray, centre, shadowing = false){
	switch (primitive.tipus){
		case "esfera":
			return QuadraticEquationSolver(primitive, centre, ray);
			break;
		case "pla":
			if (shadowing)
				return PlaneIntersection(primitive, centre, ray, false);
			else
				return PlaneIntersection(primitive, centre, ray);
			break;
		case "triangle":
			var aux = TriangleIntersection(primitive, centre, ray);
			return aux;
			break;
	}
}

function QuadraticEquationSolver(sphere, CamCentre, v){
	var a = vec3.dot(v, v);
	
	var SphereCentre = vec3.fromValues(sphere.centre[0], sphere.centre[1], sphere.centre[2]);
	var diff = vec3.subtract(CamCentre, SphereCentre);
	var mult = vec3.dot(v, diff);
	var b = mult * 2;
	
	var diff1 = vec3.subtract(CamCentre, SphereCentre);
	var diffTot = vec3.dot(diff1, diff1);
	var c = diffTot - Math.pow(sphere.radi, 2);
	
	var sqrtPart = Math.pow(b, 2) - (4 * a * c);
	if (sqrtPart < 0)
		return null;
	
	var t1 = (-b + Math.sqrt(sqrtPart)) / (2 * a);
	var t2 = (-b - Math.sqrt(sqrtPart)) / (2 * a);
	var t;
	
	if (t1 > 0 || t2 > 0){
		if ((t1 < t2 && t1 > 0))
			t = t1;
		else if (t2 > 0)
			t = t2;
		else{
			t = null;
		}
	}
	
	var point = null;
	var normal = null;
	if (t !== null){
		point = vec3.add(CamCentre, vec3.multiply(vec3.fromValues(t, t, t), v));
		normal = vec3.divide(vec3.subtract(point, SphereCentre), vec3.fromValues(sphere.radi, sphere.radi, sphere.radi));
	}

	var h = { ...hitInfo };
	h.t = t;
	h.normal = normal;
	h.point = point;
	h.surfaceId = sphere.id;
	h.type = sphere.tipus;
	h.material = sphere.material;
	h.specular = sphere.specular;
	h.specularCoeff = sphere.specularCoeff;

	return h;
}

function PlaneIntersection(primitive, centre, v, abs = true){
	var h = { ...hitInfo };
	var d = vec3.dot(primitive.normal, primitive.point) * -1;
	var numerator = (-d) - (vec3.dot(primitive.normal, centre));
	var denominator = vec3.dot(primitive.normal, vec3.normalize(v));
	var t = numerator / denominator;
	var point = vec3.add(centre, vec3.multiply(vec3.fromValues(t, t, t), vec3.normalize(v)));
	
	if (t >= 0)
		h.t = t;
	else
		h.t = null;
	
	h.normal = primitive.normal;
	h.point = point;
	h.surfaceId = primitive.id;
	h.type = primitive.tipus;
	h.material = primitive.material;
	h.specular = primitive.specular;
	h.specularCoeff = primitive.specularCoeff;
	
	return h;
}

function TriangleIntersection(primitive, centre, ray){

	var h = { ...hitInfo };
	
	var u = vec3.subtract(primitive.b, primitive.a);
	var v = vec3.subtract(primitive.c, primitive.a);
	var normal = vec3.cross(u, v);
	
	var normalRayDirection = vec3.dot(normal, ray);
	if (Math.abs(normalRayDirection) < 0.0001)
		return null;
	
	var d = vec3.dot(normal, primitive.a);
	var t = -(vec3.dot(normal, centre) + d) / normalRayDirection;
	if (t < 0)
		return null;
	
	var point = vec3.add(centre, vec3.multiply(vec3.fromValues(t, t, t), ray));
	
	var edge0 = vec3.subtract(primitive.b, primitive.a);
	var vp0 = vec3.subtract(point, primitive.a);
	var C = vec3.cross(edge0, vp0);
	if (vec3.dot(normal, C) < 0)
		return null;
	
	var edge1 = vec3.subtract(primitive.c, primitive.b);
	var vp1 = vec3.subtract(point, primitive.b);
	C = vec3.cross(edge1, vp1);
	if (vec3.dot(normal, C) < 0)
		return null;
	
	var edge2 = vec3.subtract(primitive.a, primitive.c);
	var vp2 = vec3.subtract(point, primitive.c);
	C = vec3.cross(edge2, vp2);
	if (vec3.dot(normal, C) < 0)
		return null;
	
	h.t = Math.abs(t);
	h.normal = normal;
	h.point = point;
	h.surfaceId = primitive.id;
	h.type = primitive.tipus;
	h.material = primitive.material;
	h.specular = primitive.specular;
	h.specularCoeff = primitive.specularCoeff;
	
	return h;
}

// Computem el raig
function computeRay(incX,incY,P0,Cam,x,y){
	// Calculem la direcció per a cada píxel
	var aux = vec3.scale(incX,x); // Increment de X * x
	var aux2 = vec3.scale(incY,y); // Increment de Y * y
	var aux3 = vec3.add(P0,aux); // P0 + Increment de X * x
	var aux4 = vec3.subtract(aux3,aux2); // P0 + Increment de X * x - Increment de Y * y
	var ray = vec3.subtract(aux4,Cam.position); // Obtenim raig (P0 + Increment de X * x - Increment de Y * y - O)
	var rayNorm = vec3.normalize(ray); // Normalitzem el raig

	return rayNorm;
}

//Calculem el nou centre
function calculateNewCentre () {
	var centre = vec3.fromValues(Scene.Camera.centre[0], Scene.Camera.centre[1], Scene.Camera.centre[2]);
	var position = Scene.Camera.position;
	var radius = vec3.length(vec3.subtract(centre, position));
	var x = radius * Math.sin(phi) * Math.sin(theta);
	var y = radius * Math.cos(phi);
	var z = radius * Math.sin(phi) * Math.cos(theta);
	
	Scene.Camera.centre = [Scene.Camera.position[0] + x, Scene.Camera.position[1] + y, Scene.Camera.position[2] + z];
}



//Inicialitzem els handlers
function initHandlers () {
	var canvas = document.getElementById("glcanvas");
	
	document.addEventListener('keydown', (event) => {
		//W
		var update = false;
		if (event.keyCode === 87){
			Scene.Camera.position[2] -= 0.25;
			Scene.Camera.centre[2] -= 0.25;
			update = true;
		}
		//S
		else if (event.keyCode === 83){
			Scene.Camera.position[2] += 0.25;
			Scene.Camera.centre[2] += 0.25;
			update = true;
		}
		//A
		else if (event.keyCode === 65){
			Scene.Camera.position[0] -= 0.25;
			Scene.Camera.centre[0] -= 0.25;
			update = true;
		}
		//D	
		else if (event.keyCode === 68){
			Scene.Camera.position[0] += 0.25;
			Scene.Camera.centre[0] += 0.25;
			update = true;
		}
		
		event.preventDefault();
		if (update)
			inicialitzar(Scene);
	}, false);
	
	canvas.addEventListener('mousedown', (event) => {
		isMouseDown = true;
		lastPhi = event.clientY;
		lastTheta = event.clientX;
	}, false);
	
	canvas.addEventListener('mouseup', (event) => {
		isMouseDown = false;
	}, false);
	
	canvas.addEventListener('mousemove', (event) => {
		if (!isMouseDown)
			return;
		
		var newY = (event.clientY - lastPhi) * 0.005;
		var newX = (event.clientX - lastTheta) * 0.005;
		
		phi -= newY;
		theta += newX;
		
		//We limit vertical rotation
		var margen = Math.PI / 4;
		phi = Math.min (Math.max(phi, margen), Math.PI - margen);
		
		lastPhi = event.clientY;
		lastTheta = event.clientX;
		
		if (theta < 0)
			theta += Math.PI * 2;
		if (phi < 0)
			phi += Math.PI * 2;
		
		calculateNewCentre();
		event.preventDefault();
		inicialitzar(Scene);
	}, false);
}

//Per crear nous POI
function savePOI () {
	//Estructura per guardar un POI
	var newPOI = {
		"eye" : vec3.fromValues(Scene.Camera.position[0], Scene.Camera.position[1], Scene.Camera.position[2]),
		"centre" : vec3.fromValues(Scene.Camera.centre[0], Scene.Camera.centre[1], Scene.Camera.centre[2]),
		"phi" : phi,
		"theta" : theta,
		"lastPhi" : lastPhi,
		"lastTheta" : lastTheta
	};
	//Push back el nou POI
	poiArray.push(newPOI);
	
	//Nou tag per el nou POI
	var optionText = 'POI ' + poiArray.length.toString();
	var newOption = new Option(optionText, (poiArray.length - 1).toString());
	
	//Tag afegit com a nova opció en el HTML
	select.add(newOption, undefined);
}

//De la càmera al POI
function goToPOI () {
	var poi = poiArray[parseInt(select.value)];
	
	// Resetegem les variables
	Scene.Camera.position = poi.eye;
	Scene.Camera.centre = poi.centre;
	phi = poi.phi;
	theta = poi.theta;
	lastPhi = poi.lastPhi;
	lastTheta = poi.lastTheta;
	
	// Dibuixem un altre cop
	inicialitzar(Scene);
}

function changeColor(input){
	var name = input.name;
	
	if (name === "1")
		Scene.Lights[0].color = fromHexToRGB(input.value);
	else if (name === "2")
		Scene.Lights[1].color = fromHexToRGB(input.value);
}

//Per transformar un valor HEX a RGB
function fromHexToRGB (value) {
	var myColor = value.substr(1);
	  
	var r = myColor.charAt(0) + '' + myColor.charAt(1);
	var g = myColor.charAt(2) + '' + myColor.charAt(3);
	var b = myColor.charAt(4) + '' + myColor.charAt(5);

	r = parseInt(r, 16) / 255.0;
	g = parseInt(g, 16) / 255.0;
	b = parseInt(b, 16) / 255.0;
	
	return vec3.fromValues(r, g, b);
}

function aux(slider){
	Scene.Shapes[6].a[2] = slider.value;	
	inicialitzar(Scene);
}
