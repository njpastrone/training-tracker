import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkChallenge, issueChallenge, toB64, fromB64, verifyAssertion, verifyAttestation } from './attest.ts';
import { SAMPLE } from './attest.fixtures.ts';

const { appId, keyId, clientData, now, publicKey, attestation, assertion } = SAMPLE;
const rejects = (p: Promise<unknown>, why: RegExp) => assert.rejects(p, { message: why });

test('accepts a recorded attestation and returns its key', async () => {
  assert.deepEqual(await verifyAttestation(attestation, keyId, clientData, appId, now), publicKey);
});

test('rejects an attestation for another challenge, app or key id', async () => {
  await rejects(verifyAttestation(attestation, keyId, 'other challenge', appId, now), /nonce mismatch/);
  await rejects(verifyAttestation(attestation, keyId, clientData, '6MURL8TA57.com.other.app', now), /wrong app/);
  await rejects(verifyAttestation(attestation, toB64(new Uint8Array(32)), clientData, appId, now), /key id mismatch/);
});

test('rejects an attestation whose certificates are expired, tampered or not from Apple', async () => {
  await rejects(verifyAttestation(attestation, keyId, clientData, appId, new Date('2026-10-13T00:00:00Z')), /expired/);
  const bytes = fromB64(attestation);
  bytes[200] ^= 1; // inside the leaf certificate's tbs
  await rejects(verifyAttestation(toB64(bytes), keyId, clientData, appId, now), /bad signature/);
  const otherRoot = `-----BEGIN CERTIFICATE-----\n${SAMPLE.leafCert}\n-----END CERTIFICATE-----`;
  await rejects(verifyAttestation(attestation, keyId, clientData, appId, now, otherRoot), /bad signature/);
  await rejects(verifyAttestation(toB64(new Uint8Array([0xa0])), keyId, clientData, appId, now), /malformed/);
});

test('accepts a recorded assertion once and rejects replays, other data and other keys', async () => {
  assert.equal(await verifyAssertion(assertion, clientData, publicKey, appId, 0), 1);
  await rejects(verifyAssertion(assertion, clientData, publicKey, appId, 1), /counter not increased/);
  await rejects(verifyAssertion(assertion, clientData + ' ', publicKey, appId, 0), /bad signature/);
  await rejects(verifyAssertion(assertion, clientData, publicKey, '6MURL8TA57.com.other.app', 0), /wrong app/);
  const otherKey = ((await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair).publicKey;
  await rejects(verifyAssertion(assertion, clientData, toB64(new Uint8Array((await crypto.subtle.exportKey('spki', otherKey)) as ArrayBuffer)), appId, 0), /bad signature/);
  await rejects(verifyAssertion(toB64(new Uint8Array([0xa0])), clientData, publicKey, appId, 0), /malformed/);
});

test('challenges are recognised only unexpired and with the right secret', async () => {
  const t0 = new Date('2026-10-13T12:00:00Z');
  const c = await issueChallenge('secret', t0);
  await checkChallenge('secret', c, new Date(t0.getTime() + 4 * 60_000));
  await rejects(checkChallenge('secret', c, new Date(t0.getTime() + 6 * 60_000)), /expired/);
  await rejects(checkChallenge('other', c, t0), /bad signature/);
  await rejects(checkChallenge('secret', `${t0.getTime() + 60_000}.forged`, t0), /bad signature/);
  await rejects(checkChallenge('secret', 'nonsense', t0), /expired/);
});
