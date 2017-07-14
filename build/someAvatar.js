/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.CopyShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"opacity":  { value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform float opacity;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 texel = texture2D( tDiffuse, vUv );",
			"gl_FragColor = opacity * texel;",

		"}"

	].join( "\n" )

};

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Film grain & scanlines shader
 *
 * - ported from HLSL to WebGL / GLSL
 * http://www.truevision3d.com/forums/showcase/staticnoise_colorblackwhite_scanline_shaders-t18698.0.html
 *
 * Screen Space Static Postprocessor
 *
 * Produces an analogue noise overlay similar to a film grain / TV static
 *
 * Original implementation and noise algorithm
 * Pat 'Hawthorne' Shearon
 *
 * Optimized scanlines + noise version with intensity scaling
 * Georg 'Leviathan' Steinrohder
 *
 * This version is provided under a Creative Commons Attribution 3.0 License
 * http://creativecommons.org/licenses/by/3.0/
 */

THREE.FilmShader = {

	uniforms: {

		"tDiffuse":   { value: null },
		"time":       { value: 0.0 },
		"nIntensity": { value: 0.5 },
		"sIntensity": { value: 0.05 },
		"sCount":     { value: 4096 },
		"grayscale":  { value: 0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"#include <common>",
		
		// control parameter
		"uniform float time;",

		"uniform bool grayscale;",

		// noise effect intensity value (0 = no effect, 1 = full effect)
		"uniform float nIntensity;",

		// scanlines effect intensity value (0 = no effect, 1 = full effect)
		"uniform float sIntensity;",

		// scanlines effect count value (0 = no effect, 4096 = full effect)
		"uniform float sCount;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",

		"void main() {",

			// sample the source
			"vec4 cTextureScreen = texture2D( tDiffuse, vUv );",

			// make some noise
			"float dx = rand( vUv + time );",

			// add noise
			"vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );",

			// get us a sine and cosine
			"vec2 sc = vec2( sin( vUv.y * sCount ), cos( vUv.y * sCount ) );",

			// add scanlines
			"cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;",

			// interpolate between source and result by intensity
			"cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );",

			// convert to grayscale if desired
			"if( grayscale ) {",

				"cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );",

			"}",

			"gl_FragColor =  vec4( cResult, cTextureScreen.a );",

		"}"

	].join( "\n" )

};

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.EffectComposer = function ( renderer, renderTarget ) {

	this.renderer = renderer;

	if ( renderTarget === undefined ) {

		var parameters = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false
		};

		var size = renderer.getSize();
		renderTarget = new THREE.WebGLRenderTarget( size.width, size.height, parameters );
		renderTarget.texture.name = 'EffectComposer.rt1';

	}

	this.renderTarget1 = renderTarget;
	this.renderTarget2 = renderTarget.clone();
	this.renderTarget2.texture.name = 'EffectComposer.rt2';

	this.writeBuffer = this.renderTarget1;
	this.readBuffer = this.renderTarget2;

	this.passes = [];

	// dependencies

	if ( THREE.CopyShader === undefined ) {

		console.error( 'THREE.EffectComposer relies on THREE.CopyShader' );

	}

	if ( THREE.ShaderPass === undefined ) {

		console.error( 'THREE.EffectComposer relies on THREE.ShaderPass' );

	}

	this.copyPass = new THREE.ShaderPass( THREE.CopyShader );

};

Object.assign( THREE.EffectComposer.prototype, {

	swapBuffers: function() {

		var tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;

	},

	addPass: function ( pass ) {

		this.passes.push( pass );

		var size = this.renderer.getSize();
		pass.setSize( size.width, size.height );

	},

	insertPass: function ( pass, index ) {

		this.passes.splice( index, 0, pass );

	},

	render: function ( delta ) {

		var maskActive = false;

		var pass, i, il = this.passes.length;

		for ( i = 0; i < il; i ++ ) {

			pass = this.passes[ i ];

			if ( pass.enabled === false ) continue;

			pass.render( this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive );

			if ( pass.needsSwap ) {

				if ( maskActive ) {

					var context = this.renderer.context;

					context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, delta );

					context.stencilFunc( context.EQUAL, 1, 0xffffffff );

				}

				this.swapBuffers();

			}

			if ( THREE.MaskPass !== undefined ) {

				if ( pass instanceof THREE.MaskPass ) {

					maskActive = true;

				} else if ( pass instanceof THREE.ClearMaskPass ) {

					maskActive = false;

				}

			}

		}

	},

	reset: function ( renderTarget ) {

		if ( renderTarget === undefined ) {

			var size = this.renderer.getSize();

			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( size.width, size.height );

		}

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

	},

	setSize: function ( width, height ) {

		this.renderTarget1.setSize( width, height );
		this.renderTarget2.setSize( width, height );

		for ( var i = 0; i < this.passes.length; i ++ ) {

			this.passes[i].setSize( width, height );

		}

	}

} );


THREE.Pass = function () {

	// if set to true, the pass is processed by the composer
	this.enabled = true;

	// if set to true, the pass indicates to swap read and write buffer after rendering
	this.needsSwap = true;

	// if set to true, the pass clears its buffer before rendering
	this.clear = false;

	// if set to true, the result of the pass is rendered to screen
	this.renderToScreen = false;

};

Object.assign( THREE.Pass.prototype, {

	setSize: function( width, height ) {},

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );

	}

} );

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.RenderPass = function ( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

	THREE.Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;

	this.clear = true;
	this.clearDepth = false;
	this.needsSwap = false;

};

THREE.RenderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.RenderPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		this.scene.overrideMaterial = this.overrideMaterial;

		var oldClearColor, oldClearAlpha;

		if ( this.clearColor ) {

			oldClearColor = renderer.getClearColor().getHex();
			oldClearAlpha = renderer.getClearAlpha();

			renderer.setClearColor( this.clearColor, this.clearAlpha );

		}

		if ( this.clearDepth ) {

			renderer.clearDepth();

		}

		renderer.render( this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear );

		if ( this.clearColor ) {

			renderer.setClearColor( oldClearColor, oldClearAlpha );

		}

		this.scene.overrideMaterial = null;
		renderer.autoClear = oldAutoClear;
	}

} );

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function ( shader, textureID ) {

	THREE.Pass.call( this );

	this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";

	if ( shader instanceof THREE.ShaderMaterial ) {

		this.uniforms = shader.uniforms;

		this.material = shader;

	} else if ( shader ) {

		this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		this.material = new THREE.ShaderMaterial( {

			defines: shader.defines || {},
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader

		} );

	}

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );

};

THREE.ShaderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.ShaderPass,

	render: function( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.quad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.render( this.scene, this.camera );

		} else {

			renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		}

	}

} );

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.FilmPass = function(noiseIntensity, scanlinesIntensity, scanlinesCount, grayscale) {

	THREE.Pass.call(this);

	if (THREE.FilmShader === undefined)
		console.error("THREE.FilmPass relies on THREE.FilmShader");

	var shader = THREE.FilmShader;

	this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

	this.material = new THREE.ShaderMaterial({

		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	});

	if (grayscale !== undefined) this.uniforms.grayscale.value = grayscale;
	if (noiseIntensity !== undefined) this.uniforms.nIntensity.value = noiseIntensity;
	if (scanlinesIntensity !== undefined) this.uniforms.sIntensity.value = scanlinesIntensity;
	if (scanlinesCount !== undefined) this.uniforms.sCount.value = scanlinesCount;

	this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add(this.quad);

};

THREE.FilmPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

	constructor: THREE.FilmPass,

	setUniforms: function(noiseIntensity, scanlinesIntensity, scanlinesCount, grayscale) {
		if (grayscale !== undefined) this.uniforms.grayscale.value = grayscale;
		if (noiseIntensity !== undefined) this.uniforms.nIntensity.value = noiseIntensity;
		if (scanlinesIntensity !== undefined) this.uniforms.sIntensity.value = scanlinesIntensity;
		if (scanlinesCount !== undefined) this.uniforms.sCount.value = scanlinesCount;
	},

	render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

		this.uniforms["tDiffuse"].value = readBuffer.texture;
		this.uniforms["time"].value += delta;

		this.quad.material = this.material;

		if (this.renderToScreen) {

			renderer.render(this.scene, this.camera);

		} else {

			renderer.render(this.scene, this.camera, writeBuffer, this.clear);

		}

	}

});
/**
 * @author WaterTian
 */

THREE.WaterPass = function() {

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
		vertexShader: document.getElementById('water_vertexShader').textContent,
		fragmentShader: document.getElementById('water_fragmentShader').textContent

	});


	this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add(this.quad);

};

THREE.WaterPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

	constructor: THREE.WaterPass,

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
/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.TexturePass = function ( map, opacity ) {

	THREE.Pass.call( this );

	if ( THREE.CopyShader === undefined )
		console.error( "THREE.TexturePass relies on THREE.CopyShader" );

	var shader = THREE.CopyShader;

	this.map = map;
	this.opacity = ( opacity !== undefined ) ? opacity : 1.0;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {

		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader,
		depthTest: false,
		depthWrite: false

	} );

	this.needsSwap = false;

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );

};

THREE.TexturePass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.TexturePass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		this.quad.material = this.material;

		this.uniforms[ "opacity" ].value = this.opacity;
		this.uniforms[ "tDiffuse" ].value = this.map;
		this.material.transparent = ( this.opacity < 1.0 );

		renderer.render( this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear );

		renderer.autoClear = oldAutoClear;
	}

} );

// namespace:
this.TY = this.TY || {};

TY.VERSION = "1";
TY.Debug = 1;

TY.baseURL = "./";

