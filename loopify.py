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


def path_append(*it):
    for el in it:
        os.environ['PATH'] += os.pathsep + el


path_append(os.curdir, r'C:\Program Files (x86)\sox-14-4-2')

from plumbum import BG, FG, local as pb, cli

assert BG, FG

SOXI = pb['soxi']
SOX = pb['sox']


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

def trim_as(wavname, outname, samples):
    # BUG: Firefox currently doesn't support 24-bit WAV.
    # https://bugzilla.mozilla.org/show_bug.cgi?id=864780
    args = ['trim', '0s', str(samples)+'s']

    SOX[wavname, '-b', '16', outname][args] & FG

    # Convert to MP3.
    mp3name = get_base_ext(outname)[0] + '.mp3'
    SOX[wavname, '-C', '-0.01', mp3name][args] & FG


LOOP_SECONDS = 0
LOOP_SAMPLES = 0


class Looper:
    def __init__(self, x1name='1x.wav', x2name='2x.wav', outname='out.wav'):
        self.x1name = x1name
        self.x2name = x2name
        self.outname = outname

    def get_loop_overlap(self):
        if LOOP_SECONDS:
            return self.sample_rate * LOOP_SECONDS
        else:
            return LOOP_SAMPLES

    def get_loop_data(self):
        # --|loop|loop
        #        a    b
        #   ls   le
        self.sample_rate = sample_rate = get_rate(self.x1name)

        a = get_len(self.x1name)
        b = get_len(self.x2name)

        loop_len = b - a

        overlap = self.get_loop_overlap()

        self.loopStart = loopStart = a - loop_len + overlap
        self.loopEnd = loopEnd = a + overlap

        return [sample_rate, loopStart, loopEnd]

    def trim(self, length, outname):
        trim_as(self.x2name, outname, length)

    def generate_outname(self, loopdata):
        base, ext = get_base_ext(self.outname)

        return '.'.join([base] + [str(s) for s in loopdata] + [ext])

    def run(self):
        loopdata = self.get_loop_data()

        outname = self.generate_outname(loopdata)

        self.trim(self.loopEnd, outname)


class MainApp(cli.Application):
    def main(self, *args):
        Looper(*args).run()


if __name__ == '__main__':
    MainApp.run()
