import { format, parseISO } from 'date-fns';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import PhotoPrivacy from '../modules/photo-privacy';

// Progress photos, and the only module that touches photo files: services/photos.test.mts fails the build if
// it, or the screens allowed to import it, import network, AI, backup or sharing code. Photos live in
// Library/Application Support/ProgressPhotos, not Documents (which the Files app shows and backups use),
// and each is left out of every backup and locked while the iPhone is locked (modules/photo-privacy). The
// folder is the list: a photo's date and pose are in its file name, so nothing about photos ever goes into
// the store that backups and the AI read.

export type Pose = 'front' | 'side' | 'back' | 'other';
export const POSES: { value: Pose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
];
export const poseLabel = (pose: Pose) => POSES.find(p => p.value === pose)?.label ?? 'Photo';

export interface Photo {
  uri: string;
  name: string;
  date: string; // yyyy-MM-dd
  pose: Pose;
}

export const photoDir = () => new Directory(Paths.document.parentDirectory, 'Library', 'Application Support', 'ProgressPhotos');

const NAME = /^(\d{4}-\d{2}-\d{2})_(front|side|back|other)_[a-z0-9]+\.[a-z0-9]+$/i;
export const photoName = (date: string, pose: Pose, extension: string, id = Date.now().toString(36)) =>
  `${date}_${pose}_${id}${extension.startsWith('.') ? extension : `.${extension}`}`.toLowerCase();
export function parsePhotoName(name: string): Omit<Photo, 'uri'> | null {
  const m = NAME.exec(name);
  return m ? { name, date: m[1], pose: m[2].toLowerCase() as Pose } : null;
}

// Newest first; anything in the folder that isn't a photo is ignored
export function listPhotos(): Photo[] {
  const dir = photoDir();
  if (!dir.exists) return [];
  return dir
    .list()
    .flatMap(f => {
      const parsed = f instanceof File ? parsePhotoName(f.name) : null;
      return parsed ? [{ ...parsed, uri: f.uri }] : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.name.localeCompare(a.name));
}

// The timeline: one group per month, newest first ("October 2026")
export function byMonth(photos: Photo[]): { month: string; photos: Photo[] }[] {
  const groups: { month: string; photos: Photo[] }[] = [];
  for (const photo of photos) {
    const month = format(parseISO(photo.date), 'MMMM yyyy');
    if (groups.at(-1)?.month === month) groups.at(-1)!.photos.push(photo);
    else groups.push({ month, photos: [photo] });
  }
  return groups;
}

// All the Progress tab's locked card shows: how many and the latest date
export function photoSummary(): { count: number; last?: string } {
  const photos = listPhotos();
  return { count: photos.length, last: photos[0]?.date };
}

// Moves a picked photo out of the picker's cache into the private folder, so no copy is left behind. If the
// folder or the photo can't be protected, nothing is kept and it throws.
export async function addPhoto(pickedUri: string, date: string, pose: Pose): Promise<Photo> {
  const picked = new File(pickedUri);
  if (!PhotoPrivacy) {
    if (picked.exists) picked.delete();
    throw new Error('Progress photos need the App Store or TestFlight version of LiftText.');
  }
  const dir = photoDir();
  const dest = new File(dir, photoName(date, pose, picked.extension || '.jpg'));
  try {
    if (!dir.exists) dir.create({ intermediates: true });
    PhotoPrivacy.protect(dir.uri);
    await picked.move(dest);
    PhotoPrivacy.protect(dest.uri);
  } catch (error) {
    if (picked.exists) picked.delete();
    if (dest.exists) dest.delete();
    throw error;
  }
  return { uri: dest.uri, name: dest.name, date, pose };
}

export function deletePhoto(photo: Photo) {
  const file = new File(photoDir(), photo.name);
  if (file.exists) file.delete();
}

export function deleteAllPhotos() {
  const dir = photoDir();
  if (dir.exists) dir.delete();
}

// "2026:10:01 08:12:33" (EXIF's DateTimeOriginal) → "2026-10-01"
export function exifDate(exif: Record<string, unknown> | null | undefined): string | undefined {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(String(exif?.DateTimeOriginal ?? exif?.DateTimeDigitized ?? ''));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

// A photo from the camera or the picker, still in the picker's cache; `date` when the photo has one
export interface Picked {
  uri: string;
  date?: string;
}

// The camera: the photo is never saved to the camera roll (no media-library code exists in the app)
export async function takePhoto(): Promise<Picked | 'denied' | null> {
  if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) return 'denied';
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  return result.canceled ? null : { uri: result.assets[0].uri };
}

// The iPhone's photo picker, which needs no photo library permission: LiftText only gets the photo you pick,
// as a copy, and the original stays in Photos. Its date comes from the photo when it has one.
export async function choosePhoto(): Promise<Picked | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, exif: true });
  return result.canceled ? null : { uri: result.assets[0].uri, date: exifDate(result.assets[0].exif) };
}

// Face ID, falling back to the iPhone passcode. Without a passcode the photos stay locked.
export async function unlockPhotos(): Promise<'unlocked' | 'no-passcode' | 'failed'> {
  if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) return 'no-passcode';
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock your progress photos', disableDeviceFallback: false });
  if (result.success) return 'unlocked';
  return result.error === 'passcode_not_set' ? 'no-passcode' : 'failed';
}
