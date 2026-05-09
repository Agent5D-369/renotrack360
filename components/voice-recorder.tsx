"use client";

import { useState, useRef } from "react";

type SRInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

function getSpeechRecognition(): (new () => SRInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceRecorderProps {
  onTranscript?: (text: string) => void;
  copyToClipboard?: boolean;
  placeholder?: string;
}

export function VoiceRecorder({ onTranscript, copyToClipboard, placeholder }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [permError, setPermError] = useState("");
  const recRef = useRef<SRInstance | null>(null);

  async function start() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) { setUnsupported(true); return; }

    setPermError("");

    // Step 1: confirm the microphone is physically accessible via getUserMedia.
    // This uses the standard mic permission — completely separate from the
    // Speech Recognition API which also requires Google's servers.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "unknown";
      setPermError(`Microphone not accessible (${name}). Check Windows Settings → Privacy & Security → Microphone and make sure Chrome is allowed.`);
      return;
    }

    // Step 2: getUserMedia succeeded — mic is accessible. Now try Speech Recognition.
    // If this fails with not-allowed, the issue is Chrome's Speech API (requires
    // connection to Google's servers), not the microphone permission itself.
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const full = Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>)
        .map((r) => r[0].transcript)
        .join(" ");
      setTranscript(full);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        // getUserMedia succeeded above so the microphone IS accessible.
        // not-allowed here means Chrome's Speech Recognition service itself
        // is blocked — usually because Chrome cannot reach Google's speech
        // servers (firewall, VPN, corporate proxy, or a Chrome extension).
        setPermError("Microphone works but Chrome's Speech Recognition service is blocked. This is usually a network or extension issue, not a microphone permission. Try disabling extensions one by one, or check if a VPN or firewall is blocking Chrome.");
      } else if (e.error !== "no-speech") {
        setPermError(`Voice error: ${e.error}. Try again.`);
      }
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);
    recRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
      setTranscript("");
    } catch {
      setPermError("Could not start voice. Try reloading the page.");
    }
  }

  function stop() {
    recRef.current?.stop();
    setIsRecording(false);
  }

  if (unsupported) {
    return (
      <p className="text-xs text-muted-foreground">
        Voice recording requires Chrome or Edge with microphone access.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted transition"
          >
            <span className="text-red-500">●</span>
            {placeholder ?? "Record voice note"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            Stop recording
          </button>
        )}
      </div>

      {permError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{permError}</p>
      )}

      {transcript && (
        <div className="rounded-lg border border-border bg-slate-50 p-3">
          <p className="text-sm leading-relaxed">{transcript}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const text = transcript.trim();
                if (onTranscript) {
                  onTranscript(text);
                } else if (copyToClipboard) {
                  navigator.clipboard?.writeText(text).catch(() => {});
                }
                setTranscript("");
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              Use this
            </button>
            <button
              type="button"
              onClick={() => setTranscript("")}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
