#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FirebasePhoneAuthModule, NSObject)

RCT_EXTERN_METHOD(verifyPhoneNumber:(NSString *)phone
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
