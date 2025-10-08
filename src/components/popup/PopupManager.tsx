import { useState } from 'react';
import { Popup } from 'sillytavern-utils-lib/components';
import { POPUP_TYPE } from 'sillytavern-utils-lib/types/popup';
import { FlowChartDataPopup } from './FlowChartDataPopup.js';

export const PopupManager = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const openPopup = () => setIsPopupVisible(true);
  const closePopup = () => setIsPopupVisible(false);

  // @ts-ignore
  window.openFlowChartDataPopup = openPopup;

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
