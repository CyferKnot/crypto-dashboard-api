document.addEventListener('DOMContentLoaded', () => {
  function openTargetModal(symbol = '') {
    const form = document.getElementById('target-form');
    form.reset();

    const title = document.querySelector('#targetModalLabel');
    const symbolInput = document.getElementById('symbol');

    if (symbol) {
      title.textContent = `Edit Targets for ${symbol.toUpperCase()}`;
      symbolInput.value = symbol;
      symbolInput.readOnly = true;
    } else {
      title.textContent = 'Add New Target';
      symbolInput.value = '';
      symbolInput.readOnly = false;
      populateSymbolDatalist();
    }

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

    if (!token_symbol || isNaN(buy_target) || isNaN(profit_target)) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_symbol, buy_target, profit_target, buy_tax, sell_tax })
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

  window.openTargetModal = openTargetModal; // 🔑 expose to global scope for HTML inline onclick
});

async function populateSymbolDatalist() {
  const datalist = document.getElementById('symbolOptions');
  datalist.innerHTML = ''; // clear existing options

  try {
    const response = await fetch('/api/holdings');
    const holdings = await response.json();

    // console.log('Holdings response:', holdings);

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
