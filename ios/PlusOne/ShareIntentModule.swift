import Foundation
import React

// JS-facing counterpart to the Android ShareIntentModule: same one-shot
// "hand over whatever's pending, then clear it" contract. The value itself is
// written by PlusOneShareExtension (see ios/PlusOneShareExtension) into the
// App Group container shared between the extension and this app.
@objc(ShareIntentModule)
class ShareIntentModule: NSObject {

  static let appGroupId = "group.com.refaat.plusone"
  static let sharedTextKey = "sharedInstaPayText"
  static let sharedImageFileNameKey = "sharedReceiptImageFileName"

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func getInitialSharedText(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: ShareIntentModule.appGroupId)
    let text = defaults?.string(forKey: ShareIntentModule.sharedTextKey)
    defaults?.removeObject(forKey: ShareIntentModule.sharedTextKey)
    resolve(text)
  }

  @objc
  func getInitialSharedImage(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: ShareIntentModule.appGroupId)
    guard let fileName = defaults?.string(forKey: ShareIntentModule.sharedImageFileNameKey),
          let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: ShareIntentModule.appGroupId
          )
    else {
      resolve(nil)
      return
    }
    defaults?.removeObject(forKey: ShareIntentModule.sharedImageFileNameKey)
    resolve(containerURL.appendingPathComponent(fileName).absoluteString)
  }
}
