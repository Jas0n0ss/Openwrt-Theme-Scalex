#!/usr/bin/env python3
"""Validate the on-disk IPK container format used by OpenWrt opkg."""
from __future__ import annotations

import io
import sys
import tarfile
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(f"IPK FORMAT FAIL: {message}")


def main(path: Path) -> None:
    raw = path.read_bytes()
    if not raw.startswith(b"\x1f\x8b"):
        fail(f"{path.name} is not gzip-wrapped (expected modern tar.gz IPK)")

    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as outer:
            names = {m.name for m in outer.getmembers()}
            for required in ("debian-binary", "data.tar.gz", "control.tar.gz"):
                if required not in names:
                    fail(f"missing outer member {required}")

            if outer.extractfile("debian-binary").read().strip() != b"2.0":
                fail("debian-binary is not version 2.0")

            for member_name in ("data.tar.gz", "control.tar.gz"):
                payload = outer.extractfile(member_name).read()
                with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as inner:
                    for member in inner.getmembers():
                        if member.type not in (b"0", b"5"):
                            fail(f"{member_name}: unsupported tar type {member.type!r} in {member.name}")
                        if member.name.startswith("./._") or "/._" in member.name:
                            fail(f"{member_name}: AppleDouble file {member.name}")
                        mode = member.mode & 0o777
                        if member.isdir() and mode != 0o755:
                            fail(f"{member_name}: directory mode {oct(mode)} for {member.name}")
                        if member.isfile() and mode not in (0o644, 0o755):
                            fail(f"{member_name}: file mode {oct(mode)} for {member.name}")
    except tarfile.TarError as exc:
        fail(str(exc))

    print(f"OK: format {path.name}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: check-ipk-format.py <ipk>")
    main(Path(sys.argv[1]))
