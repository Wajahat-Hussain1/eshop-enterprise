import { useState, useEffect } from 'react';

export default function App() {
  const [view, setView] = useState('landing'); 
  const [session, setSession] = useState(null); 
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [] });
  
  // Form State Inputs
  const [authForm, setAuthForm] = useState({ name: '', email: '', username: '', password: '' });
  const [prodForm, setProdForm] = useState({ name: '', price: '', ram: '', storage: '' });
  const [addressForm, setAddressForm] = useState({ street: '', city: '', zip: '' });
  const [adminMetrics, setAdminMetrics] = useState({ orders: [], trafficHits: 0 });
  const [activeAddressId, setActiveAddressId] = useState(null);

  // Core functions declared first so JavaScript references them correctly
  const loadCatalog = async () => {
    const res = await fetch('http://localhost:3000/api/products');
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => { 
    loadCatalog(); 
  }, []);

  const handleLogin = async (endpoint, payload) => {
    const res = await fetch(`http://localhost:3000/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      setSession(data);
      if (data.role === 'admin') {
        setView('admin');
        loadAdminPanel();
      } else {
        setView('user');
        loadUserCart(data.userId);
      }
    } else { alert(data.error || "Authentication security block dropped."); }
  };

  const loadUserCart = async (uid) => {
    const res = await fetch(`http://localhost:3000/api/cart?userId=${uid}`);
    const data = await res.json();
    setCart(data);
  };

  const addToCart = async (pid) => {
    await fetch('http://localhost:3000/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.userId, productId: pid })
    });
    loadUserCart(session.userId);
  };

  const removeFromCart = async (pid) => {
    if (!pid) return;
    await fetch('http://localhost:3000/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.userId, productId: pid })
    });
    loadUserCart(session.userId);
  };

  const submitAddress = async () => {
  if(!addressForm.street || !addressForm.city || !addressForm.zip) {
    return alert("Please fill out all address fields before saving.");
  }
  const res = await fetch('http://localhost:3000/api/address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: session.userId,
      street: addressForm.street,
      city: addressForm.city,
      zip: addressForm.zip
    })
  });
  const data = await res.json();
  if(data.success) {
    setActiveAddressId(data.addressId); // Keep track of the active address ID
    alert(data.message);
  } else {
    alert("Failed to save address to MySQL.");
  }
};

