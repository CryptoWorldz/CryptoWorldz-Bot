# WorldzFullBuild™ wallet and release standard

Status: build-branch design and validation gate. This file does not deploy a connector, authorize a transaction or turn on mainnet execution.

## The user journey

The person stays on a first-party Worldz website. Connect Wallet opens a supported external wallet approval flow from that page. Their wallet retains custody and signs only after the person reviews a specific transaction. On mobile, a wallet can hand the user to its own approval screen and return them to the same Worldz page; the website must not demand that they first paste its URL into a wallet browser.

A real wallet and device must prove this flow before any launch is described as ready. An injected provider or a connection bridge can be used per chain, with one consistent on-site entry point. Never request a seed phrase or private key.

## Every token launch

1. Publish a canonical, tappable production link. Verify the mobile page, buttons and long wallet addresses fit the viewport. No literal escape text in links.
2. Connect the intended owner wallet, display its full address and chain, and recover safely after an interrupted or returned wallet session. An unsupported connector reports a useful action on the same site.
3. Fetch and compare live mint or contract, authority, vault, multisig, token accounts and fee payer to the approved launch profile.
4. Show every recipient, raw token amount, remainder, rent, network fee and transaction instructions. Simulate the exact bytes and reject changes before broadcast.
5. For multisig, prove that create, approve and execute all reference the same reviewed message. Resume only after comparing the on-chain proposal.
6. Show separate evidence for connected, simulated, signed, submitted, confirmed, liquidity live, lock confirmed, vesting active and distribution complete. No status may be inferred from another.
7. Publish a receipt or a clear stop state, including recovery instructions, without pretending a page deployment has moved tokens.

This standard applies to WorldzLaunchPad launches and WorldzFullScope actions across supported chains. The connector and exact transaction verification are chain-specific, while the on-site user journey and release gates are shared.

## WLDZ and REVIVE evidence

The WLDZ launch feedback identified repeated mobile wallet connection trouble, hard-to-copy links, proposal and rent-recovery friction and status confusion. The REVIVE owner setup showed address overflow and a dead-end instruction to open a wallet browser. The first attempt at an on-site Jupiter bridge exposed duplicate React packages in the live browser. These are regression cases, not proof that every chain connector is working.

The REVIVE owner setup and distribution routes are pilots. A source change or a successful CI check is not enough: verify the live site, a real wallet connection, the exact approval screen and on-chain receipt before promoting that connector as the platform default. See [REVIVE launch settings](WORLDZLAUNCHPAD-LAUNCH-SETTINGS-PILOT.md).
