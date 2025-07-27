document.addEventListener('DOMContentLoaded', () => {
  async function openTargetModal(symbol = '') {
    console.log('openTargetModal called');
    const form = document.getElementById('target-form');
    form.reset();

    const title = document.querySelector('#targetModalLabel');
    const symbolInput = document.getElementById('symbol');
    const coingeckoInput = document.getElementById('coingeckoId');

    if (symbol) {
      title.textContent = `Edit Targets for ${symbol.toUpperCase()}`;
      symbolInput.value = symbol;
      symbolInput.readOnly = true;
      try {
        const res = await fetch(`/api/targets/${symbol.toUpperCase()}`);
        const target = await res.json();

        if (!target || target.error) {
          console.warn('No target data found for symbol:', symbol);
          return;
        }

        document.getElementById('buy').value = target.buy_target ?? '';
        document.getElementById('profit').value = target.profit_target ?? '';
        document.getElementById('buyTaxInput').value = target.buy_tax ?? '';
        document.getElementById('sellTaxInput').value = target.sell_tax ?? '';
        coingeckoInput.value = target.coingecko_id ?? '';
      } catch (err) {
        console.error('Failed to load target details:', err);
      }
    } else {
      title.textContent = 'Add New Target';
      symbolInput.value = '';
      symbolInput.readOnly = false;
      coingeckoInput.value = '';
    }

    populateSymbolDatalist();

    const modal = new bootstrap.Modal(document.getElementById('targetModal'));
    modal.show();
  }

  document.getElementById('target-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const token_symbol = document.getElementById('symbol').value.trim();
    const buy_target = parseFloat(document.getElementById('buy').value);
    const profit_target = parseFloat(document.getElementById('profit').value);
    const buy_tax = parseFloat(document.getElementById('buyTaxInput').value) || 0;
    const sell_tax = parseFloat(document.getElementById('sellTaxInput').value) || 0;
    const coingecko_id = document.getElementById('coingeckoId').value.trim();

    if (!token_symbol || isNaN(buy_target) || isNaN(profit_target)) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      console.log('modal.js Coingecko ID:', coingecko_id)
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_symbol, buy_target, profit_target, buy_tax, sell_tax, coingecko_id })
      });

      const result = await response.json();
      if (response.ok) {
        alert('Target saved!');
        bootstrap.Modal.getInstance(document.getElementById('targetModal')).hide();
        location.reload();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    }
  });

  async function populateSymbolDatalist() {
    console.log('populateSymbolDatalist called');
    const datalist = document.getElementById('symbolOptions');
    if (!datalist) {
      console.error('No datalist found');
      return;
    }
    datalist.innerHTML = ''; // clear existing options

    try {
      const response = await fetch('/api/holdings');
      const holdings = await response.json();

      console.log('Holdings response:', holdings);

      holdings.forEach(({ token_symbol }) => {
        if (token_symbol) {
          const option = document.createElement('option');
          option.value = token_symbol;
          datalist.appendChild(option);
        }
      });
    } catch (err) {
      console.error('Failed to load symbol options:', err);
    }
  }

  window.openTargetModal = openTargetModal; // 🔑 expose to global scope for HTML inline onclick
});
