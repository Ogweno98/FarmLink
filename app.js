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
      auth.signOut().then(() => window.location.href="index.html");
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
if(registerForm){
  registerForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const name=document.getElementById('name').value.trim();
    const email=document.getElementById('email').value.trim();
    const password=document.getElementById('password').value;
    const location=document.getElementById('location').value.trim();
    const role=document.getElementById('role').value;

    try{
      const userCredential=await auth.createUserWithEmailAndPassword(email,password);
      const user=userCredential.user;
      await db.collection('users').doc(user.uid).set({name,email,location,role,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      await user.sendEmailVerification();
      alert("Registration successful! Check your email to verify.");
      registerForm.reset();
      setTimeout(()=>window.location.href='login.html',2000);
    }catch(err){ alert(err.message); }
  });
}

// ================== LOGIN ==================
const loginForm=document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const email=document.getElementById('loginEmail').value.trim();
    const password=document.getElementById('loginPassword').value;
    try{
      const userCred=await auth.signInWithEmailAndPassword(email,password);
      if(!userCred.user.emailVerified){ alert("Please verify your email."); await auth.signOut(); return; }
      window.location.href='dashboard.html';
    }catch(err){ alert(err.message); }
  });
}

// ================== PRODUCTS ==================
const addListingForm=document.getElementById('addListingForm');
const listingsContainer=document.getElementById('listingsContainer');

if(addListingForm){
  addListingForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const name=document.getElementById('productName').value.trim();
    const category=document.getElementById('category').value;
    const quantity=document.getElementById('quantity').value||null;
    const price=document.getElementById('price').value;
    const location=document.getElementById('locationListing').value.trim();
    const user=auth.currentUser;
    if(!user) return alert("Not logged in");
    await db.collection('listings').add({name,category,quantity,price,location,farmerID:user.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    addListingForm.reset();
    displayProducts();
  });
}

// ================== SERVICES ==================
const addServiceForm=document.getElementById("addServiceForm");
const servicesContainer=document.getElementById("servicesContainer");

if(addServiceForm){
  addServiceForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const name=document.getElementById("serviceName").value.trim();
    const desc=document.getElementById("serviceDesc").value.trim();
    const price=document.getElementById("servicePrice").value||null;
    const category=document.getElementById("serviceCategory").value;
    const imageFile=document.getElementById("serviceImage").files[0];
    const user=auth.currentUser;
    if(!user) return alert("Not logged in");

    let imageUrl="";
    if(imageFile){
      const imgRef=storage.ref(`services/${Date.now()}_${imageFile.name}`);
      await imgRef.put(imageFile);
      imageUrl=await imgRef.getDownloadURL();
    }

    await db.collection("services").add({name,desc,price,category,imageUrl,addedBy:user.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    addServiceForm.reset();
    displayServices();
  });
}

// ================== DISPLAY PRODUCTS & SERVICES ==================
async function displayProducts(){
  if(!listingsContainer) return;
  listingsContainer.innerHTML="";
  const snap=await db.collection('listings').orderBy('createdAt','desc').get();
  snap.forEach(doc=>{
    const p=doc.data();
    listingsContainer.innerHTML+=`
      <div class="bg-white p-4 rounded shadow flex flex-col">
        <h3 class="font-bold text-green-800">${p.name}</h3>
        <p>Category: ${p.category}</p>
        <p>Quantity: ${p.quantity||'-'}</p>
        <p>Price: KSh ${p.price}</p>
        <p>Location: ${p.location}</p>
        <button class="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">Buy</button>
      </div>
    `;
  });
}

async function displayServices(){
  if(!servicesContainer) return;
  servicesContainer.innerHTML="";
  const snap=await db.collection("services").orderBy("createdAt","desc").get();
  snap.forEach(doc=>{
    const s=doc.data();
    servicesContainer.innerHTML+=`
      <div class="bg-white p-4 rounded shadow flex flex-col">
        <img src="${s.imageUrl||'placeholder.jpg'}" alt="${s.name}" class="h-40 w-full object-cover rounded mb-2"/>
        <h3 class="font-bold text-green-800">${s.name}</h3>
        <p>${s.desc}</p>
        ${s.price? `<p class="font-semibold">KSh ${s.price}</p>` : ""}
        <p class="text-gray-500">Category: ${s.category}</p>
        <button class="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">Request</button>
      </div>
    `;
  });
}

