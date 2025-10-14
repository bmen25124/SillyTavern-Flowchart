import { settingsManager } from '../config.js';
import { st_echo } from 'sillytavern-utils-lib/config';

type NotificationCategory = 'execution' | 'ui_action' | 'user_flow';

export function notify(
  level: 'info' | 'success' | 'warning' | 'error',
  message: string,
  category: NotificationCategory,
) {
  const settings = settingsManager.getSettings();

  // Only suppress 'info' notifications in the 'execution' category
  if (level === 'info' && category === 'execution' && !settings.showExecutionNotifications) {
    return;
  }

  st_echo(level, message);
}