TY.inherit = function(ctor, superCtor) {
	ctor.superClass = superCtor;
	ctor.prototype = Object.create(superCtor.prototype);
	ctor.prototype.constructor = ctor;
};
TY.extend = function(origin, add) {
	// Don't do anything if add isn't an object
	if (!add || typeof add !== 'object')
		return origin;
	var keys = Object.keys(add);
	var i = keys.length;
	while (i--) {
		origin[keys[i]] = add[keys[i]];
	}
	return origin;
};

TY.logBox = {};
TY.Log = function(_t) {
	if (!TY.Debug) return;
	if (TY.isMobileDevice) TY.logBox.innerHTML += _t + '<br>';
	console.log(_t);
}
TY.isAndroid = /Android/i.test(navigator.userAgent);
TY.isIphone = /iphone/i.test(navigator.userAgent);
TY.isChrome = /chrome\//i.test(navigator.userAgent);
TY.isWeixin = /MicroMessenger\//i.test(navigator.userAgent);
TY.isWeibo = /Weibo/i.test(navigator.userAgent);

TY.isMobileDevice = function() {
	var e = navigator.userAgent.toLowerCase();
	return !!/(iphone|ios|android|mini|mobile|mobi|nokia|symbian|ipod|ipad|ws\s+phone|mqqbrowser|wp7|wp8|ucbrowser7|ucweb|360\s+aphone\s+browser)/i.test(e)
}
TY.isIosDevice = function() {
	var e = navigator.userAgent.toLowerCase(),
		t = !!e.match(/\(i[^;]+;( U;)? cpu.+mac os x/),
		n = e.indexOf("iphone") > -1 || e.indexOf("Mac") > -1,
		r = e.indexOf("ipad") > -1;
	return !!(t || r || n)
}



TY.displacement = function(x, y, z, t) {
	if (x * x + y * y + z * z < 2) {
		return new THREE.Vector3(0, 0, 0);
	} else {
		var r = Math.sqrt(x * x + y * y + z * z);
		var theta = Math.acos(z / r);
		var phi = Math.atan2(y, x);
		return new THREE.Vector3(3 * Math.cos(phi) * Math.sin(theta) * Math.sin(r - t) / r, 3 * Math.sin(phi) * Math.sin(theta) * Math.sin(r - t) / r, 3 * Math.cos(theta) * Math.sin(r - t) / r);
	}
};

TY.displacement2 = function(x, y, z, t) {
	return new THREE.Vector3(Math.sin(x - t), 0, 0);
};

TY.displacement3 = function(x, y, z, t) {
	if (x * x + y * y + z * z < 0.01) {
		return new THREE.Vector3(0, 0, 0);
	} else {
		var r = Math.sqrt(x * x + y * y + z * z);
		var theta = Math.acos(z / r);
		var phi = Math.atan2(y, x);
		return new THREE.Vector3(3 * Math.cos(phi) * Math.sin(theta) * Math.sin(r - t) / r, 3 * Math.sin(phi) * Math.sin(theta) * Math.sin(r - t) / r, 3 * Math.cos(theta) * Math.sin(r - t) / r);
	}
};


TY.rand = function(a, b, d) {
	d = 0 == d ? !1 : !0;
	a = Math.min(a + Math.random() * (b + 2 - a), b);
	return d ? parseInt(a) : a
}



TY.getTexturesFromAtlasFile = function(atlasImgUrl, tilesNum) {
	var textures = [];
	for (var i = 0; i < tilesNum; i++) {
		textures[i] = new THREE.Texture();
	}
	var imageObj = new Image();
	imageObj.onload = function() {
		var canvas, context;
		var tileWidth = imageObj.height;
		for (var i = 0; i < textures.length; i++) {
			canvas = document.createElement('canvas');
			context = canvas.getContext('2d');
			canvas.height = tileWidth;
			canvas.width = tileWidth;
			context.drawImage(imageObj, tileWidth * i, 0, tileWidth, tileWidth, 0, 0, tileWidth, tileWidth);
			textures[i].image = canvas
			textures[i].needsUpdate = true;
		}
	};
	imageObj.src = atlasImgUrl;
	return textures;
}



TY.getImgData = function(_image, _w, _h) {
	var imgCanvas = document.createElement('canvas');
	imgCanvas.style.display = "block";
	imgCanvas.id = "imgCanvas";
	document.body.appendChild(imgCanvas);
	imgCanvas.width = _w;
	imgCanvas.height = _h;
	var imgContext = imgCanvas.getContext("2d");
	imgContext.drawImage(_image, 0, 0, _w, _h, 0, 0, _w, _h);
	imgContext.restore();
	var imgData = imgContext.getImageData(0, 0, _w, _h);
	document.body.removeChild(imgCanvas);
	return imgData.data;
}
/**
 * @author waterTian
 */
TY.EventDispatcher = function() {}
TY.EventDispatcher.prototype = {
	constructor: TY.EventDispatcher,
	addEventListener: function(type, listener) {
		if (!this._listeners) {
			this._listeners = {};
		} else {
			this.removeEventListener(type, listener);
		}

		if (!this._listeners[type]) this._listeners[type] = []
		this._listeners[type].push(listener);

		return listener;
	},

	hasEventListener: function(type, listener) {
		var listeners = this._listeners;
		return !!(listeners && listeners[type]);
	},

	removeEventListener: function(type, listener) {
		if (!this._listeners) return;
		if (!this._listeners[type]) return;

		var arr = this._listeners[type];
		for (var i = 0, l = arr.length; i < l; i++) {
			if (arr[i] == listener) {
				if (l == 1) {
					delete(this._listeners[type]);
				}
				// allows for faster checks.
				else {
					arr.splice(i, 1);
				}
				break;
			}
		}
	},
	removeAllEventListeners: function(type) {
		if (!type)
			this._listeners = null;
		else if (this._listeners)
			delete(this._listeners[type]);
	},

	dispatchEvent: function(eventName, eventTarget) {
		var ret = false,
			listeners = this._listeners;

		if (eventName && listeners) {
			var arr = listeners[eventName];
			if (!arr) return ret;

			arr = arr.slice();
			// to avoid issues with items being removed or added during the dispatch

			var handler, i = arr.length;
			while (i--) {
				var handler = arr[i];
				ret = ret || handler(eventTarget);
			}

		}
		return !!ret;
	}
};
// WaterTian

THREE.TyOrbitControls = function(object, domElement) {

	this.object = object;

	this.domElement = (domElement !== undefined) ? domElement : document;

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the object orbits around
	this.target = new THREE.Vector3();

	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// How far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = -Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to enable damping (inertia)
	// If damping is enabled, you must call controls.update() in your animation loop
	this.enableDamping = false;
	this.dampingFactor = 0.25;

	// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
	// Set to false to disable zooming
	this.enableZoom = true;
	this.zoomSpeed = 1.0;

	// Set to false to disable rotating
	this.enableRotate = true;
	this.rotateSpeed = 1.0;

	// Set to false to disable panning
	this.enablePan = true;
	this.keyPanSpeed = 7.0; // pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	// If auto-rotate is enabled, you must call controls.update() in your animation loop
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// Set to false to disable use of the keys
	this.enableKeys = true;

	// The four arrow keys
	this.keys = {
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		BOTTOM: 40
	};

	// Mouse buttons
	this.mouseButtons = {
		ORBIT: THREE.MOUSE.LEFT,
		ZOOM: THREE.MOUSE.MIDDLE,
		PAN: THREE.MOUSE.RIGHT
	};

	// for reset
	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	//TYadd 
	this.deviceOrientation = {};
	this.screenOrientation = 0;

	//
	// public methods
	//

	this.getPolarAngle = function() {

		return spherical.phi;

	};

	this.getAzimuthalAngle = function() {

		return spherical.theta;

	};

	this.reset = function() {

		scope.target.copy(scope.target0);
		scope.object.position.copy(scope.position0);
		scope.object.zoom = scope.zoom0;

		scope.object.updateProjectionMatrix();
		scope.dispatchEvent(changeEvent);

		scope.update();

		state = STATE.NONE;

	};

	////////////////////////////////////////

	//tyadd
	this.resetToStart = function() {
		TweenMax.to(scope.object.position, 1, {
			x: scope.position0.x,
			y: scope.position0.y,
			z: scope.position0.z,
			ease: Strong.easeInOut,
			onUpdate: function() {
				scope.update();
			}
		});
	};

	//tyadd
	this.moveIn = function(_t, _x, _y, _z, callback) {
		TweenMax.to(scope.object.position, _t, {
			x: _x,
			y: _y,
			z: _z,
			ease: Strong.easeInOut,
			onUpdate: function() {
				scope.update();
			},
			onComplete: function() {
				if (callback instanceof Function) callback.call();
			}
		});
	};
	//tyadd
	this.moveOut = function(callback) {
		TweenMax.to(scope.object.position, 1, {
			x: 0,
			y: 30,
			z: 2000,
			ease: Strong.easeOut,
			onUpdate: function() {
				scope.update();
			},
			onComplete: function() {
				if (callback instanceof Function) callback.call();
			}
		});
	};

	//tyadd if touch the  objects of the scene
	this.touchTargetCallBack = undefined;
	this.touchTargets = [];
	this.raycaster = new THREE.Raycaster();
	this.startTouchPoint = new THREE.Vector2();
	this.moveTouchPoint = new THREE.Vector2();
	//tyadd
	this.checkTouchTarget = function() {

		if (scope.moveTouchPoint.x == 0 && scope.moveTouchPoint.y == 0) {
			var mouse = new THREE.Vector2();
			mouse.x = (scope.startTouchPoint.x / window.innerWidth) * 2 - 1;
			mouse.y = -(scope.startTouchPoint.y / window.innerHeight) * 2 + 1;

			var camera = scope.object;
			scope.raycaster.setFromCamera(mouse, camera);

			for (var i = 0; i < scope.touchTargets.length; i++) {
				var intersects = scope.raycaster.intersectObject(scope.touchTargets[i]);
				if (intersects.length > 0) {
					if (scope.touchTargetCallBack) scope.touchTargetCallBack(scope.touchTargets[i]);
				}
			}

			scope.dispatchEvent({
				type: 'clickScene'
			});
		}
	}



	////////////////////////////////////////



	// this method is exposed, but perhaps it would be better if we can make it private...
	this.update = function() {

		var offset = new THREE.Vector3();

		// so camera.up is the orbit axis
		var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
		var quatInverse = quat.clone().inverse();


		var lastPosition = new THREE.Vector3();
		var lastQuaternion = new THREE.Quaternion();

		var euler = new THREE.Euler();
		var q0 = new THREE.Quaternion();
		var q1 = new THREE.Quaternion(Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); //  PI/2 around the x-axis

		return function update() {

			var alpha = scope.deviceOrientation.alpha ? THREE.Math.degToRad(scope.deviceOrientation.alpha) : 0; // Z
			var beta = scope.deviceOrientation.beta ? THREE.Math.degToRad(scope.deviceOrientation.beta) : 0; // X'
			var gamma = scope.deviceOrientation.gamma ? THREE.Math.degToRad(scope.deviceOrientation.gamma) : 0; // Y''
			var orient = scope.screenOrientation ? THREE.Math.degToRad(scope.screenOrientation) : 0; // O


			// if(TY.logBox)TY.logBox.innerHTML = "alpha:"+alpha+"  beta:"+beta+"  gamma:"+gamma+"  orient:"+orient;

			if (alpha != 0 || beta != 0 || gamma != 0) {
				// 'ZXY' for the device, but 'YXZ' for us
				euler.set(-beta, alpha, gamma, 'YXZ');
				q0.setFromEuler(euler);
				q0.multiply(q1);

				/////////////////////////////////////////
				if (TY.ThreeContainer) {
					TY.ThreeContainer.quaternion.slerp(q0, 0.2);
					// TY.ThreeContainer.setRotationFromQuaternion(q0);
				}
			}



			var position = scope.object.position;

			offset.copy(position).sub(scope.target);

			// rotate offset to "y-axis-is-up" space
			offset.applyQuaternion(quat);

			// angle from z-axis around y-axis
			spherical.setFromVector3(offset);


			if (scope.autoRotate && state === STATE.NONE) {
				rotateLeft(getAutoRotationAngle());
			}


			spherical.theta += sphericalDelta.theta;
			spherical.phi += sphericalDelta.phi;

			// restrict theta to be between desired limits
			spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));

			// restrict phi to be between desired limits
			spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

			spherical.makeSafe();


			spherical.radius *= scale;

			// restrict radius to be between desired limits
			spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

			// move target to panned location
			scope.target.add(panOffset);



			offset.setFromSpherical(spherical);

			// rotate offset back to "camera-up-vector-is-up" space
			offset.applyQuaternion(quatInverse);



			position.copy(scope.target).add(offset);

			scope.object.lookAt(scope.target);

			if (scope.enableDamping === 0) {

				sphericalDelta.theta *= (1 - scope.dampingFactor);
				sphericalDelta.phi *= (1 - scope.dampingFactor);

			} else {

				sphericalDelta.set(0, 0, 0);
			}

			scale = 1;
			panOffset.set(0, 0, 0);

			// update condition is:
			// min(camera displacement, camera rotation in radians)^2 > EPS
			// using small-angle approximation cos(x/2) = 1 - x^2 / 8

			if (zoomChanged ||
				lastPosition.distanceToSquared(scope.object.position) > EPS ||
				8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {

				scope.dispatchEvent(changeEvent);

				lastPosition.copy(scope.object.position);
				lastQuaternion.copy(scope.object.quaternion);
				zoomChanged = false;

				return true;
			}


			return false;

		};

	}();


	this.connect = function() {

		onScreenOrientationChangeEvent(); // run once on load
		window.addEventListener('orientationchange', onScreenOrientationChangeEvent, false);
		window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
		window.addEventListener('devicemotion', onDeviceMotionHandler, false);

		scope.domElement.addEventListener('contextmenu', onContextMenu, false);
		scope.domElement.addEventListener('mousedown', onMouseDown, false);
		scope.domElement.addEventListener('wheel', onMouseWheel, false);

		scope.domElement.addEventListener('touchstart', onTouchStart, false);
		scope.domElement.addEventListener('touchend', onTouchEnd, false);
		scope.domElement.addEventListener('touchmove', onTouchMove, false);

		window.addEventListener('keydown', onKeyDown, false);
	};

	this.dispose = function() {

		window.removeEventListener('orientationchange', onScreenOrientationChangeEvent, false);
		window.removeEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
		window.removeEventListener('devicemotion', onDeviceMotionHandler, false);

		scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
		scope.domElement.removeEventListener('mousedown', onMouseDown, false);
		scope.domElement.removeEventListener('wheel', onMouseWheel, false);

		scope.domElement.removeEventListener('touchstart', onTouchStart, false);
		scope.domElement.removeEventListener('touchend', onTouchEnd, false);
		scope.domElement.removeEventListener('touchmove', onTouchMove, false);

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);

		window.removeEventListener('keydown', onKeyDown, false);

		// scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

	};

	//
	// internals
	//

	var scope = this;

	var changeEvent = {
		type: 'change'
	};
	var startEvent = {
		type: 'start'
	};
	var endEvent = {
		type: 'end'
	};

	var STATE = {
		NONE: -1,
		ROTATE: 0,
		DOLLY: 1,
		PAN: 2,
		TOUCH_ROTATE: 3,
		TOUCH_DOLLY: 4,
		TOUCH_PAN: 5
	};

	var state = STATE.NONE;

	var EPS = 0.000001;

	// current position in spherical coordinates
	var spherical = new THREE.Spherical();
	var sphericalDelta = new THREE.Spherical();


	var scale = 1;
	var panOffset = new THREE.Vector3();
	var zoomChanged = false;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow(0.95, scope.zoomSpeed);

	}

	function rotateLeft(angle) {

		sphericalDelta.theta -= angle;

	}

	function rotateUp(angle) {

		sphericalDelta.phi -= angle;

	}

	var panLeft = function() {

		var v = new THREE.Vector3();

		return function panLeft(distance, objectMatrix) {

			v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
			v.multiplyScalar(-distance);

			panOffset.add(v);

		};

	}();

	var panUp = function() {

		var v = new THREE.Vector3();

		return function panUp(distance, objectMatrix) {

			v.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
			v.multiplyScalar(distance);

			panOffset.add(v);

		};

	}();

	// deltaX and deltaY are in pixels; right and down are positive
	var pan = function() {

		var offset = new THREE.Vector3();

		return function pan(deltaX, deltaY) {

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			if (scope.object instanceof THREE.PerspectiveCamera) {

				// perspective
				var position = scope.object.position;
				offset.copy(position).sub(scope.target);
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

				// we actually don't use screenWidth, since perspective camera is fixed to screen height
				panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
				panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);

			} else if (scope.object instanceof THREE.OrthographicCamera) {

				// orthographic
				panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
				panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);

			} else {

				// camera neither orthographic nor perspective
				console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
				scope.enablePan = false;

			}

		};

	}();

	function dollyIn(dollyScale) {

		if (scope.object instanceof THREE.PerspectiveCamera) {

			scale /= dollyScale;

		} else if (scope.object instanceof THREE.OrthographicCamera) {

			scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
			scope.object.updateProjectionMatrix();
			zoomChanged = true;

		} else {

			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;

		}

	}

	function dollyOut(dollyScale) {

		if (scope.object instanceof THREE.PerspectiveCamera) {

			scale *= dollyScale;

		} else if (scope.object instanceof THREE.OrthographicCamera) {

			scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
			scope.object.updateProjectionMatrix();
			zoomChanged = true;

		} else {

			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;

		}

	}

	//
	// event callbacks - update the object state
	//

	function handleMouseDownRotate(event) {
		//console.log( 'handleMouseDownRotate' );
		rotateStart.set(event.clientX, event.clientY);
		//tyadd
		scope.startTouchPoint.set(event.clientX, event.clientY);
		scope.moveTouchPoint.set(0, 0);
	}

	function handleMouseDownDolly(event) {

		//console.log( 'handleMouseDownDolly' );

		dollyStart.set(event.clientX, event.clientY);

	}

	function handleMouseDownPan(event) {

		//console.log( 'handleMouseDownPan' );

		panStart.set(event.clientX, event.clientY);

	}

	function handleMouseMoveRotate(event) {

		//console.log( 'handleMouseMoveRotate' );

		rotateEnd.set(event.clientX, event.clientY);
		rotateDelta.subVectors(rotateEnd, rotateStart);

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		// rotating across whole screen goes 360 degrees around
		rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

		// rotating up and down along whole screen attempts to go 360, but limited to 180
		rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

		rotateStart.copy(rotateEnd);

		//tyadd
		scope.moveTouchPoint.copy(rotateDelta);

		scope.update();

	}

	function handleMouseMoveDolly(event) {

		//console.log( 'handleMouseMoveDolly' );

		dollyEnd.set(event.clientX, event.clientY);

		dollyDelta.subVectors(dollyEnd, dollyStart);

		if (dollyDelta.y > 0) {

			dollyIn(getZoomScale());

		} else if (dollyDelta.y < 0) {

			dollyOut(getZoomScale());

		}

		dollyStart.copy(dollyEnd);

		scope.update();

	}

	function handleMouseMovePan(event) {

		//console.log( 'handleMouseMovePan' );

		panEnd.set(event.clientX, event.clientY);

		panDelta.subVectors(panEnd, panStart);

		pan(panDelta.x, panDelta.y);

		panStart.copy(panEnd);

		scope.update();

	}

	function handleMouseUp(event) {
		// console.log( 'handleMouseUp' );
		//tyadd
		scope.checkTouchTarget();
	}

	function handleMouseWheel(event) {

		// console.log( 'handleMouseWheel' );

		if (event.deltaY < 0) {

			dollyOut(getZoomScale());

		} else if (event.deltaY > 0) {

			dollyIn(getZoomScale());

		}

		scope.update();

	}

	function handleKeyDown(event) {

		//console.log( 'handleKeyDown' );

		switch (event.keyCode) {

			case scope.keys.UP:
				pan(0, scope.keyPanSpeed);
				scope.update();
				break;

			case scope.keys.BOTTOM:
				pan(0, -scope.keyPanSpeed);
				scope.update();
				break;

			case scope.keys.LEFT:
				pan(scope.keyPanSpeed, 0);
				scope.update();
				break;

			case scope.keys.RIGHT:
				pan(-scope.keyPanSpeed, 0);
				scope.update();
				break;

		}

	}


	function handleTouchStartDolly(event) {
		dollyStart.set(event.touches[0].pageX, event.touches[0].pageY);
		//tyadd
		scope.startTouchPoint.set(event.touches[0].pageX, event.touches[0].pageY);
		scope.moveTouchPoint.set(0, 0);
	}

	function handleTouchStartPan(event) {

		//console.log( 'handleTouchStartPan' );
		panStart.set(event.touches[0].pageX, event.touches[0].pageY);

	}

	function handleTouchMoveDolly(event) {

		dollyEnd.set(event.touches[0].pageX, event.touches[0].pageY);

		dollyDelta.subVectors(dollyEnd, dollyStart);

		if (dollyDelta.y > 0) {

			dollyOut(getZoomScale());

		} else if (dollyDelta.y < 0) {

			dollyIn(getZoomScale());

		}

		dollyStart.copy(dollyEnd);

		//tyadd
		scope.moveTouchPoint.copy(dollyDelta);

		scope.update();

	}

	function handleTouchMovePan(event) {

		//console.log( 'handleTouchMovePan' );

		panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

		panDelta.subVectors(panEnd, panStart);

		pan(panDelta.x, panDelta.y);

		panStart.copy(panEnd);

		scope.update();

	}

	function handleTouchEnd(event) {
		//console.log( 'handleTouchEnd' );
		//tyadd
		scope.checkTouchTarget();
	}

	//
	// event handlers - FSM: listen for events and reset state
	//

	function onMouseDown(event) {

		if (scope.enabled === false) return;

		event.preventDefault();

		if (event.button === scope.mouseButtons.ORBIT) {

			if (scope.enableRotate === false) return;

			handleMouseDownRotate(event);

			state = STATE.ROTATE;

		} else if (event.button === scope.mouseButtons.ZOOM) {

			if (scope.enableZoom === false) return;

			handleMouseDownDolly(event);

			state = STATE.DOLLY;

		} else if (event.button === scope.mouseButtons.PAN) {

			if (scope.enablePan === false) return;

			handleMouseDownPan(event);

			state = STATE.PAN;

		}

		if (state !== STATE.NONE) {

			document.addEventListener('mousemove', onMouseMove, false);
			document.addEventListener('mouseup', onMouseUp, false);

			scope.dispatchEvent(startEvent);

		}

	}

	function onMouseMove(event) {

		if (scope.enabled === false) return;

		event.preventDefault();

		if (state === STATE.ROTATE) {

			if (scope.enableRotate === false) return;

			handleMouseMoveRotate(event);

		} else if (state === STATE.DOLLY) {

			if (scope.enableZoom === false) return;

			handleMouseMoveDolly(event);

		} else if (state === STATE.PAN) {

			if (scope.enablePan === false) return;

			handleMouseMovePan(event);

		}

	}

	function onMouseUp(event) {

		if (scope.enabled === false) return;

		handleMouseUp(event);

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);

		scope.dispatchEvent(endEvent);

		state = STATE.NONE;

	}

	function onMouseWheel(event) {

		if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) return;

		event.preventDefault();
		event.stopPropagation();

		handleMouseWheel(event);

		scope.dispatchEvent(startEvent); // not sure why these are here...
		scope.dispatchEvent(endEvent);

	}

	function onKeyDown(event) {

		if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

		handleKeyDown(event);

	}

	function onTouchStart(event) {

		if (scope.enabled === false) return;

		switch (event.touches.length) {

			case 1: // one-fingered touch: rotate

				if (scope.enableRotate === false) return;

				handleTouchStartDolly(event);

				state = STATE.TOUCH_DOLLY;

				break;

			default:

				state = STATE.NONE;

		}

		if (state !== STATE.NONE) {

			scope.dispatchEvent(startEvent);

		}

	}

	function onTouchMove(event) {

		if (scope.enabled === false) return;

		event.preventDefault();
		event.stopPropagation();

		switch (event.touches.length) {

			case 1: // one-fingered touch: rotate

				if (scope.enableZoom === false) return;
				if (state !== STATE.TOUCH_DOLLY) return; // is this needed?...

				handleTouchMoveDolly(event);
				break;
			default:

				state = STATE.NONE;

		}

	}

	function onTouchEnd(event) {

		if (scope.enabled === false) return;

		handleTouchEnd(event);

		scope.dispatchEvent(endEvent);

		state = STATE.NONE;

		//tyadd
		scope.dispatchEvent({
			type: 'touchEnd'
		});
	}

	function onContextMenu(event) {

		event.preventDefault();

	}

	// tyadd
	function onDeviceOrientationChangeEvent(event) {
		if (scope.enabled === false) return;

		scope.deviceOrientation = event;
		scope.update();
	};
	// tyadd
	function onScreenOrientationChangeEvent() {
		if (scope.enabled === false) return;

		scope.screenOrientation = window.orientation || 0;
	};
	// tyadd
	var SHAKE_THRESHOLD = 2000;
	var last_update = 0;
	var x, y, z, last_x = 0,
		last_y = 0,
		last_z = 0;
	// tyadd
	function onDeviceMotionHandler(event) {
		if (scope.enabled === false) return;

		var acceleration = event.accelerationIncludingGravity;
		var curTime = new Date().getTime();
		if ((curTime - last_update) > 10) {
			var diffTime = curTime - last_update;
			last_update = curTime;
			x = acceleration.x;
			y = acceleration.y;
			z = acceleration.z;
			var speed = Math.abs(x + y + z - last_x - last_y - last_z) / diffTime * 10000;
			if (speed > SHAKE_THRESHOLD) {
				console.log("摇一摇");
				scope.dispatchEvent({
					type: 'yao'
				});
			}
			last_x = x;
			last_y = y;
			last_z = z;
		};
	}


	//

	this.connect();

	// force an update at start

	this.update();

};

