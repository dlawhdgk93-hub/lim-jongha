import { Component, type ReactNode } from 'react';
import { DeviceSpeechContext, DeviceSpeechHost } from '../context/DeviceSpeechContext';
import { useUnavailableDeviceSpeech } from '../hooks/useDeviceSpeechRecognition';

const unavailableSpeechApi = useUnavailableDeviceSpeech();

type Props = {
  children: ReactNode;
  onFailed?: () => void;
};

type State = {
  failed: boolean;
};

export class NativeSpeechBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Native speech unavailable:', error.message);
    this.props.onFailed?.();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <DeviceSpeechContext.Provider value={unavailableSpeechApi}>
          {this.props.children}
        </DeviceSpeechContext.Provider>
      );
    }

    return <DeviceSpeechHost>{this.props.children}</DeviceSpeechHost>;
  }
}
