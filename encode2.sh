#!/usr/bin/env bash

img=$1
t=$2
# 8/7 * 1080 = 1234.2857142857142
# 1234x1080
# scale=x1080
scale=:1080
video=$1.mp4


# Unfortunately, area filtering = bilinear, not AANN.

# with opts: -i input \
# with opts: -i output \

if [[ ! -e "$video" ]]; then
	ffmpeg -loglevel warning -hide_banner -y \
	-loop 1 -i $img \
		-vf scale=$scale -sws_flags neighbor \
		-t $t -r 1 \
		-c:v libx264 -tune stillimage -pix_fmt yuv420p \
	$video
fi


audio=sd3sister-extend.m4a
final=sd3sister.mp4
ffmpeg -loglevel warning -hide_banner -y \
	-i $video -i $audio -codec copy \
	-bsf:a aac_adtstoasc -movflags +faststart $final

# ffmpeg -i out-extend.aac -c:a copy lol.aac

# -map 0:0 -map 1:1 \

# 	-c:a copy \