THREE.TyOrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.TyOrbitControls.prototype.constructor = THREE.TyOrbitControls;

Object.defineProperties(THREE.TyOrbitControls.prototype, {

	center: {

		get: function() {

			console.warn('THREE.OrbitControls: .center has been renamed to .target');
			return this.target;

		}

	},

	// backward compatibility

	noZoom: {

		get: function() {

			console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
			return !this.enableZoom;

		},

		set: function(value) {

			console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
			this.enableZoom = !value;

		}

	},

	noRotate: {

		get: function() {

			console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
			return !this.enableRotate;

		},

		set: function(value) {

			console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
			this.enableRotate = !value;

		}

	},

	noPan: {

		get: function() {

			console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
			return !this.enablePan;

		},

		set: function(value) {

			console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
			this.enablePan = !value;

		}

	},

	noKeys: {

		get: function() {

			console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
			return !this.enableKeys;

		},

		set: function(value) {

			console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
			this.enableKeys = !value;

		}

	},

	staticMoving: {

		get: function() {

			console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
			return !this.enableDamping;

		},

		set: function(value) {

			console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
			this.enableDamping = !value;

		}

	},

	dynamicDampingFactor: {

		get: function() {

			console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
			return this.dampingFactor;

		},

		set: function(value) {

			console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
			this.dampingFactor = value;

		}

	}

});
;(function () {
	'use strict';

	/**
	 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
	 *
	 * @codingstandard ftlabs-jsv2
	 * @copyright The Financial Times Limited [All Rights Reserved]
	 * @license MIT License (see LICENSE.txt)
	 */

	/*jslint browser:true, node:true*/
	/*global define, Event, Node*/


	/**
	 * Instantiate fast-clicking listeners on the specified layer.
	 *
	 * @constructor
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	function FastClick(layer, options) {
		var oldOnClick;

		options = options || {};

		/**
		 * Whether a click is currently being tracked.
		 *
		 * @type boolean
		 */
		this.trackingClick = false;


		/**
		 * Timestamp for when click tracking started.
		 *
		 * @type number
		 */
		this.trackingClickStart = 0;


		/**
		 * The element being tracked for a click.
		 *
		 * @type EventTarget
		 */
		this.targetElement = null;


		/**
		 * X-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartX = 0;


		/**
		 * Y-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartY = 0;


		/**
		 * ID of the last touch, retrieved from Touch.identifier.
		 *
		 * @type number
		 */
		this.lastTouchIdentifier = 0;


		/**
		 * Touchmove boundary, beyond which a click will be cancelled.
		 *
		 * @type number
		 */
		this.touchBoundary = options.touchBoundary || 10;


		/**
		 * The FastClick layer.
		 *
		 * @type Element
		 */
		this.layer = layer;

		/**
		 * The minimum time between tap(touchstart and touchend) events
		 *
		 * @type number
		 */
		this.tapDelay = options.tapDelay || 200;

		/**
		 * The maximum time for a tap
		 *
		 * @type number
		 */
		this.tapTimeout = options.tapTimeout || 700;

		if (FastClick.notNeeded(layer)) {
			return;
		}

		// Some old versions of Android don't have Function.prototype.bind
		function bind(method, context) {
			return function() { return method.apply(context, arguments); };
		}


		var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
		var context = this;
		for (var i = 0, l = methods.length; i < l; i++) {
			context[methods[i]] = bind(context[methods[i]], context);
		}

		// Set up event handlers as required
		if (deviceIsAndroid) {
			layer.addEventListener('mouseover', this.onMouse, true);
			layer.addEventListener('mousedown', this.onMouse, true);
			layer.addEventListener('mouseup', this.onMouse, true);
		}

		layer.addEventListener('click', this.onClick, true);
		layer.addEventListener('touchstart', this.onTouchStart, false);
		layer.addEventListener('touchmove', this.onTouchMove, false);
		layer.addEventListener('touchend', this.onTouchEnd, false);
		layer.addEventListener('touchcancel', this.onTouchCancel, false);

		// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
		// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
		// layer when they are cancelled.
		if (!Event.prototype.stopImmediatePropagation) {
			layer.removeEventListener = function(type, callback, capture) {
				var rmv = Node.prototype.removeEventListener;
				if (type === 'click') {
					rmv.call(layer, type, callback.hijacked || callback, capture);
				} else {
					rmv.call(layer, type, callback, capture);
				}
			};

			layer.addEventListener = function(type, callback, capture) {
				var adv = Node.prototype.addEventListener;
				if (type === 'click') {
					adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
						if (!event.propagationStopped) {
							callback(event);
						}
					}), capture);
				} else {
					adv.call(layer, type, callback, capture);
				}
			};
		}

		// If a handler is already declared in the element's onclick attribute, it will be fired before
		// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
		// adding it as listener.
		if (typeof layer.onclick === 'function') {

			// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
			// - the old one won't work if passed to addEventListener directly.
			oldOnClick = layer.onclick;
			layer.addEventListener('click', function(event) {
				oldOnClick(event);
			}, false);
			layer.onclick = null;
		}
	}

	/**
	* Windows Phone 8.1 fakes user agent string to look like Android and iPhone.
	*
	* @type boolean
	*/
	var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

	/**
	 * Android requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


	/**
	 * iOS requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


	/**
	 * iOS 4 requires an exception for select elements.
	 *
	 * @type boolean
	 */
	var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


	/**
	 * iOS 6.0-7.* requires the target element to be manually derived
	 *
	 * @type boolean
	 */
	var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

	/**
	 * BlackBerry requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	FastClick.prototype.needsClick = function(target) {
		switch (target.nodeName.toLowerCase()) {

		// Don't send a synthetic click to disabled inputs (issue #62)
		case 'button':
		case 'select':
		case 'textarea':
			if (target.disabled) {
				return true;
			}

			break;
		case 'input':

			// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
			if ((deviceIsIOS && target.type === 'file') || target.disabled) {
				return true;
			}

			break;
		case 'label':
		case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
		case 'video':
			return true;
		}

		return (/\bneedsclick\b/).test(target.className);
	};


	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	FastClick.prototype.needsFocus = function(target) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true;
		case 'select':
			return !deviceIsAndroid;
		case 'input':
			switch (target.type) {
			case 'button':
			case 'checkbox':
			case 'file':
			case 'image':
			case 'radio':
			case 'submit':
				return false;
			}

			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly;
		default:
			return (/\bneedsfocus\b/).test(target.className);
		}
	};


	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	FastClick.prototype.sendClick = function(targetElement, event) {
		var clickEvent, touch;

		// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
		if (document.activeElement && document.activeElement !== targetElement) {
			document.activeElement.blur();
		}

		touch = event.changedTouches[0];

		// Synthesise a click event, with an extra attribute so it can be tracked
		clickEvent = document.createEvent('MouseEvents');
		clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
		clickEvent.forwardedTouchEvent = true;
		targetElement.dispatchEvent(clickEvent);
	};

	FastClick.prototype.determineEventType = function(targetElement) {

		//Issue #159: Android Chrome Select Box does not open with a synthetic click event
		if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
			return 'mousedown';
		}

		return 'click';
	};


	/**
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.focus = function(targetElement) {
		var length;

		// Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
		if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
			length = targetElement.value.length;
			targetElement.setSelectionRange(length, length);
		} else {
			targetElement.focus();
		}
	};


	/**
	 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
	 *
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.updateScrollParent = function(targetElement) {
		var scrollParent, parentElement;

		scrollParent = targetElement.fastClickScrollParent;

		// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
		// target element was moved to another parent.
		if (!scrollParent || !scrollParent.contains(targetElement)) {
			parentElement = targetElement;
			do {
				if (parentElement.scrollHeight > parentElement.offsetHeight) {
					scrollParent = parentElement;
					targetElement.fastClickScrollParent = parentElement;
					break;
				}

				parentElement = parentElement.parentElement;
			} while (parentElement);
		}

		// Always update the scroll top tracker if possible.
		if (scrollParent) {
			scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
		}
	};


	/**
	 * @param {EventTarget} targetElement
	 * @returns {Element|EventTarget}
	 */
	FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

		// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
		if (eventTarget.nodeType === Node.TEXT_NODE) {
			return eventTarget.parentNode;
		}

		return eventTarget;
	};


	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchStart = function(event) {
		var targetElement, touch, selection;

		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true;
		}

		targetElement = this.getTargetElementFromEventTarget(event.target);
		touch = event.targetTouches[0];

		if (deviceIsIOS) {

			// Only trusted events will deselect text on iOS (issue #49)
			selection = window.getSelection();
			if (selection.rangeCount && !selection.isCollapsed) {
				return true;
			}

			if (!deviceIsIOS4) {

				// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
				// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
				// with the same identifier as the touch event that previously triggered the click that triggered the alert.
				// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
				// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
				// Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
				// which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
				// random integers, it's safe to to continue if the identifier is 0 here.
				if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
					event.preventDefault();
					return false;
				}

				this.lastTouchIdentifier = touch.identifier;

				// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
				// 1) the user does a fling scroll on the scrollable layer
				// 2) the user stops the fling scroll with another tap
				// then the event.target of the last 'touchend' event will be the element that was under the user's finger
				// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
				// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
				this.updateScrollParent(targetElement);
			}
		}

		this.trackingClick = true;
		this.trackingClickStart = event.timeStamp;
		this.targetElement = targetElement;

		this.touchStartX = touch.pageX;
		this.touchStartY = touch.pageY;

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault();
		}

		return true;
	};


	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.touchHasMoved = function(event) {
		var touch = event.changedTouches[0], boundary = this.touchBoundary;

		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true;
		}

		return false;
	};


	/**
	 * Update the last position.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchMove = function(event) {
		if (!this.trackingClick) {
			return true;
		}

		// If the touch has moved, cancel the click tracking
		if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
			this.trackingClick = false;
			this.targetElement = null;
		}

		return true;
	};


	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @param {EventTarget|HTMLLabelElement} labelElement
	 * @returns {Element|null}
	 */
	FastClick.prototype.findControl = function(labelElement) {

		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control;
		}

		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor);
		}

		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
	};


	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchEnd = function(event) {
		var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

		if (!this.trackingClick) {
			return true;
		}

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true;
			return true;
		}

		if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
			return true;
		}

		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false;

		this.lastClickTime = event.timeStamp;

		trackingClickStart = this.trackingClickStart;
		this.trackingClick = false;
		this.trackingClickStart = 0;

		// On some iOS devices, the targetElement supplied with the event is invalid if the layer
		// is performing a transition or scroll, and has to be re-detected manually. Note that
		// for this to function correctly, it must be called *after* the event target is checked!
		// See issue #57; also filed as rdar://13048589 .
		if (deviceIsIOSWithBadTarget) {
			touch = event.changedTouches[0];

			// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
			targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
			targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
		}

		targetTagName = targetElement.tagName.toLowerCase();
		if (targetTagName === 'label') {
			forElement = this.findControl(targetElement);
			if (forElement) {
				this.focus(targetElement);
				if (deviceIsAndroid) {
					return false;
				}

				targetElement = forElement;
			}
		} else if (this.needsFocus(targetElement)) {

			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
				this.targetElement = null;
				return false;
			}

			this.focus(targetElement);
			this.sendClick(targetElement, event);

			// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
			// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
			if (!deviceIsIOS || targetTagName !== 'select') {
				this.targetElement = null;
				event.preventDefault();
			}

			return false;
		}

		if (deviceIsIOS && !deviceIsIOS4) {

			// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
			// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
			scrollParent = targetElement.fastClickScrollParent;
			if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
				return true;
			}
		}

		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault();
			this.sendClick(targetElement, event);
		}

		return false;
	};


	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.onTouchCancel = function() {
		this.trackingClick = false;
		this.targetElement = null;
	};


	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onMouse = function(event) {

		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true;
		}

		if (event.forwardedTouchEvent) {
			return true;
		}

		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true;
		}

		// Derive and check the target element to see whether the mouse event needs to be permitted;
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			} else {

				// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
				event.propagationStopped = true;
			}

			// Cancel the event
			event.stopPropagation();
			event.preventDefault();

			return false;
		}

		// If the mouse event is permitted, return true for the action to go through.
		return true;
	};


	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onClick = function(event) {
		var permitted;

		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null;
			this.trackingClick = false;
			return true;
		}

		// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
		if (event.target.type === 'submit' && event.detail === 0) {
			return true;
		}

		permitted = this.onMouse(event);

		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null;
		}

		// If clicks are permitted, return true for the action to go through.
		return permitted;
	};


	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.destroy = function() {
		var layer = this.layer;

		if (deviceIsAndroid) {
			layer.removeEventListener('mouseover', this.onMouse, true);
			layer.removeEventListener('mousedown', this.onMouse, true);
			layer.removeEventListener('mouseup', this.onMouse, true);
		}

		layer.removeEventListener('click', this.onClick, true);
		layer.removeEventListener('touchstart', this.onTouchStart, false);
		layer.removeEventListener('touchmove', this.onTouchMove, false);
		layer.removeEventListener('touchend', this.onTouchEnd, false);
		layer.removeEventListener('touchcancel', this.onTouchCancel, false);
	};


	/**
	 * Check whether FastClick is needed.
	 *
	 * @param {Element} layer The layer to listen on
	 */
	FastClick.notNeeded = function(layer) {
		var metaViewport;
		var chromeVersion;
		var blackberryVersion;
		var firefoxVersion;

		// Devices that don't support touch don't need FastClick
		if (typeof window.ontouchstart === 'undefined') {
			return true;
		}

		// Chrome version - zero for other browsers
		chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (chromeVersion) {

			if (deviceIsAndroid) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// Chrome 32 and above with width=device-width or less don't need FastClick
					if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}

			// Chrome desktop doesn't need FastClick (issue #15)
			} else {
				return true;
			}
		}

		if (deviceIsBlackBerry10) {
			blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

			// BlackBerry 10.3+ does not require Fastclick library.
			// https://github.com/ftlabs/fastclick/issues/251
			if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// user-scalable=no eliminates click delay.
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// width=device-width (or less than device-width) eliminates click delay.
					if (document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
			}
		}

		// IE10 with -ms-touch-action: none or manipulation, which disables double-tap-to-zoom (issue #97)
		if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		// Firefox version - zero for other browsers
		firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (firefoxVersion >= 27) {
			// Firefox 27+ does not have tap delay if the content is not zoomable - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

			metaViewport = document.querySelector('meta[name=viewport]');
			if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
				return true;
			}
		}

		// IE11: prefixed -ms-touch-action is no longer supported and it's recomended to use non-prefixed version
		// http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
		if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		return false;
	};


	/**
	 * Factory method for creating a FastClick object
	 *
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	FastClick.attach = function(layer, options) {
		return new FastClick(layer, options);
	};


	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

		// AMD. Register as an anonymous module.
		define(function() {
			return FastClick;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = FastClick.attach;
		module.exports.FastClick = FastClick;
	} else {
		window.FastClick = FastClick;
	}
}());

TY.H5Sound = {
    load: function(sounds, fun) {

        createjs.Sound.alternateExtensions = ["mp3"]; // add other extensions to try loading if the src file extension is not supported
        createjs.Sound.addEventListener("fileload", createjs.proxy(soundLoaded, this)); // add an event listener for when load is completed
        createjs.Sound.registerSounds(sounds);

        var _num = 0;

        function soundLoaded(e) {
            _num++;
            if (_num >= sounds.length) {
                if (fun) fun();
            }
        }
    },

    play: function(id, loop, completeFun) {
		console.log(id)
        //Play the sound: play (src, interrupt, delay, offset, loop, volume, pan)
        var instance = createjs.Sound.play(id, createjs.Sound.INTERRUPT_ANY, 0, 0, loop - 1, 1, 0);
        if (instance == null || instance.playState == createjs.Sound.PLAY_FAILED) {
            return;
        }
        console.log("playSound:" + id);

        instance.addEventListener("complete", function(instance) {
            if (completeFun) completeFun();
        });
    },

    stop: function(id) {
        createjs.Sound.stop(id);
    }
}
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
/**
 * @author Slayvin / http://slayvin.net
 */

