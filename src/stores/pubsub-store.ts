import { defineStore } from 'pinia';

export const usePubsubStore = defineStore('event', () => {
  const topics = new Map<string, Set<(...args: any[]) => void>>();
  const subscribe = (topic: string, callback: (...args: any[]) => void) => {
    if (!topics.has(topic)) {
      topics.set(topic, new Set());
    }
    topics.get(topic)?.add(callback);
    return () => {
      topics.get(topic)?.delete(callback);
    };
  };
  const publish = (topic: string, ...args: any[]) => {
    topics.get(topic)?.forEach((callback) => callback(...args));
  };

  return {
    subscribe,
    publish,
  };
});
