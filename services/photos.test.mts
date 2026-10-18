/// <reference types="node" />
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// expo-file-system over a temp dir laid out like the app's container: Documents and Library side by side
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lifttext-photos-'));
const join = (parts: any[]) => path.join(...parts.map((p) => (typeof p === 'string' ? p : p.uri)));
class FakeFile {
  uri: string;
  constructor(...parts: any[]) { this.uri = join(parts); }
  get name() { return path.basename(this.uri); }
  get extension() { return path.extname(this.uri); }
  get exists() { return fs.existsSync(this.uri); }
  delete() { fs.rmSync(this.uri); }
  async move(dest: FakeFile) { fs.renameSync(this.uri, dest.uri); this.uri = dest.uri; }
}
class FakeDirectory {
  uri: string;
  constructor(...parts: any[]) { this.uri = join(parts); }
  get exists() { return fs.existsSync(this.uri); }
  get parentDirectory() { return new FakeDirectory(path.dirname(this.uri)); }
  create(options?: { intermediates?: boolean }) { fs.mkdirSync(this.uri, { recursive: !!options?.intermediates }); }
  delete() { fs.rmSync(this.uri, { recursive: true }); }
  list() {
    return fs.readdirSync(this.uri).map((n) => {
      const p = path.join(this.uri, n);
      return fs.statSync(p).isDirectory() ? new FakeDirectory(p) : new FakeFile(p);
    });
  }
}
const documents = new FakeDirectory(root, 'Documents');
const cache = new FakeDirectory(root, 'Library', 'Caches', 'ImagePicker');
mock.module('expo-file-system', { namedExports: { File: FakeFile, Directory: FakeDirectory, Paths: { document: documents } } });

// The local native module: records what it protected; can be made to fail for one name
const protectedUris: string[] = [];
let protectFails: string | null = null;
mock.module('expo', {
  namedExports: {
    requireOptionalNativeModule: (name: string) =>
      name === 'PhotoPrivacy'
        ? { protect: (uri: string) => { if (protectFails && uri.includes(protectFails)) throw new Error('protection failed'); protectedUris.push(uri); } }
        : null,
  },
});

let cameraGranted = true;
let cameraOpened = 0;
let pickerOptions: any;
let nextPick: any = { canceled: true, assets: null };
mock.module('expo-image-picker', {
  namedExports: {
    requestCameraPermissionsAsync: async () => ({ granted: cameraGranted }),
    launchCameraAsync: async (options: any) => { cameraOpened++; pickerOptions = options; return nextPick; },
    launchImageLibraryAsync: async (options: any) => { pickerOptions = options; return nextPick; },
  },
});

let enrolledLevel = 3;
let authResult: any = { success: true };
let authOptions: any;
mock.module('expo-local-authentication', {
  namedExports: {
    SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
    getEnrolledLevelAsync: async () => enrolledLevel,
    authenticateAsync: async (options: any) => { authOptions = options; return authResult; },
  },
});

const photos = await import('./photos');
const folder = path.join(root, 'Library', 'Application Support', 'ProgressPhotos');

// A photo the picker just wrote to its cache
function picked(name = 'IMG_1.jpg') {
  fs.mkdirSync(cache.uri, { recursive: true });
  const p = path.join(cache.uri, name);
  fs.writeFileSync(p, 'jpeg bytes');
  return p;
}

beforeEach(() => {
  fs.rmSync(path.join(root, 'Library'), { recursive: true, force: true });
  fs.mkdirSync(documents.uri, { recursive: true });
  protectedUris.length = 0;
  protectFails = null;
});

test('a photo moves from the picker cache into Library/Application Support/ProgressPhotos, protected, never into Documents', async () => {
  const temp = picked();
  const photo = await photos.addPhoto(temp, '2026-10-18', 'front');
  assert.equal(path.dirname(photo.uri), folder);
  assert.match(photo.name, /^2026-10-18_front_[a-z0-9]+\.jpg$/);
  assert.equal(fs.readFileSync(photo.uri, 'utf8'), 'jpeg bytes');
  assert.ok(!fs.existsSync(temp), 'no copy is left in the picker cache');
  assert.deepEqual(fs.readdirSync(documents.uri), [], 'nothing in Documents, which the Files app and backups see');
  // The folder and the photo are both left out of backups and locked with the phone
  assert.deepEqual(protectedUris, [folder, photo.uri]);
  assert.deepEqual(photos.listPhotos(), [{ name: photo.name, date: '2026-10-18', pose: 'front', uri: photo.uri }]);
});

test('a photo that cannot be protected is not kept anywhere', async () => {
  const temp = picked();
  protectFails = '2026-10-18_side_';
  await assert.rejects(photos.addPhoto(temp, '2026-10-18', 'side'), /protection failed/);
  assert.ok(!fs.existsSync(temp));
  assert.deepEqual(fs.readdirSync(folder), []);

  // Nor when the folder itself can't be protected
  const again = picked();
  protectFails = 'ProgressPhotos';
  await assert.rejects(photos.addPhoto(again, '2026-10-18', 'side'), /protection failed/);
  assert.ok(!fs.existsSync(again));
  assert.deepEqual(fs.readdirSync(folder), []);
});

