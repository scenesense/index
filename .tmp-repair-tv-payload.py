import base64
import gzip
import hashlib
import subprocess
import sys
import zlib

PAYLOAD = '.tmp-tv-batch-payload.b64'
INTEGRATOR = '.tmp-integrate-tv-batch.py'
EXPECTED_SHA = 'fed375a715de5f2619b596a6f34e3f68ecd185addc6a05935968155fea3260dc'
ALPHABET = b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
MAX_DEPTH = 16
BEAM_WIDTH = 8

original = bytearray(open(PAYLOAD, 'rb').read().strip())


def decode(buf):
    return base64.b64decode(bytes(buf), validate=True)


def exact_match(buf):
    try:
        raw = gzip.decompress(decode(buf))
    except Exception:
        return False
    return hashlib.sha256(raw).hexdigest() == EXPECTED_SHA


def prefix_ok(blob, n):
    d = zlib.decompressobj(16 + zlib.MAX_WBITS)
    try:
        d.decompress(blob[:n])
        return True
    except zlib.error:
        return False


def first_bad(blob):
    if prefix_ok(blob, len(blob)):
        return len(blob)
    lo, hi = 0, len(blob)
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if prefix_ok(blob, mid):
            lo = mid
        else:
            hi = mid
    return hi


def char_indices(err, text_len, byte_back=20, byte_forward=8):
    # A base64 character carries six bits and can influence at most two adjacent
    # decoded bytes. Include a little history because a damaged Huffman header can
    # become visibly invalid several bytes after the actual bad character.
    b0 = max(10, err - byte_back)  # preserve gzip header unless evidence says otherwise
    b1 = min((text_len * 3) // 4, err + byte_forward)
    c0 = max(0, (b0 * 4) // 3 - 4)
    c1 = min(text_len, (b1 * 4) // 3 + 6)
    return range(c0, c1)


def expand_one(state):
    buf, err, edits = state
    out = []
    for idx in char_indices(err, len(buf)):
        if idx in {e[0] for e in edits}:
            continue
        old = buf[idx]
        if old not in ALPHABET:
            continue
        for ch in ALPHABET:
            if ch == old:
                continue
            trial = bytearray(buf)
            trial[idx] = ch
            try:
                blob = decode(trial)
            except Exception:
                continue
            nb = first_bad(blob)
            if nb <= err:
                continue
            new_edits = edits + [(idx, chr(old), chr(ch), err, nb)]
            if exact_match(trial):
                return trial, nb, new_edits, True
            out.append((trial, nb, new_edits))
    return out


def pair_escape(state):
    # Some DEFLATE structures can require two nearby damaged sextets to be fixed
    # before the parser advances at all. This bounded fallback explores pairs only
    # in a tight window around the current failure.
    buf, err, edits = state
    used = {e[0] for e in edits}
    idxs = [i for i in char_indices(err, len(buf), byte_back=10, byte_forward=4)
            if i not in used and buf[i] in ALPHABET]
    for a_pos, i in enumerate(idxs):
        old_i = buf[i]
        for j in idxs[a_pos + 1:]:
            old_j = buf[j]
            for ci in ALPHABET:
                if ci == old_i:
                    continue
                for cj in ALPHABET:
                    if cj == old_j:
                        continue
                    trial = bytearray(buf)
                    trial[i] = ci
                    trial[j] = cj
                    try:
                        blob = decode(trial)
                    except Exception:
                        continue
                    nb = first_bad(blob)
                    if nb <= err:
                        continue
                    new_edits = edits + [
                        (i, chr(old_i), chr(ci), err, err),
                        (j, chr(old_j), chr(cj), err, nb),
                    ]
                    if exact_match(trial):
                        return trial, nb, new_edits, True
                    return [(trial, nb, new_edits)]
    return []


if exact_match(original):
    recovered = original
    print('Payload already matches audited SHA-256.')
else:
    start_blob = decode(original)
    start_err = first_bad(start_blob)
    print(f'Compressed bytes: {len(start_blob)}; first DEFLATE failure exposed at byte {start_err}.')
    beam = [(original, start_err, [])]
    recovered = None

    for depth in range(1, MAX_DEPTH + 1):
        candidates = []
        exact = None
        for state in beam:
            expanded = expand_one(state)
            if isinstance(expanded, tuple) and len(expanded) == 4 and expanded[3] is True:
                exact = expanded
                break
            candidates.extend(expanded)
        if exact:
            recovered = exact[0]
            print(f'Exact payload recovered at edit depth {depth}.')
            for e in exact[2]:
                print('  edit', e)
            break

        if not candidates:
            print(f'No single-character state advanced at depth {depth}; trying a bounded two-character escape.')
            escaped = pair_escape(max(beam, key=lambda s: s[1]))
            if isinstance(escaped, tuple) and len(escaped) == 4 and escaped[3] is True:
                recovered = escaped[0]
                print('Exact payload recovered by paired repair.')
                for e in escaped[2]:
                    print('  edit', e)
                break
            candidates.extend(escaped)

        if not candidates:
            break

        # Deduplicate identical transport states and retain the states that push
        # valid decompression furthest. Prefer fewer edits on equal progress.
        uniq = {}
        for st in candidates:
            key = bytes(st[0])
            old = uniq.get(key)
            if old is None or (st[1], -len(st[2])) > (old[1], -len(old[2])):
                uniq[key] = st
        beam = sorted(uniq.values(), key=lambda s: (s[1], -len(s[2])), reverse=True)[:BEAM_WIDTH]
        print(f'Depth {depth}: best parser progress {beam[0][1]}/{len(start_blob)}; beam={len(beam)}; edits={len(beam[0][2])}.')
        for st in beam[:3]:
            print('  state', st[1], st[2])

    if recovered is None or not exact_match(recovered):
        best = max(beam, key=lambda s: s[1]) if beam else None
        if best:
            print('Best unresolved state:', best[1], best[2])
        raise SystemExit('Exact SHA-256 payload recovery failed; repository data files were not touched.')

with open(PAYLOAD, 'wb') as f:
    f.write(recovered + b'\n')
print('Exact audited payload recovered and transport repaired.')
subprocess.run([sys.executable, INTEGRATOR], check=True)
