// TODO: loop points based on URL tags
// TODO: fix midway looping

var LOOP_SEPARATOR = '.';
var LOOP_END_SKIP = (LOOP_SEPARATOR === '.' ? 1 : 0);


// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}



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


function LoopPlayer(url, loaded_callback) {
	var ctx = this.ctx = new AudioContext();
	var that = this;

	this.url = url;
	this.data = null;
	this.playing = false;

	this.source = null;

	this.initTime = 0;
	this.pause_offset = 0;

	// fuck Javascript

	this.loaded = function() {
		return that.data != null;
	}

	this.getFile = function(callback) {
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

	this.parseLoopPoints = function() {
		var uri = new URI(that.url);

		var filename = arrayGet(uri.path().split('/'), -1);

		var timeArray = filename.split(LOOP_SEPARATOR);

		var loopStart = arrayGet(timeArray, -2 - LOOP_END_SKIP);
		var loopEnd = arrayGet(timeArray, -1 - LOOP_END_SKIP);

		alert("Loop points: {0}, {1}"
			.format(String(loopStart), String(loopEnd)));
	}



	this.getFile(callback = function(data) {
		that.data = data;
		loaded_callback();
	  });


	// AFTER LOADED


	this.play = function() {
		if (!that.loaded()) return;

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

	this.pause = function() {
		if (!that.loaded()) return;
		that.pause_offset = that.source.playTime();
		that.source.stop(0);
		that.source = null;

		that.playing = false;
	}

	this.toggle = function(t) {
		if (that.playing) {
			that.pause();
		} else {
			that.play();
		}

		t.innerHTML = that.playing ? "Pause" : "Play";
	}

}
