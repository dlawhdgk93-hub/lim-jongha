import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { DEFAULT_ALARM_MODE, type AlarmMode } from '../constants/alarmModes';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useDeviceSpeech } from '../context/DeviceSpeechContext';
import { useThemeColors, useThemedStyles } from '../hooks/useThemedStyles';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { formatTranscriptLines } from '../utils/transcriptDisplay';
import { buildScheduleTimestamp } from '../utils/timeAdjust';
import {
  getRecordingDateHintFromIso,
  parseKoreanScheduleText,
} from '../utils/nlpParser';
import { debugLog } from '../utils/debugLog';
import type { VoiceParseResult } from '../types/schedule';
import { TimeAdjuster } from './TimeAdjuster';
import { AlarmModePicker } from './AlarmModePicker';

export type VoiceChoicePayload = {
  transcript: string;
  aiResult: VoiceParseResult;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  preview?: VoiceParseResult;
  voiceChoice?: VoiceChoicePayload;
};

type Props = {
  parsing: boolean;
  onParseText: (text: string, rawText?: string) => Promise<VoiceParseResult>;
  onParseAudio?: (audioUri: string) => Promise<VoiceParseResult>;
  onConfirmSave: (preview: VoiceParseResult) => Promise<void>;
  onExpandChange?: (expanded: boolean) => void;
  recordingDateHint?: string | null;
  defaultDateKey?: string;
  autoStartRecording?: boolean;
  speechHostFailed?: boolean;
  onSpeechFallback?: () => void;
};

function buildTranscriptPreview(transcript: string, defaultDateKey?: string): VoiceParseResult {
  const parsed = parseKoreanScheduleText(transcript, { defaultDateKey });
  return {
    schedule: {
      raw_text: transcript,
      parsed_content: parsed.parsed_content,
      target_timestamp: parsed.target_timestamp,
      location_info: parsed.location_info,
      contact_info: parsed.contact_info,
    },
    confidence: parsed.confidence,
  };
}

function formatAiSummary(result: VoiceParseResult): string {
  const { title, date, time, is_all_day } = result.schedule.parsed_content;
  const timeLabel = is_all_day || !time ? '종일' : time;
  return `📅 ${title}\n🕐 ${date} ${timeLabel}`;
}

function withAlarmMode(preview: VoiceParseResult, mode: AlarmMode): VoiceParseResult {
  return {
    ...preview,
    schedule: {
      ...preview.schedule,
      parsed_content: {
        ...preview.schedule.parsed_content,
        alarm_mode: mode,
      },
    },
  };
}

