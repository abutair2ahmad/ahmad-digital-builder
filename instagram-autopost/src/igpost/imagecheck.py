#!/usr/bin/env python3
"""The last gate before an image is allowed near Instagram.

Two independent checks have to agree before a post proceeds:

  1. The layout fit report from render.py — did any text clip or escape the frame.
  2. This module — is the produced PNG actually a well-formed, non-empty image of
     the right shape.

The second matters because the first only knows what the DOM claimed. A font that
failed to load, a renderer that wrote a single flat colour, or a truncated file all
produce a DOM that measures perfectly and an image nobody should post.

Implemented against the PNG spec directly rather than an imaging library, so the
publisher keeps its "standard library only" property and needs no build step on
whatever host ends up running it.
"""

import struct
import zlib

SIGNATURE = b"\x89PNG\r\n\x1a\n"

# What Instagram accepts, and what we intend to send.
EXPECT_W = 1080
EXPECT_H = 1080
MIN_BYTES = 12 * 1024          # a flat colour compresses far below this
MAX_BYTES = 8 * 1024 * 1024    # Instagram's practical ceiling
MIN_DISTINCT_COLOURS = 6       # background + ink + accent + antialiasing
MIN_INK_COVERAGE = 0.004       # at least ~0.4% of pixels differ from the dominant colour

CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


class ImageRejected(RuntimeError):
    """The rendered image is not fit to publish."""


def read_chunks(data):
    offset, chunks = 8, []
    while offset + 8 <= len(data):
        (length,) = struct.unpack(">I", data[offset:offset + 4])
        kind = data[offset + 4:offset + 8]
        body = data[offset + 8:offset + 8 + length]
        chunks.append((kind, body))
        offset += 12 + length
        if kind == b"IEND":
            break
    return chunks


def _paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


def decode_rgb(data):
    """Decode a non-interlaced 8-bit PNG to (width, height, list of row bytearrays)."""
    chunks = read_chunks(data)
    header = next((body for kind, body in chunks if kind == b"IHDR"), None)
    if header is None:
        raise ImageRejected("PNG has no IHDR chunk")
    width, height, depth, colour, _, _, interlace = struct.unpack(">IIBBBBB", header[:13])
    if depth != 8:
        raise ImageRejected("unsupported bit depth %d" % depth)
    if interlace:
        raise ImageRejected("interlaced PNG is not supported")
    if colour not in CHANNELS:
        raise ImageRejected("unsupported colour type %d" % colour)

    channels = CHANNELS[colour]
    raw = zlib.decompress(b"".join(body for kind, body in chunks if kind == b"IDAT"))
    stride = width * channels
    if len(raw) < (stride + 1) * height:
        raise ImageRejected("truncated image data")

    rows, previous, pos = [], bytearray(stride), 0
    for _ in range(height):
        filter_type = raw[pos]
        line = bytearray(raw[pos + 1:pos + 1 + stride])
        pos += 1 + stride
        if filter_type == 1:                       # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif filter_type == 2:                     # Up
            for i in range(stride):
                line[i] = (line[i] + previous[i]) & 0xFF
        elif filter_type == 3:                     # Average
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + previous[i]) >> 1)) & 0xFF
        elif filter_type == 4:                     # Paeth
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                upleft = previous[i - channels] if i >= channels else 0
                line[i] = (line[i] + _paeth(left, previous[i], upleft)) & 0xFF
        elif filter_type != 0:
            raise ImageRejected("unknown scanline filter %d" % filter_type)
        rows.append(line)
        previous = line
    return width, height, rows, channels


def inspect(path, sample_step=4):
    """Measure the file. `sample_step` subsamples pixels for the colour statistics."""
    with open(path, "rb") as handle:
        data = handle.read()
    if not data.startswith(SIGNATURE):
        raise ImageRejected("not a PNG file")

    width, height, rows, channels = decode_rgb(data)
    counts = {}
    for y in range(0, height, sample_step):
        row = rows[y]
        for x in range(0, width, sample_step):
            i = x * channels
            key = (row[i], row[i + 1], row[i + 2]) if channels >= 3 else (row[i], row[i], row[i])
            counts[key] = counts.get(key, 0) + 1

    sampled = sum(counts.values())
    dominant = max(counts.values()) if counts else 0
    return {
        "path": path,
        "bytes": len(data),
        "width": width,
        "height": height,
        "distinct_colours": len(counts),
        "dominant_share": (float(dominant) / sampled) if sampled else 1.0,
        "ink_coverage": 1.0 - ((float(dominant) / sampled) if sampled else 1.0),
    }


def check(path, fit_report=None):
    """Return (ok, stats, reasons). Never raises for a merely bad image."""
    reasons = []
    try:
        stats = inspect(path)
    except (ImageRejected, zlib.error, struct.error) as exc:
        return False, {"path": path}, ["unreadable image: %s" % exc]

    if stats["width"] != EXPECT_W or stats["height"] != EXPECT_H:
        reasons.append("wrong dimensions %dx%d (expected %dx%d)"
                       % (stats["width"], stats["height"], EXPECT_W, EXPECT_H))
    if stats["bytes"] < MIN_BYTES:
        reasons.append("suspiciously small file (%d bytes) — likely a blank render" % stats["bytes"])
    if stats["bytes"] > MAX_BYTES:
        reasons.append("file too large (%d bytes)" % stats["bytes"])
    if stats["distinct_colours"] < MIN_DISTINCT_COLOURS:
        reasons.append("only %d distinct colours — image looks empty" % stats["distinct_colours"])
    if stats["ink_coverage"] < MIN_INK_COVERAGE:
        reasons.append("%.2f%% of the frame differs from the background — no content drawn"
                       % (stats["ink_coverage"] * 100))

    if fit_report is not None:
        if not fit_report.get("stage_fits", True):
            reasons.append("content overflows the 1080x1080 frame")
        for item in fit_report.get("overflow", []):
            reasons.append("text clipped in %s: %r" % (item.get("cls"), item.get("text")))
        if fit_report.get("empty_text"):
            reasons.append("%d text blocks rendered empty" % fit_report["empty_text"])

    return (not reasons), stats, reasons
