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
      document.getElementById('message').classList.remove('text-red-600');
      document.getElementById('message').classList.add('text-green-600');
      document.getElementById('message').textContent = 'Registration successful. Check your email to verify.';
      registerForm.reset();
      setTimeout(() => window.location.href = 'login.html', 3000);
    } catch (err) {
      document.getElementById('message').classList.remove('text-green-600');
      document.getElementById('message').classList.add('text-red-600');
      document.getElementById('message').textContent = err.message;
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
        if (loginError) {
          loginError.textContent = 'Please verify your email before logging in.';
          loginError.classList.remove('hidden');
        }
        await auth.signOut();
        return;
      }
      window.location.href = 'dashboard.html';
    } catch (err) {
      if (loginError) {
        loginError.textContent = err.message;
        loginError.classList.remove('hidden');
      } else alert(err.message);
    }
  });

  // Forgot password
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const loginError = document.getElementById('loginError');
      if (!email) {
        if (loginError) {
          loginError.textContent = 'Enter email then click Forgot Password';
          loginError.classList.remove('hidden');
        }
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        if (loginError) {
          loginError.textContent = 'Password reset email sent. Check your inbox.';
          loginError.classList.remove('hidden');
          loginError.classList.add('text-green-600');
        }
      } catch (err) {
        if (loginError) {
          loginError.textContent = err.message;
          loginError.classList.remove('hidden');
        }
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
    const quantity = document.getElementById('quantity').value || null;
    const price = document.getElementById('price').value;
    const location = document.getElementById('locationListing').value.trim();
    const user = auth.currentUser;
    if (!user) return alert('Not logged in');

    const listingData = {
      name, category, quantity, price, location,
      farmerID: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (category === 'service') await db.collection('services').add(listingData);
      else await db.collection('listings').add(listingData);
      alert('Listing added!');
      addListingForm.reset();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
}

// ================== DASHBOARD LISTINGS ==================
const listingsContainer = document.getElementById('listingsContainer');
if (listingsContainer) {
  auth.onAuthStateChanged(async user => {
    if (!user) return (window.location.href = 'login.html');
    listingsContainer.innerHTML = '';

    // Fetch products
    const prodSnap = await db.collection('listings').orderBy('createdAt', 'desc').get();
    prodSnap.forEach(doc => {
      const d = doc.data();
      listingsContainer.innerHTML += `
        <div class="bg-white p-4 rounded shadow flex flex-col">
          <h3 class="font-bold text-green-800">${d.name}</h3>
          <p>Category: ${d.category}</p>
          <p>Quantity: ${d.quantity || '-'}</p>
          <p>Price: KSh ${d.price}</p>
          <p>Location: ${d.location}</p>
          <button class="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600 addCartBtn">Add to Cart</button>
        </div>
      `;
    });

    const svcSnap = await db.collection('services').orderBy('createdAt', 'desc').get();
    svcSnap.forEach(doc => {
      const d = doc.data();
      listingsContainer.innerHTML += `
        <div class="bg-white p-4 rounded shadow flex flex-col">
          <h3 class="font-bold text-green-800">${d.name}</h3>
          <p>Category: ${d.category}</p>
          <p>Price: KSh ${d.price}</p>
          <p>Location: ${d.location}</p>
          <button class="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600 addCartBtn">Add to Cart</button>
        </div>
      `;
    });

    // Add to Cart
    const cartBtns = document.querySelectorAll('.addCartBtn');
    cartBtns.forEach(btn => {
      btn.addEventListener('click', () => alert('Added to cart!'));
    });
  });
}

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
    supportResponse.textContent =
      "✅ Thank you! Your message has been sent. We'll respond shortly.";
    supportForm.reset();
  });
}

// ================== CHATBOT ==================
const chatbotBtn = document.getElementById('chatbotBtn');
const chatbotBox = document.getElementById('chatbotBox');
const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');

if (chatbotBtn && chatbotBox && chatInput) {
  chatbotBtn.addEventListener('click', () => chatbotBox.classList.toggle('hidden'));

  chatInput.addEventListener('keypress', async e => {
    if (e.key === 'Enter') {
      const userMsg = chatInput.value.trim();
      if (!userMsg) return;
      const li = document.createElement('div');
      li.textContent = "You: " + userMsg;
      li.classList.add('text-right');
      chatBody.appendChild(li);

      // Simple AI responses
      let botMsg = "I can help with smart farming advice or weather info.";
      if (userMsg.toLowerCase().includes("weather")) {
        botMsg = "🌤 Today's weather is sunny, 28°C. Good for planting maize and vegetables!";
      } else if (userMsg.toLowerCase().includes("planting")) {
        botMsg = "📌 For smart planting: rotate crops, enrich soil with compost, and irrigate efficiently.";
      } else if (userMsg.toLowerCase().includes("fertilizer")) {
        botMsg = "💡 Use organic fertilizer for better yield and soil health.";
      }

      const botLi = document.createElement('div');
      botLi.textContent = "Bot: " + botMsg;
      botLi.classList.add('text-left', 'text-green-800');
      chatBody.appendChild(botLi);

      chatInput.value = "";
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  });
}
      
