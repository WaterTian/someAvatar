var container, stats;

var camera, scene, renderer;

var cubeCamera;
var L1;
var logo, yao;


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
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 40000);
	camera.position.set(0, 8000, 8000);
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
	logo = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000, 4, 4), material);
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
		delay: 4
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

	controls.moveIn(3, 0, Floor + 100, 400);
	//yao
	var material = new THREE.SpriteMaterial({
		map: new THREE.TextureLoader().load('assets/img/yao.png'),
		// transparent: true,
		// opacity: 0,
		fog: false
	});

	yao = new THREE.Sprite(material);
	yao.position.set(50, Floor + 150, -50);
	yao.scale.set(50, 50, 1);
	TY.ThreeContainer.add(yao);

	yaoLoop();
	function yaoLoop() {
		TweenMax.to(material, 0.06, {
			rotation: -Math.PI / 10,
			repeat: 7,
			yoyo: true,
			delay: 1,
			onComplete: yaoLoop
		});
	}

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

			FilmEffect.renderToScreen = true;
			FilmEffect.setUniforms(0.35, 0.9, 2048, false);
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