import { requireOptionalNativeModule } from 'expo';

// ios/PhotoPrivacyModule.swift: leaves a file or folder out of every backup and locks it while the iPhone
// is locked. Null in Expo Go, so services/photos.ts never saves a photo it couldn't protect.
export default requireOptionalNativeModule<{ protect(uri: string): void }>('PhotoPrivacy');
