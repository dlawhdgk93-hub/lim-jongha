import { useCallback, useEffect, useRef, useState } from 'react';

import {

  ExpoSpeechRecognitionModule,

  useSpeechRecognitionEvent,

} from 'expo-speech-recognition';

import { debugLog } from '../utils/debugLog';



export type DeviceSpeechApi = {

  isReady: boolean;

  isAvailable: boolean;

  isListening: boolean;

  interimText: string;

  startListening: () => Promise<void>;

  stopListening: () => Promise<string>;

  requestPermission: () => Promise<boolean>;

  abortListening: () => void;

};



function speechErrorMessage(error: string): string {

  if (error === 'no-speech') return '말씀이 감지되지 않았습니다. 다시 시도해 주세요.';

  if (error === 'not-allowed') {

    return '마이크·음성 인식 권한이 필요합니다. 설정에서 허용해 주세요.';

  }

  if (error === 'network') return '음성 인식에 네트워크가 필요합니다. 연결을 확인해 주세요.';

  if (error === 'busy') return '음성 인식이 사용 중입니다. 잠시 후 다시 시도해 주세요.';

  if (error === 'service-not-allowed') {

    return '기기 음성 인식 앱(구글)이 필요합니다. Play 스토어에서 Google 앱을 업데이트해 주세요.';

  }

  return '음성 인식에 실패했습니다. 다시 시도해 주세요.';

}