THREE.Mirror = function ( width, height, options ) {

	THREE.Mesh.call( this, new THREE.PlaneBufferGeometry( width, height ) );

	var scope = this;

	scope.name = 'mirror_' + scope.id;
	scope.matrixNeedsUpdate = true;

	options = options || {};

	var textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512;
	var textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512;

	var clipBias = options.clipBias !== undefined ? options.clipBias : 0.0;
	var mirrorColor = options.color !== undefined ? new THREE.Color( options.color ) : new THREE.Color( 0x7F7F7F );

	var mirrorPlane = new THREE.Plane();
	var normal = new THREE.Vector3();
	var mirrorWorldPosition = new THREE.Vector3();
	var cameraWorldPosition = new THREE.Vector3();
	var rotationMatrix = new THREE.Matrix4();
	var lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
	var clipPlane = new THREE.Vector4();

	var view = new THREE.Vector3();
	var target = new THREE.Vector3();
	var q = new THREE.Vector4();

	var textureMatrix = new THREE.Matrix4();

	var mirrorCamera = new THREE.PerspectiveCamera();

	var parameters = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBFormat,
		stencilBuffer: false
	};

	var renderTarget = new THREE.WebGLRenderTarget( textureWidth, textureHeight, parameters );

	if ( ! THREE.Math.isPowerOfTwo( textureWidth ) || ! THREE.Math.isPowerOfTwo( textureHeight ) ) {

		renderTarget.texture.generateMipmaps = false;

	}

	var mirrorShader = {

		uniforms: {
			mirrorColor: { value: new THREE.Color( 0x7F7F7F ) },
			mirrorSampler: { value: null },
			textureMatrix: { value: new THREE.Matrix4() }
		},

		vertexShader: [
			'uniform mat4 textureMatrix;',
			'varying vec4 mirrorCoord;',

			'void main() {',

			'	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
			'	vec4 worldPosition = modelMatrix * vec4( position, 1.0 );',
			'	mirrorCoord = textureMatrix * worldPosition;',

			'	gl_Position = projectionMatrix * mvPosition;',

			'}'
		].join( '\n' ),

		fragmentShader: [
			'uniform vec3 mirrorColor;',
			'uniform sampler2D mirrorSampler;',
			'varying vec4 mirrorCoord;',

			'float blendOverlay(float base, float blend) {',
			'	return( base < 0.5 ? ( 2.0 * base * blend ) : (1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );',
			'}',

			'void main() {',
			'	vec4 color = texture2DProj(mirrorSampler, mirrorCoord);',
			'	color = vec4(blendOverlay(mirrorColor.r, color.r), blendOverlay(mirrorColor.g, color.g), blendOverlay(mirrorColor.b, color.b), 1.0);',
			'	gl_FragColor = color;',
			'}'
		].join( '\n' )

	};

	var mirrorUniforms = THREE.UniformsUtils.clone( mirrorShader.uniforms );

	var material = new THREE.ShaderMaterial( {

		fragmentShader: mirrorShader.fragmentShader,
		vertexShader: mirrorShader.vertexShader,
		uniforms: mirrorUniforms

	} );

	material.uniforms.mirrorSampler.value = renderTarget.texture;
	material.uniforms.mirrorColor.value = mirrorColor;
	material.uniforms.textureMatrix.value = textureMatrix;

	scope.material = material;

	function updateTextureMatrix( camera ) {

		scope.updateMatrixWorld();

		mirrorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
		cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

		rotationMatrix.extractRotation( scope.matrixWorld );

		normal.set( 0, 0, 1 );
		normal.applyMatrix4( rotationMatrix );

		view.subVectors( mirrorWorldPosition, cameraWorldPosition );
		view.reflect( normal ).negate();
		view.add( mirrorWorldPosition );

		rotationMatrix.extractRotation( camera.matrixWorld );

		lookAtPosition.set( 0, 0, - 1 );
		lookAtPosition.applyMatrix4( rotationMatrix );
		lookAtPosition.add( cameraWorldPosition );

		target.subVectors( mirrorWorldPosition, lookAtPosition );
		target.reflect( normal ).negate();
		target.add( mirrorWorldPosition );

		mirrorCamera.position.copy( view );
		mirrorCamera.up.set( 0, - 1, 0 );
		mirrorCamera.up.applyMatrix4( rotationMatrix );
		mirrorCamera.up.reflect( normal ).negate();
		mirrorCamera.lookAt( target );

		mirrorCamera.near = camera.near;
		mirrorCamera.far = camera.far;

		mirrorCamera.updateMatrixWorld();
		mirrorCamera.updateProjectionMatrix();

		// Update the texture matrix
		textureMatrix.set(
			0.5, 0.0, 0.0, 0.5,
			0.0, 0.5, 0.0, 0.5,
			0.0, 0.0, 0.5, 0.5,
			0.0, 0.0, 0.0, 1.0
		);
		textureMatrix.multiply( mirrorCamera.projectionMatrix );
		textureMatrix.multiply( mirrorCamera.matrixWorldInverse );

		// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
		// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
		mirrorPlane.setFromNormalAndCoplanarPoint( normal, mirrorWorldPosition );
		mirrorPlane.applyMatrix4( mirrorCamera.matrixWorldInverse );

		clipPlane.set( mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant );

		var projectionMatrix = mirrorCamera.projectionMatrix;

		q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
		q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
		q.z = - 1.0;
		q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

		// Calculate the scaled plane vector
		clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

		// Replacing the third row of the projection matrix
		projectionMatrix.elements[ 2 ] = clipPlane.x;
		projectionMatrix.elements[ 6 ] = clipPlane.y;
		projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
		projectionMatrix.elements[ 14 ] = clipPlane.w;

	}

	scope.onBeforeRender = function ( renderer, scene, camera ) {

		updateTextureMatrix( camera );

		scope.visible = false;

		var currentRenderTarget = renderer.getRenderTarget();

		var currentVrEnabled = renderer.vr.enabled;
		var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

		renderer.vr.enabled = false; // Avoid camera modification and recursion
		renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

		renderer.render( scene, mirrorCamera, renderTarget, true );

		renderer.vr.enabled = currentVrEnabled;
		renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

		renderer.setRenderTarget( currentRenderTarget );

		scope.visible = true;

	};

};

