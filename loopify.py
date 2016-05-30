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


LOOP_SECONDS = 0
LOOP_SAMPLES = 0


class Looper:
    def __init__(self, x1name='1x.wav', x2name='2x.wav', outname='out.wav'):
        self.x1name = x1name
        self.x2name = x2name
        self.outbase = get_base_ext(outname)[0]

    def run(self, compress=True):
        loopdata = self.get_loop_data()
        outname = self.generate_outname(loopdata)

        self.render(self.loopEnd, outname, compress)

    def render(self, samples, outname, compress=True):
        wavname = self.x2name

        # BUG: Firefox currently doesn't support 24-bit WAV.
        # https://bugzilla.mozilla.org/show_bug.cgi?id=864780
        # TODO: Firefox bug is resolved. Should we use 24?
        args = ['trim', '0s', smp(samples)]

        SOX[wavname, '-b', '16', outname][args] & FG

        # Convert to Ogg.
        # BUG: Chrome current'y doesn't support WebAudio Opus.
        # https://bugs.chromium.org/p/chromium/issues/detail?id=482934
        # Oh, and sox also doesn't support opus.

        # -1=bad, 10=good
        # default=3 = 112kbps

        if not compress:
            return

        oggname = self.outbase + '.ogg'
        loggname = self.outbase + '.logg'
        SOX[wavname, '-C', '6',
            '--add-comment', 'LOOP_START=%s' % self.loopStart,
            '--add-comment', 'LOOP_END=%s' % self.loopEnd,
            oggname][args] & FG

        os.rename(oggname, loggname)

    def extend(self, seconds):
        """ assemble an extended sound file using "first" and "looped", """

        loopdata = self.get_loop_data()
        wavname = self.x2name

        first = self.generate_outname(loopdata)         # len = self.loopEnd

        # **** Generate looped section only.
        looped = self.outbase + '-loop.wav' # len = self.loop_len
        SOX[wavname, looped, 'trim',
            smp(self.loopStart),
            smp(self.loopEnd)
        ] & FG

        # **** Calculate loop count.

        # loopEnd + n*loop_len >= seconds*sample_rate
        # n = ceil((seconds*sample_rate - loopend) / loop_len)
        # add 1 for luck

        n = math.ceil(
            (seconds*self.sample_rate - self.loopEnd) / self.loop_len
        ) + 1

        CAT_TXT = 'cat.txt'

        FORMAT = "file '%s'\n"

        with open(CAT_TXT, 'w') as file:
            file.write(FORMAT % first)
            for i in range(n):
                file.write(FORMAT % looped)

        # **** Use ffmpeg to loop audio.

        outwav = self.outbase + '-extend.opus'
        FFMPEG[(
            # -c copy
            '-loglevel warning -hide_banner -y '
            '-t %s -f concat -i %s '                # input
            '-t %s -b:a 128000 '                      # output
            % (seconds, CAT_TXT, seconds)
        ).split()] \
        [outwav] & FG


    def get_loop_overlap(self):
        if LOOP_SECONDS:
            return self.sample_rate * LOOP_SECONDS
        else:
            return LOOP_SAMPLES

    def get_loop_data(self):
        # --|loop|loop
        #        a    b
        #   lsta lend
        self.sample_rate = sample_rate = get_rate(self.x1name)

        a = get_len(self.x1name)
        b = get_len(self.x2name)

        self.loop_len = loop_len = b - a

        overlap = self.get_loop_overlap()

        self.loopStart = loopStart = a - loop_len + overlap
        self.loopEnd = loopEnd = a + overlap

        return [sample_rate, loopStart, loopEnd]

    def generate_outname(self, loopdata):
        return '.'.join([self.outbase] + [str(s) for s in loopdata] + ['wav'])


class LooperApp(cli.Application):
    def main(self, *args):
        looper = Looper(*args)
        looper.run(compress=False)
        looper.extend(180)


if __name__ == '__main__':
    LooperApp.run()
