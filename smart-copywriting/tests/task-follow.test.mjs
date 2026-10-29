import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followCopywritingTask } from '../task-follow.mjs';

test('an open but silent stream still displays persisted text before completion without resubmitting', async () => {
  let task = { id: 71, status: 'running', last_seq: 1, result_text: '' };
  const seen = [];
  let reads = 0, aborted = 0;
  const follower = followCopywritingTask({
    current: () => task,
    connect: () => ({ done: new Promise(() => {}), abort: () => aborted++ }),
    detail: async id => {
      assert.equal(id, 71);
      reads++;
      return { ...task, last_seq: reads + 1, result_text: reads === 1 ? '第一段正文' : '第一段正文，已完成', status: reads === 1 ? 'running' : 'success' };
    },
    update: v => { task = v; seen.push({ text: v.result_text, status: v.status }); },
    pollMs: 5,
  });
  await follower.done;
  assert.equal(seen[0].status, 'running');
  assert.equal(seen[0].text, '第一段正文');
  assert.equal(task.status, 'success');
  assert.equal(reads, 2);
  assert.ok(aborted > 0);
});

test('a successful empty stream reconnects with backoff and obtains the same original task', async () => {
  let task = { id: 72, status: 'running', last_seq: 2, result_text: '' };
  let connects = 0;
  const follower = followCopywritingTask({ current: () => task,
    connect: () => { connects++; return { done: Promise.resolve(), abort() {} }; },
    detail: async id => ({ id, status: 'success', last_seq: 3, result_text: '原任务正文' }),
    update: v => { task = v; }, pollMs: 5, reconnectMs: 20,
  });
  await follower.done;
  assert.equal(task.id, 72);
  assert.equal(task.result_text, '原任务正文');
  assert.equal(connects, 1);
});

test('disposing a follower aborts the stream and ignores an outstanding detail response', async () => {
  let task = { id: 73, status: 'running', last_seq: 1 }, resolveRead, readStarted;
  const started = new Promise(r => { readStarted = r; });
  let aborted = 0, updates = 0;
  const follower = followCopywritingTask({ current: () => task,
    connect: () => ({ done: new Promise(() => {}), abort: () => aborted++ }),
    detail: () => { readStarted(); return new Promise(r => { resolveRead = r; }); },
    update: () => updates++, pollMs: 5,
  });
  await started;
  follower.stop();
  resolveRead({ ...task, status: 'success', result_text: '不得回填' });
  await follower.done;
  assert.equal(updates, 0);
  assert.ok(aborted > 0);
});
