import test from 'node:test';
import assert from 'node:assert';
import { isValidDeviantArtUrl } from './deviantart.js';

test('isValidDeviantArtUrl', async (t) => {
  await t.test('should validate standard DeviantArt URLs', () => {
    assert.strictEqual(isValidDeviantArtUrl('https://www.deviantart.com/username/art/artwork-title-123456789'), true);
    assert.strictEqual(isValidDeviantArtUrl('http://www.deviantart.com/username/art/artwork-title-123456789'), true);
    assert.strictEqual(isValidDeviantArtUrl('https://deviantart.com/username/art/artwork-title-123456789'), true);
  });

  await t.test('should validate subdomain DeviantArt URLs', () => {
    assert.strictEqual(isValidDeviantArtUrl('https://username.deviantart.com/art/artwork-title-123456789'), true);
    assert.strictEqual(isValidDeviantArtUrl('http://username.deviantart.com/art/artwork-title-123456789'), true);
  });

  await t.test('should validate fav.me short URLs', () => {
    assert.strictEqual(isValidDeviantArtUrl('https://fav.me/d123456'), true);
    assert.strictEqual(isValidDeviantArtUrl('http://fav.me/d123456'), true);
  });

  await t.test('should reject invalid URLs', () => {
    assert.strictEqual(isValidDeviantArtUrl('https://www.google.com'), false);
    assert.strictEqual(isValidDeviantArtUrl('https://www.instagram.com/p/12345'), false);
    assert.strictEqual(isValidDeviantArtUrl('https://www.deviantart.com/username'), false);
    assert.strictEqual(isValidDeviantArtUrl('https://www.deviantart.com/username/gallery'), false);
    assert.strictEqual(isValidDeviantArtUrl('https://www.deviantart.com/username/art/artwork-title'), false);
    assert.strictEqual(isValidDeviantArtUrl('not-a-url'), false);
    assert.strictEqual(isValidDeviantArtUrl(''), false);
    assert.strictEqual(isValidDeviantArtUrl(null), false);
  });
});
