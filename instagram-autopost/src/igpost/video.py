#!/usr/bin/env python3
"""Frames to MP4, and back to numbers so the result can be checked.

ffmpeg is used for exactly one thing: compositing a directory of PNG frames
(already fully animated by headless Chrome, see story_render.py) into a single
H.264/AAC MP4 that meets Instagram's Stories video requirements — no filters,
no effects, no re-timing happen here.
"""

import json
import shutil
import subprocess

STORY_WIDTH = 1080
STORY_HEIGHT = 1920


class VideoError(RuntimeError):
    pass


def find_ffmpeg(explicit=None):
    binary = explicit or shutil.which("ffmpeg")
    if not binary:
        raise VideoError("ffmpeg not found on PATH")
    return binary


def find_ffprobe(explicit=None):
    binary = explicit or shutil.which("ffprobe")
    if not binary:
        raise VideoError("ffprobe not found on PATH")
    return binary


def encode(frame_dir, fps, out_path, ffmpeg_bin=None, pattern="frame_%04d.png", timeout=120):
    """Composite frame_dir/pattern at `fps` into a Stories-ready MP4 at out_path.

    Silent AAC audio is added because Meta's video validators are more reliable
    against clips that carry an audio stream, even a silent one; nothing in the
    visual pipeline depends on it.
    """
    binary = find_ffmpeg(ffmpeg_bin)
    command = [
        binary, "-y",
        "-framerate", str(fps), "-i", frame_dir.rstrip("/") + "/" + pattern,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-shortest",
        "-vf", "scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2"
               % (STORY_WIDTH, STORY_HEIGHT, STORY_WIDTH, STORY_HEIGHT),
        "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        out_path,
    ]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise VideoError("ffmpeg timed out after %ss" % timeout)
    if result.returncode != 0:
        raise VideoError("ffmpeg failed: %s" % result.stderr.decode("utf-8", "replace")[-400:])
    return out_path


def probe(path, ffprobe_bin=None, timeout=30):
    """Return {width, height, duration, codec_name, has_audio} for a video file."""
    binary = find_ffprobe(ffprobe_bin)
    command = [
        binary, "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", path,
    ]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise VideoError("ffprobe timed out after %ss" % timeout)
    if result.returncode != 0:
        raise VideoError("ffprobe failed: %s" % result.stderr.decode("utf-8", "replace")[-400:])
    data = json.loads(result.stdout.decode("utf-8"))
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), {})
    has_audio = any(s.get("codec_type") == "audio" for s in streams)
    return {
        "width": video.get("width"),
        "height": video.get("height"),
        "codec_name": video.get("codec_name"),
        "duration": float(data.get("format", {}).get("duration") or 0),
        "has_audio": has_audio,
    }
