// public/js/settings.js

document.addEventListener('DOMContentLoaded', () => {
  fetchChains();
  populateChainOptions();
  fetchWallets();

  document.getElementById('chain-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('chainKey').value.trim();
    const label = document.getElementById('chainLabel').value.trim();

    if (!key || !label) return;

    await fetch('/api/chains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label })
    });

    document.getElementById('chain-form').reset();
    fetchChains();
  });

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

async function fetchChains() {
  const res = await fetch('/api/chains');
  const chains = await res.json();

  const tbody = document.getElementById('chains-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  chains.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><code>${c.key}</code></td>
      <td>${c.value}</td>
      <td>
        <button class="btn btn-sm btn-danger" data-key="${c.key}">🗑️</button>
      </td>
    `;
    row.querySelector('button').addEventListener('click', async () => {
      if (!confirm(`Delete chain "${c.value}"?`)) return;

      await fetch(`/api/chains/${c.key}`, { method: 'DELETE' });
      fetchChains();
    });
    tbody.appendChild(row);
  });
}

async function populateChainOptions() {
  try {
    const res = await fetch('/api/chains'); // <- use this
    const chains = await res.json();
    console.log('Dropdown chains:', chains);

    const select = document.getElementById('walletChain');
    if (!select) {
      console.warn('#walletChain not found in DOM when populateChainOptions ran');
      return;
    }

    select.innerHTML = '';
    chains.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.key;       // 'eth'
      opt.textContent = c.value; // 'Ethereum'
      select.appendChild(opt);
    });
  } catch (e) {
    console.error('populateChainOptions failed:', e);
  }
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
