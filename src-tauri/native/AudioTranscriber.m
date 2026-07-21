#import <Foundation/Foundation.h>
#import <Speech/Speech.h>

static char *copyString(NSString *value) {
    return value == nil ? NULL : strdup(value.UTF8String);
}

char *celestine_transcribe_audio(const char *audioPath, char **errorOutput) {
    @autoreleasepool {
        __block NSString *recognizedText = nil;
        __block NSString *recognitionError = nil;
        __block BOOL hasSignaled = NO;
        dispatch_semaphore_t recognitionSemaphore = dispatch_semaphore_create(0);
        NSString *path = [NSString stringWithUTF8String:audioPath];

        void (^signalOnce)(void) = ^{
            @synchronized (recognitionSemaphore) {
                if (!hasSignaled) {
                    hasSignaled = YES;
                    dispatch_semaphore_signal(recognitionSemaphore);
                }
            }
        };

        dispatch_async(dispatch_get_main_queue(), ^{
            if ([[NSBundle mainBundle] objectForInfoDictionaryKey:@"NSSpeechRecognitionUsageDescription"] == nil) {
                recognitionError = [@"Info.plist is missing NSSpeechRecognitionUsageDescription. Rebuild and restart Celestine." copy];
                signalOnce();
                return;
            }

            SFSpeechRecognizer *recognizer = [[SFSpeechRecognizer alloc] initWithLocale:NSLocale.currentLocale];
            if (recognizer == nil || !recognizer.available) {
                recognitionError = [@"macOS Speech Recognition is currently unavailable." copy];
                signalOnce();
                return;
            }

            SFSpeechRecognizerAuthorizationStatus authorization = [SFSpeechRecognizer authorizationStatus];
            void (^startTask)(void) = ^{
                SFSpeechURLRecognitionRequest *request = [[SFSpeechURLRecognitionRequest alloc] initWithURL:[NSURL fileURLWithPath:path]];
                request.shouldReportPartialResults = YES;
                [recognizer recognitionTaskWithRequest:request resultHandler:^(SFSpeechRecognitionResult *result, NSError *error) {
                    if (result.bestTranscription.formattedString.length > 0) {
                        recognizedText = [result.bestTranscription.formattedString copy];
                    }
                    if (error != nil) {
                        if (recognizedText.length == 0) {
                            recognitionError = [error.localizedDescription copy];
                        }
                        signalOnce();
                    } else if (result.isFinal) {
                        signalOnce();
                    }
                }];
            };

            if (authorization == SFSpeechRecognizerAuthorizationStatusAuthorized) {
                startTask();
            } else if (authorization == SFSpeechRecognizerAuthorizationStatusNotDetermined) {
                [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus status) {
                    dispatch_async(dispatch_get_main_queue(), ^{
                        if (status == SFSpeechRecognizerAuthorizationStatusAuthorized) {
                            startTask();
                        } else {
                            recognitionError = [@"Speech Recognition permission is not enabled for Celestine." copy];
                            signalOnce();
                        }
                    });
                }];
            } else {
                recognitionError = [@"Speech Recognition permission is not enabled for Celestine." copy];
                signalOnce();
            }
        });

        long timedOut = dispatch_semaphore_wait(recognitionSemaphore, dispatch_time(DISPATCH_TIME_NOW, 120 * NSEC_PER_SEC));

        if (recognizedText.length > 0) {
            return copyString(recognizedText);
        }

        *errorOutput = copyString(timedOut != 0
            ? @"Speech Recognition timed out before producing a transcript."
            : recognitionError ?: @"No speech was detected in this recording.");
        return NULL;
    }
}

void celestine_free_transcription(char *value) {
    free(value);
}
