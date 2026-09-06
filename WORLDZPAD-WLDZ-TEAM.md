# WorldzPad™ — WLDZ Team Ownership

## Locked working allocation

- WORLDZ `$WLDZ` total supply: **100,000,000**.
- Initial LP remains **1,000,000 WLDZ / 1%** and is not part of the Team Pool.
- Team Pool: **6,000,000 WLDZ / 6% of total supply**.
- Team Pool is split **equally** between eligible active WorldzPad team profiles at allocation time.
- JayJayTeamDev remains the sole authorised deployer and is **excluded from the equal Team Pool**.
- Team names/wallets are not hard-coded in this public specification before allocation.

### Equal split examples

| Eligible team members | WLDZ each | Total-supply allocation each |
| ---: | ---: | ---: |
| 2 | 3,000,000 | 3.00% |
| 3 | 2,000,000 | 2.00% |
| 4 | 1,500,000 | 1.50% |
| 5 | 1,200,000 | 1.20% |
| 6 | 1,000,000 | 1.00% |

For other counts, G.R.A.C.E. calculates `6,000,000 / eligible member count`. Any indivisible smallest-unit rounding remainder stays in the Team Pool rather than favouring a member.

## G.R.A.C.E. vesting

Each member grant uses the same schedule:

- **20% unlocked at allocation**.
- **80% linear vesting over 12 months**.
- Locked/vesting WLDZ is **not eligible for SOL holder rewards**.
- Vested/unlocked WLDZ becomes reward eligible under the same token reward rules as other eligible holdings.

This gives the team meaningful ownership while reducing the risk of a large immediate team sell-off.

## Command Centre profile ownership

Every DEV/TEAM profile is designed to show:

1. WLDZ allocated to the profile.
2. Allocation as % of the fixed 100M supply.
3. Current verified on-chain WLDZ wallet balance.
4. Current wallet ownership as % of total supply.
5. Unlocked WLDZ.
6. Locked/vesting WLDZ.
7. Reward-eligible WLDZ.
8. DEV or TEAM role.

The **current ownership percentage is calculated from the verified on-chain wallet balance**, not manually entered. If tokens move, the percentage changes.

The separate Command Centre runtime is not stored in this repository. This repository publishes the machine-readable policy/schema that runtime can consume and deploys the public ZED/WorldzPad ownership surface.

## Promotion transparency

Team members may promote/support WLDZ and the Worldz ecosystem. Team ownership and vesting remain visible. WorldzPad does not encode guaranteed price, APY or return claims as part of team promotion.
