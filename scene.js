var Screen = {
    width 	: 0,
    height 	: 0,
    canvas 	: null,
    context : null,
    buffer 	: null,
};

var Scene = {
    Fons: [1, 0, 0],
    Shapes: [
        //techo
        {
            id		: "pla_gris",
            tipus	: "pla",
            normal	: vec3.fromValues(0, 2, 0),
            point   : vec3.fromValues( 0, -0.1, 0),
			material : { ...Obsidian },
			specular : false,
			specularCoeff : null
        },
        //suelo
		{
            id		: "pla_verd2",
            tipus	: "pla",
            normal	: vec3.fromValues(0, 0, 0),
            point   : vec3.fromValues(0, 100, 0),
			material : { ...Obsidian },
			specular : false,
			specularCoeff : null
        },
        //esferas
        {
            id		: "esfera_blava",
            tipus	: "esfera",
            radi	: 1.0,
            centre	: [-1.5,1.5,1],
			material : { ...Jade },
			specular : true,
			specularCoeff : 1.0

        },
        {
            id		: "esfera_verda",
            tipus	: "esfera",
            radi	: 0.7,
            centre	: [-2.5,0.4,4],
			material : { ...Ruby },
			specular : false,
			specularCoeff : null
        },
        //triangulos
		{
			id : "triangle1",
			tipus : "triangle",
			a : vec3.fromValues(-4.5, 3.2, -1),
			b : vec3.fromValues(-1.5, 3.2, -1),
			c : vec3.fromValues(-4, 4.0, -1),
			material : { ...Obsidian },
			specular : false,
			specularCoeff : null
		},
		{
			id : "triangle2",
			tipus : "triangle",
			a : vec3.fromValues(0.0, 0.0, 3),
			b : vec3.fromValues(3.0, 0.0, 3),
			c : vec3.fromValues(0.5, 3.0, 3),
			material : { ...Esmerald },
			specular : false,
			specularCoeff : null
		},	
    ],
    Camera: {
        position: vec3.fromValues(0.0, 2.0, 5.0),
        up: [0.0, 1.0, 0.0],
        centre: vec3.fromValues(0.0, 2.0, 4.0),
        fov: 60,
        X: vec3.create(),
        Y: vec3.create(),
        Z: vec3.create()
    },
    Lights: [
        {
            position: vec3.fromValues(-1.0, 5.0, 2.0),
            color   : vec3.fromValues(0.8, 0.8, 0.8)
        },
		{
            position: vec3.fromValues(-4.0, 6.0, 2.0),
            color   : vec3.fromValues(0.2, 0.2, 0.2)
        }
    ]
};