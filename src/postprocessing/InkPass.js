/**
 * @author WaterTian
 */

THREE.InkPass = function() {

	THREE.Pass.call(this);

	this.uniforms = {
		u_time: {
			value: 0.0
		},
		u_resolution: {
			value: new THREE.Vector2(window.innerWidth*window.devicePixelRatio, window.innerHeight*window.devicePixelRatio)
		},
		u_mouse: {
			value: new THREE.Vector2(10, 10)
		},
		u_texture1: {
			value: null
		}
	};


	this.material = new THREE.ShaderMaterial({
		uniforms:this.uniforms,
		vertexShader: document.getElementById('ink_vertexShader').textContent,
		fragmentShader: document.getElementById('ink_fragmentShader').textContent

	});


	this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add(this.quad);

};

THREE.InkPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

	constructor: THREE.InkPass,

	render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

		this.uniforms["u_texture1"].value = readBuffer.texture;
		this.uniforms["u_time"].value += delta;

		this.quad.material = this.material;

		if (this.renderToScreen) {

			renderer.render(this.scene, this.camera);

		} else {

			renderer.render(this.scene, this.camera, writeBuffer, this.clear);

		}

	}

});