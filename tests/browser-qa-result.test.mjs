import test from 'node:test';
import assert from 'node:assert/strict';
import {renderedQaResult,renderedQaPassed}
 from '../tools/browser-qa-result.mjs';

test('PASS token in inline script cannot fake a successful Firebase browser match',()=>{
 const stalled='<!doctype html><html><body><strong id="result">ONLINE-EMBED-WAIT</strong>'+
  '<script>result.textContent="SITES-FIREBASE-FRIENDS-EMULATOR-PASS real two-iframe";</script></body></html>';
 assert.equal(stalled.includes('SITES-FIREBASE-FRIENDS-EMULATOR-PASS'),true);
 assert.equal(renderedQaResult(stalled),'ONLINE-EMBED-WAIT');
 assert.equal(renderedQaPassed(stalled,'SITES-FIREBASE-FRIENDS-EMULATOR-PASS'),false);
});

test('only actual result node with PASS prefix and details can pass',()=>{
 const html='<html><strong id="result">SITES-FIREBASE-FRIENDS-EMULATOR-PASS real two-iframe, ACK, pin</strong>'+
  '<script>result.textContent="SITES-ONLINE-FAIL";</script></html>';
 assert.equal(renderedQaPassed(html,'SITES-FIREBASE-FRIENDS-EMULATOR-PASS'),true);
 assert.equal(renderedQaPassed(html,'SITES-ONLINE-SETUP-PASS'),false);
 assert.equal(renderedQaPassed(html,'SITES-FIREBASE-FRIENDS-EMULATOR-PA'),false);
 assert.equal(renderedQaResult('no visible QA result'),null);
});

test('failed, empty and missing QA nodes are never successful',()=>{
 for(const html of [
  '<strong id="result">SITES-ONLINE-FAIL target ACK</strong>',
  '<strong id="result">SITES-FIREBASE-FRIENDS-EMULATOR-PASS</strong>',
  '<strong id="result">ONLINE-EMBED-WAIT</strong>',
  '<script>SITES-FIREBASE-FRIENDS-EMULATOR-PASS fake</script>',
  ''
 ])assert.equal(renderedQaPassed(html,'SITES-FIREBASE-FRIENDS-EMULATOR-PASS'),false);
});
