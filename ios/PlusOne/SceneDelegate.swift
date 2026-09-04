import UIKit
import React
import FirebaseAuth

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

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
}
