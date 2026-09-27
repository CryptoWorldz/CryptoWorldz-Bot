"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

test("Android unsigned manifest preparer rejects substitute and insecure logo URLs",async()=>{
  const mod=await import("../tools/prepare-worldzapp-android-unsigned.mjs");
  const template={
    packageId:"xyz.cryptoworldz.worldzapp",
    host:"launchpad.cryptoworldz.xyz",
    name:"WorldzApp™",
    launcherName:"WorldzApp",
    display:"standalone",
    themeColor:"#6d28d9",
    themeColorDark:"#05020b",
    navigationColor:"#05020b",
    navigationColorDark:"#05020b",
    navigationDividerColor:"#05020b",
    navigationDividerColorDark:"#05020b",
    backgroundColor:"#05020b",
    enableNotifications:false,
    startUrl:"/worldz-app/",
    splashScreenFadeOutDuration:300,
    appVersion:"0.1.0",
    appVersionCode:1,
    shortcuts:[],
    fingerprints:[],
    additionalTrustedOrigins:[]
  };
  const contract={androidIdentity:{candidateApplicationId:"xyz.cryptoworldz.worldzapp"}};
  const logo={state:"APPROVED_SOURCE_IDENTIFIED__FIRST_PARTY_WEB_DERIVATIVE_PENDING"};
  assert.throws(()=>mod.buildUnsignedManifest({
    template,contract,logo,
    iconUrl:"http://launchpad.cryptoworldz.xyz/worldz-app/assets/approved.jpg",
    maskableIconUrl:"https://launchpad.cryptoworldz.xyz/worldz-app/assets/approved.jpg"
  }),/HTTPS_REQUIRED/);
  assert.throws(()=>mod.buildUnsignedManifest({
    template,contract,logo,
    iconUrl:"https://launchpad.cryptoworldz.xyz/worldz-app/worldz-app-icon.svg",
    maskableIconUrl:"https://launchpad.cryptoworldz.xyz/worldz-app/assets/approved.jpg"
  }),/PLACEHOLDER_OR_REJECTED_ASSET/);
  const out=mod.buildUnsignedManifest({
    template,contract,logo,
    iconUrl:"https://launchpad.cryptoworldz.xyz/worldz-app/assets/worldz-center-logo-approved-512.jpg",
    maskableIconUrl:"https://launchpad.cryptoworldz.xyz/worldz-app/assets/worldz-center-logo-approved-maskable-512.jpg"
  });
  assert.equal(out.packageId,"xyz.cryptoworldz.worldzapp");
  assert.equal(Object.prototype.hasOwnProperty.call(out,"signingKey"),false);
});
