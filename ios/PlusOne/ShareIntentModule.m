#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ShareIntentModule, NSObject)

RCT_EXTERN_METHOD(getInitialSharedText:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
