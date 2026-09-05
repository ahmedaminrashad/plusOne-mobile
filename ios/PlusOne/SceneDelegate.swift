import UIKit
import React
import FirebaseAuth
import os.log

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  /// Opaque cover on the existing scene window only. A second UIWindow or
  /// hiding this window during Recents is what locks the phone.
  private var recentsCover: UIView?
  private let log = OSLog(subsystem: "com.refaat.plusone", category: "lifecycle")

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory
    else { return }

    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    window.backgroundColor = UIColor(red: 244 / 255, green: 243 / 255, blue: 239 / 255, alpha: 1)

    factory.startReactNative(
      withModuleName: "PlusOne",
      in: window,
      launchOptions: launchOptions
    )

    self.window = window
    appDelegate.window = window

    for userActivity in connectionOptions.userActivities {
      if let url = userActivity.webpageURL, Auth.auth().canHandle(url) {
        continue
      }
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = Auth.auth().canHandle(context.url)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    if let url = userActivity.webpageURL {
      _ = Auth.auth().canHandle(url)
    }
  }

  func sceneWillResignActive(_ scene: UIScene) {
    os_log("sceneWillResignActive", log: log, type: .info)
    guard recentsCover == nil, let window else { return }
    window.endEditing(true)
    let cover = UIView(frame: window.bounds)
    cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    cover.isOpaque = true
    cover.isUserInteractionEnabled = false
    cover.backgroundColor = UIColor(red: 244 / 255, green: 243 / 255, blue: 239 / 255, alpha: 1)
    window.addSubview(cover)
    recentsCover = cover
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    os_log("sceneDidBecomeActive", log: log, type: .info)
    recentsCover?.removeFromSuperview()
    recentsCover = nil
  }
}