test('the folder is the list: names carry date and pose, newest first, grouped by month', async () => {
  assert.deepEqual(photos.listPhotos(), [], 'no folder yet');
  await photos.addPhoto(picked('a.jpg'), '2026-09-30', 'back');
  await photos.addPhoto(picked('b.png'), '2026-10-01', 'front');
  await photos.addPhoto(picked('c.heic'), '2026-10-12', 'side');
  fs.writeFileSync(path.join(folder, 'notes.txt'), 'not a photo');
  fs.mkdirSync(path.join(folder, 'tmp'));
  const list = photos.listPhotos();
  assert.deepEqual(list.map((p) => [p.date, p.pose]), [['2026-10-12', 'side'], ['2026-10-01', 'front'], ['2026-09-30', 'back']]);
  assert.deepEqual(photos.byMonth(list).map((m) => [m.month, m.photos.length]), [['October 2026', 2], ['September 2026', 1]]);
  assert.deepEqual(photos.photoSummary(), { count: 3, last: '2026-10-12' });
  assert.deepEqual(photos.parsePhotoName(photos.photoName('2026-01-02', 'back', 'JPG', 'abc')), { name: '2026-01-02_back_abc.jpg', date: '2026-01-02', pose: 'back' });
  assert.equal(photos.parsePhotoName('IMG_0001.jpg'), null);
});

test('delete one photo, then all of them', async () => {
  const a = await photos.addPhoto(picked('a.jpg'), '2026-10-01', 'front');
  await photos.addPhoto(picked('b.jpg'), '2026-10-02', 'front');
  photos.deletePhoto(a);
  assert.deepEqual(photos.listPhotos().map((p) => p.date), ['2026-10-02']);
  photos.deleteAllPhotos();
  assert.ok(!fs.existsSync(folder));
  assert.deepEqual(photos.photoSummary(), { count: 0, last: undefined });
});

test('the camera opens only with permission and asks for images; the picker keeps the photo date', async () => {
  cameraGranted = false;
  assert.equal(await photos.takePhoto(), 'denied');
  assert.equal(cameraOpened, 0);

  cameraGranted = true;
  nextPick = { canceled: true, assets: null };
  assert.equal(await photos.takePhoto(), null);
  nextPick = { canceled: false, assets: [{ uri: 'file:///cache/x.jpg' }] };
  assert.deepEqual(await photos.takePhoto(), { uri: 'file:///cache/x.jpg' });
  assert.deepEqual(pickerOptions.mediaTypes, ['images']);

  nextPick = { canceled: false, assets: [{ uri: 'file:///cache/y.jpg', exif: { DateTimeOriginal: '2026:03:04 07:08:09' } }] };
  assert.deepEqual(await photos.choosePhoto(), { uri: 'file:///cache/y.jpg', date: '2026-03-04' });
  nextPick = { canceled: false, assets: [{ uri: 'file:///cache/z.jpg', exif: null }] };
  assert.deepEqual(await photos.choosePhoto(), { uri: 'file:///cache/z.jpg', date: undefined });
});

test('Face ID unlocks with the passcode as a fallback; without a passcode the photos stay locked', async () => {
  enrolledLevel = 3;
  authResult = { success: true };
  assert.equal(await photos.unlockPhotos(), 'unlocked');
  assert.equal(authOptions.disableDeviceFallback, false);
  authResult = { success: false, error: 'user_cancel' };
  assert.equal(await photos.unlockPhotos(), 'failed');
  authResult = { success: false, error: 'passcode_not_set' };
  assert.equal(await photos.unlockPhotos(), 'no-passcode');
  enrolledLevel = 0;
  authOptions = undefined;
  assert.equal(await photos.unlockPhotos(), 'no-passcode');
  assert.equal(authOptions, undefined, 'never asks without a passcode to fall back on');
});

// Source scan: photo files are touched in one module, and nothing near them can reach the network, the AI,
// backups or sharing. A failure here means a change could leak photos; fix the change, not the test.
const repo = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(repo, file), 'utf8');
const importsOf = (src: string) =>
  [...src.matchAll(/(?:from\s*|import\s*\(\s*|require\(\s*|import\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]);
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(path.join(repo, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'ios' ? [] : sourceFiles(rel);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.fixtures\./.test(e.name) ? [rel] : [];
  });
const NETWORK = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|\.upload\s*\(|createUploadTask|downloadFileAsync|navigator\.sendBeacon/;
const AI_BACKUP_SHARING = /services\/(claude|ask|coach\w*|backup)|\/(claude|ask|coach\w*|backup)$|^\.\/(claude|ask|coach\w*|backup)$|expo-sharing|expo-media-library|async-storage|chatStore|^https?:|^node:/;

test('services/photos.ts imports only the file system, the picker, Face ID, date formatting and the privacy module', () => {
  const src = read('services/photos.ts');
  assert.deepEqual(new Set(importsOf(src)), new Set(['date-fns', 'expo-file-system', 'expo-image-picker', 'expo-local-authentication', '../modules/photo-privacy']));
  assert.doesNotMatch(src, NETWORK);
});

test('only the Photos screen and the locked Progress card import photo code, and neither imports network, AI, backup or sharing code', () => {
  const importers = ['app', 'components', 'services', 'hooks', 'stores', 'contexts', 'modules']
    .flatMap(sourceFiles)
    .filter((f) => importsOf(read(f)).some((i) => /(^|\/)photos$|photo-privacy/.test(i)));
  assert.deepEqual(importers.sort(), ['app/photos.tsx', 'components/PhotosCard.tsx', 'services/photos.ts']);
  for (const screen of ['app/photos.tsx', 'components/PhotosCard.tsx']) {
    const src = read(screen);
    for (const i of importsOf(src)) assert.doesNotMatch(i, AI_BACKUP_SHARING, `${screen} imports ${i}`);
    assert.doesNotMatch(src, NETWORK, screen);
    assert.doesNotMatch(src, /updateSettings|setState\s*\(|Share\b|Clipboard/, `${screen} must not store or share anything`);
  }
});

test('no media-library package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(!('expo-media-library' in { ...pkg.dependencies, ...pkg.devDependencies }));
});
