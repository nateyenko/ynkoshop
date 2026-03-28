const firebaseConfig = {
  apiKey: "AIzaSyAbPJVcTkc0b4Rgjbbr5tbDcODRUivATvU",
  authDomain: "ynko-d3498.firebaseapp.com",
  databaseURL: "https://ynko-d3498-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ynko-d3498",
  storageBucket: "ynko-d3498.firebasestorage.app",
  messagingSenderId: "518773878851",
  appId: "1:518773878851:web:668396929fc24fdd2f24f6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let cart = [];
let freeShipping = false;

function startCountdown() {
    const targetDate = new Date("April 17, 2026 13:00:00").getTime();
    setInterval(() => {
        const distance = targetDate - new Date().getTime();
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        document.getElementById("timer").innerHTML = (d > 0 ? d + "d " : "") + h + "h " + m + "m " + s + "s ";
        if (distance < 0) { document.getElementById("restock-banner").innerHTML = "DROP IS LIVE"; }
    }, 1000);
}

function syncStock() {
    db.ref('stock').on('value', (snap) => {
        const data = snap.val(); if (!data) return;
        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`stock-btn-${i}`);
            if (data[`item${i}`] === false) { 
                btn.innerText = "SOLD OUT"; 
                btn.disabled = true; 
                btn.style.background = "#222"; 
            } else { 
                btn.innerText = "ADD TO CART"; 
                btn.disabled = false; 
                btn.style.background = "#fff"; 
            }
        }
    });
}

function addToCart(name, price, sizeId) {
    const size = document.getElementById(sizeId).value;
    const cartId = Date.now(); 
    cart.push({ cartId, name, price, size });
    updateUI();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.cartId !== id);
    updateUI();
}

function applyPromo() {
    const code = document.getElementById('promo-input').value.toUpperCase().trim();
    const msg = document.getElementById('promo-msg');
    
    if (code === "PSD") {
        freeShipping = true;
        msg.innerText = "CODE APPLIED: FREE SHIPPING";
        msg.style.color = "#25d366";
    } else {
        freeShipping = false;
        msg.innerText = "INVALID CODE";
        msg.style.color = "#ff0000";
    }
    updateUI();
}

function updateUI() {
    const display = document.getElementById('cart-display');
    const totalDisplay = document.getElementById('final-total');
    const shippingDisplay = document.getElementById('shipping-fee');
    
    display.innerHTML = cart.length === 0 ? "CART IS EMPTY" : "";
    let subtotal = 0; 
    let summary = "";

    cart.forEach(item => {
        subtotal += item.price;
        display.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin:10px 0; font-size:0.75rem;">
                <span>${item.name} (${item.size})</span>
                <span>${item.price} QAR <button class="remove-btn" onclick="removeFromCart(${item.cartId})">REMOVE</button></span>
            </div>`;
        summary += `${item.name} (${item.size}) | `;
    });

    let shippingFee = (cart.length > 0) ? 20 : 0;
    
    if (freeShipping && cart.length > 0) {
        shippingFee = 0;
        if (shippingDisplay) shippingDisplay.innerHTML = `<span style="text-decoration:line-through; color:#666;">20 QAR</span> <span style="color:#25d366;">0 QAR</span>`;
    } else {
        if (shippingDisplay) shippingDisplay.innerText = shippingFee + " QAR";
    }

    const total = subtotal + shippingFee;
    totalDisplay.innerText = `${total} QAR`;
    document.getElementById('cart-count').innerText = cart.length;
    
    // Hidden input for Formspree
    const promoNote = freeShipping ? " [PROMO: PSD - FREE SHIPPING]" : "";
    document.getElementById('cart-input').value = summary + promoNote + ` TOTAL: ${total} QAR`;
}

function validatePhone() {
    const phone = document.getElementById('phone-input').value;
    document.getElementById('submit-order-btn').disabled = phone.length !== 8;
}

document.getElementById('order-form').onsubmit = async function(e) {
    e.preventDefault();
    if(cart.length === 0) return;
    
    const submitBtn = document.getElementById('submit-order-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "PLACING ORDER...";

    const formData = new FormData(this);
    const guestId = localStorage.getItem('ynko_user') || "GUEST_" + Math.floor(Math.random() * 10000);
    
    const orderData = { 
        customer: guestId, 
        name: formData.get('name'), 
        phone: formData.get('phone'), 
        address: formData.get('address'),
        items: document.getElementById('cart-input').value, 
        status: "PENDING", 
        timestamp: Date.now() 
    };

    try {
        await db.ref('orders').push(orderData);
        localStorage.setItem('ynko_user', guestId);
        await fetch(this.action, { 
            method: 'POST', 
            body: formData, 
            headers: { 'Accept': 'application/json' } 
        });
        alert("ORDER PLACED SUCCESSFULLY!");
        cart = [];
        freeShipping = false;
        document.getElementById('promo-input').value = "";
        document.getElementById('promo-msg').innerText = "";
        updateUI();
        this.reset();
    } catch (error) {
        alert("Something went wrong. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "PLACE ORDER";
    }
};

function toggleOrders() {
    const modal = document.getElementById('orders-modal');
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
    const guestId = localStorage.getItem('ynko_user');
    if (guestId) {
        db.ref('orders').orderByChild('customer').equalTo(guestId).on('value', (snap) => {
            const list = document.getElementById('orders-list');
            list.innerHTML = "";
            if (!snap.exists()) {
                list.innerHTML = '<p style="font-size: 0.7rem; color: #444;">NO ACTIVE ORDERS FOUND.</p>';
                return;
            }
            snap.forEach((child) => {
                const o = child.val();
                list.innerHTML += `<div style="border:1px solid #222; padding:10px; margin-top:10px; background:#050505;">
                    <span style="color:#ff0000; font-weight:900; font-size:0.7rem;">STATUS: ${o.status}</span><br>
                    <p style="font-size:0.65rem; color:#ccc; margin-top:5px;">${o.items}</p>
                </div>`;
            });
        });
    }
}

startCountdown();
syncStock();
