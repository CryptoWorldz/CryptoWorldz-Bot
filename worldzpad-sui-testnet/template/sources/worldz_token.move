module worldz_sui_token::worldz_token;

use std::string::String;
use sui::coin::Coin;
use sui::coin_registry::{Self, CoinRegistry};

const EZeroSupply: u64 = 1;

/// Unique type for this published package instance.
/// Re-publishing the same audited bytecode creates a new package address,
/// therefore a new coin type without generating untrusted Move source.
public struct WorldzToken has key {
    id: UID,
}

/// One-use capability created for the package publisher.
/// It is consumed when the fixed-supply currency is initialized.
public struct PublisherCap has key, store {
    id: UID,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(
        PublisherCap { id: object::new(ctx) },
        ctx.sender(),
    );
}

/// Creates exactly one Worldz-supported fixed-supply Sui currency.
///
/// Security properties:
/// - supply must be non-zero;
/// - caller must own the one-use PublisherCap;
/// - full supply is minted once;
/// - TreasuryCap is irreversibly locked into Currency as fixed supply;
/// - MetadataCap is deleted at finalization, making metadata immutable;
/// - no deny list / global pause / blacklist capability is created;
/// - no transfer tax exists in the token package.
///
/// Returns the complete minted supply to the publisher's PTB.
public fun create_fixed_supply(
    cap: PublisherCap,
    registry: &mut CoinRegistry,
    decimals: u8,
    symbol: String,
    name: String,
    description: String,
    icon_url: String,
    total_supply: u64,
    ctx: &mut TxContext,
): Coin<WorldzToken> {
    assert!(total_supply > 0, EZeroSupply);

    let PublisherCap { id } = cap;
    id.delete();

    let (mut currency, mut treasury_cap) = coin_registry::new_currency<WorldzToken>(
        registry,
        decimals,
        symbol,
        name,
        description,
        icon_url,
        ctx,
    );

    let full_supply = treasury_cap.mint(total_supply, ctx);

    // Irreversible fixed supply: no TreasuryCap remains in a creator wallet.
    currency.make_supply_fixed(treasury_cap);

    // Worldz fixed preset: immutable metadata once launch initialization completes.
    currency.finalize_and_delete_metadata_cap(ctx);

    full_supply
}
