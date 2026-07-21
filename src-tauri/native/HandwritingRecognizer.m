#import <Foundation/Foundation.h>
#import <ImageIO/ImageIO.h>
#import <Vision/Vision.h>

static void writeError(NSString *message) {
    NSData *data = [[message stringByAppendingString:@"\n"] dataUsingEncoding:NSUTF8StringEncoding];
    [[NSFileHandle fileHandleWithStandardError] writeData:data];
}

int main(void) {
    @autoreleasepool {
        NSData *input = [[NSFileHandle fileHandleWithStandardInput] readDataToEndOfFile];
        NSString *encoded = [[NSString alloc] initWithData:input encoding:NSUTF8StringEncoding];
        NSData *imageData = [[NSData alloc] initWithBase64EncodedString:encoded options:0];

        if (imageData == nil) {
            writeError(@"The handwriting image was invalid.");

            return 2;
        }

        CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)imageData, NULL);
        CGImageRef image = source == NULL ? NULL : CGImageSourceCreateImageAtIndex(source, 0, NULL);

        if (source != NULL) {
            CFRelease(source);
        }

        if (image == NULL) {
            writeError(@"macOS could not decode the handwriting image.");

            return 2;
        }

        __block NSError *recognitionError = nil;
        VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc]
            initWithCompletionHandler:^(VNRequest *completedRequest, NSError *requestError) {
                recognitionError = requestError;
            }];
        request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
        request.recognitionLanguages = @[@"en-US", @"en-GB"];
        request.usesLanguageCorrection = YES;
        request.minimumTextHeight = 0.01;

        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:image options:@{}];

        if (handler == nil) {
            CGImageRelease(image);
            writeError(@"macOS could not prepare the handwriting image for recognition.");

            return 3;
        }

        NSError *error = nil;
        BOOL completed = [handler performRequests:@[request] error:&error];
        CGImageRelease(image);

        if (!completed) {
            NSError *reportedError = error ?: recognitionError;
            NSString *message = reportedError == nil
                ? @"macOS could not analyze this handwriting."
                : [NSString stringWithFormat:@"%@ (%@ %ld)", reportedError.localizedDescription, reportedError.domain, reportedError.code];
            writeError(message);

            return 3;
        }

        NSMutableArray<VNRecognizedTextObservation *> *observations = [request.results mutableCopy];
        [observations sortUsingComparator:^NSComparisonResult(
            VNRecognizedTextObservation *left,
            VNRecognizedTextObservation *right
        ) {
            const CGFloat rowTolerance = 0.025;
            CGFloat verticalDifference = left.boundingBox.origin.y - right.boundingBox.origin.y;

            if (fabs(verticalDifference) > rowTolerance) {
                return verticalDifference > 0 ? NSOrderedAscending : NSOrderedDescending;
            }

            CGFloat horizontalDifference = left.boundingBox.origin.x - right.boundingBox.origin.x;
            return horizontalDifference < 0 ? NSOrderedAscending : NSOrderedDescending;
        }];

        NSMutableArray<NSString *> *lines = [NSMutableArray array];

        for (VNRecognizedTextObservation *observation in observations) {
            VNRecognizedText *candidate = [observation topCandidates:1].firstObject;

            if (candidate.string.length > 0) {
                [lines addObject:candidate.string];
            }
        }

        NSString *text = [[lines componentsJoinedByString:@"\n"]
            stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];

        if (text.length == 0) {
            writeError(@"No English handwriting was found in that area.");

            return 4;
        }

        [[NSFileHandle fileHandleWithStandardOutput] writeData:[text dataUsingEncoding:NSUTF8StringEncoding]];

        return 0;
    }
}
