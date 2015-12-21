# loopplayer - browser-based Web Audio music player

loopplayer is a Web Audio player with sample-perfect looping. It is designed for video game music which loops perfectly by design.

loopplayer was born out of frustration with extended music Youtube videos. They take a very long time to render and upload, are extremely wasteful of space due to repeated video and audio, and don't loop forever for the watcher.

## Looping Files

To prepare files for loopplayer, rename them to `name.samplerate.loopstart.loopend.extension`(1).

This process can be automated using `loopify.py`. Simply call `loopify 1x.wav 2x.wav out.wav`, and it will automatically generate a looped file `out.rate.start.end.wav` and `...mp3`.

* loopify.py assumes that 1x.wav includes at least 1 loop, and 2x.wav is exactly one loop longer.
* loopify.py currently only generates 16-bit WAVs because Firefox does not support higher bit depths (fixed in Nightly). See <https://bugzilla.mozilla.org/show_bug.cgi?id=864780> .

## Usage

To use loopplayer, download, clone, or upload all files in this repository. Then open loopplayer.html in a browser, and append `?file=[path-to-file]` to the URL.

* Locally hosted files can only be accessed using relative URLs from a local installation of loopplayer. The sounds must be stored with loopplayer or in a subdirectory.

## Compatibility

loopplayer supports Chrome and Firefox (stutters on Windows). It should work with Opera, due to using Webkit. Edge is untested. It will not work on IE11, due to not supporting Web Audio API.

*(1) The reason you need `samplerate` is because Web Audio was designed by a bunch of idiotic fucktards who provide absolutely no way whatsoever to determine the sample point of a file, and I didn't want to parse the file using a separate library for such a simple requirement.*
