"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onaudiostart: (() => void) | null;
};

function getSR(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceTextarea({
  name,
  placeholder,
  className,
  rows = 4
}: {
  name: string;
  placeholder?: string;
  className?: string;
  rows?: number;
}) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Voice works in supported Chrome/Edge browsers with microphone permission.");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const restore = (event: Event) => setValue(String((event as CustomEvent).detail ?? textarea.value));
    textarea.addEventListener("draft-restore", restore);
    return () => textarea.removeEventListener("draft-restore", restore);
  }, []);

  function startVoice() {
    const Recognition = getSR();
    if (!Recognition) {
      setStatus("Voice capture is not available in this browser. Use Chrome or Edge.");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus(`Voice requires a secure context. Open the app at http://localhost:${window.location.port || "3010"} instead of ${window.location.hostname}.`);
      return;
    }

    setStatus("Starting microphone...");

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onaudiostart = () => setStatus("Listening now. Speak clearly, then pause.");
    recognition.onresult = (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => {
      const transcript = Array.from(event.results).map((result: { 0: { transcript: string } }) => result[0].transcript).join(" ");
      setValue((current) => [current, transcript].filter(Boolean).join(" "));
      setStatus("Voice note captured.");
      textareaRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    };
    recognition.onerror = (event: { error?: string; message?: string }) => {
      const error = event.error ?? event.message ?? "unknown";
      const origin = typeof window !== "undefined" ? window.location.origin : "this site";
      setStatus(error === "not-allowed"
        ? `Microphone blocked for ${origin}. In Chrome: go to chrome://settings/content/microphone, click Add under Allowed, enter ${origin}, then reload.`
        : error === "no-speech"
        ? "No speech detected. Press Voice note and speak clearly."
        : `Voice error: ${error}. You can keep typing.`);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setStatus((s) => s.includes("Listening") ? "Stopped. Press Voice note to record again." : s);
    };
    setListening(true);
    try {
      recognition.start();
    } catch (err) {
      setListening(false);
      setStatus(err instanceof Error ? err.message : "Could not start voice. Try reloading the page.");
    }
  }

  return (
    <div className="grid gap-2">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={className}
        placeholder={placeholder}
        rows={rows}
      />
      <button type="button" onClick={startVoice} className="w-fit rounded-md border border-border px-3 py-2 text-xs font-bold">
        {listening ? "Listening..." : "Voice note"}
      </button>
      <p className="text-xs leading-5 text-muted-foreground">{status}</p>
    </div>
  );
}
