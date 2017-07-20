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
	// console.log("animateNameList:" + scope.animateNameList);

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