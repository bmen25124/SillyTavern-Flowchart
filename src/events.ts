import { NodeReport } from './components/popup/flowRunStore.js';

type EventMap = {
  openFlowchartDataPopup: [];
  'flow:reset-all-settings': [];
  'flow:run:start': [{ runId: string }];
  'node:run:start': [{ runId: string; nodeId: string }];
  'node:run:end': [{ runId: string; nodeId: string; report: NodeReport }];
  'flow:run:end': [
    {
      runId: string;
      status: 'completed' | 'error';
      executedNodes: { nodeId: string }[];
    },
  ];
};

type EventName = keyof EventMap;

class EventEmitter {
  private events: { [K in EventName]?: ((...args: EventMap[K]) => void)[] } = {};

  on<K extends EventName>(eventName: K, listener: (...args: EventMap[K]) => void) {
    const listeners = (this.events[eventName] = this.events[eventName] || []);
    // @ts-ignore
    listeners.push(listener);
  }

  off<K extends EventName>(eventName: K, listener: (...args: EventMap[K]) => void) {
    const listeners = this.events[eventName];
    if (!listeners) {
      return;
    }
    // @ts-ignore
    this.events[eventName] = listeners.filter((l) => l !== listener);
  }

  emit<K extends EventName>(eventName: K, ...args: EventMap[K]) {
    const listeners = this.events[eventName];
    if (!listeners) {
      return;
    }
    listeners.forEach((listener) => listener(...args));
  }
}

export const eventEmitter = new EventEmitter();
