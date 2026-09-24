#![allow(unexpected_cfgs)]

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    system_program,
};

entrypoint!(process_instruction);

const PAYOUT_INSTRUCTION: u8 = 1;
const LEGACY_VAULT_SEED: &[u8] = b"legacy-vault";

/// Instruction data:
/// byte 0       = 1 (payout)
/// bytes 1..33  = legacy mint pubkey
/// bytes 33..41 = payout lamports, little endian u64
///
/// Accounts:
/// 0. [signer]   Worldz router authority
/// 1. [writable] Legacy SOL vault PDA
/// 2. [writable] HODLer recipient
/// 3. []         System Program
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.len() != 41 || instruction_data[0] != PAYOUT_INSTRUCTION {
        return Err(ProgramError::InvalidInstructionData);
    }

    let mut mint_bytes = [0u8; 32];
    mint_bytes.copy_from_slice(&instruction_data[1..33]);
    let legacy_mint = Pubkey::new_from_array(mint_bytes);

    let mut amount_bytes = [0u8; 8];
    amount_bytes.copy_from_slice(&instruction_data[33..41]);
    let lamports = u64::from_le_bytes(amount_bytes);
    if lamports == 0 {
        return Err(ProgramError::InvalidArgument);
    }

    let account_iter = &mut accounts.iter();
    let authority = next_account_info(account_iter)?;
    let vault = next_account_info(account_iter)?;
    let recipient = next_account_info(account_iter)?;
    let system_program_info = next_account_info(account_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if *system_program_info.key != system_program::id() {
        return Err(ProgramError::IncorrectProgramId);
    }

    let (expected_vault, bump) = Pubkey::find_program_address(
        &[
            LEGACY_VAULT_SEED,
            authority.key.as_ref(),
            legacy_mint.as_ref(),
        ],
        program_id,
    );
    if expected_vault != *vault.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if **vault.try_borrow_lamports()? < lamports {
        return Err(ProgramError::InsufficientFunds);
    }

    let bump_seed = [bump];
    let signer_seeds: &[&[u8]] = &[
        LEGACY_VAULT_SEED,
        authority.key.as_ref(),
        legacy_mint.as_ref(),
        &bump_seed,
    ];

    invoke_signed(
        &system_instruction::transfer(vault.key, recipient.key, lamports),
        &[vault.clone(), recipient.clone(), system_program_info.clone()],
        &[signer_seeds],
    )
}
