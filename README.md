# loopplayer - browser-based Web Audio music player

loopplayer is a Web Audio player with sample-perfect looping. It is designed for video game music which loops perfectly by design.

loopplayer was born out of frustration with extended music Youtube videos. They take a very long time to render and upload, are extremely wasteful of space due to repeated video and audio, and don't loop forever for the watcher.

For examples of loopplayer in action, see:

* <https://jimbo1qaz.github.io/loopplayer/?file=sounds/chrono-revive.yaml>
* https://jimbo1qaz.github.io/loopplayer/?file=sounds/sd3sister.yaml
* https://jimbo1qaz.github.io/loopplayer/?file=sounds/ff6decisive.yaml

## Looping Files

Use `loopify.py` to prepare sound files. For example, call `loopify 1x.wav 2x.wav out_title` . This will generate looped files `out.rate.start.end.wav` and `...logg`. The `logg` file includes loop point tags, allowing you to playback looped files locally, using foobar2000 or Winamp with vgmstream plugin.

* loopify.py assumes that 1x.wav includes at least 1 loop, and 2x.wav is exactly one loop longer. To prevent decaying notes from cutting out, you can extend both 1x and 2x using a fadeout of a specific length.
* loopify.py currently only generates 16-bit WAVs. (Firefox prior to 46 did not support higher bit-depths. See <https://bugzilla.mozilla.org/show_bug.cgi?id=864780> .)

### Extending Files

I'm adding tools to extend audio and video for Youtube (unrelated to loopplayer). I'm adding "extend audio to 30m" (depends on loopify), "encode still image into video", and "Synthesia first-note audio/video sync" features. "loopify-extend" may be split into a new repository.

## Usage (Playback)

To use loopplayer, download, clone, or upload all files in this repository. Then open loopplayer.html in a browser, and append `?file=[path-to-file]` to the URL.

* Locally hosted files can only be accessed using relative URLs from a local installation of loopplayer. The sounds must be stored with loopplayer or in a subdirectory. You may receive permission errors in Chrome; either launch with `--allow-file-access` flag, or use a web server such as XAMPP or WebStorm's.

## Redirects/Metadata

loopplayer supports redirect/metadata files. See `sample.yaml` as an example. Redirect files must have an extension of `.yaml` or `.loop` (subject to change).

Right now, only `url` and `title` are implemented. All other attributes are unimplemented and subject to change. Relative, root, and absolute URLs are supported.

## Compatibility

loopplayer supports Chrome, Firefox (may stutter on Windows), and Edge. It should work with Opera, due to using Webkit. It will not work on IE11, due to not supporting Web Audio API.

*(1) The reason you need `samplerate` is because Web Audio provides no way to determine the sample rate of a file, and I didn't want to parse the file using a separate library for such a simple requirement. I don't like decimal loop points, since they're inexact and could suffer from floating-point errors during calculation.*
