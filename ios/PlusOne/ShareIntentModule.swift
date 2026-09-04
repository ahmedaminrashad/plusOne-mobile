import Foundation
import React
import UIKit

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

  @objc
  func shareText(
    _ message: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard UIApplication.shared.applicationState == .active else {
        resolve(false)
        return
      }
      guard let presenter = Self.topViewController() else {
        resolve(false)
        return
      }
      let sheet = UIActivityViewController(activityItems: [message], applicationActivities: nil)
      sheet.completionWithItemsHandler = { _, _, _, _ in
        resolve(true)
      }
      if let popover = sheet.popoverPresentationController {
        popover.sourceView = presenter.view
        popover.sourceRect = CGRect(
          x: presenter.view.bounds.midX,
          y: presenter.view.bounds.midY,
          width: 1,
          height: 1
        )
        popover.permittedArrowDirections = []
      }
      presenter.present(sheet, animated: true)
    }
  }

  @objc
  func openExternal(
    _ urlString: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard UIApplication.shared.applicationState == .active,
            let url = URL(string: urlString)
      else {
        resolve(false)
        return
      }
      UIApplication.shared.open(url, options: [:]) { success in
        resolve(success)
      }
    }
  }

  private static func topViewController() -> UIViewController? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    let window = windows.first(where: { $0.isKeyWindow })
      ?? windows.first
      ?? UIApplication.shared.delegate.flatMap { ($0 as? AppDelegate)?.window }
    var top = window?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}
