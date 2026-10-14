import AsyncStorage from '@react-native-async-storage/async-storage';

// Apple App Attest: proves to the Worker that a request comes from a genuine copy of this app on a real
// iPhone. Once per install the app makes a key in the Secure Enclave, has Apple attest it and registers it
// with the Worker; then it signs each AI request with that key. The Worker's APP_ATTEST_MODE decides what
// happens to requests that carry no valid signature (see README).

const KEY_ID_STORAGE_KEY = '@training-tracker/app-attest-key-id';

type AppIntegrity = typeof import('@expo/app-integrity');

// The native module, or null where App Attest cannot run (simulator, Expo Go, Android)
let integrity: Promise<AppIntegrity | null> | undefined;
const native = () => (integrity ??= import('@expo/app-integrity').then((m) => (m.isSupported ? m : null)).catch(() => null));

let keyId: Promise<string> | undefined;

const post = (url: string, path: string, password: string, body?: string) =>
  fetch(`${url.replace(/\/$/, '')}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-password': password }, body });

async function challenge(url: string, password: string): Promise<string> {
  const res = await post(url, '/attest/challenge', password);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.challenge !== 'string') throw new Error(data.error ?? `No App Attest challenge (${res.status})`);
  return data.challenge;
}

// The saved key id, or a new key attested by Apple and registered with the Worker
async function registerKey(url: string, password: string, mod: AppIntegrity): Promise<string> {
  const saved = await AsyncStorage.getItem(KEY_ID_STORAGE_KEY);
  if (saved) return saved;
  const c = await challenge(url, password);
  const id = await mod.generateKeyAsync();
  const attestation = await mod.attestKeyAsync(id, c);
  const res = await post(url, '/attest/register', password, JSON.stringify({ keyId: id, challenge: c, attestation }));
  if (!res.ok) throw new Error(`App Attest registration refused (${res.status})`);
  await AsyncStorage.setItem(KEY_ID_STORAGE_KEY, id);
  return id;
}

// Headers for an AI request with this exact body: the body signed with the attested key over a fresh
// challenge. Empty when App Attest cannot run or fails, and the request goes out unsigned.
export async function attestHeaders(url: string, password: string, body: string): Promise<Record<string, string>> {
  const mod = await native();
  if (!mod) return {};
  try {
    const id = await (keyId ??= registerKey(url, password, mod));
    const c = await challenge(url, password);
    return { 'x-attest-key-id': id, 'x-attest-challenge': c, 'x-attest-assertion': await mod.generateAssertionAsync(id, `${c}\n${body}`) };
  } catch (err) {
    console.warn('App Attest skipped', err);
    keyId = undefined; // next request reads the saved id again, or registers afresh if none was saved
    return {};
  }
}

// The Worker refused this key (403): drop it, so the next request attests a new one
export async function forgetKey(): Promise<void> {
  keyId = undefined;
  await AsyncStorage.removeItem(KEY_ID_STORAGE_KEY).catch(() => {});
}
