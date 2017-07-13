var container, stats;

var camera, scene, renderer;

var cubeCamera;
var L1;

var Step = 0;

var avatarScale = 0.6;
var avatar, skeletonHelper;
var skyBox;
var ground;
var snows;

var composer;

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
	// renderer.setClearColor(new THREE.Color(0xffffff));
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
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 20000);
	camera.position.set(0, 9000, 9000);
	scene.add(camera);

	controls = new THREE.TyOrbitControls(camera, renderer.domElement);
	controls.target.set(0, Floor + 60, 0);
	controls.update();


	TY.ThreeContainer = new THREE.Group();
	scene.add(TY.ThreeContainer);


	window.addEventListener('resize', onWindowResize, false);

	// STATS
	stats = new Stats();
	container.appendChild(stats.dom);


	intoIntor();


	// postprocessing
	composer = new THREE.EffectComposer(renderer);
	composer.addPass(new THREE.RenderPass(scene, camera));

	var FilmEffect = new THREE.FilmPass();
	FilmEffect.renderToScreen = true;
	composer.addPass(FilmEffect);
	var TextureEffect = new THREE.TexturePass(new THREE.TextureLoader().load('assets/img/vignette.png'), 0.9);
	TextureEffect.renderToScreen = true;
	composer.addPass(TextureEffect);
}


function intoIntor() {
	initSky();
	initSnows();
	L1 = new TY.Light2(new THREE.IcosahedronGeometry(30, 5));
	L1.position.set(0, Floor + 100, 0);
	TY.ThreeContainer.add(L1);
	L1.scale.set(100, 100, 100);

	controls.addEventListener('yao', intoStage);
}

function intoStage() {
	controls.removeEventListener('yao', intoStage);
	controls.enabled = false;
	TweenMax.to(L1.scale, 2, {
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
	controls.moveIn(0, Floor + 200, 600, function() {
		controls.enabled = true;
		controls.minDistance = 100;
		controls.maxDistance = 3000;
		controls.minPolarAngle = Math.PI * 0.2;
		controls.maxPolarAngle = Math.PI * 0.48;

		initTrees();
		//Load Model
		loadModel('assets/models/model.js');
	});
}



function initSky() {
	var texture = new THREE.TextureLoader().load('assets/img/starsmap.jpg');
	var material = new THREE.MeshBasicMaterial({
		map: texture,
		fog: false
	});

	var geometry = new THREE.SphereBufferGeometry(5000, 60, 40).toNonIndexed();

	skyBox = new THREE.Mesh(geometry, material);
	skyBox.applyMatrix(new THREE.Matrix4().makeScale(1, 1, -1));
	TY.ThreeContainer.add(skyBox);

	material.transparent = true;
	material.opacity = 0;
	TweenMax.to(material, 4, {
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
		fog: false
	});
	var fggeometry = new THREE.SphereBufferGeometry(2500, 30, 10).toNonIndexed();
	var fgskyBox = new THREE.Mesh(fggeometry, fgmaterial);
	fgskyBox.position.set(0, 1500, 0);
	skyBox.add(fgskyBox);
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
		console.log('event:playAction');
	});

	controls.addEventListener('yao', showAvatar);
}

function showAvatar() {
	controls.removeEventListener('yao', showAvatar);


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
			}, 1500)
		}
	});
}



function setControlMotions() {

	//touch
	var TouchAble = true;
	controls.touchTarget = avatar;
	controls.touchTargetCallBack = function() {
		if (!TouchAble) return;

		console.log("touchCallBack");

		removeTip();
		var _num = Math.floor(Math.random() * 3 + 1);
		// var _num = 4;
		TY.H5Sound.play("touch" + (_num + 1), 1);

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