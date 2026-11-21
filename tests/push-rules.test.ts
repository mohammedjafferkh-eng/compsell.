import { test, expect } from 'bun:test';
import { messageRecipient, stalePushToken } from '../src/lib/push-rules';

test('a buyer message notifies only the seller', () => {
  expect(messageRecipient({ buyer_id: 'buyer', seller_id: 'seller' }, 'buyer')).toBe('seller');
});
test('a seller reply notifies only the buyer', () => {
  expect(messageRecipient({ buyer_id: 'buyer', seller_id: 'seller' }, 'seller')).toBe('buyer');
});
test('outsiders and self-conversations cannot generate alerts', () => {
  expect(messageRecipient({ buyer_id: 'buyer', seller_id: 'seller' }, 'outsider')).toBeNull();
  expect(messageRecipient({ buyer_id: 'buyer', seller_id: 'buyer' }, 'buyer')).toBeNull();
});
test('expired tokens are removed, temporary errors are not', () => {
  expect(stalePushToken(404, 'UNREGISTERED')).toBe(true);
  expect(stalePushToken(400, 'INVALID_ARGUMENT')).toBe(true);
  expect(stalePushToken(429, 'RESOURCE_EXHAUSTED')).toBe(false);
  expect(stalePushToken(503, 'UNAVAILABLE')).toBe(false);
});