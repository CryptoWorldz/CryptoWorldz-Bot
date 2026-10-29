#!/usr/bin/env node
// Guard the WorldzLaunchPad homepage against reintroducing the oversized generic orbit.
const fs=require('node:fs');
const html=fs.readFileSync('launchpad.cryptoworldz.xyz/index.html','utf8');
const css=fs.readFileSync('launchpad.cryptoworldz.xyz/worldz-clean-home.css','utf8');
const required=['Create Token','Explore Tokens','Launch Station','/create-your-own-money/','/launch-station/','worldz-clean-home.css'];
for(const value of required) if(!html.includes(value)) throw new Error('Missing launchpad action: '+value);
if(!css.includes('.hero>*:not(.hero-copy){display:none!important}')) throw new Error('Legacy generic orbit is not hidden');
if(!css.includes('.topbar nav{display:none!important}')) throw new Error('Overcrowded legacy navigation is not hidden');
console.log('WorldzLaunchPad homepage smoke checks passed');
