var container, stats;

var camera, scene, renderer;

var avatarScale = 0.6;
var avatar, skeletonHelper;
var skyBox;
var ground;

var clock = new THREE.Clock();

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
	var ambient = new THREE.AmbientLight(0x666666);
	scene.add(ambient);
	var directionalLight = new THREE.DirectionalLight(0x887766);
	directionalLight.position.set(-1, 1, 1).normalize();
	scene.add(directionalLight);


	// RENDERER
	renderer = new THREE.WebGLRenderer({
		antialias: true
	});

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(new THREE.Color(0xffffff));
	container.appendChild(renderer.domElement);

	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.shadowMap.enabled = true;

	FastClick.attach(document.body);

	///// controls, camera
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 20000);
	camera.position.set(0, Floor + 200, 500);
	scene.add(camera);
	controls = new TY.TYOrbitControls(camera, renderer.domElement);
	// controls.autoRotate = true;
	controls.target.set(0, Floor+100, 0);
	// controls.minDistance = 100;
	// controls.maxDistance = 1000;
	controls.update();


	window.addEventListener('resize', onWindowResize, false);

	// STATS
	stats = new Stats();
	container.appendChild(stats.dom);


	initSky();
	initGround();
	// initTrees();

	//Load Model
	loadModel('assets/models/model.js');
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
	scene.add(skyBox);

	material.transparent = true;
	material.opacity = 0;
	TweenMax.to(material, 2, {
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
	var fggeometry = new THREE.SphereBufferGeometry(3000, 30, 10).toNonIndexed();
	var fgskyBox = new THREE.Mesh(fggeometry, fgmaterial);
	fgskyBox.position.set(0, 1500, 0);
	skyBox.add(fgskyBox);
}


function initGround() {
	var texture = new THREE.TextureLoader().load('assets/img/height.jpg', function() {
		var _w = texture.image.width;
		var _h = texture.image.height;
		var data = getImgData(texture.image, _w, _h);

		var material = new THREE.MeshStandardMaterial({
			color: 0x00ffff,
			metalness: 0.9,
			roughness: 0.8,
			map: texture,
			normalMap: new THREE.TextureLoader().load("assets/img/normal.jpg")
		});

		var geometry = new THREE.PlaneBufferGeometry(2000, 2000, _w - 1, _h - 1);
		geometry.rotateX(-Math.PI / 2);
		var vertices = geometry.attributes.position.array;
		for (var i = 0, j = 0, l = data.length; i < l; i += 4, j += 3) {
			vertices[j + 1] = data[i];
		}
		ground = new THREE.Mesh(geometry, material);
		ground.position.set(0, Floor - 50, 0);
		// ground.receiveShadow = true;
		scene.add(ground);


		// MIRROR planes
		var groundMirror = new THREE.Mirror(1000, 1000, {
			color: 0x454545,
			textureWidth: 1000,
			textureHeight: 1000
		});
		groundMirror.rotateX(-Math.PI / 2);
		groundMirror.position.set(0, Floor, 0);
		scene.add(groundMirror);

	});

}


function getImgData(_image, _w, _h) {
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


function initTrees() {
	var texture = new THREE.TextureLoader().load('assets/img/tree.jpg');
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(1, 10);
	var material = new THREE.MeshPhongMaterial({
		color: 0x004444,
		map: texture
	});



	for (var i = 0; i < 20; i++) {
		var _r = Math.random() + 1;
		var geometry = new THREE.CylinderGeometry(2, 10 * _r, 1600, 10, 4);
		var object = new THREE.Mesh(geometry, material);

		var _x = (Math.random() - 0.5) * 1000;
		var _z = (Math.random() - 0.5) * 1000;
		object.position.set(_x, 500, _z);
		scene.add(object);
	}
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

	//Avatar
	avatar = new TY.Avatar(geometry, materialTexture);
	avatar.position.set(0, Floor, 0);
	avatar.scale.set(avatarScale, avatarScale, avatarScale);
	scene.add(avatar);
	avatar.castShadow = true;
	avatar.receiveShadow = true;


	avatar.addEventListener("playAction", function(event) {
		console.log('event:playAction');
	})
	avatar.playAction(avatar.animateClips[1]);


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
}

function render() {
	var delta = clock.getDelta();
	if (avatar) avatar.update(delta);
	renderer.render(scene, camera);
}