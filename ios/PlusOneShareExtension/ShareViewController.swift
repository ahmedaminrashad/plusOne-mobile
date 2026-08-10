import UIKit
import Social

// The system-provided "compose" share sheet: InstaPay hands us its share text
// (link + "Click the link to send money to..." message), the user taps Post,
// and we drop the raw text into the App Group container for the main app to
// read on next launch/foreground — see ShareIntentModule on the main app side.
class ShareViewController: SLComposeServiceViewController {

  private static let appGroupId = "group.com.refaat.plusone"
  private static let sharedTextKey = "sharedInstaPayText"
  private static let sharedImageFileNameKey = "sharedReceiptImageFileName"

  override func isContentValid() -> Bool {
    return true
  }

  override func didSelectPost() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let provider = item.attachments?.first
    else {
      saveTextAndComplete(contentText)
      return
    }

    // A shared receipt/payment screenshot (e.g. from InstaPay or Photos) — same
    // App Group hand-off as text, but written to a file since images don't fit UserDefaults.
    if provider.hasItemConformingToTypeIdentifier("public.image") {
      provider.loadItem(forTypeIdentifier: "public.image", options: nil) { [weak self] data, _ in
        DispatchQueue.main.async {
          self?.saveImageAndComplete(data)
        }
      }
      return
    }

    guard provider.hasItemConformingToTypeIdentifier("public.plain-text") else {
      saveTextAndComplete(contentText)
      return
    }

    provider.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { [weak self] data, _ in
      let text = (data as? String) ?? self?.contentText
      DispatchQueue.main.async {
        self?.saveTextAndComplete(text)
      }
    }
  }

  override func configurationItems() -> [Any]! {
    return []
  }

  private func saveTextAndComplete(_ text: String?) {
    if let text = text, !text.isEmpty {
      UserDefaults(suiteName: ShareViewController.appGroupId)?.set(text, forKey: ShareViewController.sharedTextKey)
    }
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }

  private func saveImageAndComplete(_ data: NSSecureCoding?) {
    defer { extensionContext?.completeRequest(returningItems: nil, completionHandler: nil) }

    guard let containerURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: ShareViewController.appGroupId
    ) else { return }

    var imageData: Data?
    if let url = data as? URL {
      imageData = try? Data(contentsOf: url)
    } else if let image = data as? UIImage {
      imageData = image.jpegData(compressionQuality: 0.9)
    } else if let raw = data as? Data {
      imageData = raw
    }
    guard let imageData = imageData else { return }

    let fileName = "shared_receipt_\(Int(Date().timeIntervalSince1970)).jpg"
    let destURL = containerURL.appendingPathComponent(fileName)
    guard (try? imageData.write(to: destURL)) != nil else { return }

    UserDefaults(suiteName: ShareViewController.appGroupId)?.set(fileName, forKey: ShareViewController.sharedImageFileNameKey)
  }
}
