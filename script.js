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

// TIMER
const TEST_MODE = false; 
function startCountdown() {
    const targetDate = new Date("April 17, 2026 13:00:00").getTime();
    const finalTarget = TEST_MODE ? (Date.now() + 10000) : targetDate;
    setInterval(() => {
        const distance = finalTarget - new Date().getTime();
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        document.getElementById("timer").innerHTML = (d > 0 ? d + "d " : "") + h + "h " + m + "m " + s + "s ";
        if (distance < 0) {
            document.getElementById("restock-banner").innerHTML = "<div style='font-size:1.6rem; font-weight:900;'>DROP IS LIVE</div>";
        }
    }, 1000);
}

// STOCK SYNC
function syncStock() {
    db.ref('stock').on('value', (snap) => {
        const data = snap.val(); if (!data) return;
        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`stock-btn-${i}`);
            if (data[`item${i}`] === false) { btn.innerText = "SOLD OUT"; btn.disabled = true; btn.style.background = "#222"; }
            else { btn.innerText = "ADD TO CART"; btn.disabled = false; btn.style.background = "#fff"; }
        }
    });
}

// CART LOGIC WITH REMOVE
function addToCart(name, price, sizeId) {
    const size = document.getElementById(sizeId).value;
    const cartId = Date.now() + Math.random();
    cart.push({ cartId, name, price, size });
    updateUI();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.cartId !== id);
    updateUI();
}

function updateUI() {
    const display = document.getElementById('cart-display');
    const totalDisplay = document.getElementById('final-total');
    display.innerHTML = cart.length === 0 ? "CART IS EMPTY" : "";
    let subtotal = 0; let summary = "";
    cart.forEach(item => {
        subtotal += item.price;
        display.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin:10px 0; font-size:0.75rem;">
                <span>${item.name} (${item.size})</span>
                <span>${item.price} QAR <button class="remove-btn" onclick="removeFromCart(${item.cartId})">REMOVE</button></span>
            </div>`;
        summary += `${item.name} (${item.size}) | `;
    });
    const total = subtotal + (cart.length > 0 ? 15 : 0);
    totalDisplay.innerText = `${total} QAR`;
    document.getElementById('cart-count').innerText = cart.length;
    document.getElementById('cart-input').value = summary + ` TOTAL: ${total} QAR`;
}

// FORM & PHONE
function validatePhone() {
    const phone = document.getElementById('phone-input').value;
    document.getElementById('submit-order-btn').disabled = phone.length !== 8;
}

document.getElementById('order-form').onsubmit = async function(e) {
    e.preventDefault();
    if(cart.length === 0) return;
    const formData = new FormData(this);
    const guestId = localStorage.getItem('ynko_user') || "GUEST_" + Math.floor(Math.random() * 10000);
    const orderData = { customer: guestId, name: formData.get('name'), phone: formData.get('phone'), items: document.getElementById('cart-input').value, status: "PENDING", timestamp: Date.now() };
    await db.ref('orders').push(orderData);
    localStorage.setItem('ynko_user', guestId);
    await fetch(this.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
    alert("ORDER PLACED!"); cart = []; updateUI(); this.reset();
};

// MY ORDERS MODAL
function toggleOrders() {
    const modal = document.getElementById('orders-modal');
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
    const guestId = localStorage.getItem('ynko_user');
    if (guestId) {
        db.ref('orders').orderByChild('customer').equalTo(guestId).on('value', (snap) => {
            const list = document.getElementById('orders-list');
            list.innerHTML = "";
            snap.forEach((child) => {
                const o = child.val();
                list.innerHTML += `<div style="border:1px solid #222; padding:10px; margin-top:10px;">
                    <span style="color:red; font-weight:900;">${o.status}</span><br>${o.items}
                    <br><a href="https://wa.me/97450714232?text=Cancel%20Order" target="_blank" style="color:#fff; font-size:0.6rem;">CANCEL VIA WA</a>
                </div>`;
            });
        });
    }
}

startCountdown();
syncStock();