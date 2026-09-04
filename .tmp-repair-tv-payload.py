import base64
import gzip
import hashlib
import subprocess
import sys

PAYLOAD = '.tmp-tv-batch-payload.b64'
INTEGRATOR = '.tmp-integrate-tv-batch.py'
EXPECTED_SHA = 'fed375a715de5f2619b596a6f34e3f68ecd185addc6a05935968155fea3260dc'

text = open(PAYLOAD, 'rb').read().strip()

# The staged transport was assembled from independently base64-encoded chunks.
# A normal b64decode() stops at the first internal '=' padding boundary, which is
# why the previous integration saw only the first 12,600 compressed bytes.
# Split exactly at each padding run, decode every chunk, then concatenate the
# original compressed bytes back together.
parts = []
start = 0
i = 0
while i < len(text):
    if text[i] == ord('='):
        j = i
        while j + 1 < len(text) and text[j + 1] == ord('='):
            j += 1
        segment = text[start:j + 1]
        if segment:
            parts.append(base64.b64decode(segment, validate=True))
        start = j + 1
        i = j + 1
    else:
        i += 1
if start < len(text):
    segment = text[start:]
    if segment:
        parts.append(base64.b64decode(segment, validate=True))

blob = b''.join(parts)
print('Decoded base64 segments:', len(parts))
print('Compressed bytes recovered:', len(blob))
print('Segment byte lengths:', [len(x) for x in parts])

try:
    raw = gzip.decompress(blob)
except Exception as exc:
    raise SystemExit(f'Reassembled gzip still invalid: {exc}')

sha = hashlib.sha256(raw).hexdigest()
print('Recovered payload SHA-256:', sha)
if sha != EXPECTED_SHA:
    raise SystemExit('Reassembled payload checksum does not match the audited original; refusing to write.')

# Normalize the transport into one conventional base64 stream so the original
# integrator can remain unchanged.
with open(PAYLOAD, 'wb') as f:
    f.write(base64.b64encode(blob) + b'\n')
print('Transport normalized; exact audited payload recovered.')

subprocess.run([sys.executable, INTEGRATOR], check=True)
