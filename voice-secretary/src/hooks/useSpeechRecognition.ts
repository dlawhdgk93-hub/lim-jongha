import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [interimRaw, setInterimRaw] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef('');
  const userStoppedRef = useRef(false);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const onErrorRef = useRef<((message: string) => void) | null>(null);

  const isSupported = Platform.OS === 'web' && getSpeechRecognitionCtor() !== null;

  const stopListening = useCallback((deliverResult = true) => {
    userStoppedRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      setIsListening(false);
      if (deliverResult) {
        const text = finalTextRef.current.trim();
        if (text) onFinalRef.current?.(text);
      }
      finalTextRef.current = '';
      setInterimRaw('');
    }
  }, []);

  const startListening = useCallback(
    (onFinal: (text: string) => void, onError?: (message: string) => void) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        onError?.('Chrome/Edge 브라우저에서 음성 인식을 사용할 수 있습니다.');
        return;
      }

      if (recognitionRef.current) {
        stopListening(true);
        return;
      }

      finalTextRef.current = '';
      userStoppedRef.current = false;
      onFinalRef.current = onFinal;
      onErrorRef.current = onError ?? null;
      setInterimRaw('');

      const recognition = new Ctor();
      recognition.lang = 'ko-KR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const chunk = event.results[i][0]?.transcript ?? '';
          if (event.results[i].isFinal) {
            finalTextRef.current += chunk;
          } else {
            interim += chunk;
          }
        }
        setInterimRaw((finalTextRef.current + interim).trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted') return;
        userStoppedRef.current = true;
        setIsListening(false);
        recognitionRef.current = null;
        if (event.error !== 'no-speech') {
          onErrorRef.current?.('음성 인식에 실패했습니다. 다시 시도해 주세요.');
        }
      };

      recognition.onend = () => {
        if (!userStoppedRef.current && recognitionRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            // fall through to finish
          }
        }

        setIsListening(false);
        recognitionRef.current = null;

        if (userStoppedRef.current) {
          const text = finalTextRef.current.trim();
          finalTextRef.current = '';
          setInterimRaw('');
          if (text) onFinalRef.current?.(text);
        }
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    },
    [stopListening],
  );

  return {
    isSupported,
    isListening,
    interimRaw,
    startListening,
    stopListening: () => stopListening(true),
  };
}
