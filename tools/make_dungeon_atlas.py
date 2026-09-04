#!/usr/bin/env python3
"""Build-time generator for assets/atlases/dungeon.png (+ .atlas text atlas).

Offline tooling only — never shipped or run by the game. Produces a 128x16
RGBA strip of 16px tiles (floor, wall, door, exit, two player animation
frames). The .atlas file pins Nearest filtering so the runtime loads crisp
pixel art without extra texture uploads. Deterministic: same script, same PNG.
"""

import struct
import zlib

TILE = 16
TILES = ["floor", "wall", "door", "exit", "player_a", "player_b"]

PALETTE = {
    ".": (0, 0, 0, 0),
    # floor
    "f": (48, 48, 60, 255),
    "g": (60, 60, 74, 255),
    "d": (40, 40, 50, 255),
    # wall
    "w": (92, 92, 112, 255),
    "m": (54, 54, 66, 255),
    "h": (108, 108, 130, 255),
    # door
    "W": (150, 102, 52, 255),
    "x": (118, 78, 40, 255),
    "F": (84, 56, 28, 255),
    "K": (230, 206, 120, 255),
    # exit (stairs down)
    "p": (16, 16, 22, 255),
    "1": (108, 108, 124, 255),
    "2": (76, 76, 90, 255),
    "3": (52, 52, 62, 255),
    "e": (66, 66, 82, 255),
    # player
    "H": (101, 67, 33, 255),
    "S": (241, 194, 140, 255),
    "E": (30, 30, 40, 255),
    "T": (63, 191, 127, 255),
    "t": (47, 153, 102, 255),
    "B": (74, 58, 40, 255),
    "L": (74, 74, 94, 255),
    "b": (43, 32, 26, 255),
    "O": (24, 24, 32, 255),
}

FLOOR = [
    "ffffffffffffffff",
    "ffffffffgdffffff",
    "ffdfffffffffffff",
    "ffffffffffdfffff",
    "ffffgfffffffffff",
    "fdffffffffffffff",
    "ffffffffffffgfff",
    "ffffffffffffffff",
    "ffffdfffffffffff",
    "fgffffffffffffff",
    "ffffffffffffdfff",
    "ffffffffffgfffff",
    "ffffgfffffffffff",
    "ffffffffffffffff",
    "fdffffffffffffgf",
    "ffffffffffffffff",
]

WALL = [
    "hhhhhhhmhhhhhhhm",
    "wwwwwwwmwwwwwwwm",
    "wwwwwwwmwwwwwwwm",
    "mmmmmmmmmmmmmmmm",
    "hhmhhhhhhmhhhhhh",
    "wwmwwwwwwwmwwwww",
    "wwmwwwwwwwmwwwww",
    "mmmmmmmmmmmmmmmm",
    "hhhhhhhmhhhhhhhm",
    "wwwwwwwmwwwwwwwm",
    "wwwwwwwmwwwwwwwm",
    "mmmmmmmmmmmmmmmm",
    "hhmhhhhhhmhhhhhh",
    "wwmwwwwwwwmwwwww",
    "wwmwwwwwwwmwwwww",
    "mmmmmmmmmmmmmmmm",
]

DOOR = [
    "FFFFFFFFFFFFFFFF",
    "FxxxxxxxxxxxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxKxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxWxxxxxxWxxxxF",
    "FxxxxxxxxxxxxxxF",
    "FFFFFFFFFFFFFFFF",
]

EXIT = [
    "eeeeeeeeeeeeeeee",
    "e11111111111111e",
    "e1pppppppppppp2e",
    "e1p1111111111p2e",
    "e1p1ppppppppp22e",
    "e1p1p2222222p22e",
    "e1p1p2ppppppp22e",
    "e1p1p2p333333p2e",
    "e1p1p2p3pppp3p2e",
    "e1p1p2p3p33p3p2e",
    "e1p1p2p3p3p3p3pe",
    "e1p1p2p3p3p3p3pe",
    "e1p1p2p3p3p3p3pe",
    "e1p1p2p3p3p3p3pe",
    "eppppppppppppppp",
    "eeeeeeeeeeeeeeee",
]

PLAYER_A = [
    "................",
    "................",
    ".....OOOOOO.....",
    "....OHHHHHHO....",
    "....OHHHHHHO....",
    "....OSSSSSSO....",
    "....OSESSESO....",
    "....OSSSSSSO....",
    ".....OSSSSO.....",
    "....OTTTTTTO....",
    "...OSTTTTTTSO...",
    "...OSTtTTtTSO...",
    "....OBBBBBBO....",
    ".....OLLLLO.....",
    ".....OLO.OLO....",
    ".....ObO.ObO....",
]

PLAYER_B = [
    "................",
    "................",
    ".....OOOOOO.....",
    "....OHHHHHHO....",
    "....OHHHHHHO....",
    "....OSSSSSSO....",
    "....OSESSESO....",
    "....OSSSSSSO....",
    ".....OSSSSO.....",
    "....OTTTTTTO....",
    "...OSTTTTTTSO...",
    "...OSTtTTtTSO...",
    "....OBBBBBBO....",
    "....OLLL.LLO....",
    "...OLO.....OLO..",
    "...ObO.....ObO..",
]


def tile_pixels(rows):
    assert len(rows) == TILE and all(len(r) == TILE for r in rows), "tile must be 16x16"
    return [[PALETTE[ch] for ch in row] for row in rows]


def write_png(path, width, height, pixels):
    raw = b""
    for row in pixels:
        raw += b"\x00" + b"".join(struct.pack("4B", *px) for px in row)

    def chunk(tag, data):
        block = struct.pack(">I", len(data)) + tag + data
        return block + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as fh:
        fh.write(png)


def main():
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "atlases")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    strips = [tile_pixels(rows) for rows in (FLOOR, WALL, DOOR, EXIT, PLAYER_A, PLAYER_B)]
    strips.append([[PALETTE["."]] * TILE for _ in range(TILE)])  # padding
    strips.append([[PALETTE["."]] * TILE for _ in range(TILE)])  # padding

    width = TILE * len(strips)
    height = TILE
    pixels = []
    for y in range(height):
        row = []
        for strip in strips:
            row.extend(strip[y])
        pixels.append(row)

    write_png(os.path.join(out_dir, "dungeon.png"), width, height, pixels)

    atlas = [
        "dungeon.png",
        f"size: {width},{height}",
        "format: RGBA8888",
        "filter: Nearest,Nearest",
        "repeat: none",
    ]
    for index, name in enumerate(TILES):
        atlas.extend([
            name,
            "  rotate: false",
            f"  xy: {index * TILE}, 0",
            f"  size: {TILE}, {TILE}",
            f"  orig: {TILE}, {TILE}",
            "  offset: 0, 0",
            "  index: -1",
        ])
    with open(os.path.join(out_dir, "dungeon.atlas"), "w") as fh:
        fh.write("\n".join(atlas) + "\n")
    print(f"wrote {out_dir}/dungeon.png ({width}x{height}) and dungeon.atlas")


if __name__ == "__main__":
    main()