THREE.Mirror.prototype = Object.create( THREE.Mesh.prototype );

/**
 * @author waterTian
 */
TY.Avatar = function(geometry, material) {
	THREE.SkinnedMesh.call(this, geometry, material);
	var scope = this;

	this.NativeVs = [];
	this.MoveVs = [];
	for (var i = 0; i < geometry.vertices.length; i++) {
		this.NativeVs.push(geometry.vertices[i].clone());
		this.MoveVs.push(geometry.vertices[i].clone());
	}


	this.isFire = false;
	this.fireTime = 0;


	this.timeScale = 1;
	//Animate
	this.mixer = new THREE.AnimationMixer(this);
	this.animateNameList = [];
	this.animateClips = [];
	this.morphClips = [];
	this.currentAction = null;

	this.animateClips = geometry.animations;

	if (geometry.animations) {
		for (var i = 0; i < geometry.animations.length; i++) {
			var n = geometry.animations[i].name;
			scope.animateNameList.push(n);
		};
	}
	console.log("animateNameList:" + scope.animateNameList);

	//Morph   fps=1
	// console.log("morphTargets:");
	// console.log(geometry.morphTargets);
	this.morphClips = THREE.AnimationClip.CreateClipsFromMorphTargetSequences(geometry.morphTargets, 1); //fps=1
	// this.morphClips[0] = THREE.AnimationClip.CreateFromMorphTargetSequence( 'gallop', geometry.morphTargets, 30 );
}