// ================== SEARCH & FILTER ==================
const searchInput=document.getElementById("searchInput");
const filterCategory=document.getElementById("filterCategory");

if(searchInput || filterCategory){
  searchInput.addEventListener("input", applyFilter);
  filterCategory.addEventListener("change", applyFilter);
}

async function applyFilter(){
  const query=searchInput.value.toLowerCase();
  const category=filterCategory.value;

  // Filter Products
  const prodSnap=await db.collection('listings').orderBy('createdAt','desc').get();
  listingsContainer.innerHTML="";
  prodSnap.forEach(doc=>{
    const p=doc.data();
    if((p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)) && (!category || p.category===category)){
      listingsContainer.innerHTML+=`
        <div class="bg-white p-4 rounded shadow flex flex-col">
          <h3 class="font-bold text-green-800">${p.name}</h3>
          <p>Category: ${p.category}</p>
          <p>Quantity: ${p.quantity||'-'}</p>
          <p>Price: KSh ${p.price}</p>
          <p>Location: ${p.location}</p>
          <button class="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">Buy</button>
        </div>
      `;
    }
  });

  // Filter Services
  const svcSnap=await db.collection("services").orderBy("createdAt","desc").get();
  servicesContainer.innerHTML="";
  svcSnap.forEach(doc=>{
    const s=doc.data();
    if((s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query)) && (!category || s.category===category)){
      servicesContainer.innerHTML+=`
        <div class="bg-white p-4 rounded shadow flex flex-col">
          <img src="${s.imageUrl||'placeholder.jpg'}" alt="${s.name}" class="h-40 w-full object-cover rounded mb-2"/>
          <h3 class="font-bold text-green-800">${s.name}</h3>
          <p>${s.desc}</p>
          ${s.price? `<p class="font-semibold">KSh ${s.price}</p>` : ""}
          <p class="text-gray-500">Category: ${s.category}</p>
          <button class="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">Request</button>
        </div>
      `;
    }
  });
}

// ================== INITIAL LOAD ==================
displayProducts();
displayServices();

// ================== CHATBOT ==================
const chatBubble=document.getElementById("chatbotBubble");
const chatWindow=document.getElementById("chatbotWindow");
const chatClose=document.getElementById("chatbotClose");
const chatMessages=document.getElementById("chatbotMessages");
const chatInput=document.getElementById("chatbotText");
const chatSend=document.getElementById("sendChat");

chatBubble.addEventListener("click",()=>{ chatWindow.style.display="flex"; });
chatClose.addEventListener("click",()=>{ chatWindow.style.display="none"; });
chatSend.addEventListener("click",sendChat);
chatInput.addEventListener("keypress", e=>{ if(e.key==="Enter") sendChat(); });

function sendChat(){
  const text=chatInput.value.trim();
  if(!text) return;
  const userMsg=document.createElement("p");
  userMsg.className="user self-end";
  userMsg.textContent=text;
  chatMessages.appendChild(userMsg);
  chatInput.value="";
  chatMessages.scrollTop=chatMessages.scrollHeight;

  // Simple AI responses
  const botMsg=document.createElement("p");
  botMsg.className="bot";
  let response="I can help you with products, services, and weather info.";

  const txt=text.toLowerCase();
  if(txt.includes("weather")) response="🌤️ The local weather today is sunny 25°C.";
  else if(txt.includes("store")) response="Our storage service allows farmers to safely store produce at low fees.";
  else if(txt.includes("delivery")) response="We offer free delivery for purchases above KSh 500.";
  else if(txt.includes("solar")) response="SolarWaka PAYASYGO and solar installations are available at affordable rates.";
  else if(txt.includes("tractor")) response="Tractor plowing services are available to make land preparation easy.";
  else if(txt.includes("training")) response="We offer climate-smart farming training to farmers.";

  setTimeout(()=>{ botMsg.textContent=response; chatMessages.appendChild(botMsg); chatMessages.scrollTop=chatMessages.scrollHeight; },500);
}