export function useDeviceSpeechRecognitionImpl(): DeviceSpeechApi {

  const [availability, setAvailability] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  const [isListening, setIsListening] = useState(false);

  const [interimText, setInterimText] = useState('');

  const finalTextRef = useRef('');

  const resolveStopRef = useRef<((text: string) => void) | null>(null);

  const rejectStopRef = useRef<((err: Error) => void) | null>(null);

  const resolveStartRef = useRef<(() => void) | null>(null);

  const rejectStartRef = useRef<((err: Error) => void) | null>(null);

  const interimTextRef = useRef('');

  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isListeningRef = useRef(false);



  const clearStopTimer = () => {

    if (stopTimerRef.current) {

      clearTimeout(stopTimerRef.current);

      stopTimerRef.current = null;

    }

  };



  const clearStartWaiters = () => {

    resolveStartRef.current = null;

    rejectStartRef.current = null;

  };



  const clearStopWaiters = () => {

    resolveStopRef.current = null;

    rejectStopRef.current = null;

    clearStopTimer();

  };



  useEffect(() => {

    try {

      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();

      setAvailability(available ? 'available' : 'unavailable');

      // #region agent log

      debugLog(

        'useDeviceSpeechRecognition.native.ts:init',

        'recognition availability',

        {

          available,

          services: ExpoSpeechRecognitionModule.getSpeechRecognitionServices?.() ?? [],

          defaultService: ExpoSpeechRecognitionModule.getDefaultRecognitionService?.() ?? null,

        },

        'S1',

      );

      // #endregion

    } catch (err) {

      setAvailability('unavailable');

      // #region agent log

      debugLog(

        'useDeviceSpeechRecognition.native.ts:init',

        'recognition init failed',

        { error: (err as Error).message },

        'S1',

      );

      // #endregion

    }

  }, []);



  const isAvailable = availability === 'available';



  useSpeechRecognitionEvent('start', () => {
    isListeningRef.current = true;
    setIsListening(true);

    // #region agent log

    debugLog('useDeviceSpeechRecognition.native.ts:start', 'listening started', {}, 'S2');

    // #endregion

    if (resolveStartRef.current) {

      resolveStartRef.current();

      clearStartWaiters();

    }

  });



  useSpeechRecognitionEvent('end', () => {
    isListeningRef.current = false;
    setIsListening(false);

    // #region agent log

    debugLog(

      'useDeviceSpeechRecognition.native.ts:end',

      'listening ended',

      { finalText: finalTextRef.current.slice(0, 80), interim: interimTextRef.current.slice(0, 80) },

      'S3',

    );

    // #endregion

    if (resolveStopRef.current) {

      const text = (finalTextRef.current || interimTextRef.current).trim();

      // #region agent log
      debugLog(
        'useDeviceSpeechRecognition.native.ts:end',
        'resolve stop from end event',
        { text: text.slice(0, 80) },
        'D5',
      );
      // #endregion

      resolveStopRef.current(text);

      clearStopWaiters();

    }

  });



  useSpeechRecognitionEvent('result', (event) => {

    const transcript = event.results.map((r) => r.transcript).join('').trim();

    if (!transcript) return;



    if (event.isFinal) {

      finalTextRef.current = transcript;

      interimTextRef.current = transcript;

      setInterimText(transcript);

      // #region agent log

      debugLog(

        'useDeviceSpeechRecognition.native.ts:result',

        'final transcript',

        { transcript: transcript.slice(0, 80) },

        'S4',

      );

      // #endregion

      if (resolveStopRef.current) {
        // #region agent log
        debugLog(
          'useDeviceSpeechRecognition.native.ts:result',
          'resolve stop from final result',
          { transcript: transcript.slice(0, 80) },
          'D5',
        );
        // #endregion
        resolveStopRef.current(transcript);
        clearStopWaiters();
      }
      return;
    }

    interimTextRef.current = transcript;
    setInterimText(transcript);
  });



  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'aborted') {
      // #region agent log
      debugLog(
        'useDeviceSpeechRecognition.native.ts:error',
        'ignored aborted error',
        { message: event.message },
        'S9',
      );
      // #endregion
      return;
    }

    isListeningRef.current = false;
    setIsListening(false);

    const err = new Error(speechErrorMessage(event.error));

    // #region agent log

    debugLog(

      'useDeviceSpeechRecognition.native.ts:error',

      'recognition error',

      { error: event.error, message: event.message },

      'S5',

    );

    // #endregion

    if (rejectStartRef.current) {

      rejectStartRef.current(err);

      clearStartWaiters();

    }

    if (rejectStopRef.current) {

      rejectStopRef.current(err);

      clearStopWaiters();

    }

  });



  const abortListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
    isListeningRef.current = false;
    clearStartWaiters();
    clearStopWaiters();
    setIsListening(false);
  }, []);



  const requestPermission = useCallback(async () => {

    const existing = await ExpoSpeechRecognitionModule.getPermissionsAsync();

    if (existing.granted) return true;

    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    // #region agent log

    debugLog(

      'useDeviceSpeechRecognition.native.ts:permission',

      'permission result',

      { granted: result.granted, status: result.status, canAskAgain: result.canAskAgain },

      'S6',

    );

    // #endregion

    return result.granted;

  }, []);



  const startListening = useCallback(async () => {

    const granted = await requestPermission();

    if (!granted) {
      throw new Error('마이크·음성 인식 권한이 필요합니다. 설정에서 허용해 주세요.');
    }

    if (isListeningRef.current) {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // ignore
      }
    }

    finalTextRef.current = '';
    interimTextRef.current = '';
    setInterimText('');



    await new Promise<void>((resolve, reject) => {

      resolveStartRef.current = resolve;

      rejectStartRef.current = reject;



      try {

        ExpoSpeechRecognitionModule.start({

          lang: 'ko-KR',

          interimResults: true,

          continuous: true,

          addsPunctuation: true,

          requiresOnDeviceRecognition: false,

        });

      } catch (err) {

        clearStartWaiters();

        reject(err instanceof Error ? err : new Error('음성 인식을 시작하지 못했습니다.'));

        return;

      }



      setTimeout(() => {

        if (!resolveStartRef.current) return;

        rejectStartRef.current?.(new Error('음성 인식 시작 시간이 초과되었습니다. 다시 시도해 주세요.'));

        clearStartWaiters();

        abortListening();

      }, 6000);

    });

  }, [abortListening, requestPermission]);



  const stopListening = useCallback(async (): Promise<string> => {
    isListeningRef.current = false;
    setIsListening(false);

    return new Promise((resolve, reject) => {

      resolveStopRef.current = resolve;

      rejectStopRef.current = reject;

      // #region agent log
      debugLog('useDeviceSpeechRecognition.native.ts:stop', 'stop requested', {}, 'D1');
      // #endregion

      try {

        ExpoSpeechRecognitionModule.stop();

      } catch (err) {

        clearStopWaiters();

        reject(err instanceof Error ? err : new Error('음성 인식을 종료하지 못했습니다.'));

        return;

      }



      stopTimerRef.current = setTimeout(() => {

        if (!resolveStopRef.current) return;

        const text = (finalTextRef.current || interimTextRef.current).trim();

        // #region agent log

        debugLog(

          'useDeviceSpeechRecognition.native.ts:stopTimeout',

          'stop fallback timeout',

          { text: text.slice(0, 80) },

          'S7',

        );

        // #endregion

        resolveStopRef.current(text);

        clearStopWaiters();

        setIsListening(false);

      }, 4000);

    });

  }, []);



  return {

    isReady: availability !== 'unknown',

    isAvailable,

    isListening,

    interimText,

    startListening,

    stopListening,

    requestPermission,

    abortListening,

  };

}



const unavailableApi: DeviceSpeechApi = {

  isReady: true,

  isAvailable: false,

  isListening: false,

  interimText: '',

  startListening: async () => {

    throw new Error('이 기기에서는 음성 인식을 사용할 수 없습니다.');

  },

  stopListening: async () => '',

  requestPermission: async () => false,

  abortListening: () => undefined,

};



export function useUnavailableDeviceSpeech(): DeviceSpeechApi {

  return unavailableApi;

}

