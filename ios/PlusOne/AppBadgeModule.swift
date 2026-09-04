import Foundation
import React
import UIKit
import UserNotifications

@objc(AppBadgeModule)
class AppBadgeModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func clear(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      // Updating the SpringBoard badge while the app switcher is animating
      // deadlocks SpringBoard (black spinner, then the phone locks).
      guard UIApplication.shared.applicationState == .active else {
        resolve(true)
        return
      }
      UIApplication.shared.applicationIconBadgeNumber = 0
      if #available(iOS 16.0, *) {
        UNUserNotificationCenter.current().setBadgeCount(0) { _ in
          resolve(true)
        }
      } else {
        resolve(true)
      }
    }
  }
}
