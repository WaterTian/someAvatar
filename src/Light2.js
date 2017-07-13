/**
 * @author waterTian
 */
TY.Light2 = function(geometry) {
	var scope = this;
	this.MoveAble=false;
	this._t=.0005;

	var panoTexture = new THREE.TextureLoader().load('assets/img/explosion2.png');
	this.material = new THREE.ShaderMaterial({
		uniforms: {
			tExplosion: {
				type: "t",
				value: panoTexture
			},
			time: { // float initialized to 0
				type: "f",
				value: 0.0
			}
		},
		vertexShader: document.getElementById('light2_vertexShader').textContent,
		fragmentShader: document.getElementById('light2_fragmentShader').textContent
	});

	THREE.Mesh.call(this, geometry, this.material);
}


TY.Light2.prototype = Object.assign(Object.create(THREE.Mesh.prototype), TY.EventDispatcher.prototype, {

	constructor: TY.Light2,

	update: function(dt) {
		this.material.uniforms['time'].value = this._t * (Date.now() - start);
		if(this.MoveAble)this.position.y += Math.sin(.0025 * (Date.now() - start))*0.6;
	}
});