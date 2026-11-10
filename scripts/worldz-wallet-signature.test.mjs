import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicKey,verify} from 'node:crypto';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(s){let n=0n;for(const c of s){const i=alphabet.indexOf(c);if(i<0)throw Error('invalid base58');n=n*58n+BigInt(i)}const hex=n.toString(16).padStart(2,'0');const bytes=Buffer.from(hex.length%2?'0'+hex:hex,'hex');return Buffer.concat([Buffer.alloc(s.match(/^1*/)[0].length),bytes]);}
const wallet='8VZZ7j63E2ARRNho4SwqFthUjWnWK8S5BHPfmJCb4UHK';
const signature='3WbNc6prN7qvciJwxVod6BLoJHSQG5LCfpYJC5zX7yaP9W9SAtRDJx4u1WFvKTLEQ1bkwwATE1UYCtKw2LCsCpo2';
const message='WORLDZ INCORPORATED — Wallet ownership verification only. No token transfer or transaction authorisation. 2026-11-09.';
test('Jupiter developer wallet signed the exact non-transaction ownership challenge',()=>{const pub=b58(wallet),sig=b58(signature);assert.equal(pub.length,32);assert.equal(sig.length,64);const spki=Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),pub]);const key=createPublicKey({key:spki,format:'der',type:'spki'});assert.equal(verify(null,Buffer.from(message,'utf8'),key,sig),true)});
