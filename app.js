// ================== FIREBASE SETUP ==================
const firebaseConfig = {
  apiKey: "AIzaSyCK2sZb2_O0K8tq0KWKwmSV8z4He30dcDc",
  authDomain: "jompo-farmlink-web.firebaseapp.com",
  projectId: "jompo-farmlink-web",
  storageBucket: "jompo-farmlink-web.appspot.com",
  messagingSenderId: "497296091103",
  appId: "1:497296091103:web:72b3e8223ea0cbb306066a"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ================== NAVBAR ==================
auth.onAuthStateChanged(user => {
  const authLinks = document.getElementById("authLinks");
  if (!authLinks) return;

  if (user) {
    authLinks.innerHTML = `
      <span class="mr-4">Hi, ${user.email}</span>
      <button id="logoutBtn" class="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white">Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      auth.signOut().then(() => (window.location.href = "index.html"));
    });
  } else {
    authLinks.innerHTML = `
      <a href="login.html" class="px-4 py-2">Login</a>
      <a href="register.html" class="px-4 py-2 bg-green-500 hover:bg-green-600 rounded text-white">Register</a>
    `;
  }
});

// ================== REGISTER & LOGIN ==================
// ... (copy previous working registration/login code here) ...

// ================== DASHBOARD: ADD LISTING ==================
const addListingForm = document.getElementById('addListingForm');
if (addListingForm) {
  addListingForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('category').value;
    const quantity = document.getElementById('quantity').value || null;
    const price = parseFloat(document.getElementById('price').value);
    const location = document.getElementById('locationListing').value.trim();
    const user = auth.currentUser;
    if (!user) return alert('Not logged in');

    const imageFile = document.getElementById('imageUpload').files[0];
    let imageUrl = "";

    try {
      if (imageFile) {
        const storageRef = storage.ref(`listing_images/${Date.now()}_${imageFile.name}`);
        await storageRef.put(imageFile);
        imageUrl = await storageRef.getDownloadURL();
      }

      const listingData = { name, category, quantity, price, location, imageUrl, farmerID: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (category === 'service') await db.collection('services').add(listingData);
      else await db.collection('listings').add(listingData);

      alert('Listing added!');
      addListingForm.reset();
      loadListings(); // reload marketplace
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
}

// ================== DASHBOARD: LOAD LISTINGS ==================
const listingsContainer = document.getElementById('listingsContainer');
let cart = [];
const cartList = document.getElementById("cartList");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

async function loadListings() {
  listingsContainer.innerHTML = "";
  const snapshot = await db.collection('listings').orderBy('createdAt', 'desc').get();
  snapshot.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "bg-white p-4 rounded shadow flex flex-col";
    div.innerHTML = `
      ${d.imageUrl ? `<img src="${d.imageUrl}" class="w-full h-40 object-cover rounded mb-2">` : ""}
      <h3 class="font-bold text-green-800">${d.name}</h3>
      <p>Category: ${d.category}</p>
      <p>Quantity: ${d.quantity || '-'}</p>
      <p>Price: KSh ${d.price}</p>
      <p>Location: ${d.location}</p>
    `;
    const buyBtn = document.createElement("button");
    buyBtn.textContent = "Buy";
    buyBtn.className = "mt-2 bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700";
    buyBtn.onclick = () => {
      cart.push({ name: d.name, price: d.price, quantity: 1 });
      updateCartUI();
    };
    div.appendChild(buyBtn);
    listingsContainer.appendChild(div);
  });
}
loadListings();

// ================== CART ==================
function updateCartUI() {
  cartList.innerHTML = "";
  let total = 0;
  cart.forEach((item, idx) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} — KSh ${item.price} x ${item.quantity}`;
    li.classList.add("flex", "justify-between", "items-center");
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "ml-2 bg-red-500 text-white px-2 rounded";
    removeBtn.onclick = () => { cart.splice(idx,1); updateCartUI(); };
    li.appendChild(removeBtn);
    cartList.appendChild(li);
    total += item.price * item.quantity;
  });
  cartTotalEl.textContent = total;
}
checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) return alert("Cart is empty");
  alert("Order placed successfully!");
  cart = [];
  updateCartUI();
});

// ================== FARM RECORDS ==================
const farmForm = document.getElementById("farmRecordForm");
const recordsList = document.getElementById("recordsList");
if (farmForm && recordsList) {
  farmForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const crop = document.getElementById("cropName").value;
    const qty = document.getElementById("harvestQty").value;
    const li = document.createElement("li");
    li.textContent = `${crop} — ${qty} kg`;
    recordsList.appendChild(li);
    farmForm.reset();
  });
}

// ================== COMMUNITY ==================
const communityForm = document.getElementById("communityForm");
const communityPosts = document.getElementById("communityPosts");
if (communityForm && communityPosts) {
  communityForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = document.getElementById("userName").value;
    const message = document.getElementById("message").value;
    const li = document.createElement("li");
    li.innerHTML = `<strong>${user}:</strong> ${message}`;
    communityPosts.appendChild(li);
    communityForm.reset();
  });
}

// ================== SUPPORT ==================
const supportForm = document.getElementById("supportForm");
const supportResponse = document.getElementById("supportResponse");
if (supportForm && supportResponse) {
  supportForm.addEventListener("submit", (e) => {
    e.preventDefault();
    supportResponse.textContent = "✅ Thank you! Your message has been sent.";
    supportForm.reset();
  });
}

// ================== AI CHATBOT ==================
const chatbotBtn = document.getElementById("chatbotBtn");
const chatbotBox = document.getElementById("chatbotBox");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");

chatbotBtn.addEventListener("click", () => chatbotBox.classList.toggle("hidden"));

chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter" && chatInput.value.trim() !== "") {
    const msg = chatInput.value.trim();
    const userMsg = document.createElement("div");
    userMsg.className = "self-end bg-green-100 p-2 rounded";
    userMsg.textContent = msg;
    chatBody.appendChild(userMsg);

    setTimeout(() => {
      const botMsg = document.createElement("div");
      botMsg.className = "self-start bg-gray-200 p-2 rounded";
      botMsg.textContent = generateBotReply(msg);
      chatBody.appendChild(botMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 800);

    chatInput.value = "";
  }
});

function generateBotReply(msg) {
  msg = msg.toLowerCase();
  if (msg.includes("weather")) return "🌤️ Current weather: Sunny 28°C";
  if (msg.includes("crop") || msg.includes("farming")) return "💡 Tip: Rotate crops and use organic fertilizers for better yield.";
  if (msg.includes("price")) return "💰 Prices vary, please check marketplace listings above.";
  return "🤖 Sorry, I can only help with weather, farming tips, and marketplace info.";
}
  
