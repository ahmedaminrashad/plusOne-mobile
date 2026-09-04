#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppBadgeModule, NSObject)

RCT_EXTERN_METHOD(clear:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
