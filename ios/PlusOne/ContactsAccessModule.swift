import Contacts
import ContactsUI
import React
import SwiftUI
import UIKit

// iOS 18 "Select Contacts" (limited access) never re-prompts via
// requestAccess. This module:
//  - reports the real CNAuthorizationStatus (full / limited / none)
//  - requests access so the system Full Access sheet can appear
//  - presents Apple's contactAccessPicker so the user can add more people
@objc(ContactsAccessModule)
class ContactsAccessModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func authorizationStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      resolve(Self.statusString(CNContactStore.authorizationStatus(for: .contacts)))
    }
  }

  @objc
  func requestAccess(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let current = CNContactStore.authorizationStatus(for: .contacts)
      if current == .authorized {
        resolve("authorized")
        return
      }
      CNContactStore().requestAccess(for: .contacts) { _, _ in
        let next = CNContactStore.authorizationStatus(for: .contacts)
        resolve(Self.statusString(next))
      }
    }
  }

  @objc
  func presentLimitedAccessPicker(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if #available(iOS 18.0, *) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        guard status == .limited else {
          resolve(NSNull())
          return
        }
        guard let presenter = Self.topViewController() else {
          reject("NO_VIEW", "No view controller to present from", nil)
          return
        }

        let box = HostBox()
        var settled = false
        let finish: ([String]) -> Void = { ids in
          guard !settled else { return }
          settled = true
          if let controller = box.controller, controller.presentingViewController != nil {
            controller.dismiss(animated: false) { resolve(ids) }
          } else {
            resolve(ids)
          }
        }

        let host = UIHostingController(rootView: LimitedContactsPickerHost(onComplete: finish))
        host.view.backgroundColor = .clear
        host.modalPresentationStyle = .overFullScreen
        host.view.isOpaque = false
        box.controller = host
        presenter.present(host, animated: false)
      } else {
        reject("UNSUPPORTED", "Limited contacts picker requires iOS 18", nil)
      }
    }
  }

  private static func statusString(_ status: CNAuthorizationStatus) -> String {
    switch status {
    case .authorized:
      return "authorized"
    case .denied, .restricted:
      return "denied"
    case .notDetermined:
      return "undefined"
    default:
      if #available(iOS 18.0, *), status == .limited {
        return "limited"
      }
      return "undefined"
    }
  }

  private static func topViewController() -> UIViewController? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    let window = windows.first(where: { $0.isKeyWindow }) ?? windows.first
    var top = window?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

private final class HostBox {
  var controller: UIViewController?
}

@available(iOS 18.0, *)
private struct LimitedContactsPickerHost: View {
  let onComplete: ([String]) -> Void
  @State private var isPresented = true

  var body: some View {
    Color.clear
      .frame(width: 1, height: 1)
      .contactAccessPicker(isPresented: $isPresented) { identifiers in
        onComplete(identifiers)
      }
      .onChange(of: isPresented) { _, visible in
        if !visible {
          onComplete([])
        }
      }
  }
}
