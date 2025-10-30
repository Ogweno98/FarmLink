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

// ================== DASHBOARD FORMS ==================
// Listings
const addListingForm = document.getElementById('addListingForm');
if (addListingForm) {
  addListingForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('category').value;
    const quantity = document.getElementById('quantity').value || null;
    const price = document.getElementById('price').value;
    const location = document.getElementById('locationListing').value.trim();
    const user = auth.currentUser;
    if (!user) return alert('Not logged in');

    const listingData = { name, category, quantity, price, location, farmerID: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() };

    try {
      if (category === 'service') await db.collection('services').add(listingData);
      else await db.collection('listings').add(listingData);
      alert('Listing added!');
      addListingForm.reset();
    } catch (err) { alert('Error: ' + err.message); }
  });
}

const listingsContainer = document.getElementById('listingsContainer');
if (listingsContainer) {
  auth.onAuthStateChanged(async user => {
    if (!user) return (window.location.href = 'login.html');
    listingsContainer.innerHTML = '';

    const prodSnap = await db.collection('listings').where('farmerID', '==', user.uid).get();
    prodSnap.forEach(doc => {
      const d = doc.data();
      listingsContainer.innerHTML += `<div class="bg-white p-4 rounded shadow">
        <h3 class="font-bold text-green-800">${d.name}</h3>
        <p>Category: ${d.category}</p>
        <p>Quantity: ${d.quantity || '-'}</p>
        <p>Price: KSh ${d.price}</p>
        <p>Location: ${d.location}</p>
      </div>`;
    });

    const svcSnap = await db.collection('services').where('farmerID', '==', user.uid).get();
    svcSnap.forEach(doc => {
      const d = doc.data();
      listingsContainer.innerHTML += `<div class="bg-white p-4 rounded shadow">
        <h3 class="font-bold text-green-800">${d.name}</h3>
        <p>Category: ${d.category}</p>
        <p>Price: KSh ${d.price}</p>
        <p>Location: ${d.location}</p>
      </div>`;
    });
  });
}

// Farm Records
const farmForm = document.getElementById("farmRecordForm");
const recordsList = document.getElementById("recordsList");
if (farmForm && recordsList) {
  farmForm.addEventListener("submit", e => {
    e.preventDefault();
    const crop = document.getElementById("cropName").value;
    const qty = document.getElementById("harvestQty").value;
    const li = document.createElement("li");
    li.textContent = `${crop} — ${qty} kg`;
    recordsList.appendChild(li);
    farmForm.reset();
  });
}

// Market Access
const marketForm = document.getElementById("marketForm");
const marketList = document.getElementById("marketList");
if (marketForm && marketList) {
  marketForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("productNameMarket").value;
    const price = document.getElementById("priceMarket").value;
    const li = document.createElement("li");
    li.textContent = `${name} — KES ${price}/kg`;
    marketList.appendChild(li);
    marketForm.reset();
  });
}

// Community
const communityForm = document.getElementById("communityForm");
const communityPosts = document.getElementById("communityPosts");
if (communityForm && communityPosts) {
  communityForm.addEventListener("submit", e => {
    e.preventDefault();
    const user = document.getElementById("userName").value;
    const message = document.getElementById("message").value;
    const li = document.createElement("li");
    li.innerHTML = `<strong>${user}:</strong> ${message}`;
    communityPosts.appendChild(li);
    communityForm.reset();
  });
}

// Support
const supportForm = document.getElementById("supportForm");
const supportResponse = document.getElementById("supportResponse");
if (supportForm && supportResponse) {
  supportForm.addEventListener("submit", e => {
    e.preventDefault();
    supportResponse.textContent = "✅ Thank you! Your message has been sent. We'll respond shortly.";
    supportForm.reset();
  });
}

// ================== CHATBOT ==================
const chatbotBtn = document.getElementById('chatbotBtn');
const chatWindow = document.getElementById('chatWindow');
const chatHeaderBubble = document.getElementById('chatHeaderBubble');
const chatBodyBubble = document.getElementById('chatBodyBubble');
const chatInputBubble = document.getElementById('chatInputBubble');
const chatSendBubble = document.getElementById('chatSendBubble');

const OPENAI_SERVER = "https://YOUR_SERVER_DOMAIN/chat";
const WEATHER_KEY = "YOUR_OPENWEATHERMAP_API_KEY";

chatbotBtn.addEventListener('click', () => {
  chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex';
});
chatHeaderBubble.addEventListener('click', () => { chatWindow.style.display = 'none'; });

async function sendChatMessage() {
  const msg = chatInputBubble.value.trim();
  if (!msg) return;
  const user = auth.currentUser;
  if (!user) return alert("Login to chat");

  const userDiv = document.createElement('div');
  userDiv.classList.add('userMsg');
  userDiv.innerHTML = `<strong>You:</strong> ${msg}`;
  chatBodyBubble.appendChild(userDiv);
  chatInputBubble.value = '';
  chatBodyBubble.scrollTop = chatBodyBubble.scrollHeight;

  db.collection('chatbot').add({ userID: user.uid, message: msg, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

  const botDiv = document.createElement('div');
  botDiv.classList.add('botMsg');
  botDiv.innerHTML = `<strong>AI:</strong> Typing...`;
  chatBodyBubble.appendChild(botDiv);
  chatBodyBubble.scrollTop = chatBodyBubble.scrollHeight;

  const weatherRegex = /weather in ([a-zA-Z\s]+)/i;
  const match = msg.match(weatherRegex);

  if (match) {
    const location = match[1];
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${WEATHER_KEY}`);
      const data = await res.json();
      botDiv.innerHTML = data.cod === 200 ? `<strong>AI:</strong> Weather in ${location}: ${data.weather[0].description}, Temp: ${data.main.temp}°C, Humidity: ${data.main.humidity}%` : `<strong>AI:</strong> Sorry, I could not find weather for ${location}.`;
    } catch (err) { botDiv.innerHTML = `<strong>AI:</strong> Error fetching weather data.`; }
    return;
  }

  try {
    const res = await fetch(OPENAI_SERVER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    botDiv.innerHTML = `<strong>AI:</strong> ${data.reply}`;
    chatBodyBubble.scrollTop = chatBodyBubble.scrollHeight;

    db.collection('chatbot').add({ userID: "AI", message: data.reply, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

  } catch (err) { botDiv.innerHTML = `<strong>AI:</strong> Sorry, I couldn't respond.`; }
}

chatSendBubble.addEventListener('click', sendChatMessage);
chatInputBubble.addEventListener('keypress', e => { if (e.key === 'Enter') sendChatMessage(); });
