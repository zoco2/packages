import { mergeTaskSnapshot } from './client.mjs';

// Streaming and recovery only read the original task. Neither path can submit.
export function followCopywritingTask({ current, connect, detail, update, onError,
  pollMs = 2000, reconnectMs = 1000 }) {
  const id = current()?.id;
  let stopped = false, transport, lastProgress = Date.now();
  const sleepers = new Map();
  let resolveStopped;
  const stoppedPromise = new Promise(resolve => { resolveStopped = resolve; });
  const active = () => !stopped && current()?.id === id && ['pending', 'running'].includes(current()?.status);
  const pause = ms => new Promise(resolve => {
    if (stopped) return resolve();
    const timer = setTimeout(() => { sleepers.delete(timer); resolve(); }, ms);
    sleepers.set(timer, resolve);
  });
  function stop() {
    if (stopped) return;
    stopped = true;
    transport?.abort();
    for (const [timer, resolve] of sleepers) { clearTimeout(timer); resolve(); }
    sleepers.clear();
    resolveStopped();
  }
  function accept(snapshot) {
    if (!active() || snapshot?.id !== id) return;
    if ((snapshot.last_seq || 0) > (current().last_seq || 0)) lastProgress = Date.now();
    update(mergeTaskSnapshot(current(), snapshot));
    if (!active()) stop();
  }
  const stream = async () => {
    while (active()) {
      try {
        transport = connect(accept);
        if (stopped) transport.abort();
        await Promise.race([transport.done, stoppedPromise]);
      } catch { /* The independent reader recovers silent or broken transports. */ }
      if (active()) await pause(reconnectMs);
    }
  };
  const recover = async () => {
    while (active()) {
      await pause(pollMs);
      if (!active()) break;
      if (Date.now() - lastProgress < pollMs) continue;
      try { accept(await detail(id)); }
      catch (error) { if (active()) onError?.(error); }
    }
  };
  return { stop, done: Promise.all([stream(), recover()]).finally(stop) };
}
