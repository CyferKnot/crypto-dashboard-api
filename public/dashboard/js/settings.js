// public/js/settings.js

document.addEventListener('DOMContentLoaded', () => {
  fetchWallets();

  document.getElementById('wallet-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const address = document.getElementById('walletAddress').value.trim();
    const label = document.getElementById('walletLabel').value.trim();
    const chain = document.getElementById('walletChain').value.trim();

    const res = await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, chain })
    });

    if (res.ok) {
      fetchWallets();
      document.getElementById('wallet-form').reset();
      // bootstrap.Modal.getInstance(document.getElementById('walletSettingsModal')).hide();
    }
  });
});

// async function fetchWallets() {
//   const res = await fetch('/api/settings/wallets');
//   const wallets = await res.json();
//   const tableBody = document.getElementById('wallets-table-body');
//   tableBody.innerHTML = '';

//   wallets.forEach(w => {
//     const row = document.createElement('tr');
//     row.innerHTML = `
//       <td>${w.address}</td>
//       <td>${w.chain}</td>
//       <td><button class="btn btn-danger btn-sm" onclick="deleteWallet(${w.id})">Delete</button></td>
//     `;
//     tableBody.appendChild(row);
//   });
// }

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
  await fetch(`/api/settings/wallets/${id}`, { method: 'DELETE' });
  fetchWallets();
}

// document.addEventListener('DOMContentLoaded', () => {
//   fetchWallets();
// });