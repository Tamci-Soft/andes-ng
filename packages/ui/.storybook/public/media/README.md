# Media fixtures

Generated test media for the stories. Run the commands from this directory; the tools are
`ffmpeg` and `ffprobe` (version 9). The picture is the `testsrc` pattern, whose built-in
seconds counter is the ticking clock (no font rendering needed), with a beeping sine tone.

```sh
# 12 s, 640x360, H.264 + AAC
ffmpeg -y -f lavfi -i "testsrc=size=640x360:rate=24:duration=12" \
  -f lavfi -i "sine=frequency=440:beep_factor=4:duration=12:sample_rate=44100" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 32 -preset slow -g 24 \
  -c:a aac -b:a 48k -ac 1 -movflags +faststart -shortest sample.mp4

# The same as VP9 + Opus
ffmpeg -y -f lavfi -i "testsrc=size=640x360:rate=24:duration=12" \
  -f lavfi -i "sine=frequency=440:beep_factor=4:duration=12:sample_rate=48000" \
  -c:v libvpx-vp9 -b:v 0 -crf 45 -row-mt 1 -deadline good -g 24 \
  -c:a libopus -b:a 32k -ac 1 -shortest sample.webm

# 6 s audio only (AAC)
ffmpeg -y -f lavfi -i "sine=frequency=330:beep_factor=2:duration=6:sample_rate=44100" \
  -c:a aac -b:a 48k -ac 1 -movflags +faststart sample-audio.m4a

# Storyboard: one 160x90 frame per second, 4 columns x 3 rows
ffmpeg -y -i sample.mp4 -vf "fps=1,scale=160:90,tile=4x3" -frames:v 1 -q:v 6 storyboard.jpg

# Poster (frame at 2 s) and a cover image for the audio stories
ffmpeg -y -ss 2 -i sample.mp4 -frames:v 1 -q:v 5 poster.jpg
ffmpeg -y -f lavfi -i "gradients=size=400x400:n=3:seed=7:duration=1" -frames:v 1 -q:v 5 cover.jpg
```

The WebVTT files are written by hand (or by a short script):

- `captions.en.vtt`, `captions.es.vtt`: one cue per second describing the picture.
- `chapters.en.vtt`: Opening (0-4 s), Middle (4-8 s), Ending (8-12 s).
- `thumbnails.vtt`: one cue per second, `storyboard.jpg#xywh=x,y,160,90` with
  `x = (second % 4) * 160` and `y = floor(second / 4) * 90`.
