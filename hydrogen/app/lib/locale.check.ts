import assert from 'node:assert/strict';
import {parseLocale, shouldPrefixLocale, stripLocale, withLocale} from './locale.ts';

assert.equal(parseLocale('/en-kr/products/hat')?.country, 'KR');
assert.equal(parseLocale('/en-kr/products/hat')?.language, 'EN');
assert.equal(parseLocale('/products/hat'), null);
assert.equal(stripLocale('/en-kr/products/hat'), '/products/hat');
assert.equal(stripLocale('/en-kr'), '/');
assert.equal(stripLocale('/en-asia/collections/all'), '/collections/all');
assert.equal(
  withLocale('/en-asia/collections/all', {language: 'EN', country: 'KR'}),
  '/en-kr/collections/all',
);
assert.equal(
  withLocale('/en-us/products/hat?size=M', {language: 'EN', country: 'KR'}),
  '/en-kr/products/hat?size=M',
);
assert.equal(withLocale('/', {language: 'EN', country: 'US'}), '/en-us');
assert.equal(shouldPrefixLocale('/products/hat'), true);
assert.equal(shouldPrefixLocale('/en-us'), false);
assert.equal(shouldPrefixLocale('/robots.txt'), false);
assert.equal(shouldPrefixLocale('/account/authorize'), false);

console.log('locale.check ok');
