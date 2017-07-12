TY.TYOrbitControls = function(object, domElement) {

	this.object = object;

	this.domElement = (domElement !== undefined) ? domElement : document;

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the object orbits around
	this.target = new THREE.Vector3();

	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

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

	// Set to true to automatically rotate around the target
	// If auto-rotate is enabled, you must call controls.update() in your animation loop
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60


	// for reset
	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	//
	// public methods
	//

	this.getPolarAngle = function() {
		return spherical.phi;
	};
	this.getAzimuthalAngle = function() {
		return spherical.theta;
	};


	//tyadd
	this.resetToStart = function() {
		TweenMax.to(scope.object.position, 2, {
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
	this.resetToStartQuick = function() {
		TweenMax.to(scope.object.position, 1, {
			x: scope.position0.x,
			y: scope.position0.y,
			z: scope.position0.z,
			ease: Strong.easeOut,
			onUpdate: function() {
				scope.update();
			},
			onComplete: function() {
				scope.isLookUp = false;
			}
		});
	};
	//tyadd  event look up
	this.startControlCallBack = undefined;
	TY.isStartControl = false;
	this.lookUpCallBack = undefined;
	this.isLookUp = false;

	//tyadd if touch the object
	this.touchTargetCallBack = undefined;
	this.touchTarget = null;
	this.raycaster = new THREE.Raycaster();
	this.startTouchPoint = new THREE.Vector2();
	this.moveTouchPoint = new THREE.Vector2();
	//tyadd
	this.checkTouchTarget = function() {
		if (!TY.isStartControl) {
			if (scope.moveTouchPoint.x > 2 || scope.moveTouchPoint.y > 2) {
				if (scope.startControlCallBack) {
					scope.startControlCallBack();
				}
			}
		}
		if (!scope.touchTarget) return;

		if (scope.moveTouchPoint.x < 1 && scope.moveTouchPoint.y < 1) {
			var mouse = new THREE.Vector2();
			mouse.x = (scope.startTouchPoint.x / window.innerWidth) * 2 - 1;
			mouse.y = -(scope.startTouchPoint.y / window.innerHeight) * 2 + 1;

			var camera = scope.object;
			scope.raycaster.setFromCamera(mouse, camera);
			var intersects = scope.raycaster.intersectObject(scope.touchTarget);
			if (intersects.length > 0) {
				console.log("touchTarget");
				if (scope.touchTargetCallBack) scope.touchTargetCallBack();

			}
		}
	}



	this.reset = function() {
		scope.target.copy(scope.target0);
		scope.object.position.copy(scope.position0);
		scope.object.zoom = scope.zoom0;
		scope.object.updateProjectionMatrix();
		scope.update();
		state = STATE.NONE;
	};

	// this method is exposed, but perhaps it would be better if we can make it private...
	this.update = function() {
		var offset = new THREE.Vector3();
		// so camera.up is the orbit axis
		var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
		var quatInverse = quat.clone().inverse();
		var lastPosition = new THREE.Vector3();
		var lastQuaternion = new THREE.Quaternion();
		return function update() {
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


			// tyadd event lookup
			if (spherical.phi > 3.1) {
				if (scope.lookUpCallBack) {
					if (!scope.isLookUp) {
						scope.isLookUp = true;
						scope.lookUpCallBack();
					}
				}
			}

			offset.setFromSpherical(spherical);
			// rotate offset back to "camera-up-vector-is-up" space
			offset.applyQuaternion(quatInverse);
			position.copy(scope.target).add(offset);
			scope.object.lookAt(scope.target);

			if (scope.enableDamping === true) {
				sphericalDelta.theta *= (1 - scope.dampingFactor);
				sphericalDelta.phi *= (1 - scope.dampingFactor);
			} else {
				sphericalDelta.set(0, 0, 0);
			}
			scale = 1;

			// update condition is:
			// min(camera displacement, camera rotation in radians)^2 > EPS
			// using small-angle approximation cos(x/2) = 1 - x^2 / 8

			if (zoomChanged ||
				lastPosition.distanceToSquared(scope.object.position) > EPS ||
				8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
				lastPosition.copy(scope.object.position);
				lastQuaternion.copy(scope.object.quaternion);
				zoomChanged = false;
				return true;
			}
			return false;
		};
	}();

	this.dispose = function() {
		scope.domElement.removeEventListener('touchstart', onTouchStart, false);
		scope.domElement.removeEventListener('touchend', onTouchEnd, false);
		scope.domElement.removeEventListener('touchmove', onTouchMove, false);

		scope.domElement.removeEventListener('mousedown', onMouseDown, false);
		scope.domElement.removeEventListener('wheel', onMouseWheel, false);
	};

	//
	// internals
	//
	var scope = this;

	var STATE = {
		NONE: -1,
		ROTATE: 0,
		DOLLY: 1
	};

	var state = STATE.NONE;
	var EPS = 0.000001;

	// current position in spherical coordinates
	var spherical = new THREE.Spherical();
	var sphericalDelta = new THREE.Spherical();

	var scale = 1;
	var zoomChanged = false;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

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



	function dollyIn(dollyScale) {
		if (scope.object instanceof THREE.PerspectiveCamera) {
			scale /= dollyScale;
		} else {
			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;
		}
	}

	function dollyOut(dollyScale) {
		if (scope.object instanceof THREE.PerspectiveCamera) {
			scale *= dollyScale;
		} else {
			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;
		}
	}


	function handleTouchStartRotate(event) {
		//console.log( 'handleTouchStartRotate' );
		rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);

		//tyadd
		scope.startTouchPoint.set(event.touches[0].pageX, event.touches[0].pageY);
		scope.moveTouchPoint.set(0, 0);
	}

	function handleTouchStartDolly(event) {
		//console.log( 'handleTouchStartDolly' );
		var dx = event.touches[0].pageX - event.touches[1].pageX;
		var dy = event.touches[0].pageY - event.touches[1].pageY;
		var distance = Math.sqrt(dx * dx + dy * dy);
		dollyStart.set(0, distance);
	}


	function handleTouchMoveRotate(event) {
		//console.log( 'handleTouchMoveRotate' );
		rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
		rotateDelta.subVectors(rotateEnd, rotateStart);
		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
		// rotating across whole screen goes 360 degrees around
		rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);
		// rotating up and down along whole screen attempts to go 360, but limited to 180
		rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);
		rotateStart.copy(rotateEnd);
		scope.update();

		//tyadd
		scope.moveTouchPoint.set(event.touches[0].pageX, event.touches[0].pageY);
	}

	function handleTouchMoveDolly(event) {
		//console.log( 'handleTouchMoveDolly' );
		var dx = event.touches[0].pageX - event.touches[1].pageX;
		var dy = event.touches[0].pageY - event.touches[1].pageY;
		var distance = Math.sqrt(dx * dx + dy * dy);
		dollyEnd.set(0, distance);
		dollyDelta.subVectors(dollyEnd, dollyStart);
		if (dollyDelta.y > 0) {
			dollyOut(getZoomScale());
		} else if (dollyDelta.y < 0) {
			dollyIn(getZoomScale());
		}
		dollyStart.copy(dollyEnd);
		scope.update();
	}


	function handleTouchEnd(event) {
		//console.log( 'handleTouchEnd' );
		//tyadd
		scope.checkTouchTarget();
	}

	function handleMouseDownRotate(event) {
		rotateStart.set(event.clientX, event.clientY);

		//tyadd
		scope.startTouchPoint.set(event.clientX, event.clientY);
		scope.moveTouchPoint.set(0, 0);
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
		scope.update();

		//tyadd
		scope.moveTouchPoint.set(event.clientX, event.clientY);

	}
	function handleMouseWheel(event) {
		//console.log( 'handleMouseWheel' );
		if (event.deltaY < 0) {
			dollyOut(getZoomScale());
		} else if (event.deltaY > 0) {
			dollyIn(getZoomScale());
		}
		scope.update();
	}
	function handleMouseUp(event) {
		//console.log( 'handleMouseUp' );
		//tyadd
		scope.checkTouchTarget();
	}

	function onMouseDown(event) {
		if (scope.enabled === false) return;
		event.preventDefault();

		if (scope.enableRotate === false) return;
		handleMouseDownRotate(event);
		state = STATE.ROTATE;

		document.addEventListener('mousemove', onMouseMove, false);
		document.addEventListener('mouseup', onMouseUp, false);
	}

	function onMouseUp(event) {
		if (scope.enabled === false) return;
		handleMouseUp(event);
		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);
		state = STATE.NONE;
	}

	function onMouseMove(event) {
		if (scope.enabled === false) return;
		event.preventDefault();

		if (state === STATE.ROTATE) {
			if (scope.enableRotate === false) return;
			handleMouseMoveRotate(event);
		}
	}
	function onMouseWheel(event) {
		if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) return;
		event.preventDefault();
		event.stopPropagation();
		handleMouseWheel(event);
	}

	function onTouchStart(event) {
		if (scope.enabled === false) return;
		var event = event || window.event;
		switch (event.touches.length) {
			case 1: // one-fingered touch: rotate
				if (scope.enableRotate === false) return;
				handleTouchStartRotate(event);
				state = STATE.ROTATE;
				break;
			case 2: // two-fingered touch: dolly
				if (scope.enableZoom === false) return;
				handleTouchStartDolly(event);
				state = STATE.DOLLY;
				break;
			default:
				state = STATE.NONE;
		}

	}

	function onTouchMove(event) {
		if (scope.enabled === false) return;
		var event = event || window.event;
		event.preventDefault();
		switch (event.touches.length) {
			case 1: // one-fingered touch: rotate
				if (scope.enableRotate === false) return;
				if (state !== STATE.ROTATE) return; // is this needed?...
				handleTouchMoveRotate(event);
				break;
			case 2: // two-fingered touch: dolly
				if (scope.enableZoom === false) return;
				if (state !== STATE.DOLLY) return; // is this needed?...
				handleTouchMoveDolly(event);
				break;
			default:
				state = STATE.NONE;
		}
	}

	function onTouchEnd(event) {
		if (scope.enabled === false) return;
		var event = event || window.event;
		handleTouchEnd(event);
		state = STATE.NONE;
	}



	scope.domElement.addEventListener('touchstart', onTouchStart, false);
	scope.domElement.addEventListener('touchend', onTouchEnd, false);
	scope.domElement.addEventListener('touchmove', onTouchMove, false);

	scope.domElement.addEventListener('mousedown', onMouseDown, false);
	scope.domElement.addEventListener('wheel', onMouseWheel, false);

	this.update();
};

TY.TYOrbitControls.prototype = Object.create(TY.EventDispatcher.prototype);
TY.TYOrbitControls.prototype.constructor = TY.TYOrbitControls;