TY.Avatar.prototype = Object.assign(Object.create(THREE.SkinnedMesh.prototype), TY.EventDispatcher.prototype, {

	constructor: TY.Avatar,

	setMoveVsZ: function(_s) {
		for (i = 0; i < this.MoveVs.length; i++) {
			this.MoveVs[i].z *= _s;
		}
	},
	resetMoveVs: function() {
		for (i = 0; i < this.MoveVs.length; i++) {
			this.MoveVs[i] = this.NativeVs[i].clone();
		}
	},
	setRandMoveVs: function(_r) {
		for (i = 0; i < this.MoveVs.length; i++) {
			var r = TY.rand(-_r, _r);
			this.MoveVs[i].x *= r;
			this.MoveVs[i].y *= r;
			this.MoveVs[i].z *= r;
		}
	},

	playAction: function(clip) {
		var action = this.mixer.clipAction(clip);
		action.setEffectiveTimeScale(this.timeScale);
		action.paused = false;
		action.play();
		this.dispatchEvent('playAction', action);
		return action;
	},


	fadeAction: function(clip, duration) {
		if (this.currentAction == this.mixer.clipAction(clip)) return;

		var scope = this;
		var toAction = this.playAction(clip);
		if (this.currentAction) {
			console.log("crossFadeTo")
			this.currentAction.crossFadeTo(toAction, duration, false);
			setTimeout(function() {
				scope.currentAction.stop();
				scope.currentAction = toAction;
			}, duration * 1000);
		} else {
			this.currentAction = toAction;
		}

	},


	/*
	  percent 0~1  duration/alltimes percent 
	*/
	gotoAndStopAction: function(clip, percent) {
		var action = this.mixer.clipAction(clip);
		action.setEffectiveTimeScale(this.timeScale);
		if (!action.isRunning()) action.play();
		// paused
		action.paused = true;
		action.time = clip.duration * 0.5 * percent;
		// action.play();
		return action;
	},

	gotoAndStop: function(percent) {
		if (this.currentAction) {
			this.currentAction.paused = true;
			this.currentAction.time = this.currentAction.duration * 0.5 * percent;
		}
	},


	update: function(dt) {
		this.mixer.update(dt);

		var time = Date.now() * 0.01;
		for (var i = 0; i < this.geometry.vertices.length; i++) {
			var t = Math.sin(i * 0.1 + time) * 0.01;
			this.geometry.vertices[i].x += ((this.MoveVs[i].x + t) - this.geometry.vertices[i].x) * 0.16;
			this.geometry.vertices[i].y += ((this.MoveVs[i].y + t) - this.geometry.vertices[i].y) * 0.16;
			this.geometry.vertices[i].z += ((this.MoveVs[i].z + t) - this.geometry.vertices[i].z) * 0.16;
			this.geometry.verticesNeedUpdate = true;
		}


		if (this.isFire) {
			for (var i = 0; i < this.NativeVs.length; i++) {
				var v0 = this.NativeVs[i];
				var v = TY.displacement(v0.x, v0.y, v0.z, this.fireTime / 2);
				this.geometry.vertices[i].set(v.y * 60 + v0.x, v.x * 60 + v0.y, v.z * 60 + v0.z);

				this.geometry.verticesNeedUpdate = true;
			}
			this.fireTime++;
		}
	},



	applyWeight: function(animName, weight) {
		this.mixer.clipAction(animName).setEffectiveWeight(weight);
	},

	getWeight: function(animName) {
		return this.mixer.clipAction(animName).getEffectiveWeight();
	},

	pauseAll: function() {
		this.mixer.timeScale = 0;
	},

	stopAll: function() {
		this.mixer.stopAllAction();
	},

	showModel: function(boolean) {
		this.visible = boolean;
	}
});
var container, stats;

