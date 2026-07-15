import UIKit
import Social

// The system-provided "compose" share sheet: InstaPay hands us its share text
// (link + "Click the link to send money to..." message), the user taps Post,
// and we drop the raw text into the App Group container for the main app to
// read on next launch/foreground — see ShareIntentModule on the main app side.
class ShareViewController: SLComposeServiceViewController {

  private static let appGroupId = "group.org.reactjs.native.example.PlusOne"
  private static let sharedTextKey = "sharedInstaPayText"

  override func isContentValid() -> Bool {
    return true
  }

  override func didSelectPost() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let provider = item.attachments?.first,
          provider.hasItemConformingToTypeIdentifier("public.plain-text")
    else {
      saveAndComplete(contentText)
      return
    }

    provider.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { [weak self] data, _ in
      let text = (data as? String) ?? self?.contentText
      DispatchQueue.main.async {
        self?.saveAndComplete(text)
      }
    }
  }

  override func configurationItems() -> [Any]! {
    return []
  }

  private func saveAndComplete(_ text: String?) {
    if let text = text, !text.isEmpty {
      UserDefaults(suiteName: ShareViewController.appGroupId)?.set(text, forKey: ShareViewController.sharedTextKey)
    }
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}
