var LOOP_SEPARATOR = '.';
var LOOP_END_SKIP = (LOOP_SEPARATOR === '.' ? 1 : 0);
var UPDATE_GUI_INTERVAL = 50;

// Dummy console.
var console = window.console || {
      "log": function(stuff) {
      }
   };

// Implement (string).format .
if (!String.prototype.format) {
   String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) {
         return typeof args[number] != 'undefined' ?
            args[number] :
            match;
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

function LoopPlayer(url, domPlayPause, domSeek, domDescription, loadedCallback) {
   var that = this;

   var ctx = that.ctx = new AudioContext();

   that.url = url;
   that.data = null;
   that.playing = false;

   that.loaded = function() {
      return that.data !== null;
   };

   that.source = null;

   that.sampleRate = null;
   that.loopStart = null;
   that.loopEnd = null;

   // startTime = arbitrary seconds.
   // playOffset = delta seconds (ctx.currentTime - startTime).

   that.startTime = null;
   that.playOffset = 0;

   that.domPlayPause = domPlayPause;
   that.domSeek = domSeek;
   that.canSeekGui = true;

   // Load the audio data from URL.
   // It will be resampled to ctx.sampleRate.
   // Set data -> that.data.

   that.loadFile = function() {
      var request = new XMLHttpRequest();
      var url = that.url;
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

      that.parseLoopPoints();
   };

   // Parses the loop points from URL.
   // The problem is that you don't know the sampling rate, because WebAudio was designed by a bunch of idiotic fucktards.
   // So I place the fucking sampling rate in the fucking file name.
   that.parseLoopPoints = function() {
      var uri = new URI(that.url);

      var filename = arrayGet(uri.path().split('/'), -1);

      var timeArray = filename.split(LOOP_SEPARATOR);

      var sampleRateOrig = arrayGetLoop(timeArray, -3);
      console.log(sampleRateOrig);
      that.loopStart = arrayGetLoop(timeArray, -2) / sampleRateOrig;
      that.loopEnd = arrayGetLoop(timeArray, -1) / sampleRateOrig;

      console.log("{0} {1}".format(that.loopStart, that.loopEnd));
   };

   // Assign the decoded data to $data.
   // that.loadFile();


   // Start playing from playOffset, and initialize startTime. ()
   that.play = function() {
      if (!that.loaded()) return;

      var source = that.source = ctx.createBufferSource();
      source.buffer = that.data;

      source.connect(ctx.destination);

      source.start(0, that.playOffset);
      that.startTime = ctx.currentTime;

      that.playing = true;

      // Set up looping.

      var loopStart = source.loopStart = that.loopStart;
      var loopEnd = source.loopEnd = that.loopEnd;
      source.loop = true;

      source.playTime = function() {
         var realTime = that.playOffset + (ctx.currentTime - that.startTime);
         var loopTime = realTime - loopStart;
         var loopLength = loopEnd - loopStart;

         return (loopTime > 0) ? (loopStart + loopTime % loopLength) : realTime;
      };

      that.updateGui();
   };

   that.getPlayTime = function() {
      if (that.source !== null) {
         return that.source.playTime();
      } else {
         return that.playOffset;
      }
   };

   // **** GUI FUNCTIONS ****

   that.pause = function() {
      if (!that.loaded()) return;
      that.playOffset = that.source.playTime();
      that.source.stop(0);
      that.source = null;

      that.playing = false;

      that.updateGui();
   };

   that.toggle = function() {
      if (that.playing) {
         that.pause();
      } else {
         that.play();
      }

      that.updateGui();
   };

   that.seek = function(time) {
      if (that.enableSeek()) {
         alert('Seeking when GUI update is disabled!');
      }

      var playing = that.playing;

      if (playing) that.pause();
      that.playOffset = time;
      if (playing) that.play();
   };

   that.seekMaybe = function(time) {
      if (that.enableSeek()) {
         that.seek(time);
      }
   };

   that.stop = function() {
      if (that.playing) that.pause();
      that.playOffset = 0;
      that.updateGui();
   };

   that.disableSeek = function() {
      return that.canSeekGui !== (that.canSeekGui = false);
   };

   that.enableSeek = function() {
      return that.canSeekGui !== (that.canSeekGui = true);
   };

   // **** GUI STATUS FUNCTIONS ****

   that.updateGui = function() {
      that.domPlayPause.value = that.playing ? "Pause" : "Play";
      that.updateSeek();
   };

   that.updateSeek = function() {
      if (that.canSeekGui) {
         that.domSeek.value = that.getPlayTime();
      }
   };

   that.updateGuiLoop = function() {
      that.updateSeek();
      window.setTimeout(that.updateGuiLoop, UPDATE_GUI_INTERVAL);
   };

   // **** END CONSTRUCTOR

   that.loadFile();
}
