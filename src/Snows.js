/**
 * @author waterTian
 */
TY.Snows = function() {
	THREE.Group.call(this);
	var scope = this;

	this.snows = [];

	var textureLoader = new THREE.TextureLoader();
	var geometry = new THREE.Geometry();
	var materials = [];
	var sprites = [];
	sprites.push(textureLoader.load("assets/img//sprites/snowflake1.png"));
	sprites.push(textureLoader.load("assets/img//sprites/snowflake2.png"));
	sprites.push(textureLoader.load("assets/img//sprites/snowflake3.png"));
	sprites.push(textureLoader.load("assets/img//sprites/snowflake4.png"));
	for (i = 0; i < 2000; i++) {
		var vertex = new THREE.Vector3();
		vertex.x = Math.random() * 2000 - 1000;
		vertex.y = Math.random() * 2000 - 1000;
		vertex.z = Math.random() * 2000 - 1000;
		geometry.vertices.push(vertex);
	}
	for (i = 0; i < 4; i++) {
		var sprite = sprites[i];
		materials[i] = new THREE.PointsMaterial({
			size: 8,
			map: sprite,
			blending: THREE.AdditiveBlending,
			depthTest: false,
			transparent: true,
			opacity: 0.8
		});
		var particles = new THREE.Points(geometry, materials[i]);
		particles.rotation.x = Math.random() * 6;
		particles.rotation.y = Math.random() * 6;
		particles.rotation.z = Math.random() * 6;

		this.snows.push(particles);
		this.add(particles);
	}
}


TY.Snows.prototype = Object.assign(Object.create(THREE.Group.prototype), TY.EventDispatcher.prototype, {

	constructor: TY.Snows,

	update: function() {
		var time = Date.now() * 0.00003;
		for (var i = this.snows.length - 1; i >= 0; i--) {
			this.snows[i].rotation.y = time * (i < 4 ? i + 1 : -(i + 1));
		}
	}
});