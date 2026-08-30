import FirebaseAuth
import React
import UIKit

/// Presents Firebase Phone Auth reCAPTCHA from the live React Native window.
/// RNFirebase passes `uiDelegate: nil`, which often fails to find a presenter
/// under RCTReactNativeFactory — then SMS never sends.
private final class PhoneAuthPresenter: NSObject, AuthUIDelegate {
  func present(_ viewControllerToPresent: UIViewController, animated flag: Bool, completion: (() -> Void)? = nil) {
    DispatchQueue.main.async {
      Self.topViewController()?.present(viewControllerToPresent, animated: flag, completion: completion)
    }
  }

  func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
    DispatchQueue.main.async {
      Self.topViewController()?.dismiss(animated: flag, completion: completion)
    }
  }

  static func topViewController() -> UIViewController? {
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

@objc(FirebasePhoneAuthModule)
class FirebasePhoneAuthModule: NSObject {
  private var presenter: PhoneAuthPresenter?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func verifyPhoneNumber(
    _ phone: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let presenter = PhoneAuthPresenter()
      self.presenter = presenter
      PhoneAuthProvider.provider().verifyPhoneNumber(phone, uiDelegate: presenter) { verificationID, error in
        self.presenter = nil
        if let error = error as NSError? {
          reject(Self.jsCode(error), error.localizedDescription, error)
          return
        }
        guard let verificationID, !verificationID.isEmpty else {
          reject("auth/missing-app-credential", "No verification ID from Firebase", nil)
          return
        }
        resolve(verificationID)
      }
    }
  }

  private static func jsCode(_ error: NSError) -> String {
    if let name = error.userInfo["FIRAuthErrorUserInfoNameKey"] as? String {
      let slug = name
        .replacingOccurrences(of: "ERROR_", with: "")
        .replacingOccurrences(of: "_", with: "-")
        .lowercased()
      return "auth/\(slug)"
    }
    return "auth/\(error.code)"
  }
}
