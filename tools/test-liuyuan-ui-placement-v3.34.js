'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inputStart = html.indexOf('<section id="view-input">');
const inputEnd = html.indexOf('</section>\n\n<dialog id="liuYuanDialog"', inputStart);
const resultStart = html.indexOf('<section id="view-result" hidden>');
const summaryIndex = html.indexOf('id="summary"', resultStart);
const cardIndex = html.indexOf('id="liuYuanLookupSection"', resultStart);
const buttonIndex = html.indexOf('id="openLiuYuanDialogBtn"', resultStart);
const observationIndex = html.indexOf('id="observationSection"', resultStart);

assert.ok(inputStart >= 0 && inputEnd > inputStart, 'birth-entry view boundaries must be found');
assert.ok(resultStart > inputEnd, 'query/results view must follow birth-entry view');
const inputMarkup = html.slice(inputStart, inputEnd);
assert.ok(!inputMarkup.includes('liuYuanLookupSection'), 'lookup card must not be on the birth-entry page');
assert.ok(!inputMarkup.includes('openLiuYuanDialogBtn'), 'lookup launcher must not be on the birth-entry page');
assert.ok(cardIndex > resultStart, 'lookup card must be inside query/results view');
assert.ok(buttonIndex > cardIndex, 'lookup button must be inside the dedicated lookup card');
assert.ok(summaryIndex >= 0 && summaryIndex < cardIndex, 'lookup card should follow the result summary');
assert.ok(observationIndex > cardIndex, 'lookup card should appear before observation/query panels');
assert.equal((html.match(/id="openLiuYuanDialogBtn"/g) || []).length, 1, 'exactly one lookup launcher must exist');
assert.equal((html.match(/id="liuYuanDialog"/g) || []).length, 1, 'exactly one lookup dialog must exist');
assert.ok(html.includes('不讀取出生資料'), 'lookup copy should state that birth data is not used');
console.log('PASS: Liu-Yuan lookup launcher resides in the query/results view, not the birth-entry page.');
