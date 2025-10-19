import { useState, useCallback } from 'react';
import { PopupButton } from '../components/primitives/Popup/Popup';

export interface PopupState {
  visible: boolean;
  title?: string;
  message: string;
  buttons?: PopupButton[];
  type?: 'alert' | 'confirmation';
}

export const usePopup = () => {
  const [popupState, setPopupState] = useState<PopupState>({
    visible: false,
    message: '',
  });

  const showPopup = useCallback((
    message: string,
    title?: string,
    buttons?: PopupButton[],
    type: 'alert' | 'confirmation' = 'alert'
  ) => {
    setPopupState({
      visible: true,
      message,
      title,
      buttons: buttons || [{ text: 'OK', onPress: () => {} }],
      type,
    });
  }, []);

  const showAlert = useCallback((
    message: string,
    title?: string,
    onOk?: () => void
  ) => {
    showPopup(
      message,
      title,
      [{ text: 'OK', onPress: onOk || (() => {}) }],
      'alert'
    );
  }, [showPopup]);

  const showConfirmation = useCallback((
    message: string,
    title?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText: string = 'OK',
    cancelText: string = 'Cancel'
  ) => {
    showPopup(
      message,
      title,
      [
        { text: cancelText, onPress: onCancel || (() => {}), style: 'cancel' },
        { text: confirmText, onPress: onConfirm || (() => {}), style: 'default' },
      ],
      'confirmation'
    );
  }, [showPopup]);

  const showDestructiveConfirmation = useCallback((
    message: string,
    title?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText: string = 'Delete',
    cancelText: string = 'Cancel'
  ) => {
    showPopup(
      message,
      title,
      [
        { text: cancelText, onPress: onCancel || (() => {}), style: 'cancel' },
        { text: confirmText, onPress: onConfirm || (() => {}), style: 'destructive' },
      ],
      'confirmation'
    );
  }, [showPopup]);

  const hidePopup = useCallback(() => {
    setPopupState(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    popupState,
    showPopup,
    showAlert,
    showConfirmation,
    showDestructiveConfirmation,
    hidePopup,
  };
};
