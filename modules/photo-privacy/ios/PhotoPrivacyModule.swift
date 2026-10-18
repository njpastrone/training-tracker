import ExpoModulesCore
import Foundation

// Keeps progress photos on this iPhone (services/photos.ts calls it on the photo folder and each photo):
// leaves the file or folder out of iCloud and computer backups, which expo-file-system can't do, and
// gives it complete file protection, so it can't be read while the iPhone is locked.
public class PhotoPrivacyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhotoPrivacy")

    Function("protect") { (url: URL) in
      var target = url
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try target.setResourceValues(values)
      try FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
    }
  }
}
