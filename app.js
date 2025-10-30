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

// ================== NAVBAR (Dynamic Auth Links) ==================
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

// ================== REGISTER ==================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const location = document.getElementById('location').value.trim();
    const role = document.getElementById('role').value;

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await db.collection('users').doc(user.uid).set({
        name, email, location, role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await user.sendEmailVerification();
      const msgEl = document.getElementById('message');
      msgEl.classList.remove('text-red-600');
      msgEl.classList.add('text-green-600');
      msgEl.textContent = '✅ Registration successful. Check your email to verify.';
      registerForm.reset();
      setTimeout(() => window.location.href = 'login.html', 3000);
    } catch (err) {
      const msgEl = document.getElementById('message');
      msgEl.classList.remove('text-green-600');
      msgEl.classList.add('text-red-600');
      msgEl.textContent = err.message;
    }
  });
}

// ================== LOGIN ==================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginError = document.getElementById('loginError');

    try {
      const userCred = await auth.signInWithEmailAndPassword(email, password);
      if (!userCred.user.emailVerified) {
        loginError.textContent = '⚠️ Please verify your email before logging in.';
        loginError.classList.remove('hidden');
        await auth.signOut();
        return;
      }
      window.location.href = 'dashboard.html';
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    }
  });

  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const loginError = document.getElementById('loginError');
      if (!email) {
        loginError.textContent = 'Enter your email then click Forgot Password';
        loginError.classList.remove('hidden');
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        loginError.textContent = '✅ Password reset email sent. Check your inbox.';
        loginError.classList.remove('hidden');
        loginError.classList.add('text-green-600');
      } catch (err) {
        loginError.textContent = err.message;
        loginError.classList.remove('hidden');
      }
    });
  }
}

// ================== DASHBOARD (Add Listing) ==================
const addListingForm = document.getElementById('addListingForm');
if (addListingForm) {
  addListingForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('category').value;
    const quantity = document.getElementById('quantity').value || 0;
    const price = document.getElementById('price').value;
    const location = document.getElementById('locationListing').value.trim();
    const imageFile = document.getElementById('listingImage').files[0];
    const user = auth.currentUser;
    if (!user) return alert('Not logged in');

    let imageUrl = '';
    if (imageFile) {
      const storageRef = storage.ref(`listingImages/${Date.now()}_${imageFile.name}`);
      await storageRef.put(imageFile);
      imageUrl = await storageRef.getDownloadURL();
    }

    const listingData = {
      name, category, quantity, price, location, imageUrl,
      farmerID: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      const collectionRef = category === 'services' ? db.collection('services') : db.collection('listings');
      await collectionRef.add(listingData);
      alert('✅ Listing added!');
      addListingForm.reset();
      loadListings(); // refresh listings
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
}

// ================== DASHBOARD LISTINGS ==================
const listingsContainer = document.getElementById('listingsContainer');

async function loadListings() {
  if (!listingsContainer) return;
  const user = auth.currentUser;
  if (!user) return;

  listingsContainer.innerHTML = '';

  const allListings = [];

  const prodSnap = await db.collection('listings').where('farmerID', '==', user.uid).get();
  prodSnap.forEach(doc => allListings.push(doc.data()));

  const svcSnap = await db.collection('services').where('farmerID', '==', user.uid).get();
  svcSnap.forEach(doc => allListings.push(doc.data()));

  if (allListings.length === 0) {
    listingsContainer.innerHTML = `<p class="text-gray-500 text-center col-span-full">No listings yet. Add products or services above.</p>`;
    return;
  }

  allListings.forEach(d => {
    listingsContainer.innerHTML += `
      <div class="bg-white p-4 rounded shadow flex flex-col items-center">
        <img src="${d.imageUrl || 'https://via.placeholder.com/150'}" alt="${d.name}" class="w-full h-40 object-cover rounded mb-2">
        <h3 class="font-bold text-green-800">${d.name}</h3>
        <p>Category: ${d.category}</p>
        ${d.quantity ? `<p>Quantity: ${d.quantity}</p>` : ''}
        <p>Price: KSh ${d.price}</p>
        <p>Location: ${d.location}</p>
      </div>
    `;
  });
}

if (listingsContainer) {
  auth.onAuthStateChanged(user => {
    if (!user) return (window.location.href = 'login.html');
    loadListings();
  });
}

// ================== FARM RECORDS ==================
const farmForm = document.getElementById("farmRecordForm");
const recordsList = document.getElementById("recordsList");
if (farmForm && recordsList) {
  farmForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const crop = document.getElementById("cropName").value.trim();
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
    const user = document.getElementById("userName").value.trim();
    const message = document.getElementById("message").value.trim();
    if (!user || !message) return;

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
    supportResponse.textContent = "✅ Thank you! Your message has been sent. We'll respond shortly.";
    supportForm.reset();
  });
}

// ================== CHATBOT ==================
const chatbotBubble = document.getElementById("chatbotBubble");
const chatbotWindow = document.getElementById("chatbotWindow");
const chatbotClose = document.getElementById("chatbotClose");
const sendChat = document.getElementById("sendChat");
const chatbotMessages = document.getElementById("chatbotMessages");
const chatbotText = document.getElementById("chatbotText");

if(chatbotBubble && chatbotWindow){
  chatbotBubble.addEventListener("click", () => chatbotWindow.classList.toggle("hidden"));
  chatbotClose.addEventListener("click", () => chatbotWindow.classList.add("hidden"));

  sendChat.addEventListener("click", () => {
    const message = chatbotText.value.trim();
    if(!message) return;
    const li = document.createElement("div");
    li.classList.add("mb-2");
    li.innerHTML = `<strong>You:</strong> ${message}`;
    chatbotMessages.appendChild(li);

    const botReply = document.createElement("div");
    botReply.classList.add("mb-2");
    botReply.innerHTML = `<strong>JOMPO AI:</strong> ${generateBotReply(message)}`;
    chatbotMessages.appendChild(botReply);

    chatbotText.value = '';
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  });

  chatbotText.addEventListener('keypress', e => { if(e.key==='Enter') sendChat.click(); });
}

function generateBotReply(msg){
  msg = msg.toLowerCase();
  if(msg.includes('weather')) return "🌤 The weather is sunny today. Remember to water crops accordingly!";
  if(msg.includes('smart farming')) return "🌱 You can use crop rotation and organic compost for sustainable farming.";
  if(msg.includes('solar')) return "☀️ SolarWaka PAYASYGO helps you access off-grid solar energy easily.";
  if(msg.includes('delivery')) return "🚚 Our FarmLink delivery service can deliver products to consumers at a small fee.";
  return "🤖 I can help with weather, smart farming tips, solar info, and delivery services.";
}
