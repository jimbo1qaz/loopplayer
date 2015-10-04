// TODO: loop points based on URL tags
// TODO: fix midway looping

var LOOP_SEPARATOR = '.';
var LOOP_END_SKIP = (LOOP_SEPARATOR === '.' ? 1 : 0);

var console = console || {
    "log": function(stuff) {}
};

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

function arrayGetLoop(array, idx) {
	return Number(array[array.length + idx - LOOP_END_SKIP]);
}

function LoopPlayer(url, loadedCallback) {
	var ctx = this.ctx = new AudioContext();
	var that = this;

	this.url = url;
	this.data = null;
	this.playing = false;

	this.source = null;

	this.sampleRate = null;
	this.loopStart = null;
	this.loopEnd = null;

	this.initTime = 0;
	this.pauseOffset = 0;

	// fuck Javascript

	this.loaded = function() {
		return this.data != null;
	}

	// Load the audio data from URL.
	// It will be resampled to ctx.sampleRate.
	// Set data -> this.data.

	this.loadFile = function() {
		var request = new XMLHttpRequest();
		var url = this.url;
		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		request.onload = function() {
			ctx.decodeAudioData(request.response,
				function(data) {
					// console.log(data.length);
					that.data = data;
					loadedCallback();
				  },
				function() {
					console.log('error');
				  }
			  );
		  };
		request.send();

		this.parseLoopPoints();
	}

	// Parses the loop points from URL.
	// The problem is that you don't know 
	this.parseLoopPoints = function() {
		var uri = new URI(this.url);

		var filename = arrayGet(uri.path().split('/'), -1);

		var timeArray = filename.split(LOOP_SEPARATOR);

		var sampleRateOrig = arrayGetLoop(timeArray, -3);
		console.log(sampleRateOrig);
		this.loopStart = arrayGetLoop(timeArray, -2) / sampleRateOrig;
		this.loopEnd = arrayGetLoop(timeArray, -1) / sampleRateOrig;

		console.log("{0} {1}".format(this.loopStart, this.loopEnd));
	}

	// Assign the decoded data to $data.
	this.loadFile();

	// AFTER LOADED


	this.play = function() {
		if (!this.loaded()) return;

		var source = this.source = ctx.createBufferSource();
		source.buffer = this.data;

		var loopStart = source.loopStart = this.loopStart;
		var loopEnd   = source.loopEnd   = this.loopEnd;
		source.loop = true;
		
		source.connect(ctx.destination);

		source.playTime = function() {
			var realTime = that.pauseOffset + (ctx.currentTime - that.initTime);
			var loopTime = realTime - loopStart;
			var loopLength = loopEnd - loopStart;

			return (loopTime > 0) ? (loopStart + loopTime % loopLength) : realTime;
		  }


		source.start(0, offset = this.pauseOffset);
		this.initTime = ctx.currentTime;

		this.playing = true;
	}

	this.pause = function() {
		if (!this.loaded()) return;
		this.pauseOffset = this.source.playTime();
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
