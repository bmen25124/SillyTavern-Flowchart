import { useState, useEffect } from 'react';
import { Popup } from 'sillytavern-utils-lib/components';
import { POPUP_TYPE } from 'sillytavern-utils-lib/types/popup';
import { FlowchartDataPopup } from './FlowchartDataPopup.js';
import { eventEmitter } from '../../events.js';

export const PopupManager = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const openPopup = () => setIsPopupVisible(true);
  const closePopup = () => setIsPopupVisible(false);

  useEffect(() => {
    eventEmitter.on('openFlowchartDataPopup', openPopup);
    return () => {
      eventEmitter.off('openFlowchartDataPopup', openPopup);
    };
  }, []);

  if (isPopupVisible) {
    return (
      <Popup
        content={<FlowchartDataPopup onSave={closePopup} />}
        type={POPUP_TYPE.DISPLAY}
        onComplete={closePopup}
        preventEscape={true}
        options={{
          large: true,
          wide: true,
        }}
      />
    );
  }

  return null;
};
