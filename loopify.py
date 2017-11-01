#!/usr/bin/env python3

"""
loopify 1x.wav 2x.wav out.wav
-> out.$rate.$start.$stop.wav

looped section: [start, stop)
stop = # of samples

Changed: Output length no longer exceeds 1x length. (previously by 2 seconds)
To properly capture decay or reverb, extend both 1x and 2x by the same amount.
For help, see function get_loop_data.
"""

import os

import math


def path_append(*it):
    for el in it:
        os.environ['PATH'] += os.pathsep + el


path_append(os.curdir, r'C:\Program Files (x86)\sox-14-4-2')

from plumbum import BG, FG, local as pb, cli

assert BG, FG

SOXI = pb['sox']['--i']
SOX = pb['sox']
FFMPEG = pb['ffmpeg']


def skip_spaces(in_str, index, character=None):
    """
    @type in_str: str
    @type index: int
    """

    if index < 0:
        raise ValueError('cannot exclude negative substring')

    splitted = in_str.split(sep=character, maxsplit=index)
    if index < len(splitted):
        return splitted[index]
    return ''


def keep_leading(in_str, index, character=None):
    if index < 0: raise ValueError('cannot get negative substring')
    if index == 0: return ''

    num_items = len(in_str.split(character))
    if index >= num_items: return in_str

    # wtf pep8
    return in_str.rsplit(sep=character, maxsplit=num_items - index)[0]


def expand(s, *args):
    formatted = s % args
    return [sub.replace('~', ' ') for sub in formatted.split()]


# **** loopify util

def get_len(wavname):
    return int(SOXI['-s', wavname]())


def get_rate(wavname):
    return int(SOXI['-r', wavname]())


def get_base_ext(filename):
    rev = filename[::-1]
    base = skip_spaces(rev, 1, '.')[::-1]
    ext = keep_leading(rev, 1, '.')[::-1]
    return base, ext


def smp(n):
    return '=%ss' % n



class Looper:
    def get_loop_overlap(self, sample_rate):
        # if LOOP_SECONDS:
        #     return self.sample_rate * LOOP_SECONDS
        # else:
        #     return LOOP_SAMPLES
        return sample_rate * self.LOOP_SECONDS

    def get_loop_data(self):
        """ Initializes and returns sample_rate, loopStart, and loopEnd. """
        # --LoooopLoooop
        #         a     b
        #   start end
        sample_rate = get_rate(self.x1name)

        a = get_len(self.x1name)
        b = get_len(self.x2name)

        loop_len = b - a

        overlap = self.get_loop_overlap(sample_rate)

        loopStart = a - loop_len + overlap
        loopEnd = a + overlap

        return [sample_rate, loopStart, loopEnd]

    def generate_out_base(self, loopdata):
        return '.'.join([self.title] + [str(s) for s in loopdata])

    def generate_outname(self, ext):
        return self.out_base + ext


    def __init__(self, x1name, x2name, title, padding):
        self.x1name = x1name
        self.x2name = x2name
        self.title = title

        self.LOOP_SECONDS = padding
        # self.LOOP_SAMPLES = 0


        loopdata = self.get_loop_data()
        [self.sample_rate, self.loopStart, self.loopEnd] = loopdata
        self.loop_len = self.loopEnd - self.loopStart

        # We want to loop the original (x2) file.
        # Out base = "title.rate.begin.end" plus whatever file format.
        # Out wav = "title.rate.begin.end.wav".

        self.out_base = self.generate_out_base(loopdata)
        self.wav = self.generate_outname('.wav')


    def loopify(self, compress=True):

        samples = self.loopEnd
        orig = self.x2name

        # BUG: Firefox currently doesn't support 24-bit WAV.
        # https://bugzilla.mozilla.org/show_bug.cgi?id=864780
        # TODO: Firefox bug is resolved. Should we use 24?
        args = ['trim', '0s', smp(samples)]
        SOX[orig, '-b', '16', self.wav][args] & FG

        # Convert to Ogg.
        # BUG: Chrome currently doesn't support WebAudio Opus.
        # https://bugs.chromium.org/p/chromium/issues/detail?id=482934
        # Oh, and sox also doesn't support opus.

        if compress:
            ogg = self.generate_outname('.ogg')
            logg = self.generate_outname('.logg')

            # Ogg Vorbis VBR
            # -1=bad, 10=good, default=3 (112kbps)
            # we use 6 ~= 192kbps

            SOX[orig, '-C', '6',
                '--add-comment', 'LOOP_START=%s' % self.loopStart,
                '--add-comment', 'LOOP_END=%s' % self.loopEnd,
                ogg][args] & FG

            os.rename(ogg, logg)


    def extend(self, total_seconds, fadeout=30, extension='opus', codec='', curve='squ'):
        """
        assemble an extended sound file using "intro_loop" and "loop_only".
        `codec` is split and passed as an argument. It can be used for
            codec selection/configuration/bitrate.
        `curve` is the fadeout curve. 'squ' is linear-power. 'ipar' is very subtle.
        """

        intro_loop = self.wav
        loop_only = self.title + '-loop.wav'

        # **** Generate looped section only.
        SOX[intro_loop, loop_only, 'trim',
            smp(self.loopStart),
            smp(self.loopEnd)
        ] & FG


        # **** Calculate loop count.

        # loopEnd + n*loop_len >= total samples
        # n = ceil((total_samples - loopend) / loop_len)
        # add 1 for luck

        total_samples = total_seconds * self.sample_rate
        n = math.ceil(
            (total_samples - self.loopEnd) / self.loop_len
        ) + 1


        # **** Tell FFmpeg to: intro_loop, repeat(loop_only).

        CAT_TXT = 'temp-extend.txt'

        with open(CAT_TXT, 'w') as file:
            FORMAT = "file '%s'\n"
            file.write(FORMAT % intro_loop)
            for i in range(n):
                file.write(FORMAT % loop_only)


        # **** Use FFmpeg to loop audio. COMPRESSION IS CALLER-DETERMINED.

        extended = self.title + '-extend.' + extension

        # Documentation:
        # https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu
        # https://trac.ffmpeg.org/wiki/Encode/AAC
        # https://www.ffmpeg.org/ffmpeg-codecs.html

        FFMPEG[expand(
            '-loglevel warning -hide_banner -y '
            '-t %s -f concat -i %s '                # Concatenate intro_loop and loop_only.
            '-t %s '
            ,
            total_seconds, CAT_TXT, total_seconds   # FIXME why total_seconds twice?
                                                    # FIXME ffmpeg lacks AAC length field?
                                                    # TODO is m4a fixed?
        )][
            '-af', 'afade = t=out: st=%s: d=%s: curve=%s'
            % (total_seconds - fadeout, fadeout, curve)
        ][codec.split()
        ][extended] & FG



class LooperApp(cli.Application):
    extend = cli.Flag(["-e", "--extend"], help="Extend the file, as well as looping.")
    extend_only = cli.Flag(["-E", "--extend-only"], help="Extend the file, and skip logg file compression.")

    def main(self, x1name, x2name, outname, padding=0):
        padding = int(padding)
        looper = Looper(x1name, x2name, outname, padding)

        compress = True
        if self.extend_only:
            compress = False

        looper.loopify(compress=compress)

        if self.extend or self.extend_only:
            looper.extend(1800, extension='m4a', codec='-c:a libfdk_aac -cutoff 20000 -vbr 5')
            # "Note, the VBR setting is unsupported and only works with some parameter combinations"
            # https://hydrogenaud.io/index.php/topic,95989.msg817833.html#msg817833


if __name__ == '__main__':
    LooperApp.run()
