"use client";

import * as React from "react";

/** Minimal typings; DOM lib may omit SpeechRecognition. */

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Requires HTTPS (or localhost). Chrome / Edge / Safari; Firefox support is limited. */
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseSpeechDictationOptions = {
  setDraft: (v: string) => void;
  /** When true, recognition is stopped (e.g. assistant streaming). */
  streamInFlight: boolean;
};

export function useSpeechDictation({
  setDraft,
  streamInFlight,
}: UseSpeechDictationOptions) {
  const supported = React.useMemo(() => getSpeechRecognitionCtor() !== null, []);

  const [listening, setListening] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const draftPrefixRef = React.useRef("");
  const finalSegmentRef = React.useRef("");
  const setDraftRef = React.useRef(setDraft);
  React.useLayoutEffect(() => {
    setDraftRef.current = setDraft;
  }, [setDraft]);

  const stop = React.useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      recognitionRef.current = null;
      try {
        r.stop();
      } catch {
        try {
          r.abort();
        } catch {
          /* ignore */
        }
      }
    }
    setListening(false);
  }, []);

  const start = React.useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    stop();
    setErrorMessage(null);
    draftPrefixRef.current = "";
    finalSegmentRef.current = "";

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        const piece = result[0]!.transcript;
        if (result.isFinal) {
          finalSegmentRef.current += piece;
        } else {
          interim += piece;
        }
      }
      const next =
        draftPrefixRef.current +
        finalSegmentRef.current +
        (interim ? interim : "");
      setDraftRef.current(next);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      setErrorMessage(
        event.error === "not-allowed"
          ? "Microphone permission denied"
          : `Voice input: ${event.error}`,
      );
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setListening(false);
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      setErrorMessage("Could not start voice input");
      recognitionRef.current = null;
      setListening(false);
    }
  }, [stop]);

  const toggle = React.useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  React.useEffect(() => {
    if (!streamInFlight) return;
    const id = window.setTimeout(() => {
      stop();
    }, 0);
    return () => window.clearTimeout(id);
  }, [streamInFlight, stop]);

  React.useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (r) {
        recognitionRef.current = null;
        try {
          r.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return {
    supported,
    listening,
    errorMessage,
    start,
    stop,
    toggle,
    clearError: () => setErrorMessage(null),
  };
}
