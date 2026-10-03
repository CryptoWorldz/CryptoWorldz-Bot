# Worldz Squads™

Build: 2026-10-04  
Status: BUILT / production runtime verification pending

Worldz Squads is the native Worldz team competition layer.

## Core surfaces

- WorldzLaunchPad public Squads leaderboard: `/squads/`
- Command Centre authenticated Squads screen
- Telegram: `/squads`, `/squad`, `/createsquad`, `/joinsquad`, `/leavesquad`
- THECHAOS remains linked to the existing Pump.fun Squad through the official invite.

## Competition data

Each 1D / 1W / 1M view can expose:

- verified trading PNL;
- banked value;
- trade volume and trade count;
- Legend Points earned in the window;
- approved Raids;
- approved Shills;
- member contribution rows.

Trading metrics are fail-closed: `worldz_squad_performance` is read by Worldz but can only be written by the trusted service role. The UI explicitly says when trading PNL has not yet been indexed.

## Membership

- One active Squad per registered Worldz Legend.
- Open Squads can be joined instantly.
- Squad owners cannot leave without a future ownership-transfer/archive flow.
- New Squad names/slugs are validated server-side.

## Share cards

The Command Centre generates a Worldz-branded Squad card locally in the browser with PNL, banked value, Legend Points, Raids, Shills and member count. The user can save or share the PNG without sending private keys or seed phrases anywhere.

## Existing community systems reused

Worldz Squads does not create a second points economy. It reads the existing Worldz rewards, Raid and Shill records. Treasury signing remains separate from Squad scoring.
