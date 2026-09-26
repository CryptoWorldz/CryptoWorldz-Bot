import { getWallets } from 'https://esm.sh/@wallet-standard/app@1.1.0?bundle';

const connectButton = document.getElementById('connect-wallet');
const walletChoice = document.getElementById('wallet-choice');
const signButton = document.getElementById('sign-proof');
const disconnectButton = document.getElementById('disconnect-wallet');
const status = document.getElementById('wallet-status');
const messageBox = document.getElementById('proof-message');
let active = null;
let challenge = null;

function availableWallets() {
  return getWallets().get().filter(wallet =>
    wallet.chains?.some(chain => String(chain).startsWith('solana:')) &&
    wallet.features?.['standard:connect'] && wallet.features?.['solana:signMessage']
  );
}
function refreshWallets() {
  const previous = walletChoice.value;
  walletChoice.replaceChildren(new Option('Choose a wallet', ''));
  availableWallets().forEach((wallet, index) => walletChoice.add(new Option(wallet.name, String(index))));
  if ([...walletChoice.options].some(option => option.value === previous)) walletChoice.value = previous;
}
getWallets().on('register', refreshWallets);
getWallets().on('unregister', refreshWallets);
refreshWallets();
function reset() {
  active = null;
  challenge = null;
  signButton.disabled = true;
  disconnectButton.disabled = true;
  connectButton.textContent = 'Connect Solana wallet';
  messageBox.textContent = 'Connect your wallet to see the exact message.';
  status.textContent = 'No wallet connected.';
}
function prepareMessage(address) {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, '0')).join('');
  return [
    'TURN_UP_TOWN_WALLET_PROOF_V1',
    'domain=' + location.host,
    'action=PROVE_WALLET_CONTROL_ONLY',
    'wallet=' + address,
    'nonce=' + nonce,
    'issued_at=' + new Date().toISOString(),
    'This signature does not approve a token transfer, claim, or RVIV launch.'
  ].join('\n');
}
connectButton.addEventListener('click', async () => {
  try {
    const wallets = availableWallets();
    if (!wallets.length) throw new Error('No compatible Solana wallet found. Open this page in a wallet browser or install a Wallet Standard wallet.');
    if (walletChoice.value === '') throw new Error('Choose a wallet from the list first.');
    const wallet = wallets[Number(walletChoice.value)];
    if (!wallet) throw new Error('Chosen wallet is unavailable. Please choose again.');
    const connected = await wallet.features['standard:connect'].connect();
    const account = (connected?.accounts || wallet.accounts || []).find(item =>
      item.chains?.some(chain => String(chain).startsWith('solana:'))
    );
    if (!account?.address) throw new Error('Wallet did not return a Solana account.');
    active = { wallet, account };
    challenge = prepareMessage(account.address);
    messageBox.textContent = challenge;
    status.textContent = wallet.name + ' connected: ' + account.address + '. Read the message before signing.';
    connectButton.textContent = 'Change wallet';
    signButton.disabled = false;
    disconnectButton.disabled = false;
  } catch (error) {
    reset();
    status.textContent = 'Connection stopped: ' + (error?.message || error);
  }
});
signButton.addEventListener('click', async () => {
  if (!active || !challenge) return;
  signButton.disabled = true;
  try {
    const result = await active.wallet.features['solana:signMessage'].signMessage({
      account: active.account,
      message: new TextEncoder().encode(challenge),
    });
    if (!result?.[0]?.signature?.length) throw new Error('Wallet returned no signature.');
    status.textContent = 'Message signed locally for ' + active.account.address + '. No claim or launch approval was submitted.';
    challenge = null; // Never reuse a signed challenge.
    messageBox.textContent = 'Proof message signed locally. Reconnect to prepare a fresh challenge.';
  } catch (error) {
    status.textContent = 'Signature stopped: ' + (error?.message || error);
    signButton.disabled = false;
  }
});
disconnectButton.addEventListener('click', async () => {
  try { await active?.wallet.features?.['standard:disconnect']?.disconnect(); } catch { /* Clear local state regardless. */ }
  reset();
});