const triggerStripePayment = async () => {
  const total = cart.items.reduce((sum, item) => sum + ((item.productId?.price || 0) * item.quantity), 0);
  if(total <= 0) return alert("Your cart is empty!");
  if(!activeAddressId) return alert("Please fill out and click 'Save Address to SQL' before paying!");

  const res = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId: session.userId, 
      totalAmount: total,
      addressId: activeAddressId // Sending the chosen address ID right here
    })
  });
  const data = await res.json();
  if(data.success) {
    alert(`Stripe Authorization Success! Transaction ID: ${data.transactionId}`);
    setActiveAddressId(null); // Reset after order completion
    loadUserCart(session.userId);
  } else {
    alert(data.error || "Checkout request rejected.");
  }
};

  // const submitAddress = async () => {
  //   if(!addressForm.street || !addressForm.city || !addressForm.zip) {
  //     return alert("Please fill out all address fields before saving.");
  //   }
  //   const res = await fetch('http://localhost:3000/api/address', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       userId: session.userId,
  //       street: addressForm.street,
  //       city: addressForm.city,
  //       zip: addressForm.zip
  //     })
  //   });
  //   const data = await res.json();
  //   if(data.success) {
  //     alert(data.message);
  //   } else {
  //     alert("Failed to save address to MySQL.");
  //   }
  // };

  // const triggerStripePayment = async () => {
  //   const total = cart.items.reduce((sum, item) => sum + ((item.productId?.price || 0) * item.quantity), 0);
  //   if(total <= 0) return alert("Your cart is empty!");

  //   const res = await fetch('http://localhost:3000/api/checkout', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ userId: session.userId, totalAmount: total })
  //   });
  //   const data = await res.json();
  //   if(data.success) {
  //     alert(`Stripe Authorization Success! Transaction ID: ${data.transactionId}`);
  //     loadUserCart(session.userId);
  //   }
  // };

  const loadAdminPanel = async () => {
    const res = await fetch('http://localhost:3000/api/admin/metrics');
    const data = await res.json();
    setAdminMetrics(data);
  };

  const submitNewProduct = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prodForm.name,
        price: parseFloat(prodForm.price),
        specifications: { Key: prodForm.ram, Value: prodForm.storage }
      })
    });
    setProdForm({ name: '', price: '', ram: '', storage: '' });
    loadCatalog();
    loadAdminPanel();
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', background: '#f4f6f9', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', color: 'white', padding: '15px 25px', borderRadius: '8px' }}>
        <h2 style={{ margin: 0 }}>🛍️ Enterprise Dual-DB Portal Platform</h2>
        <div>
          <button style={{ margin: '5px', padding: '8px 12px', cursor: 'pointer' }} onClick={() => setView('landing')}>Auth Gate</button>
          {session?.role === 'user' && <button style={{ margin: '5px', padding: '8px 12px', cursor: 'pointer' }} onClick={() => setView('user')}>Storefront</button>}
          {session?.role === 'admin' && <button style={{ margin: '5px', padding: '8px 12px', cursor: 'pointer' }} onClick={() => setView('admin')}>Admin Room</button>}
        </div>
      </header>

      {/* VIEW 1: AUTHENTICATION GATEWAY */}
      {view === 'landing' && (
        <div style={{ display: 'flex', gap: '30px', marginTop: '30px' }}>
          <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3>Customer Registration (Saves to MySQL)</h3>
            <input placeholder="Full Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} style={{ display: 'block', margin: '10px 0', width: '95%', padding: '8px' }} />
            <input placeholder="Email Address" onChange={e => setAuthForm({...authForm, email: e.target.value})} style={{ display: 'block', margin: '10px 0', width: '95%', padding: '8px' }} />
            <input type="password" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} style={{ display: 'block', margin: '10px 0', width: '95%', padding: '8px' }} />
            <button onClick={() => handleLogin('user/register', authForm)} style={{ padding: '8px 15px', marginRight: '10px', cursor: 'pointer' }}>Create MySQL Account</button>
            <button onClick={() => handleLogin('user/login', { email: authForm.email, password: authForm.password })} style={{ background: '#0284c7', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sign In</button>
          </div>

          <div style={{ flex: 1, background: '#fef2f2', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #ef4444', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3>Admin System Vault Login</h3>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Administrative identities are hardcoded safely inside MySQL. Public registration is locked.</p>
            <input placeholder="Admin Username (root_admin)" onChange={e => setAuthForm({...authForm, username: e.target.value})} style={{ display: 'block', margin: '10px 0', width: '95%', padding: '8px' }} />
            <input type="password" placeholder="Master Secret Key" onChange={e => setAuthForm({...authForm, password: e.target.value})} style={{ display: 'block', margin: '10px 0', width: '95%', padding: '8px' }} />
            <button onClick={() => handleLogin('admin/login', { username: authForm.username, password: authForm.password })} style={{ background: '#dc2626', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Authorize Admin Status</button>
          </div>
        </div>
      )}

      {/* VIEW 2: CUSTOMER STOREFRONT */}
      {view === 'user' && (
        <div style={{ display: 'flex', gap: '25px', marginTop: '30px' }}>
          <div style={{ flex: 2, background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3>Marketplace Items (Pulled from MongoDB)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {products.map(p => (
                <div key={p._id} style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '6px', background: '#fafafa' }}>
                  <h4>{p.name}</h4>
                  <p style={{ color: '#16a34a', fontWeight: 'bold' }}>Price: ${p.price}</p>
                  {p.specifications && (
                    <p style={{ fontSize: '12px', color: '#555' }}>
                      ⚙️ {p.specifications.Key || 'Specification'}: {p.specifications.Value || 'N/A'}
                    </p>
                  )}
                  <button onClick={() => addToCart(p._id)} style={{ background: '#10b981', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add to Cart</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3>Your Active Cart (MongoDB Live Cache)</h3>
            {cart?.items?.length === 0 ? <p style={{ color: '#777' }}>Your basket is empty.</p> : (
              cart?.items?.map((item, idx) => {
                const targetId = item.productId?._id || item.productId;
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '8px 0' }}>
                    <p style={{ margin: 0 }}>
                      {item.productId?.name || "Product"} x {item.quantity} — ${((item.productId?.price || 0) * item.quantity).toFixed(2)}
                    </p>
                    <button 
                      onClick={() => removeFromCart(targetId)}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                );
              })
            )}
            
            <div style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h4>Delivery Address Setup (Saves to MySQL)</h4>
              <input placeholder="Street Address" onChange={e => setAddressForm({...addressForm, street: e.target.value})} style={{ display: 'block', width: '90%', padding: '6px', margin: '5px 0' }} />
              <input placeholder="City" onChange={e => setAddressForm({...addressForm, city: e.target.value})} style={{ display: 'block', width: '90%', padding: '6px', margin: '5px 0' }} />
              <input placeholder="Postal Code / Zip" onChange={e => setAddressForm({...addressForm, zip: e.target.value})} style={{ display: 'block', width: '90%', padding: '6px', margin: '5px 0' }} />
              <button onClick={submitAddress} style={{ background: '#334155', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' }}>Save Address to SQL</button>
            </div>

            <h3 style={{ marginTop: '20px' }}>Total Amount: ${cart.items?.reduce((sum, item) => sum + ((item.productId?.price || 0) * item.quantity), 0).toFixed(2)}</h3>
            <button onClick={triggerStripePayment} style={{ width: '100%', padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
              Pay via Stripe Test Simulator
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: ADMIN ENVIRONMENT */}
      {view === 'admin' && (
        <div style={{ display: 'flex', gap: '25px', marginTop: '30px' }}>
          <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3>Add New Product (Saves to MongoDB)</h3>
            <form onSubmit={submitNewProduct}>
              <input placeholder="Product Title (e.g. Electric Trimmer)" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} style={{ display: 'block', width: '95%', padding: '8px', margin: '8px 0' }} required />
              <input placeholder="Price ($)" type="number" step="0.01" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} style={{ display: 'block', width: '95%', padding: '8px', margin: '8px 0' }} required />
              
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', margin: '10px 0', border: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Custom MongoDB Specification Document</span>
                <input placeholder="Spec Key (e.g. Motor Speed / Size)" value={prodForm.ram} onChange={e => setProdForm({...prodForm, ram: e.target.value})} style={{ display: 'block', width: '95%', padding: '6px', margin: '6px 0' }} />
                <input placeholder="Spec Value (e.g. 7000 RPM / Medium)" value={prodForm.storage} onChange={e => setProdForm({...prodForm, storage: e.target.value})} style={{ display: 'block', width: '95%', padding: '6px', margin: '6px 0' }} />
              </div>

              <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>Push to MongoDB Inventory</button>
            </form>
          </div>

          <div style={{ flex: 2, background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3>System Performance Metrics</h3>
            <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '6px', marginBottom: '15px', borderLeft: '5px solid #2563eb' }}>
              <h4 style={{ margin: 0 }}>Middleware Intercept API Traffic Logs (MongoDB): <span style={{ color: '#2563eb' }}>{adminMetrics.trafficHits} Hits</span></h4>
            </div>
            
            <h4>Secure Financial Ledger Orders (From MySQL)</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>
              💡 Hint: Click on any <span style={{ color: '#d97706', fontWeight: 'bold' }}>Pending ⏳</span> button badge to switch it to Delivered inside MySQL!
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }} border="1" cellpadding="6">
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th>OrderID</th>
                  <th>Total Cost</th>
                  <th>Logistics Status</th>
                </tr>
              </thead>
              <tbody>
                {adminMetrics.orders.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>${parseFloat(o.total_amount).toFixed(2)}</td>
                    <td>
                      {o.delivery_status === 'Pending' ? (
                        <button 
                          onClick={async () => {
                            if (window.confirm(`Mark Order #${o.id} as completely Delivered?`)) {
                              const res = await fetch('http://localhost:3000/api/admin/deliver', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: o.id })
                              });
                              const data = await res.json();
                              if (data.success) {
                                loadAdminPanel(); 
                              } else {
                                alert("Failed to update system registry logistics column.");
                              }
                            }
                          }}
                          style={{
                            background: '#fef3c7',
                            color: '#d97706',
                            border: '1px solid #fcd34d',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Pending ⏳
                        </button>
                      ) : (
                        <span style={{ color: 'green', fontWeight: 'bold', paddingLeft: '10px' }}>
                          Delivered ✅
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}