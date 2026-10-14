// Apple App Attest verification, following
// https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
// Uses only WebCrypto (Workers and Node), so it carries its own tiny CBOR and DER readers.

// https://www.apple.com/certificateauthority/Apple_App_Attestation_Root_CA.pem
export const APPLE_ROOT_PEM = `-----BEGIN CERTIFICATE-----
MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYw
JAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwK
QXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNa
Fw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlv
biBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9y
bmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdh
NbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9au
Yen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/
MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYw
CgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn
53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijV
oyFraWVIyd/dganmrduC1bmTBGwD
-----END CERTIFICATE-----`;

const NONCE_OID = '1.2.840.113635.100.8.2';
const CURVES: Record<string, string> = { '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384', '1.3.132.0.35': 'P-521' };
const HASHES: Record<string, string> = { '1.2.840.10045.4.3.2': 'SHA-256', '1.2.840.10045.4.3.3': 'SHA-384', '1.2.840.10045.4.3.4': 'SHA-512' };
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const utf8 = (s: string) => new TextEncoder().encode(s);
export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const sha256 = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', b));
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function fail(why: string): never {
  throw new Error(why);
}

// --- CBOR: the subset Apple emits (maps with text keys, text, byte strings, arrays, small unsigned ints)
function cbor(bytes: Uint8Array): unknown {
  let at = 0;
  const read = (): unknown => {
    const b = bytes[at++];
    const major = b >> 5;
    let n = b & 0x1f;
    if (n === 24) n = bytes[at++];
    else if (n === 25) { n = (bytes[at] << 8) | bytes[at + 1]; at += 2; }
    else if (n === 26) { n = ((bytes[at] << 24) >>> 0) + ((bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]); at += 4; }
    else if (n > 24) fail('cbor: unsupported length');
    if (major === 0) return n;
    if (major === 2 || major === 3) {
      const v = bytes.subarray(at, at + n);
      if (v.length !== n) fail('cbor: truncated');
      at += n;
      return major === 2 ? v : new TextDecoder().decode(v);
    }
    if (major === 4) return Array.from({ length: n }, read);
    if (major === 5) {
      const m: Record<string, unknown> = {};
      for (let i = 0; i < n; i++) { const k = read(); m[String(k)] = read(); }
      return m;
    }
    return fail('cbor: unsupported type');
  };
  const v = read();
  if (at !== bytes.length) fail('cbor: trailing bytes');
  return v;
}

// --- DER
interface Tlv { tag: number; value: Uint8Array; raw: Uint8Array }
function tlv(bytes: Uint8Array, at = 0): Tlv & { next: number } {
  const tag = bytes[at];
  let len = bytes[at + 1];
  let p = at + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n > 4) fail('der: length too long');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + bytes[p++];
  }
  const next = p + len;
  if (next > bytes.length) fail('der: truncated');
  return { tag, value: bytes.subarray(p, next), raw: bytes.subarray(at, next), next };
}
function children(t: Tlv): Tlv[] {
  const out: Tlv[] = [];
  for (let at = 0; at < t.value.length;) { const c = tlv(t.value, at); out.push(c); at = c.next; }
  return out;
}
function oid(t: Tlv): string {
  const b = t.value;
  const parts = [Math.floor(b[0] / 40), b[0] % 40];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (!(b[i] & 0x80)) { parts.push(v); v = 0; }
  }
  return parts.join('.');
}
function time(t: Tlv): Date {
  const s = new TextDecoder().decode(t.value);
  const full = t.tag === 0x17 ? (Number(s.slice(0, 2)) < 50 ? '20' : '19') + s : s; // UTCTime vs GeneralizedTime
  return new Date(`${full.slice(0, 4)}-${full.slice(4, 6)}-${full.slice(6, 8)}T${full.slice(8, 10)}:${full.slice(10, 12)}:${full.slice(12, 14)}Z`);
}
// ECDSA signature: DER SEQUENCE of two INTEGERs -> fixed-width r||s for WebCrypto
function rawSignature(der: Uint8Array, size: number) {
  const [r, s] = children(tlv(der)).map((i) => i.value);
  const out = new Uint8Array(size * 2);
  const put = (v: Uint8Array, at: number) => { const t = v.subarray(Math.max(0, v.length - size)); out.set(t, at + size - t.length); };
  put(r, 0);
  put(s, size);
  return out;
}

// --- X.509 (just what chain checking needs)
interface Cert { tbs: Uint8Array; sigHash: string; sig: Uint8Array; spki: Uint8Array; curve: string; notBefore: Date; notAfter: Date; extensions: Map<string, Uint8Array> }
export function parseCert(der: Uint8Array): Cert {
  const [tbsT, sigAlg, sigBits] = children(tlv(der));
  const fields = children(tbsT);
  if (fields[0].tag === 0xa0) fields.shift(); // version
  const [, , , validity, , spki] = fields;
  const [notBefore, notAfter] = children(validity).map(time);
  const curve = CURVES[oid(children(children(spki)[0])[1])] ?? fail('cert: unsupported curve');
  const extensions = new Map<string, Uint8Array>();
  const extT = fields.find((f) => f.tag === 0xa3);
  if (extT) for (const e of children(children(extT)[0])) { const c = children(e); extensions.set(oid(c[0]), c[c.length - 1].value); }
  return { tbs: tbsT.raw, sigHash: HASHES[oid(children(sigAlg)[0])] ?? fail('cert: unsupported signature'), sig: sigBits.value.subarray(1), spki: spki.raw, curve, notBefore, notAfter, extensions };
}
const pemToDer = (pem: string) => fromB64(pem.replace(/-----[^-]+-----|\s/g, ''));
const importKey = (c: Cert) => crypto.subtle.importKey('spki', c.spki, { name: 'ECDSA', namedCurve: c.curve }, false, ['verify']);
async function signedBy(cert: Cert, issuer: Cert, now: Date) {
  if (now < cert.notBefore || now > cert.notAfter) fail('cert: expired or not yet valid');
  const size = issuer.curve === 'P-256' ? 32 : issuer.curve === 'P-384' ? 48 : 66;
  if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: cert.sigHash }, await importKey(issuer), rawSignature(cert.sig, size), cert.tbs))) fail('cert: bad signature');
}

