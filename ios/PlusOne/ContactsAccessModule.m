#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ContactsAccessModule, NSObject)

RCT_EXTERN_METHOD(presentLimitedAccessPicker:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
