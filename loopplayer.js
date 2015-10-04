// TODO: loop points based on URL tags
// TODO: fix midway looping

var LOOP_SEPARATOR = '.';
var LOOP_END_SKIP = (LOOP_SEPARATOR === '.' ? 1 : 0);


function onloadf(callback) {
	document.addEventListener("DOMContentLoaded", callback);
}

function arrayGet(array, idx) {
	if (idx < 0) {
		return array[array.length + idx];
	} else {
		return array[idx];
	}
}


function LoopPlayer(id, url, loaded_callback) {
	var ctx = this.ctx = new AudioContext();
	var that = this;

	this.url = url;
	this.data = null;
	this.playing = false;

	this.source = null;

	this.initTime = 0;
	this.pause_offset = 0;

	// fuck Javascript

	function loaded() {
		return that.data != null;
	}


	onloadf(
	  function() {
		document.getElementById(id).addEventListener("click",
		  function(e) {
			toggle(e.target);
		  });
	  });


	function getFile(callback) {
		var request = new XMLHttpRequest();
		var url = that.url;
		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		request.onload = function() {
			ctx.decodeAudioData(request.response,
				function(data) {
					callback(data, undefined);
				  },
				function() {
					alert('error');
					callback(undefined, "Error decoding the file " + url);
				  }
			  );
		  };
		request.send();

		that.parseLoopPoints();
	}

	function parseLoopPoints() {
		var uri = new URI(that.url);

		// var filename = uri.split('/')[that_object.length - 1];
		var fileName = arrayGet(uri.split('/'), -1);

		var timeArray = filename.split(LOOP_SEPARATOR);

		var loopStart = arrayGet(timeArray, -2 - LOOP_END_SKIP);
		var loopEnd = arrayGet(timeArray, -1 - LOOP_END_SKIP);

		alert(loopStart, loopEnd);
	}



	getFile(callback = function(data) {
		that.data = data;
		loaded_callback();
	  });


	// AFTER LOADED


	function play() {
		if (!loaded()) return;

		var source = that.source = ctx.createBufferSource();
		source.buffer = that.data;
		source.loop = true;
		source.connect(ctx.destination);

		source.playTime = function() {
			return (that.pause_offset + (ctx.currentTime - that.initTime)) % source.buffer.duration;
		  }


		source.start(0, offset = that.pause_offset);
		that.initTime = ctx.currentTime;

		that.playing = true;
	}

	function pause() {
		if (!loaded()) return;
		that.pause_offset = that.source.playTime();
		that.source.stop(0);
		that.source = null;

		that.playing = false;
	}

	function toggle(t) {
		if (that.playing) {
			pause();
		} else {
			play();
		}

		t.innerHTML = that.playing ? "Pause" : "Play";
	}

}