// --- WebAuthn-style authenticator data Apple puts in attestations and assertions
function authData(b: Uint8Array) {
  if (b.length < 37) fail('authData: too short');
  const counter = ((b[33] << 24) >>> 0) + ((b[34] << 16) | (b[35] << 8) | b[36]);
  let credentialId: Uint8Array | undefined;
  let aaguid: string | undefined;
  if (b.length > 37) {
    aaguid = new TextDecoder().decode(b.subarray(37, 53)).replace(/\0+$/, '');
    const idLen = (b[53] << 8) | b[54];
    credentialId = b.subarray(55, 55 + idLen);
  }
  return { rpIdHash: b.subarray(0, 32), counter, aaguid, credentialId };
}

export interface AttestedKey { publicKey: string; environment: 'production' | 'development' }

// Checks the attestation the app got for a new key. appId is "<Team ID>.<bundle id>"; challenge is the
// string we issued and the app hashed into the attestation. Returns the key to store.
export async function verifyAttestation(attestationB64: string, keyIdB64: string, challenge: string, appId: string, now = new Date(), rootPem = APPLE_ROOT_PEM): Promise<AttestedKey> {
  const obj = cbor(fromB64(attestationB64)) as { fmt?: unknown; attStmt?: { x5c?: unknown }; authData?: unknown };
  if (obj?.fmt !== 'apple-appattest' || !Array.isArray(obj.attStmt?.x5c) || obj.attStmt.x5c.length < 2 || !(obj.authData instanceof Uint8Array)) fail('attestation: malformed');
  const [leaf, intermediate] = (obj.attStmt.x5c as Uint8Array[]).map(parseCert);
  await signedBy(intermediate, parseCert(pemToDer(rootPem)), now);
  await signedBy(leaf, intermediate, now);

  const clientDataHash = await sha256(utf8(challenge));
  const nonce = await sha256(concat(obj.authData, clientDataHash));
  const ext = leaf.extensions.get(NONCE_OID) ?? fail('attestation: no nonce');
  if (!equal(children(children(tlv(ext))[0])[0].value, nonce)) fail('attestation: nonce mismatch');

  const point = children(tlv(leaf.spki))[1].value.subarray(1); // BIT STRING -> 04||X||Y
  const keyId = fromB64(keyIdB64);
  if (!equal(await sha256(point), keyId)) fail('attestation: key id mismatch');
  const { rpIdHash, counter, aaguid, credentialId } = authData(obj.authData);
  if (!equal(rpIdHash, await sha256(utf8(appId)))) fail('attestation: wrong app');
  if (counter !== 0) fail('attestation: counter not zero');
  if (aaguid !== 'appattest' && aaguid !== 'appattestdevelop') fail('attestation: unknown environment');
  if (!credentialId || !equal(credentialId, keyId)) fail('attestation: credential id mismatch');
  return { publicKey: toB64(leaf.spki), environment: aaguid === 'appattest' ? 'production' : 'development' };
}

// Checks an assertion over clientData (what the app signed) with a stored key; returns the new counter.
export async function verifyAssertion(assertionB64: string, clientData: string, publicKeyB64: string, appId: string, lastCounter: number): Promise<number> {
  const obj = cbor(fromB64(assertionB64)) as { signature?: unknown; authenticatorData?: unknown };
  if (!(obj?.signature instanceof Uint8Array) || !(obj.authenticatorData instanceof Uint8Array)) fail('assertion: malformed');
  const nonce = await sha256(concat(obj.authenticatorData, await sha256(utf8(clientData))));
  const key = await crypto.subtle.importKey('spki', fromB64(publicKeyB64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, rawSignature(obj.signature, 32), nonce))) fail('assertion: bad signature');
  const { rpIdHash, counter } = authData(obj.authenticatorData);
  if (!equal(rpIdHash, await sha256(utf8(appId)))) fail('assertion: wrong app');
  if (!(counter > lastCounter)) fail('assertion: counter not increased');
  return counter;
}

// --- Challenges: "<expiry ms>.<hmac>", so the Worker needs no storage to recognise its own.
// ponytail: a challenge can be reused until it expires (5 min); the assertion counter is what stops
// replays. Store challenges in KV (one write each) if one-time use ever matters.
const hmacKey = (secret: string) => crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const mac = async (secret: string, data: string) => toB64(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), utf8(data))));

export async function issueChallenge(secret: string, now = new Date()): Promise<string> {
  const exp = String(now.getTime() + CHALLENGE_TTL_MS);
  return `${exp}.${await mac(secret, exp)}`;
}

export async function checkChallenge(secret: string, challenge: string, now = new Date()): Promise<void> {
  const [exp, sig] = challenge.split('.');
  if (!(Number(exp) > now.getTime())) fail('challenge: expired');
  if (sig !== (await mac(secret, exp))) fail('challenge: bad signature');
}
