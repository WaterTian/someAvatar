/**
 * @author waterTian
 */
TY.Light1 = function(geometry) {
	var scope = this;

	var panoTexture = new THREE.TextureLoader().load('assets/img/fg.png');
	this.material = new THREE.ShaderMaterial({
		uniforms: {
			tShine: {
				type: "t",
				value: panoTexture
			},
			time: {
				type: "f",
				value: 0
			},
			weight: {
				type: "f",
				value: 0
			}
		},
		vertexShader: document.getElementById('light1_vertexShader').textContent,
		fragmentShader: document.getElementById('light1_fragmentShader').textContent
	});

	THREE.Mesh.call(this, geometry, this.material);

}


TY.Light1.prototype = Object.assign(Object.create(THREE.Mesh.prototype), TY.EventDispatcher.prototype, {

	constructor: TY.Light1,

	update: function(dt) {
		this.material.uniforms['time'].value = .0005 * (Date.now() - start);
		this.material.uniforms['weight'].value = 100;
		this.position.y += Math.sin(.0025 * (Date.now() - start))*0.9;
	}
});