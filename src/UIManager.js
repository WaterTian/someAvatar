/**
 * @author waterTian  
 */

//Must used the zepto lib

TY.UIManager = function() {
	var scope = this;

	document.querySelector("#logo").addEventListener('click', function(event) {
		scope.dispatchEvent("LogoClick", scope);
	});
	document.querySelector("#sceneStatus").addEventListener('click', function(event) {
		scope.dispatchEvent("SceneStatusClick", scope);
	});

	document.querySelector("#btn1").addEventListener('click', function(event) {
		scope.dispatchEvent("Btn1Click", scope);
	});
	document.querySelector("#btn2").addEventListener('click', function(event) {
		scope.dispatchEvent("Btn2Click", scope);
	});
	document.querySelector("#btn3").addEventListener('click', function(event) {
		scope.dispatchEvent("Btn3Click", scope);
	});
	document.querySelector("#btn4").addEventListener('click', function(event) {
		scope.dispatchEvent("Btn4Click", scope);
	});
	document.querySelector("#btn5").addEventListener('click', function(event) {
		scope.dispatchEvent("Btn5Click", scope);
	});

	document.querySelector("#logo").addEventListener('touchmove', EventPreventDefault);
	document.querySelector("#btn0").addEventListener('touchmove', EventPreventDefault);
	document.querySelector("#btn0Txt").addEventListener('touchmove', EventPreventDefault);
	document.querySelector("#btn1").addEventListener('touchmove', EventPreventDefault);
	document.querySelector("#btn2").addEventListener('touchmove', EventPreventDefault);
	document.querySelector("#btn3").addEventListener('touchmove', EventPreventDefault);
	document.querySelector("#btn4").addEventListener('touchmove', EventPreventDefault);
	document.querySelector("#btn5").addEventListener('touchmove', EventPreventDefault);

	function EventPreventDefault(event) {
		event.preventDefault();
	}

}

TY.UIManager.prototype = {
	constructor: TY.UIManager,
	showLogo: function() {
		var logo = document.getElementById("logo");
		logo.style.display = "block";
		TweenMax.from(logo, 1, {
			opacity: 0
		});
	},
	showBtn0: function() {
		var btn = document.getElementById("btn0");
		btn.style.display = "block";
		TweenMax.from(btn, .6, {
			scale: 0,
			// opacity: 0,
			ease: Back.easeOut
		});

		var txt = document.getElementById("btn0Txt");
		txt.style.display = "block";
		TweenMax.from(txt, .6, {
			scale: 0,
			// opacity: 0,
			ease: Back.easeOut,
			delay: .4
		});

		btn0Loop();

		function btn0Loop() {
			if(btn.style.display == "none") return;
			TweenMax.to(btn, .1, {
				rotation: 4,
				repeat: 7,
				yoyo: true,
				ease: Strong.easeInOut,
				delay: 1,
				onComplete: btn0Loop
			});
		}

	},
	removeBtn0: function() {
		TY.isStartControl = true;
		var btn = document.getElementById("btn0");
		TweenMax.to(btn, .6, {
			scale: 1.5,
			opacity: 0,
			ease: Strong.easeOut,
			onComplete: function() {
				btn.style.display = "none";
			}
		});

		var txt = document.getElementById("btn0Txt");
		TweenMax.to(txt, .6, {
			// scale: 0,
			opacity: 0,
			ease: Strong.easeOut,
			onComplete: function() {
				txt.style.display = "none";
			}
		});
	},
	showBtns: function() {
		document.getElementById('sceneStatus').style.display = "block";
		TweenMax.to(document.getElementById('sceneStatus'), 1, {
			left: "5%",
			ease: Elastic.easeOut
		});
		for(var i = 1; i <= 5; i++) {
			var btn = document.getElementById("btn" + i);
			btn.style.display = "block";
			TweenMax.to(btn, 0, {
				top: 20 + i * 5 + "%",
				left: "100%",
				scale: .2
			});
			TweenMax.to(btn, .6, {
				top: 20 + i * 10 + "%",
				left: "74%",
				scale: 1,
				ease: Back.easeOut,
				delay: i * 0.1
			});
		}
		console.log()
	},
	hideBtns: function() {
		for(var i = 1; i <= 5; i++) {
			var btn = document.getElementById("btn" + i);
			TweenMax.to(btn, .6, {
				left: "100%",
				delay: i * 0.1
			});
		}
	},

	resize: function() {
		if(window.innerWidth > window.innerHeight) {
			for(var i = 1; i <= 5; i++) {
				var btn = document.getElementById("btn" + i);
				btn.style.width = window.innerHeight * 0.23 + 'px';
			}

			var btn0 = document.getElementById("btn0");
			btn0.style.width = window.innerHeight * 0.20 + 'px';
			btn0.style.top = window.innerHeight * 0.80 + 'px';
			btn0.style.left = (window.innerWidth - (window.innerHeight * 0.20)) * 0.5 + 'px';
			var txt0 = document.getElementById("btn0Txt");
			txt0.style.width = window.innerHeight * 0.40 + 'px';
			txt0.style.left = (window.innerWidth - (window.innerHeight * 0.40)) * 0.5 + 'px';

			var logo = document.getElementById("logo");
			logo.style.width = window.innerHeight * 0.17 + 'px';

		} else {
			for(var i = 1; i <= 5; i++) {
				var btn = document.getElementById("btn" + i);
				btn.style.width = '23%';
			}

			var btn0 = document.getElementById("btn0");
			btn0.style.width = '20%';
			btn0.style.top = '84%';
			btn0.style.left = '40%';
			var txt0 = document.getElementById("btn0Txt");
			txt0.style.width = '40%';
			txt0.style.left = '30%';

			var logo = document.getElementById("logo");
			logo.style.width = '17%';

		}
	},

	removeThis: function() {}
};
TY.extend(TY.UIManager.prototype, TY.EventDispatcher.prototype);