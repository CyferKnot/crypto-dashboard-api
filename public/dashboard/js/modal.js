function openTargetModal(tokenSymbol, tokenName = tokenSymbol) {
  document.getElementById('modalTokenSymbol').value = tokenSymbol;
  document.getElementById('modalTokenName').innerText = tokenName;
  // Optional: prefill inputs if data is available
  fetch(`/api/targets/${tokenSymbol}`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        document.getElementById('buyTarget').value = data.buy_target ?? '';
        document.getElementById('profitTarget').value = data.profit_target ?? '';
        document.getElementById('buyTax').value = data.buy_tax ?? '';
        document.getElementById('sellTax').value = data.sell_tax ?? '';
      } else {
        // Clear fields if no data exists
        ['buyTarget', 'profitTarget', 'buyTax', 'sellTax'].forEach(id => {
          document.getElementById(id).value = '';
        });
      }
    });

  const modal = new bootstrap.Modal(document.getElementById('targetModal'));
  modal.show();
}

document.getElementById('saveTargetBtn').addEventListener('click', async () => {
  const token_symbol = document.getElementById('modalTokenSymbol').value;
  const buy_target = parseFloat(document.getElementById('buyTarget').value);
  const profit_target = parseFloat(document.getElementById('profitTarget').value);
  const buy_tax = parseFloat(document.getElementById('buyTax').value) || 0;
  const sell_tax = parseFloat(document.getElementById('sellTax').value) || 0;

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
      location.reload(); // Or update the DOM manually
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    console.error(err);
    alert('Network error.');
  }
});

