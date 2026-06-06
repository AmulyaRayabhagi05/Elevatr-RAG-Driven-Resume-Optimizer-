import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { useRef } from "react";

export function useSpeechToText(
    onResult: (text: string) => void,
    onPartialResult?: (text: string) => void
) {
    const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startListening = async () => {
        try {
            const res = await fetch("http://localhost:8000/speech-token");
            const data = await res.json();
            const subscriptionKey = data.token;
            const region = data.region;

            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                    channelCount: 1
                }
            });
            streamRef.current = stream;

            
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, region);
            speechConfig.speechRecognitionLanguage = "en-US";
            
            // Set output format to Detailed to get better confidence scores
            speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
            
            speechConfig.enableDictation(); 
            speechConfig.setProperty(
                SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs,
                "1500"
            );

            
            const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(stream);

            
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            recognizerRef.current = recognizer;

            
            const phraseList = SpeechSDK.PhraseListGrammar.fromRecognizer(recognizer);
            phraseList.addPhrase("machine learning");
            phraseList.addPhrase("React");
            phraseList.addPhrase("TypeScript");
            phraseList.addPhrase("API");

            recognizer.recognizing = (_sender, event) => {
                if (event.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
                    onPartialResult?.(event.result.text);
                }
            };

            recognizer.recognized = (_sender, event) => {
                if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    // With Detailed output, the top result is in event.result.text
                    onResult(event.result.text);
                }
            };

            recognizer.canceled = (_sender, event) => {
                console.error("Recognition canceled:", event.errorDetails);
            };

        
            recognizer.startContinuousRecognitionAsync(
                () => console.log("Recognition started with custom stream"),
                (err) => console.error("Failed to start:", err)
            );

        } catch (err) {
            console.error("Error starting speech recognition:", err);
        }
    };

    const stopListening = () => {
        if (recognizerRef.current) {
            recognizerRef.current.stopContinuousRecognitionAsync(() => {
                recognizerRef.current?.close();
                recognizerRef.current = null;
            });
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    return { startListening, stopListening };
}