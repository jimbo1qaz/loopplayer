# loopplayer - browser-based Web Audio music player

loopplayer is a Web Audio player with sample-perfect looping. It was designed for video game music which loops perfectly by design.

loopplayer was born out of frustration with extended music Youtube videos. They take a very long time to render and upload, are extremely wasteful of space due to repeated video and content, and don't loop forever for the watcher.

## Usage

To prepare files for loopplayer, rename them to `name.samplerate.loopstart.loopend.extension`(1). Periods are allowed in the file name. All loop points are in samples to avoid the need for decimal point.

To use loopplayer, download, clone, or upload all files in this repository. Then open loopplayer.html in a browser, and append `?file=[path-to-file]` to the URL.

## Compatibility

loopplayer supports Chrome and Firefox (stutters). It should work with Opera, due to using Webkit. Edge is untested. It will not work on IE11, due to not supporting Web Audio API.

*(1) The reason you need `samplerate` is because Web Audio was designed by a bunch of idiotic fucktards who provide absolutely no way whatsoever to determine the sample point of a file, and I didn't want to parse the file using a separate library for such a simple requirement.*
