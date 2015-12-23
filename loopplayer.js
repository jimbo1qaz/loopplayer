"use strict";

const LOOP_SEPARATOR = '.';

const UPDATE_GUI_INTERVAL = 50;

// Which files are detected as metadata?
const METADATA_EXTS = [
   'loop',
   'yaml'
];

// Dummy console.
var console = window.console || {
      "log": function(stuff) {
      }
   };


// Implement (string).format .
// http://stackoverflow.com/a/4673436
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



function arrayGetInt(array, idx) {
   if (idx < 0) {
      return parseFloat(array[array.length + idx]);
   } else {
      return parseFloat(array[idx]);
   }
}


function onloadf(callback) {
   document.addEventListener("DOMContentLoaded", callback);
}

function inArray(arr, obj) {
   return arr.indexOf(obj) !== -1;
}

function relativeUrl(a, b) {
   var aa = URI(a);
   var bb = URI(b);

   if (bb.is('absolute') || bb.toString()[0] == '/') {
      return b;
   }

   return aa.directory() + '/' + b;
}


// define class
function LoopPlayer(url, domPlayPause, domSeek, domDescription, loadedCallback) {
   var that = this;

   var ctx = that.ctx = new AudioContext();

   that.url = url;
   that.urls = [url];
   that.data = null;
   that.playing = false;

   that.loaded = function() {
      return that.data !== null;
   };

   that.source = null;

   that.loopStart = null;
   that.loopEnd = null;

   // startTime = arbitrary seconds.
   // playOffset = delta seconds (ctx.currentTime - startTime).

   that.startTime = null;
   that.playOffset = 0;

   that.domPlayPause = domPlayPause;
   that.domSeek = domSeek;
   that.domDescription = domDescription;
   that.canSeekGui = true;

   const MAX_DEPTH = 2;


   // Load a file into loopplayer.
   that.loadFile = function() {
      // If $url is specified, assume audio to avoid infinite loop.

      // Detect audio or alias by file extension.
      // .loop or .yaml at the moment
      // TODO: translate this whole thing into yield-futures?

      var request = new XMLHttpRequest();

      var urls = that.urls;
      request.open("GET", that.url, true);

      var ext = URI(that.url).suffix().toLowerCase();

      if (inArray(METADATA_EXTS, ext)) {

         // Detect recursive metadata loops.

         if (urls.length >= MAX_DEPTH) {
            console.log('error: recursive metadata.');
            console.log('URL traceback (most recent URL last):');
            for (var i = urls.length - 1; i >= 0; i--) {
               console.log('    ' + urls[i]);
            }
            return;
         }

         // Process metadata files.

         request.onload = function() {
            var response = jsyaml.safeLoad(request.response);
            if (response && response.url) {

               that.url = relativeUrl(that.url, response.url);
               that.urls.push(that.url);
               that.loadFile();

            } else {
               console.log('error: invalid metadata, missing url');
            }
         };


      } else {
         // Process audio files.

         request.responseType = "arraybuffer";
         request.onload = function() {
            ctx.decodeAudioData(request.response,
               function(data) {
                  that.data = data;
                  loadedCallback();
               },
               function() {
                  console.log('error decoding audio data');
               }
            );
         };

         that.parseLoopPoints();
      }

      request.send();
   };

   // Parses the sampling rate and loop points from URL.
   that.parseLoopPoints = function() {
      var uri = new URI(that.url);

      var filename = uri.filename();
      var filebase = filename.split('.').slice(0, -1).join('.');

      var timeArray = filebase.split(LOOP_SEPARATOR);

      var sampleRateOrig = arrayGetInt(timeArray, -3);
      console.log(sampleRateOrig);
      that.loopStart = arrayGetInt(timeArray, -2) / sampleRateOrig;
      that.loopEnd = arrayGetInt(timeArray, -1) / sampleRateOrig;

      console.log("{0} {1}".format(that.loopStart, that.loopEnd));
   };


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
