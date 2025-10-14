import { useState, useEffect } from 'react';
import { Popup } from 'sillytavern-utils-lib/components';
import { POPUP_TYPE } from 'sillytavern-utils-lib/types/popup';
import { FlowChartDataPopup } from './FlowChartDataPopup.js';
import { eventEmitter } from '../../events.js';

export const PopupManager = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const openPopup = () => setIsPopupVisible(true);
  const closePopup = () => setIsPopupVisible(false);

  useEffect(() => {
    eventEmitter.on('openFlowChartDataPopup', openPopup);
    return () => {
      eventEmitter.off('openFlowChartDataPopup', openPopup);
    };
  }, []);

  if (isPopupVisible) {
    return (
      <Popup
        content={<FlowChartDataPopup onSave={closePopup} />}
        type={POPUP_TYPE.DISPLAY}
        onComplete={closePopup}
        options={{
          large: true,
          wide: true,
        }}
      />
    );
  }

  return null;
};
