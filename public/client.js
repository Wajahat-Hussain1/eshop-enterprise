let activeUser = JSON.parse(localStorage.getItem('user')) || null;

function switchView(viewId) {
    document.querySelectorAll('.view-container').forEach(el => el.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    if(viewId === 'userSection') loadShopData();
    if(viewId === 'adminSection') loadAdminMetrics();
}

async function handleAuth(type) {
    const payload = {
        name: document.getElementById('authName').value,
        email: document.getElementById('authEmail').value,
        password: document.getElementById('authPassword').value,
        role: document.getElementById('authRole').value
    };
    const res = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(data.success) {
        if(type === 'login') {
            activeUser = data;
            localStorage.setItem('user', JSON.stringify(data));
            document.getElementById('welcomeMsg').innerText = `Logged in as: ${data.name} (${data.role})`;
            alert("Identity approved.");
        } else {
            alert("Account generated.");
        }
    } else { alert(data.error || "Execution failed."); }
}

async function loadShopData() {
    // Pull catalog items out from MongoDB collection references
    const prodRes = await fetch('/api/products');
    const products = await prodRes.json();
    let catalogHTML = '';
    products.forEach(p => {
        catalogHTML += `<div class="box" style="background:#fcfcfc">
            <h4>${p.name} - $${p.price}</h4>
            <button onclick="addToCart('${p._id}')">Add to Cart</button>
        </div>`;
    });
    document.getElementById('productCatalog').innerHTML = catalogHTML || "Execute /api/seed route to generate products.";

    if(!activeUser) return;
    const cartRes = await fetch(`/api/cart?userId=${activeUser.userId}`);
    const cart = await cartRes.json();
    let cartHTML = '<ul>';
    let total = 0;
    cart.items.forEach(i => {
        cartHTML += `<li>${i.productId.name} (x${i.quantity}) - $${i.productId.price * i.quantity}</li>`;
        total += (i.productId.price * i.quantity);
    });
    cartHTML += `</ul><strong>Running Total Accumulation: $${total.toFixed(2)}</strong>`;
    document.getElementById('cartDisplay').innerHTML = cartHTML;
    document.getElementById('payBtn').setAttribute('data-total', total);
}

async function addToCart(productId) {
    if(!activeUser) return alert("Identify your account session profile first.");
    await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.userId, productId })
    });
    loadShopData();
}

async function submitAddress() {
    const payload = {
        userId: activeUser.userId,
        street: document.getElementById('shipStreet').value,
        city: document.getElementById('shipCity').value,
        zip: document.getElementById('shipZip').value
    };
    await fetch('/api/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    alert("Address matched to user registration id inside SQL rows.");
}

async function triggerCheckout() {
    const cost = parseFloat(document.getElementById('payBtn').getAttribute('data-total'));
    if(!cost || cost <= 0) return alert("Basket compilation empty.");
    
    const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.userId, totalAmount: cost })
    });
    const result = await res.json();
    if(result.success) {
        alert(`Stripe transaction processed successfully!\nID: ${result.transactionId}`);
        loadShopData();
    }
}

async function loadAdminMetrics() {
    const headers = activeUser ? { 'role': activeUser.role } : {};
    const res = await fetch('/api/admin/metrics', { headers });
    const data = await res.json();
    
    document.getElementById('metricTraffic').innerText = data.trafficHits;

    let orderHTML = '<table border="1" style="width:100%; border-collapse:collapse;" cellpadding="6"><tr><th>OrderID</th><th>Total</th><th>Status</th><th>Action</th></tr>';
    data.orders.forEach(o => {
        orderHTML += `<tr>
            <td>${o.id}</td>
            <td>$${o.total_amount}</td>
            <td><span style="color:${o.delivery_status==='Delivered'?'green':'orange'}">${o.delivery_status}</span></td>
            <td>${o.delivery_status==='Pending'?`<button onclick="markDelivered(${o.id})">Mark Delivered</button>`:'Complete'}</td>
        </tr>`;
    });
    orderHTML += '</table>';
    document.getElementById('adminOrdersTable').innerHTML = orderHTML;
}

async function markDelivered(orderId) {
    await fetch('/api/admin/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
    });
    loadAdminMetrics();
}