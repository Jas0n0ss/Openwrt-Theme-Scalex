#!/usr/bin/env python3
"""Read and write OpenWrt .ipk archives.

OpenWrt 24.10+ ships .ipk files as a gzipped tar containing debian-binary,
data.tar.gz and control.tar.gz. Older releases used a GNU ar wrapper; the
reader below accepts both so verification works across firmware generations.
"""
import io
import struct
import sys
import tarfile
import time
from pathlib import Path


def pad(n: int) -> int:
    return (n + 1) if n % 2 else n


def ar_header(name: str, size: int) -> bytes:
    # OpenWrt's opkg expects plain member names (debian-binary, control.tar.gz,
    # data.tar.gz). A trailing slash makes the package "malformed".
    name_field = name.encode("ascii")[:16].ljust(16, b" ")
    return b"".join([
        name_field,
        str(int(time.time())).encode("ascii").ljust(12)[:12],
        b"0".ljust(6)[:6],
        b"0".ljust(6)[:6],
        b"100644".ljust(8)[:8],
        str(size).encode("ascii").ljust(10)[:10],
        b"`\n",
    ])


def write_ar(out_path: Path, members: list[tuple[str, Path]]) -> None:
    with out_path.open("wb") as f:
        f.write(b"!<arch>\n")
        for name, path in members:
            data = path.read_bytes()
            f.write(ar_header(name, len(data)))
            f.write(data)
            if len(data) % 2:
                f.write(b"\n")


def read_ar_member(data: bytes, name: str) -> bytes | None:
    if not data.startswith(b"!<arch>\n"):
        return None
    pos = 8
    while pos + 60 <= len(data):
        header = data[pos : pos + 60]
        if header[58:60] != b"`\n":
            break
        mname = header[0:16].split(b"/")[0].split(b" ")[0].rstrip(b"\x00")
        size = int(header[48:58].decode("ascii").strip() or "0")
        pos += 60
        payload = data[pos : pos + size]
        pos += pad(size)
        if mname.decode("ascii", errors="ignore") == name:
            return payload
    return None


def read_ipk_member(data: bytes, name: str) -> bytes | None:
    """Read a member from either a modern tar.gz IPK or a legacy ar IPK."""
    if data.startswith(b"!<arch>\n"):
        return read_ar_member(data, name)

    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as outer:
            for member_name in (name, "./" + name):
                try:
                    member = outer.getmember(member_name)
                except KeyError:
                    continue
                handle = outer.extractfile(member)
                return handle.read() if handle else None
    except tarfile.TarError:
        return None
    return None


def extract_ipk_data(ipk_path: Path, out_dir: Path) -> None:
    payload = read_ipk_member(ipk_path.read_bytes(), "data.tar.gz")
    if payload is None:
        raise SystemExit(f"data.tar.gz not found in {ipk_path}")
    out_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as tar:
        tar.extractall(out_dir)


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "extract":
        extract_ipk_data(Path(sys.argv[2]), Path(sys.argv[3]))
        raise SystemExit(0)
    write_ar(Path(sys.argv[1]), [(Path(m).name, Path(m)) for m in sys.argv[2:]])
