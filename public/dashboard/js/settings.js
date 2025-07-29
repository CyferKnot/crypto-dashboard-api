// public/js/settings.js

document.addEventListener('DOMContentLoaded', () => {
  populateChainOptions();
  fetchWallets();

  document.getElementById('wallet-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const address = document.getElementById('walletAddress').value.trim();
    const label = document.getElementById('walletLabel').value.trim();
    const chain = document.getElementById('walletChain').value.trim();

    const res = await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, label, chain })
    });

    if (res.ok) {
      fetchWallets();
      document.getElementById('wallet-form').reset();
      // bootstrap.Modal.getInstance(document.getElementById('walletSettingsModal')).hide();
    }
  });
});

async function populateChainOptions() {
  const res = await fetch('/api/settings/chains');
  const chains = await res.json();

  const select = document.getElementById('walletChain');
  select.innerHTML = ''; // Clear existing options

  chains.forEach(c => {
    const option = document.createElement('option');
    option.value = c.key;
    option.textContent = c.value;
    select.appendChild(option);
  });
}

async function fetchWallets() {
  const res = await fetch('/api/wallets');
  const wallets = await res.json();
  const tbody = document.getElementById('wallets-table-body');
  tbody.innerHTML = '';

  for (const wallet of wallets) {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${wallet.label || ''}</td>
      <td><code>${wallet.address}</code></td>
      <td>${wallet.chain}</td>
      <td>
        <button class="btn btn-sm btn-danger" data-address="${wallet.address}" data-chain="${wallet.chain}">
          🗑️
        </button>
      </td>
    `;

    row.querySelector('button').addEventListener('click', async () => {
      if (!confirm(`Delete wallet ${wallet.label || wallet.address}?`)) return;

      await fetch(`/api/wallets/${wallet.address}/${wallet.chain}`, { method: 'DELETE' });
      fetchWallets();
    });

    tbody.appendChild(row);
  }
}

async function deleteWallet(id) {
  await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
  fetchWallets();
}