const createStyles = (c: ThemeColors) => ({
  panel: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'web' ? 12 : 8,
  },
  panelKeyboardOpen: {
    paddingBottom: 0,
  },
  panelExpanded: {
    maxHeight: 400,
  },
  handleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleLeft: { flex: 1, paddingRight: 8 },
  handleTitle: { color: c.text, fontSize: 13, fontWeight: '600' },
  handleHint: { color: c.primaryLight, fontSize: 11, marginTop: 2 },
  handleToggle: { color: c.textMuted, fontSize: 12 },
  messageList: { maxHeight: 160 },
  messageListContent: { paddingVertical: 4, gap: 8 },
  emptyChat: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 12,
  },
  bubbleWrap: { marginBottom: 6 },
  userWrap: { alignItems: 'flex-end' },
  assistantWrap: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: { backgroundColor: c.primary },
  assistantBubble: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  assistantText: { color: c.text },
  previewActions: { marginTop: 10 },
  previewBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dismissBtn: {
    flex: 1,
    backgroundColor: c.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissBtnText: { color: c.danger, fontWeight: '700', fontSize: 13 },
  saveBtn: {
    flex: 1,
    backgroundColor: c.success,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  choiceIntro: { color: c.textMuted, fontSize: 12, marginBottom: 8 },
  choiceSection: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  choiceSectionAi: { borderColor: c.primary },
  choiceLabel: { color: c.primaryLight, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  choiceBody: { color: c.text, fontSize: 13, lineHeight: 19 },
  choiceMeta: { color: c.textMuted, fontSize: 12, marginTop: 4, lineHeight: 18 },
  choiceSaveBtn: {
    marginTop: 8,
    backgroundColor: c.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  choiceSaveBtnAlt: { backgroundColor: c.success },
  choiceSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  interim: {
    color: c.text,
    fontSize: 13,
    lineHeight: 20,
  },
  transcriptBox: {
    backgroundColor: c.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primary,
    padding: 10,
    marginBottom: 6,
  },
  transcriptLabel: {
    color: c.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: c.danger },
  micIcon: { fontSize: 20 },
  textInput: {
    flex: 1,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    color: c.text,
    fontSize: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  sendBtn: {
    backgroundColor: c.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  speechNotice: {
    backgroundColor: c.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    marginBottom: 6,
  },
  speechNoticeText: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});

export function VoiceChatPanel({
  parsing,
  onParseText,
  onParseAudio,
  onConfirmSave,
  onExpandChange,
  recordingDateHint,
  defaultDateKey,
  autoStartRecording = false,
  speechHostFailed = false,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
  const isNative = Platform.OS !== 'web';
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [pendingRawText, setPendingRawText] = useState<string | null>(null);
  const [alarmMode, setAlarmMode] = useState<AlarmMode>(DEFAULT_ALARM_MODE);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const micPressInFlightRef = useRef(false);
  const parseInFlightRef = useRef(false);
  const parseInvocationRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  const { isSupported, isListening, interimRaw, startListening, stopListening } =
    useSpeechRecognition();
  const {
    isReady: isDeviceSpeechReady,
    isAvailable: isDeviceSpeechAvailable,
    isListening: isDeviceListening,
    interimText: deviceInterimText,
    startListening: startDeviceListening,
    stopListening: stopDeviceListening,
    abortListening: abortDeviceListening,
  } = useDeviceSpeech();
  const {
    isRecording: isNativeRecording,
    permissionGranted,
    requestPermission,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const useDeviceMic =
    isNative && isDeviceSpeechReady && isDeviceSpeechAvailable && !speechHostFailed;
  const useMicRecording =
    isNative &&
    isDeviceSpeechReady &&
    (speechHostFailed || !isDeviceSpeechAvailable);
  const micActive = useDeviceMic
    ? isDeviceListening
    : useMicRecording
      ? isNativeRecording
      : isListening;

  const activeRecordingHint = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.voiceChoice) {
        const date = message.voiceChoice.aiResult.schedule.parsed_content.date;
        return getRecordingDateHintFromIso(date);
      }
      if (message.preview) {
        const date = message.preview.schedule.parsed_content.date;
        return getRecordingDateHintFromIso(date);
      }
    }

    const interim = (deviceInterimText || interimRaw || '').trim();
    if (interim) {
      const parsed = parseKoreanScheduleText(interim, { defaultDateKey });
      const parsedHint = getRecordingDateHintFromIso(parsed.parsed_content.date);
      if (parsedHint && parsedHint !== recordingDateHint) {
        return parsedHint;
      }
    }

    return recordingDateHint;
  }, [
    messages,
    recordingDateHint,
    defaultDateKey,
    deviceInterimText,
    interimRaw,
  ]);

  useEffect(() => {
    if (!activeRecordingHint && !recordingDateHint) return;
    // #region agent log
    debugLog(
      'VoiceChatPanel:activeRecordingHint',
      'hint resolved',
      {
        tabHint: recordingDateHint ?? null,
        activeHint: activeRecordingHint ?? null,
        defaultDateKey: defaultDateKey ?? null,
        hasVoiceChoice: messages.some((m) => !!m.voiceChoice),
        hasPreview: messages.some((m) => !!m.preview),
        interimLen: (deviceInterimText || interimRaw || '').trim().length,
      },
      'H1',
    );
    // #endregion
  }, [activeRecordingHint, recordingDateHint, defaultDateKey, messages, deviceInterimText, interimRaw]);

  useEffect(() => {
    if (Platform.OS === 'android') return undefined;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      setKeyboardInset(height);
      // #region agent log
      debugLog(
        'VoiceChatPanel:keyboard',
        'keyboard show',
        { height, platform: Platform.OS },
        'K1',
      );
      // #endregion
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
      // #region agent log
      debugLog('VoiceChatPanel:keyboard', 'keyboard hide', { platform: Platform.OS }, 'K1');
      // #endregion
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!useDeviceMic || !isDeviceListening) return;
    setTextInput(deviceInterimText);
  }, [useDeviceMic, isDeviceListening, deviceInterimText]);

  const appendMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const setExpandedState = useCallback(
    (value: boolean) => {
      setExpanded(value);
      onExpandChange?.(value);
    },
    [onExpandChange],
  );

  const handleParse = useCallback(
    async (text: string, rawText?: string) => {
      const transcript = formatTranscriptLines(rawText?.trim() ? rawText : text);
      const parseText = transcript.normalized || transcript.raw;
      if (!parseText || parsing || parseInFlightRef.current) {
        // #region agent log
        debugLog(
          'VoiceChatPanel:handleParse',
          'parse skipped',
          {
            reason: !parseText ? 'empty' : parsing ? 'parsing-state' : 'in-flight-ref',
            text: parseText?.slice(0, 80) ?? '',
          },
          'D3',
        );
        // #endregion
        return;
      }

      parseInFlightRef.current = true;
      const invocationId = ++parseInvocationRef.current;
      // #region agent log
      debugLog(
        'VoiceChatPanel:handleParse',
        'parse started',
        {
          invocationId,
          text: parseText.slice(0, 80),
          fromVoice: !!rawText?.trim(),
        },
        'D3',
      );
      // #endregion

      setExpandedState(true);
      appendMessage({ role: 'user', text: transcript.display || parseText });
      appendMessage({ role: 'assistant', text: '일정을 분석하고 있어요...' });
      setPendingRawText(null);

      try {
        const result = await onParseText(parseText, transcript.raw || parseText);
        const voiceTranscript = transcript.raw || transcript.normalized || parseText;
        if (transcript.raw) {
          result.schedule.raw_text = transcript.raw;
        }
        setMessages((prev) => {
          const withoutLoading = prev.slice(0, -1);
          const fromVoice = !!rawText?.trim();
          if (fromVoice) {
            const localPreview = buildTranscriptPreview(voiceTranscript, defaultDateKey);
            // #region agent log
            debugLog(
              'VoiceChatPanel:handleParse',
              'voice choice dates',
              {
                invocationId,
                tabDefaultDateKey: defaultDateKey ?? null,
                tabHint: recordingDateHint ?? null,
                transcriptDate: localPreview.schedule.parsed_content.date,
                aiDate: result.schedule.parsed_content.date,
                transcript: voiceTranscript,
              },
              'H2',
            );
            // #endregion
            return [
              ...withoutLoading,
              {
                id: `${Date.now()}-choice`,
                role: 'assistant',
                text: '음성 인식 결과와 AI 추천 중 선택해 주세요.',
                voiceChoice: { transcript: voiceTranscript, aiResult: result },
              },
            ];
          }
          return [
            ...withoutLoading,
            {
              id: `${Date.now()}-preview`,
              role: 'assistant',
              text: formatAiSummary(result),
              preview: result,
            },
          ];
        });
      } catch (err) {
        setMessages((prev) => {
          const withoutLoading = prev.slice(0, -1);
          return [
            ...withoutLoading,
            {
              id: `${Date.now()}-err`,
              role: 'assistant',
              text: `분석 실패: ${(err as Error).message}`,
            },
          ];
        });
      } finally {
        parseInFlightRef.current = false;
      }
    },
    [appendMessage, onParseText, parsing, setExpandedState, defaultDateKey, recordingDateHint],
  );

  const handleMicPress = useCallback(async () => {
    if (micPressInFlightRef.current) {
      // #region agent log
      debugLog('VoiceChatPanel:handleMicPress', 'mic press skipped (in flight)', {}, 'D4');
      // #endregion
      return;
    }
    micPressInFlightRef.current = true;
    // #region agent log
    debugLog(
      'VoiceChatPanel:handleMicPress',
      'mic press started',
      {
        useDeviceMic,
        isDeviceListening,
        parsing,
      },
      'D4',
    );
    // #endregion

    try {
      setExpandedState(true);

      if (useDeviceMic) {
        if (parsing) return;

        if (isDeviceListening) {
          try {
            let spoken = (await stopDeviceListening()).trim();
            if (!spoken && deviceInterimText.trim()) {
              spoken = deviceInterimText.trim();
              abortDeviceListening();
            }
            if (!spoken) {
              appendMessage({ role: 'assistant', text: '말씀이 감지되지 않았습니다. 다시 시도해 주세요.' });
              return;
            }
            // #region agent log
            debugLog(
              'VoiceChatPanel:handleMicPress',
              'stop listening -> parse',
              { spoken: spoken.slice(0, 80) },
              'D1',
            );
            // #endregion
            await handleParse(spoken, spoken);
          } catch (err) {
            appendMessage({ role: 'assistant', text: (err as Error).message });
          }
          return;
        }

        try {
          await startDeviceListening();
        } catch (err) {
          abortDeviceListening();
          const granted = permissionGranted ?? (await requestPermission());
          if (granted) {
            try {
              await startRecording();
              appendMessage({
                role: 'assistant',
                text: `${(err as Error).message}\n녹음 모드로 전환했습니다. 말씀 후 마이크를 다시 눌러 주세요.`,
              });
            } catch (recordErr) {
              appendMessage({ role: 'assistant', text: (recordErr as Error).message });
            }
          } else {
            appendMessage({ role: 'assistant', text: (err as Error).message });
          }
        }
        return;
      }

      if (useMicRecording) {
        if (parsing) return;

        if (isNativeRecording) {
          try {
            const uri = await stopRecording();
            if (!uri) {
              appendMessage({ role: 'assistant', text: '녹음에 실패했습니다. 다시 시도해 주세요.' });
              return;
            }
            if (!onParseAudio) {
              appendMessage({ role: 'assistant', text: '음성 분석 기능을 사용할 수 없습니다.' });
              return;
            }

            appendMessage({ role: 'user', text: '🎤 음성으로 일정 등록' });
            appendMessage({ role: 'assistant', text: '녹음을 분석하고 있어요...' });

            try {
              const result = await onParseAudio(uri);
              const transcript = result.schedule.raw_text?.trim() || '음성 인식 결과 없음';
              setMessages((prev) => {
                const withoutLoading = prev.slice(0, -1);
                return [
                  ...withoutLoading,
                  {
                    id: `${Date.now()}-choice`,
                    role: 'assistant',
                    text: '음성 인식 결과와 AI 추천 중 선택해 주세요.',
                    voiceChoice: { transcript, aiResult: result },
                  },
                ];
              });
            } catch (err) {
              setMessages((prev) => {
                const withoutLoading = prev.slice(0, -1);
                return [
                  ...withoutLoading,
                  {
                    id: `${Date.now()}-err`,
                    role: 'assistant',
                    text: `분석 실패: ${(err as Error).message}`,
                  },
                ];
              });
            }
          } catch (err) {
            appendMessage({ role: 'assistant', text: (err as Error).message });
          }
          return;
        }

        const granted = permissionGranted ?? (await requestPermission());
        if (!granted) {
          appendMessage({
            role: 'assistant',
            text: '마이크 권한이 필요합니다. 휴대폰 설정에서 마이크를 허용해 주세요.',
          });
          return;
        }

        try {
          await startRecording();
        } catch (err) {
          appendMessage({ role: 'assistant', text: (err as Error).message });
        }
        return;
      }

      if (isListening) {
        stopListening();
        return;
      }

      if (isSupported) {
        startListening(
          (raw) => {
            const transcript = formatTranscriptLines(raw);
            setPendingRawText(transcript.raw);
            setTextInput(transcript.normalized || transcript.raw);
          },
          (err) => {
            appendMessage({ role: 'assistant', text: err ?? '음성 인식 오류' });
          },
        );
        return;
      }

      appendMessage({
        role: 'assistant',
        text: '음성 인식을 지원하지 않는 환경입니다. 아래에 직접 입력해 주세요.',
      });
    } finally {
      micPressInFlightRef.current = false;
    }
  }, [
    appendMessage,
    handleParse,
    isDeviceListening,
    deviceInterimText,
    isListening,
    isNativeRecording,
    isSupported,
    onParseAudio,
    parsing,
    permissionGranted,
    requestPermission,
    setExpandedState,
    startDeviceListening,
    abortDeviceListening,
    startListening,
    startRecording,
    stopDeviceListening,
    stopListening,
    stopRecording,
    useDeviceMic,
    useMicRecording,
  ]);

  const autoRecordStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStartRecording || autoRecordStartedRef.current || parsing || micActive) return;
    autoRecordStartedRef.current = true;
    const timer = setTimeout(() => {
      void handleMicPress();
    }, 500);
    return () => clearTimeout(timer);
  }, [autoStartRecording, handleMicPress, micActive, parsing]);

  const handleTextSend = () => {
    if (canSendDuringListening) {
      const value = textInput.trim() || deviceInterimText.trim();
      if (!value) return;
      abortDeviceListening();
      setTextInput('');
      void handleParse(value, value);
      return;
    }
    if (micActive || !textInput.trim()) return;
    const value = textInput.trim();
    const raw = pendingRawText ?? undefined;
    setTextInput('');
    handleParse(value, raw);
  };

  const handleSavePreview = async (messageId: string, preview: VoiceParseResult) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    try {
      await onConfirmSave(withAlarmMode(preview, alarmMode));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, preview: undefined, text: `✅ 저장됨 · ${preview.schedule.parsed_content.title}` }
            : m,
        ),
      );
      appendMessage({ role: 'assistant', text: '일정이 저장되었습니다.' });
    } catch (err) {
      appendMessage({ role: 'assistant', text: `저장 실패: ${(err as Error).message}` });
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const handleDismissPreview = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, preview: undefined, voiceChoice: undefined, text: '🗑️ 일정 등록을 취소했습니다.' }
          : m,
      ),
    );
  };

  const handleSaveTranscriptChoice = async (messageId: string, transcript: string) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    const preview = withAlarmMode(
      buildTranscriptPreview(transcript, defaultDateKey),
      alarmMode,
    );
    try {
      await onConfirmSave(preview);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                voiceChoice: undefined,
                text: `✅ 저장됨 (음성 인식) · ${preview.schedule.parsed_content.title}`,
              }
            : m,
        ),
      );
      appendMessage({ role: 'assistant', text: '음성 인식 결과로 일정이 저장되었습니다.' });
    } catch (err) {
      appendMessage({ role: 'assistant', text: `저장 실패: ${(err as Error).message}` });
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const handleSaveAiChoice = async (messageId: string, aiResult: VoiceParseResult) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    try {
      await onConfirmSave(withAlarmMode(aiResult, alarmMode));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                voiceChoice: undefined,
                text: `✅ 저장됨 (AI 추천) · ${aiResult.schedule.parsed_content.title}`,
              }
            : m,
        ),
      );
      appendMessage({ role: 'assistant', text: 'AI 추천 일정이 저장되었습니다.' });
    } catch (err) {
      appendMessage({ role: 'assistant', text: `저장 실패: ${(err as Error).message}` });
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const handleVoiceChoiceTimeChange = (
    messageId: string,
    next: { date: string; time: string },
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.voiceChoice) return m;
        const aiResult: VoiceParseResult = {
          ...m.voiceChoice.aiResult,
          schedule: {
            ...m.voiceChoice.aiResult.schedule,
            parsed_content: {
              ...m.voiceChoice.aiResult.schedule.parsed_content,
              date: next.date,
              time: next.time,
            },
            target_timestamp: buildScheduleTimestamp(
              next.date,
              next.time,
              m.voiceChoice.aiResult.schedule.parsed_content.is_all_day,
            ),
          },
        };
        return {
          ...m,
          voiceChoice: { ...m.voiceChoice, aiResult },
        };
      }),
    );
  };

  const handlePreviewTimeChange = (
    messageId: string,
    next: { date: string; time: string },
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.preview) return m;
        const preview: VoiceParseResult = {
          ...m.preview,
          schedule: {
            ...m.preview.schedule,
            parsed_content: {
              ...m.preview.schedule.parsed_content,
              date: next.date,
              time: next.time,
            },
            target_timestamp: buildScheduleTimestamp(
              next.date,
              next.time,
              m.preview.schedule.parsed_content.is_all_day,
            ),
          },
        };
        return {
          ...m,
          preview,
          text: `📅 ${preview.schedule.parsed_content.title}\n🕐 ${next.date} ${next.time}`,
        };
      }),
    );
  };

  const micPlaceholder = micActive
    ? useDeviceMic
      ? '듣는 중... 마이크를 다시 눌러 분석'
      : '녹음 중...'
    : '말하거나 여기에 입력...';
  const canSendDuringListening =
    useDeviceMic && isDeviceListening && (deviceInterimText.trim().length > 0 || textInput.trim().length > 0);

  const listeningHint = useMemo(() => {
    if (useDeviceMic && isDeviceListening) {
      return deviceInterimText
        ? deviceInterimText
        : '듣는 중... 마이크를 다시 눌러 분석·등록';
    }
    if (useMicRecording && isNativeRecording) {
      return '녹음 중... 다시 눌러 분석·등록';
    }
    if (!isListening && !pendingRawText) return null;
    if (isListening) {
      const transcript = formatTranscriptLines(interimRaw);
      return transcript.display || '듣는 중... 마이크(⏹)를 다시 눌러 완료하세요';
    }
    if (pendingRawText) {
      return formatTranscriptLines(pendingRawText).display;
    }
    return null;
  }, [
    deviceInterimText,
    interimRaw,
    isDeviceListening,
    isListening,
    isNativeRecording,
    pendingRawText,
    useDeviceMic,
    useMicRecording,
  ]);

  const showTranscriptBox = Boolean(listeningHint) && !useDeviceMic && !inputFocused;

  useEffect(() => {
    // #region agent log
    debugLog(
      'VoiceChatPanel:layout',
      'input panel state',
      {
        showTranscriptBox,
        inputFocused,
        keyboardInset,
        micActive,
        listeningHintLen: listeningHint?.length ?? 0,
        platform: Platform.OS,
      },
      'K2',
    );
    // #endregion
  }, [showTranscriptBox, inputFocused, keyboardInset, micActive, listeningHint]);

  return (
    <View
      style={[
        styles.panel,
        expanded && styles.panelExpanded,
        keyboardInset > 0 && styles.panelKeyboardOpen,
        keyboardInset > 0 ? { marginBottom: keyboardInset } : null,
      ]}
    >
      {useMicRecording && !micActive ? (
        <View style={styles.speechNotice}>
          <Text style={styles.speechNoticeText}>
            {speechHostFailed
              ? '기기 음성 인식을 불러오지 못해 녹음 방식으로 전환했습니다. 마이크를 눌러 말씀해 주세요.'
              : '음성 인식 대신 녹음으로 일정을 등록합니다. 마이크를 눌러 말씀한 뒤 다시 눌러 분석하세요.'}
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.handleRow} onPress={() => setExpandedState(!expanded)}>
        <View style={styles.handleLeft}>
          <Text style={styles.handleTitle}>🎤 음성 일정 입력</Text>
          {activeRecordingHint ? (
            <Text style={styles.handleHint}>{activeRecordingHint}</Text>
          ) : null}
        </View>
        <Text style={styles.handleToggle}>{expanded ? '접기 ▼' : '펼치기 ▲'}</Text>
      </Pressable>

      {expanded ? (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          ListEmptyComponent={
            <Text style={styles.emptyChat}>
              {useDeviceMic
                ? '마이크를 눌러 말하기 → 다시 눌러 분석\n예: "7월 24일 종일 병원", "7월 24일 3시 미팅"'
                : useMicRecording
                  ? '마이크를 눌러 녹음 시작 → 다시 눌러 분석\n예: "7월 24일 종일 병원", "7월 24일 3시 미팅"'
                  : '마이크를 눌러 녹음 시작 → 다시 눌러 완료\n예: "7월 24일 종일 병원", "7월 24일 3시 미팅"'}
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubbleWrap,
                item.role === 'user' ? styles.userWrap : styles.assistantWrap,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    item.role === 'user' ? styles.userText : styles.assistantText,
                  ]}
                >
                  {item.text}
                </Text>
                {item.voiceChoice ? (
                  <View style={styles.previewActions}>
                    <Text style={styles.choiceIntro}>원하는 방식을 선택해 저장하세요.</Text>

                    <View style={styles.choiceSection}>
                      <Text style={styles.choiceLabel}>🎙 음성 인식 결과</Text>
                      <Text style={styles.choiceBody}>{item.voiceChoice.transcript}</Text>
                      {(() => {
                        const local = buildTranscriptPreview(
                          item.voiceChoice.transcript,
                          defaultDateKey,
                        );
                        return (
                          <Text style={styles.choiceMeta}>
                            {local.schedule.parsed_content.title} · {local.schedule.parsed_content.date}{' '}
                            {local.schedule.parsed_content.time}
                          </Text>
                        );
                      })()}
                      <Pressable
                        style={styles.choiceSaveBtn}
                        onPress={() =>
                          void handleSaveTranscriptChoice(item.id, item.voiceChoice!.transcript)
                        }
                        disabled={parsing}
                      >
                        <Text style={styles.choiceSaveBtnText}>음성 인식으로 저장</Text>
                      </Pressable>
                    </View>

                    <View style={[styles.choiceSection, styles.choiceSectionAi]}>
                      <Text style={styles.choiceLabel}>🤖 AI 추천 일정</Text>
                      <Text style={styles.choiceBody}>
                        {item.voiceChoice.aiResult.schedule.parsed_content.title}
                      </Text>
                      <Text style={styles.choiceMeta}>
                        {item.voiceChoice.aiResult.schedule.parsed_content.date}{' '}
                        {item.voiceChoice.aiResult.schedule.parsed_content.time}
                      </Text>
                      <TimeAdjuster
                        compact
                        date={item.voiceChoice.aiResult.schedule.parsed_content.date}
                        time={item.voiceChoice.aiResult.schedule.parsed_content.time}
                        onChange={(next) => handleVoiceChoiceTimeChange(item.id, next)}
                      />
                      <Pressable
                        style={[styles.choiceSaveBtn, styles.choiceSaveBtnAlt]}
                        onPress={() => void handleSaveAiChoice(item.id, item.voiceChoice!.aiResult)}
                        disabled={parsing}
                      >
                        <Text style={styles.choiceSaveBtnText}>AI 추천으로 저장</Text>
                      </Pressable>
                    </View>

                    <AlarmModePicker value={alarmMode} onChange={setAlarmMode} compact />

                    <View style={styles.previewBtnRow}>
                      <Pressable
                        style={styles.dismissBtn}
                        onPress={() => handleDismissPreview(item.id)}
                        disabled={parsing}
                      >
                        <Text style={styles.dismissBtnText}>취소</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
                {!item.voiceChoice && item.preview ? (
                  <View style={styles.previewActions}>
                    <TimeAdjuster
                      compact
                      date={item.preview.schedule.parsed_content.date}
                      time={item.preview.schedule.parsed_content.time}
                      onChange={(next) => handlePreviewTimeChange(item.id, next)}
                    />
                    <AlarmModePicker value={alarmMode} onChange={setAlarmMode} compact />
                    <View style={styles.previewBtnRow}>
                      <Pressable
                        style={styles.dismissBtn}
                        onPress={() => handleDismissPreview(item.id)}
                        disabled={parsing}
                      >
                        <Text style={styles.dismissBtnText}>삭제</Text>
                      </Pressable>
                      <Pressable
                        style={styles.saveBtn}
                        onPress={() => handleSavePreview(item.id, item.preview!)}
                        disabled={parsing}
                      >
                        <Text style={styles.saveBtnText}>일정 저장</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      ) : null}

      {showTranscriptBox ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>음성 인식 결과 (전송 전 수정 가능)</Text>
          <Text style={styles.interim} numberOfLines={4}>
            {listeningHint}
          </Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable
          style={[styles.micBtn, micActive && styles.micBtnActive]}
          onPress={() => void handleMicPress()}
          disabled={parsing || (isNative && !isDeviceSpeechReady)}
        >
          {parsing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.micIcon}>{micActive ? '⏹' : '🎤'}</Text>
          )}
        </Pressable>

        <TextInput
          style={styles.textInput}
          placeholder={micPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={textInput}
          onChangeText={setTextInput}
          onFocus={() => {
            setInputFocused(true);
            // #region agent log
            debugLog('VoiceChatPanel:textInput', 'focus', { micActive }, 'K3');
            // #endregion
          }}
          onBlur={() => {
            setInputFocused(false);
            // #region agent log
            debugLog('VoiceChatPanel:textInput', 'blur', { micActive }, 'K3');
            // #endregion
          }}
          onSubmitEditing={handleTextSend}
          editable={!parsing && (!micActive || canSendDuringListening)}
          returnKeyType="send"
        />

        <Pressable
          style={[
            styles.sendBtn,
            ((!textInput.trim() && !canSendDuringListening) || parsing || (micActive && !canSendDuringListening)) &&
              styles.sendBtnDisabled,
          ]}
          onPress={handleTextSend}
          disabled={!textInput.trim() || parsing || micActive}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </Pressable>
      </View>
    </View>
  );
}
