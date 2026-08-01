import { expect, jest, test } from '@jest/globals';

import { ReadRequestCache, stableRequestKey } from '@/utils/requestCache';

test('deduplicates concurrent reads and reuses a fresh response', async () => {
  const cache = new ReadRequestCache();
  let resolve!: (value: string) => void;
  const loader = jest.fn(() => new Promise<string>((done) => { resolve = done; }));

  const first = cache.run('questions:1', 1_000, loader);
  const second = cache.run('questions:1', 1_000, loader);
  expect(loader).toHaveBeenCalledTimes(1);
  resolve('ready');
  await expect(first).resolves.toBe('ready');
  await expect(second).resolves.toBe('ready');
  await expect(cache.run('questions:1', 1_000, loader)).resolves.toBe('ready');
  expect(loader).toHaveBeenCalledTimes(1);
});

test('force refresh bypasses a stored value but still deduplicates in-flight work', async () => {
  const cache = new ReadRequestCache();
  const loader = jest.fn<() => Promise<number>>()
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(2);

  await expect(cache.run('catalog:9', 1_000, loader)).resolves.toBe(1);
  await expect(cache.run('catalog:9', 1_000, loader, true)).resolves.toBe(2);
  expect(loader).toHaveBeenCalledTimes(2);
});

test('builds stable keys and ignores incremental sync timestamps', () => {
  expect(stableRequestKey('catalog', { stream: 'Natural', grade: 11, since: 'yesterday' }))
    .toBe(stableRequestKey('catalog', { grade: 11, since: 'today', stream: 'Natural' }));
});
