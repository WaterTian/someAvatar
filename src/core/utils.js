TY.isAndroid = /Android/i.test(navigator.userAgent);
TY.isIphone = /iphone/i.test(navigator.userAgent);
TY.isChrome = /chrome\//i.test(navigator.userAgent);
TY.isWeixin = /MicroMessenger\//i.test(navigator.userAgent);
TY.isWeibo = /Weibo/i.test(navigator.userAgent);

TY.isMobileDevice = isMobileDevice;

function isMobileDevice() {
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