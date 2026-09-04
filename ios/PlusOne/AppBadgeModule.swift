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
      UIApplication.shared.applicationIconBadgeNumber = 0
      // iOS 16+ is the API that actually updates the SpringBoard badge.
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
