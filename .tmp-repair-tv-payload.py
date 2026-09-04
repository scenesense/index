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

text = bytearray(open(PAYLOAD, 'rb').read().strip())


def decode(buf):
    return base64.b64decode(bytes(buf), validate=True)


def full_match(buf):
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


def first_bad_prefix(blob):
    # The current failure is a DEFLATE parse error, so prefix validity is monotonic:
    # once enough bytes have arrived to expose it, longer prefixes fail too.
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


def char_window_for_byte_range(byte_lo, byte_hi, text_len):
    c0 = max(0, (byte_lo * 4) // 3 - 8)
    c1 = min(text_len, (byte_hi * 4) // 3 + 12)
    return range(c0, c1)


if full_match(text):
    print('Payload already matches expected SHA-256.')
else:
    print('Payload is corrupt; beginning checksum-guarded repair.')
    repaired = False

    # First try the most likely case: one substituted base64 character near the
    # first DEFLATE failure. This cannot silently accept a near-match because the
    # decompressed bytes must equal the original SHA-256 exactly.
    blob = decode(text)
    err = first_bad_prefix(blob)
    print(f'First invalid compressed prefix ends at byte {err} of {len(blob)}.')

    for radius in (256, 1024, 4096):
        lo = max(10, err - radius)
        hi = min(len(blob), err + 64)
        print(f'Trying single-character repair in compressed-byte window {lo}:{hi}.')
        for idx in char_window_for_byte_range(lo, hi, len(text)):
            old = text[idx]
            if old not in ALPHABET:
                continue
            for ch in ALPHABET:
                if ch == old:
                    continue
                text[idx] = ch
                if full_match(text):
                    print(f'Exact payload recovered by base64 character repair at index {idx}.')
                    repaired = True
                    break
            if repaired:
                break
            text[idx] = old
        if repaired:
            break

    # If there was more than one substituted transport character, repair
    # iteratively by choosing only a mutation that moves the first parse failure
    # substantially forward. The final SHA remains mandatory.
    if not repaired:
        print('Single-character exact recovery not found; trying bounded iterative repair.')
        current = bytearray(open(PAYLOAD, 'rb').read().strip())
        for round_no in range(1, 5):
            blob = decode(current)
            err = first_bad_prefix(blob)
            if err >= len(blob):
                break
            target = min(len(blob), err + 1024)
            candidates = []
            lo = max(10, err - 1024)
            hi = min(len(blob), err + 64)
            for idx in char_window_for_byte_range(lo, hi, len(current)):
                old = current[idx]
                if old not in ALPHABET:
                    continue
                for ch in ALPHABET:
                    if ch == old:
                        continue
                    trial = bytearray(current)
                    trial[idx] = ch
                    try:
                        tblob = decode(trial)
                    except Exception:
                        continue
                    if not prefix_ok(tblob, target):
                        continue
                    if full_match(trial):
                        current = trial
                        repaired = True
                        print(f'Exact payload recovered in iterative round {round_no}, char {idx}.')
                        break
                    next_bad = first_bad_prefix(tblob)
                    if next_bad > err:
                        candidates.append((next_bad, idx, ch, trial))
                if repaired:
                    break
            if repaired:
                text = current
                break
            if not candidates:
                print(f'No advancing repair candidate in iterative round {round_no}.')
                break
            candidates.sort(key=lambda x: x[0], reverse=True)
            best = candidates[0]
            if len(candidates) > 1 and candidates[1][0] == best[0]:
                print(f'Ambiguous repair candidates at progress {best[0]}; refusing to guess.')
                break
            current = best[3]
            print(f'Round {round_no}: repaired base64 char {best[1]}, parse progress {err} -> {best[0]}.')
            if full_match(current):
                text = current
                repaired = True
                break

    if not repaired or not full_match(text):
        raise SystemExit('Unable to recover the exact payload; repository left untouched.')

    with open(PAYLOAD, 'wb') as f:
        f.write(text + b'\n')
    print('Repaired payload written; exact SHA-256 verified.')

subprocess.run([sys.executable, INTEGRATOR], check=True)
