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