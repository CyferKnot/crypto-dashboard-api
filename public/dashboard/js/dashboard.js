function populateSymbolDatalist() {
  fetch('/api/wallet-scan?address=0x6E2F0275920F00e587ABD476Af915ab71A45C76C')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;
      const symbols = [...new Set(data.map(h => h.symbol).filter(Boolean))];  // Unique + no empty
      const datalist = document.getElementById('symbolOptions');
      datalist.innerHTML = '';
      symbols.forEach(sym => {
        const option = document.createElement('option');
        option.value = sym;
        datalist.appendChild(option);
      });
    });
}

async function fetchHoldings() {
  try {
    // const res = await fetch('/api/wallet-scan?address=0x6E2F0275920F00e587ABD476Af915ab71A45C76C');
    const res = await fetch('/api/holdings');
    const holdingsData = await res.json();
    if (!Array.isArray(holdingsData)) {
      console.error("Expected array from /api/holdings but got:", data);
      return;
    }

    const tbody = document.querySelector('#holdings-table tbody');
    tbody.innerHTML = '';
    holdingsData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.token_symbol}</td>
        <td>${row.token_address}</td>
        <td>${parseFloat(row.balance).toFixed(4)}</td>
        <td>$${parseFloat(row.usd_price).toFixed(2)}</td>
        <td>$${parseFloat(row.usd_value).toFixed(2)}</td>
        <td>${row.coingecko_id || '<i>None</i>'}</td>
      `;
      tbody.appendChild(tr);
    });
    console.log('Chart data:', holdingsData);
    renderHoldingsChart(holdingsData); // ✅ Chart gets rendered here

  } catch (err) {
    console.error('Failed to fetch holdings:', err);
  }
}

async function fetchTargets() {
  const res = await fetch('/api/targets');
  const text = await res.text();  // ← get raw response body
  console.log('Raw response:', text);  // ← DEBUG

  try {
    const TargetData = JSON.parse(text);     // ← convert safely
    if (!Array.isArray(TargetData)) throw new Error('Expected array');

    const tbody = document.querySelector('#targets-table tbody');
    tbody.innerHTML = '';
    TargetData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.token_symbol}</td>
        <td>${row.buy_target ?? ''}</td>
        <td>${row.profit_target ?? ''}</td>
        <td>${row.alert_sent ? '✅' : ''}</td>
        <td><button class="btn btn-outline-primary btn-sm" onclick="openTargetModal('${row.token_symbol}')">Edit</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to parse targets:', err.message);
    console.error('Actual TargetData:', text);
  }
}

async function fetchAlertsLog() {
  const res = await fetch('/api/targets/alerts-log');
  const logData = await res.json();
  const tbody = document.querySelector('#alerts-log-table tbody');
  tbody.innerHTML = '';
  logData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.token_symbol}</td>
      <td>${new Date(row.triggered_at).toLocaleString()}</td>
      <td>$${parseFloat(row.trigger_price).toFixed(2)}</td>
      <td>${row.direction}</td>
      <td>${row.action}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderHoldingsChart(holdings) {
  const ctx = document.getElementById('holdingsChart').getContext('2d');

  const labels = holdings.map(t => t.token_symbol || t.symbol || t.coingecko_id || 'Unknown');
  const data = holdings.map(h => h.usd_value);

  const categoryColors = {
    'L1': '#627eea',
    'AI': '#8e44ad',
    'RWA': '#3498db',
    'DEX': '#16a085',
    'Gaming': '#e67e22',
    'Infra': '#2c3e50',
    'Tools': '#f39c12',
    'Other': '#7f8c8d'
  };


  new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'USD Value',
        data,
        backgroundColor: holdings.map(t => categoryColors[t.category] || categoryColors['Other']),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' },
        title: {
          display: true,
          text: 'Token Distribution (by USD value)'
        }
      }
    }
  });
}

document.getElementById('target-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  console.log('dashboard.js target-form submit handler triggered');

  const token_symbol = document.getElementById('symbol').value.trim();
  const buy_target = parseFloat(document.getElementById('buy').value);
  const profit_target = parseFloat(document.getElementById('profit').value);
  const coingecko_id = document.getElementById('coingeckoId').value.trim();
  const buyTax = document.getElementById('buyTaxInput').value || 0;
  const sellTax = document.getElementById('sellTaxInput').value || 0;

  const payload = {
    token_symbol,
    buy_target,
    profit_target,
    coingecko_id,
    buy_tax: parseFloat(buyTax),
    sell_tax: parseFloat(sellTax),
  };

  if (!isNaN(buy_target)) payload.buy_target = buy_target;
  if (!isNaN(profit_target)) payload.profit_target = profit_target;

  await fetch('/api/targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  document.getElementById('target-form').reset();
  fetchTargets();
});

document.getElementById('sync-btn').addEventListener('click', async () => {
  const status = document.getElementById('sync-status');
  status.textContent = 'Syncing... ⏳';

  try {
    const res = await fetch('/api/sync-wallets', {
      method: 'POST'
    });

    if (!res.ok) throw new Error('Sync failed');

    status.textContent = '✅ Sync complete!';
    await fetchHoldings(); // Refresh dashboard
  } catch (err) {
    console.error('Sync error:', err);
    status.textContent = '❌ Sync failed';
  }

  setTimeout(() => status.textContent = '', 4000); // Clear message after 4s
});

fetchHoldings();
fetchTargets();
fetchAlertsLog();
