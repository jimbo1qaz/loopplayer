#!/usr/bin/env bash

img=sd3title.png
t=1800
# 8/7 * 1080 = 1234.2857142857142
# 1234x1080
scale=1234x1080
video=sd3video.mp4


# Unfortunately, area filtering = bilinear, not AANN.

# with opts: -i input \
# with opts: -i output \

: ffmpeg -loglevel warning -hide_banner -y \
-loop 1 -i $img \
	-s $scale -sws_flags neighbor \
	-t $t -r 1 \
	-c:v libx264 -tune stillimage -pix_fmt yuv420p \
$video -y


audio=sd3sister-extend.aac
final=sd3sister.mp4
ffmpeg -loglevel warning -hide_banner -y \
	-i $video -i $audio -codec copy -bsf:a aac_adtstoasc   $final

# ffmpeg -i out-extend.aac -c:a copy lol.aac

# -map 0:0 -map 1:1 \

# 	-c:a copy \

