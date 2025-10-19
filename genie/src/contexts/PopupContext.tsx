import React, { createContext, useContext, ReactNode } from 'react';
import { Popup } from '../components/primitives/Popup/Popup';
import { usePopup, PopupState } from '../hooks/usePopup';

interface PopupContextType {
  showAlert: (message: string, title?: string, onOk?: () => void) => void;
  showConfirmation: (
    message: string,
    title?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  showDestructiveConfirmation: (
    message: string,
    title?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  hidePopup: () => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

interface PopupProviderProps {
  children: ReactNode;
}

export const PopupProvider: React.FC<PopupProviderProps> = ({ children }) => {
  const {
    popupState,
    showAlert,
    showConfirmation,
    showDestructiveConfirmation,
    hidePopup,
  } = usePopup();

  const contextValue: PopupContextType = {
    showAlert,
    showConfirmation,
    showDestructiveConfirmation,
    hidePopup,
  };

  return (
    <PopupContext.Provider value={contextValue}>
      {children}
      <Popup
        visible={popupState.visible}
        title={popupState.title}
        message={popupState.message}
        buttons={popupState.buttons}
        onClose={hidePopup}
        type={popupState.type}
      />
    </PopupContext.Provider>
  );
};

export const usePopupContext = (): PopupContextType => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopupContext must be used within a PopupProvider');
  }
  return context;
};
