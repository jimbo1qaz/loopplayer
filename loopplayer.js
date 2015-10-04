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

	this.loopStart = null;
	this.loopEnd = null;
	
	this.initTime = 0;
	this.pause_offset = 0;

	// fuck Javascript

	this.loaded = function() {
		return this.data != null;
	}

	this.getFile = function(callback) {
		var request = new XMLHttpRequest();
		var url = this.url;
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

		this.parseLoopPoints();
	}

	this.parseLoopPoints = function() {
		var uri = new URI(this.url);

		var filename = arrayGet(uri.path().split('/'), -1);

		var timeArray = filename.split(LOOP_SEPARATOR);

		this.loopStart = arrayGet(timeArray, -2 - LOOP_END_SKIP);
		this.loopEnd = arrayGet(timeArray, -1 - LOOP_END_SKIP);
	}



	this.getFile(callback = function(data) {
		that.data = data;
		loaded_callback();
	  });


	// AFTER LOADED


	this.play = function() {
		if (!this.loaded()) return;

		var source = this.source = ctx.createBufferSource();
		source.buffer = this.data;
		source.loop = true;
		source.connect(ctx.destination);

		source.playTime = function() {
			return (that.pause_offset + (ctx.currentTime - that.initTime)) % source.buffer.duration;
		  }


		source.start(0, offset = this.pause_offset);
		this.initTime = ctx.currentTime;

		this.playing = true;
	}

	this.pause = function() {
		if (!this.loaded()) return;
		this.pause_offset = this.source.playTime();
		this.source.stop(0);
		this.source = null;

		this.playing = false;
	}

	this.toggle = function(t) {
		if (this.playing) {
			this.pause();
		} else {
			this.play();
		}

		t.innerHTML = this.playing ? "Pause" : "Play";
	}

}
