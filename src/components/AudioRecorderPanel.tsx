import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Square, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface AudioRecorderPanelProps {
  onClose: () => void;
  onSave: (dataUrl: string, duration: number, transcript: string) => void;
  transcriptionEnabled: boolean;
}

export function AudioRecorderPanel({
  onClose,
  onSave,
  transcriptionEnabled,
}: AudioRecorderPanelProps) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<'idle' | 'requesting' | 'recording' | 'paused' | 'ready' | 'error'>(
    'idle',
  );
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const startRecording = () => {
    setState('requesting');
    setErrorMessage('');
    chunks.current = [];
    let requestExpired = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        'Microphone recording is not supported by this app runtime. Restart Celestine after installing the latest build.',
      );
      setState('error');
      return;
    }

    const permissionTimeout = window.setTimeout(() => {
      requestExpired = true;
      setErrorMessage(
        'macOS did not return a microphone permission result. Open System Settings, allow Celestine under Privacy & Security → Microphone, then retry.',
      );
      setState('error');
    }, 15000);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        window.clearTimeout(permissionTimeout);
        if (requestExpired) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = mediaStream;
        if (!window.MediaRecorder) {
          mediaStream.getTracks().forEach((track) => track.stop());
          setErrorMessage(
            'This version of the desktop webview cannot encode audio recordings. Update macOS and restart Celestine.',
          );
          setState('error');
          return;
        }
        const supportedMime =
          ['audio/mp4', 'audio/wav', 'audio/webm;codecs=opus', 'audio/webm'].find((type) =>
            MediaRecorder.isTypeSupported(type),
          ) || '';
        const nextRecorder = supportedMime
          ? new MediaRecorder(mediaStream, { mimeType: supportedMime })
          : new MediaRecorder(mediaStream);
        recorder.current = nextRecorder;
        nextRecorder.ondataavailable = (event) => {
          if (event.data.size) chunks.current.push(event.data);
        };
        nextRecorder.onstop = () => {
          const blob = new Blob(chunks.current, {
            type: nextRecorder.mimeType || supportedMime || 'audio/mp4',
          });
          const reader = new FileReader();
          reader.onload = () => {
            setAudioUrl(String(reader.result));
            setState('ready');
          };
          reader.readAsDataURL(blob);
          mediaStream.getTracks().forEach((track) => track.stop());
        };
        nextRecorder.start(500);
        setState('recording');
      })
      .catch((error: unknown) => {
        window.clearTimeout(permissionTimeout);
        const name = error instanceof DOMException ? error.name : '';
        setErrorMessage(
          name === 'NotAllowedError'
            ? 'Microphone access was denied. Allow Celestine under Privacy & Security → Microphone, then retry.'
            : name === 'NotFoundError'
              ? 'No microphone was found. Connect or enable an input device, then retry.'
              : name === 'NotReadableError'
                ? 'The microphone is busy or unavailable. Close other recording apps, then retry.'
                : 'Celestine could not access the microphone. Check macOS microphone privacy settings, then retry.',
        );
        setState('error');
      });
  };

  useEffect(() => {
    if (attempt > 0) {
      startRecording();
    }
  }, [attempt]);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const stop = () => {
    if (recorder.current?.state !== 'inactive') recorder.current?.stop();
  };
  const togglePause = () => {
    if (!recorder.current) return;
    if (state === 'recording') {
      recorder.current.pause();
      setState('paused');
    } else if (state === 'paused') {
      recorder.current.resume();
      setState('recording');
    }
  };

  const openSettings = () =>
    '__TAURI_INTERNALS__' in window
      ? invoke('open_microphone_settings').catch(() => undefined)
      : Promise.resolve(
          window.open('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'),
        );
  const saveRecording = () => {
    onSave(audioUrl, seconds, '');
    onClose();
  };

  const transcriptionCopy = transcriptionEnabled
    ? 'Save the recording, then use Transcribe in the note.'
    : 'Transcription is turned off in Settings.';

  return (
    <div className="overlay-backdrop">
      <section className="audio-recorder-panel">
        <header>
          <div>
            <span>Local recording</span>
            <h2>Voice note</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => {
              if (recorder.current?.state !== 'inactive') recorder.current?.stop();
              onClose();
            }}
            aria-label="Close recorder"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>
        {state === 'error' ? (
          <div className="recorder-error">
            <Mic size={28} />
            <h3>Microphone access is unavailable.</h3>
            <p>{errorMessage}</p>
            <div className="recorder-actions">
              <button onClick={() => setAttempt((value) => value + 1)}>Retry</button>
              <button onClick={() => void openSettings()}>Open system settings</button>
              <button onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className={`recording-pulse ${state}`}>
              <Mic size={25} />
            </div>
            <div className={`audio-waveform ${state}`} aria-label="Recording waveform">
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <strong className="recording-time">
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
            </strong>
            <p>
              {state === 'idle'
                ? 'Ready to record audio note.'
                : state === 'requesting'
                  ? 'Requesting microphone access from macOS…'
                  : state === 'ready'
                    ? 'Recording is ready to save.'
                    : state === 'paused'
                      ? 'Recording paused'
                      : 'Recording locally'}
            </p>
            {state !== 'requesting' && state !== 'idle' ? (
              <div className="live-transcript" aria-live="polite">
                <small>{transcriptionCopy}</small>
              </div>
            ) : null}
            <div className="recorder-actions">
              {state === 'idle' ? (
                <button className="save-recording" onClick={startRecording}>
                  <Mic size={16} /> Start recording
                </button>
              ) : null}
              {state === 'recording' || state === 'paused' ? (
                <>
                  <button onClick={togglePause}>
                    {state === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                    {state === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  <button className="stop-recording" onClick={stop}>
                    <Square size={15} /> Stop
                  </button>
                </>
              ) : null}
              {state === 'ready' ? (
                <>
                  <audio controls src={audioUrl} />
                  <button
                    onClick={() => {
                      setAudioUrl('');
                      setSeconds(0);
                      setAttempt((value) => value + 1);
                    }}
                  >
                    Delete
                  </button>
                  <button className="save-recording" onClick={saveRecording}>
                    Save to note
                  </button>
                </>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