var camera, scene, renderer;

var cubeCamera;
var L1;
var logo;


var avatarScale = 0.6;
var avatar, skeletonHelper;
var skyBox;
var ground;
var snows;

var composer;
var FilmEffect, WaterEffect;
var effectType = 1;

var clock = new THREE.Clock();
var start = Date.now();

var Floor = -300;

var raycaster;
var mouse = new THREE.Vector2(),
	INTERSECTED;

init();
animate();

function init() {
	container = document.createElement('div');
	document.body.appendChild(container);


	scene = new THREE.Scene();
	scene.fog = new THREE.Fog(0x000000, 400, 1800);


	//light
	var ambient = new THREE.AmbientLight(0x888888, 1);
	scene.add(ambient);
	var dirLight = new THREE.DirectionalLight(0xcccccc, 1);
	dirLight.color.setHSL(0.1, 1, 0.95);
	dirLight.position.set(1, 1.75, 1);
	dirLight.position.multiplyScalar(50);
	scene.add(dirLight);


	// RENDERER
	renderer = new THREE.WebGLRenderer({
		antialias: true
	});

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(new THREE.Color(0x271137));
	container.appendChild(renderer.domElement);

	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.shadowMap.enabled = true;

	FastClick.attach(document.body);

	// CUBE CAMERA
	cubeCamera = new THREE.CubeCamera(1, 10000, 128);
	cubeCamera.position.set(0, Floor + 160, 0);
	scene.add(cubeCamera);

	///// controls, camera
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 40000);
	camera.position.set(0, 8000, 8000);
	scene.add(camera);

	controls = new THREE.TyOrbitControls(camera, renderer.domElement);
	controls.target.set(0, Floor + 60, 0);
	controls.update();


	TY.ThreeContainer = new THREE.Group();
	scene.add(TY.ThreeContainer);


	window.addEventListener('resize', onWindowResize, false);

	// STATS
	// stats = new Stats();
	// container.appendChild(stats.dom);


	intoIntor();


	// postprocessing
	composer = new THREE.EffectComposer(renderer);
	composer.addPass(new THREE.RenderPass(scene, camera));

	FilmEffect = new THREE.FilmPass(0.35, 0.0, 2048, false);
	composer.addPass(FilmEffect);
	WaterEffect = new THREE.WaterPass();
	composer.addPass(WaterEffect);

	var TextureEffect = new THREE.TexturePass(new THREE.TextureLoader().load('assets/img/vignette.png'), 0.9);
	TextureEffect.renderToScreen = true;
	composer.addPass(TextureEffect);


}

function changeEffect() {

	if (effectType == 1) {
		WaterEffect.renderToScreen = false;
		FilmEffect.renderToScreen = true;

		FilmEffect.setUniforms(0.35, 0.9, 2048, false);
	}
	if (effectType == 2) {
		WaterEffect.renderToScreen = false;
		FilmEffect.renderToScreen = true;

		FilmEffect.setUniforms(0.35, 0.0, 648, Math.floor(Math.random() * 2));
	}
	if (effectType == 3) {
		WaterEffect.renderToScreen = true;
		FilmEffect.renderToScreen = false;
	}

	effectType++;
	if (effectType > 3) effectType = 1;


	TY.H5Sound.play("l" + Math.floor(Math.random() * 6 + 1), 1);

	controls.moveIn(3, Math.random() * 1000 - 500, Floor + Math.random() * 600, 200 + Math.random() * 1000);
}


function intoIntor() {
	initSky();
	initSnows();
	L1 = new TY.Light2(new THREE.IcosahedronGeometry(30, 5));
	L1.position.set(0, Floor + 100, 0);
	TY.ThreeContainer.add(L1);
	TweenMax.to(L1.scale, 3, {
		x: 80,
		y: 80,
		z: 80
	});

	var material = new THREE.MeshLambertMaterial({
		map: new THREE.TextureLoader().load('assets/img/logo.png'),
		transparent: true,
		opacity: 0,
		fog: false,
		side: THREE.DoubleSide
	});
	logo = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 4, 4), material);
	logo.position.set(0, 1600, 1600);
	logo.rotation.set(-Math.PI / 4, 0, 0);
	scene.add(logo);
	TweenMax.to(material, 2, {
		opacity: 1,
		delay: 1
	});

	var sounds = [{
		src: TY.baseURL + "assets/sound/bg.mp3",
		id: "bg"
	}, {
		src: TY.baseURL + "assets/sound/intro.mp3",
		id: "intro"
	}, {
		src: TY.baseURL + "assets/sound/intro2.mp3",
		id: "intro2"
	}, {
		src: TY.baseURL + "assets/sound/l1.mp3",
		id: "l1"
	}, {
		src: TY.baseURL + "assets/sound/l2.mp3",
		id: "l2"
	}, {
		src: TY.baseURL + "assets/sound/l3.mp3",
		id: "l3"
	}, {
		src: TY.baseURL + "assets/sound/l4.mp3",
		id: "l4"
	}, {
		src: TY.baseURL + "assets/sound/l5.mp3",
		id: "l5"
	}, {
		src: TY.baseURL + "assets/sound/l6.mp3",
		id: "l6"
	}];
	TY.H5Sound.load(sounds, soundLoadComplete);

	function soundLoadComplete() {
		console.log("sounds loaded")
		TY.H5Sound.play("bg", 0);

		if (TY.isMobileDevice()) controls.addEventListener('touchEnd', intoStage);
		else controls.addEventListener('clickScene', intoStage);
	}

}



function intoStage() {

	controls.removeEventListener('touchEnd', intoStage);
	controls.removeEventListener('clickScene', intoStage);

	TY.H5Sound.play("intro", 1);

	controls.enabled = false;
	TweenMax.to(L1.scale, 5, {
		x: .1,
		y: .1,
		z: .1,
		ease: Strong.easeInOut,
		onComplete: function() {
			TY.ThreeContainer.remove(L1);
			L1 = new TY.Light2(new THREE.IcosahedronGeometry(16, 2));
			L1.position.set(0, Floor + 120, 0);
			TY.ThreeContainer.add(L1);
			L1.MoveAble = true;

			initGround();
		}
	});

	TweenMax.to(logo.material, 3, {
		opacity: 0,
		delay: 3
	});

	controls.moveIn(9, 0, Floor + 200, 600, function() {
		controls.enabled = true;
		controls.minDistance = 100;
		controls.maxDistance = 2000;
		controls.minPolarAngle = Math.PI * 0.2;
		controls.maxPolarAngle = Math.PI * 0.48;

		logo.material.opacity = 0.8;

		initTrees();
		//Load Model
		loadModel('assets/models/model.js');
	});
}



function initSky() {
	var texture = new THREE.TextureLoader().load('assets/img/starsmap.jpg', function() {
		var material = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			opacity: 0,
			fog: false
		});

		var geometry = new THREE.SphereBufferGeometry(5000, 60, 40).toNonIndexed();

		skyBox = new THREE.Mesh(geometry, material);
		skyBox.applyMatrix(new THREE.Matrix4().makeScale(1, 1, -1));
		TY.ThreeContainer.add(skyBox);

		TweenMax.to(material, 8, {
			opacity: 1,
			onCompleteParams: [material],
			onComplete: function(_s) {
				_s.transparent = false;
			}
		});

		var fgtexture = new THREE.TextureLoader().load('assets/img/fg.png');
		fgtexture.repeat.set(1, 1.6);
		var fgmaterial = new THREE.MeshBasicMaterial({
			map: fgtexture,
			transparent: true,
			opacity: 0,
			fog: false
		});
		var fggeometry = new THREE.SphereBufferGeometry(2200, 30, 10).toNonIndexed();
		var fgskyBox = new THREE.Mesh(fggeometry, fgmaterial);
		fgskyBox.position.set(0, 1000, 0);
		skyBox.add(fgskyBox);
		TweenMax.to(fgmaterial, 3, {
			opacity: 1,
			delay: 2
		});

	});
}


function initGround() {
	var texture = new THREE.TextureLoader().load('assets/img/height.jpg', function() {
		var _w = texture.image.width;
		var _h = texture.image.height;
		var data = TY.getImgData(texture.image, _w, _h);

		var material = new THREE.MeshBasicMaterial({
			color: 0x1e8a72,
			map: texture
		});

		var geometry = new THREE.PlaneBufferGeometry(2000, 2000, _w - 1, _h - 1);
		geometry.rotateX(-Math.PI / 2);
		var vertices = geometry.attributes.position.array;
		for (var i = 0, j = 0, l = data.length; i < l; i += 4, j += 3) {
			vertices[j + 1] = data[i] * 0.6;
		}
		ground = new THREE.Mesh(geometry, material);
		ground.position.set(0, Floor - 30, 0);
		// ground.receiveShadow = true;
		TY.ThreeContainer.add(ground);

		// MIRROR planes
		var groundMirror = new THREE.Mirror(1000, 1000, {
			color: 0x454545,
			textureWidth: 1000,
			textureHeight: 1000
		});
		groundMirror.rotateX(-Math.PI / 2);
		TY.ThreeContainer.add(groundMirror);
		groundMirror.position.set(0, Floor - 60, 0);
		TweenMax.to(groundMirror.position, 2, {
			y: Floor,
			ease: Strong.easeOut,
			delay: 1
		});
	});

}

function initTrees() {
	var texture = new THREE.TextureLoader().load('assets/img/tree.jpg');
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(1, 10);
	var material = new THREE.MeshPhongMaterial({
		color: 0x0f2e2b,
		map: texture
	});
	for (var i = 0; i < 70; i++) {
		var _x = (Math.random() - 0.5) * 3000;
		var _z = (Math.random() - 0.5) * 3000;
		if (Math.abs(_x) > 100 && Math.abs(_z) > 100) {
			var _r = Math.random() + 1;
			var _rotation = (Math.random() - 0.5) * 0.2;
			var geometry = new THREE.CylinderGeometry(2, 20 * _r, 2000 * _r, 10, 4);
			var object = new THREE.Mesh(geometry, material);
			object.position.set(_x, -3000, _z);
			object.rotation.set(_rotation, _rotation, 0);
			TY.ThreeContainer.add(object);

			TweenMax.to(object.position, 8, {
				y: 500,
				ease: Strong.easeInOut,
				delay: i * 0.06
			});
		}
	}
}

function initSnows() {
	snows = new TY.Snows();
	TY.ThreeContainer.add(snows);
}


function loadModel(url) {
	var onProgress = function(xhr) {
		if (xhr.lengthComputable) {
			var percentComplete = xhr.loaded / xhr.total * 100;

			var pr = "loading " + Math.round(percentComplete, 2);
			console.log(pr);
		}
	};

	var loader = new THREE.JSONLoader();
	loader.load(url, function(geometry, materials) {
		createModel(geometry, materials, 0, Floor, 0, 1);
	}, onProgress);

}



function createModel(geometry) {

	//Material
	var materialPhongCube = new THREE.MeshPhongMaterial({
		envMap: cubeCamera.renderTarget.texture,
		skinning: true
	});

	//Avatar
	avatar = new TY.Avatar(geometry, materialPhongCube);
	avatar.position.set(0, Floor, 0);
	avatar.scale.set(avatarScale, 0.1, avatarScale);
	TY.ThreeContainer.add(avatar);
	avatar.castShadow = true;
	avatar.receiveShadow = true;

	TweenMax.to(avatar.scale, 2, {
		y: avatarScale,
		ease: Strong.easeOut
	});

	avatar.addEventListener("playAction", function(event) {
		// console.log('event:playAction');
	});

	if (TY.isMobileDevice()) controls.addEventListener('yao', showAvatar);
	else controls.addEventListener('clickScene', showAvatar);
}

function showAvatar() {
	controls.removeEventListener('yao', showAvatar);
	controls.removeEventListener('clickScene', showAvatar);

	TY.H5Sound.play("intro2", 1);

	var mt = new THREE.TextureLoader().load('assets/skins/selfUV.png');
	var materialTexture = new THREE.MeshLambertMaterial({
		map: mt,
		opacity: 1,
		transparent: true,
		// blending:THREE.MultiplyBlending,
		side: THREE.DoubleSide,
		// wireframe: true,
		wireframeLinewidth: 1,
		skinning: true
	});


	L1.MoveAble = false;
	TweenMax.to(L1, 1, {
		_t: 0.001
	});
	TweenMax.to(L1.scale, 1, {
		x: 20,
		y: 20,
		z: 20,
		ease: Strong.easeIn,
		onComplete: function() {
			TY.ThreeContainer.remove(L1);
			avatar.material = materialTexture;
			avatar.scale.set(avatarScale * 2, avatarScale * 2, avatarScale * 2);
			TweenMax.to(avatar.scale, 0.6, {
				x: avatarScale,
				y: avatarScale,
				z: avatarScale,
				ease: Strong.easeOut
			});

			avatar.fadeAction(avatar.animateClips[5], 1);
			setTimeout(function() {
				avatar.fadeAction(avatar.animateClips[2], 1);
			}, 1500);


			if (TY.isMobileDevice()) controls.addEventListener('yao', ChangeStyle);
			else controls.addEventListener('clickScene', ChangeStyle);
		}
	});
}


var changeAble = true;

function ChangeStyle() {
	if (!changeAble) return;
	changeEffect();

	var _r = Math.floor(Math.random() * 7 + 3);
	avatar.fadeAction(avatar.animateClips[_r], 0.5);
	setTimeout(function() {
		avatar.fadeAction(avatar.animateClips[2], 0.5);
	}, 1500);


	changeAble = false;
	setTimeout(function() {
		changeAble = true;
	}, 2000);
}


function setControlMotions() {
	//touch
	var TouchAble = true;
	controls.touchTarget = avatar;
	controls.touchTargetCallBack = function() {
		if (!TouchAble) return;

		console.log("touchCallBack");

		removeTip();

		switch (_num) {
			case 1:
				avatar.fadeAction(avatar.animateClips[1], .05);
				setTimeout(function() {
					avatar.fadeAction(avatar.animateClips[0], .2);
				}, 800);
				break;
			case 2:
				avatar.fadeAction(avatar.animateClips[2], .05);
				setTimeout(function() {
					avatar.fadeAction(avatar.animateClips[0], .2);
				}, 600);
				break;
			case 3:
				avatar.fadeAction(avatar.animateClips[3], .05);
				setTimeout(function() {
					avatar.fadeAction(avatar.animateClips[0], .2);
				}, 480);
				break;
		}

		TouchAble = false;
		setTimeout(function() {
			TouchAble = true;
		}, 1500);
	}
}



function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);

	render();
	if (stats) stats.update();
	if (snows) snows.update();
	if (L1) L1.update();
}

function render() {
	var delta = clock.getDelta();
	if (avatar) avatar.update(delta);

	cubeCamera.updateCubeMap(renderer, scene);

	renderer.render(scene, camera);
	if (composer) composer.render(delta);
}