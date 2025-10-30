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

// ================== NAVBAR AUTH LINKS ==================
auth.onAuthStateChanged(user => {
  const authLinks = document.getElementById("authLinks");
  if (!authLinks) return;
  if (user) {
    authLinks.innerHTML = `<span>Hi, ${user.email}</span>
      <button id="logoutBtn" class="ml-2 px-3 py-1 bg-red-500 rounded text-white">Logout</button>`;
    document.getElementById("logoutBtn").addEventListener('click', ()=> auth.signOut().then(()=> window.location.reload()));
  } else {
    authLinks.innerHTML = `<a href="login.html" class="px-4 py-2 text-white">Login</a>
      <a href="register.html" class="px-4 py-2 bg-green-500 rounded text-white ml-2">Register</a>`;
  }
});

// ================== ADD LISTING ==================
const addListingForm = document.getElementById("addListingForm");
const listingMessage = document.getElementById("listingMessage");

addListingForm.addEventListener("submit", async e=>{
  e.preventDefault();
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("category").value;
  const price = document.getElementById("price").value;
  const location = document.getElementById("locationListing").value.trim();
  const imageFile = document.getElementById("productImage").files[0];
  const user = auth.currentUser;
  if(!user) return alert("Not logged in");

  try {
    let imageURL = "";
    if(imageFile){
      const storageRef = storage.ref().child(`productImages/${Date.now()}_${imageFile.name}`);
      await storageRef.put(imageFile);
      imageURL = await storageRef.getDownloadURL();
    }

    await db.collection("listings").add({
      name, category, price, location, imageURL,
      farmerID: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    listingMessage.textContent = "✅ Listing added successfully!";
    listingMessage.className="text-green-600 mt-2";
    addListingForm.reset();
    fetchProducts();
  } catch(err){
    listingMessage.textContent = err.message;
    listingMessage.className="text-red-600 mt-2";
  }
});

// ================== FETCH & DISPLAY PRODUCTS ==================
let allProducts = [];
const productsContainer = document.getElementById("productsContainer");

async function fetchProducts(category="all"){
  let query = db.collection("listings");
  if(category!=="all") query = query.where("category","==",category);
  const snapshot = await query.orderBy("createdAt","desc").get();
  allProducts=[];
  snapshot.forEach(doc=>{
    allProducts.push({id: doc.id, ...doc.data()});
  });
  displayProducts(allProducts);
}

function displayProducts(products){
  productsContainer.innerHTML="";
  products.forEach(p=>{
    const imgURL = p.imageURL || "https://via.placeholder.com/150";
    const card = document.createElement("div");
    card.className="bg-white p-4 rounded shadow flex flex-col justify-between";
    card.innerHTML=`
      <img src="${imgURL}" alt="${p.name}" class="mb-2 rounded h-32 object-cover">
      <h3 class="font-bold text-green-800">${p.name}</h3>
      <p>Category: ${p.category}</p>
      <p>Price: KSh ${p.price}</p>
      <p>Location: ${p.location}</p>
      <button class="bg-green-500 text-white px-4 py-2 rounded mt-2 hover:bg-green-600 addToCartBtn">Add to Cart</button>
    `;
    const btn = card.querySelector(".addToCartBtn");
    btn.addEventListener("click", ()=> addToCart(p));
    productsContainer.appendChild(card);
  });
}

// ================== CATEGORY FILTER ==================
document.querySelectorAll(".categoryBtn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".categoryBtn").forEach(b=>b.classList.replace("bg-green-500","bg-gray-200"));
    btn.classList.replace("bg-gray-200","bg-green-500");
    fetchProducts(btn.dataset.category);
  });
});

// ================== SEARCH ==================
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", ()=>{
  const filtered = allProducts.filter(p=> p.name.toLowerCase().includes(searchInput.value.toLowerCase()));
  displayProducts(filtered);
});

// ================== SORT ==================
const sortSelect = document.getElementById("sortSelect");
sortSelect.addEventListener("change", ()=>{
  let sorted = [...allProducts];
  if(sortSelect.value==="priceLow") sorted.sort((a,b)=>a.price-b.price);
  else if(sortSelect.value==="priceHigh") sorted.sort((a,b)=>b.price-a.price);
  displayProducts(sorted);
});

// ================== CART ==================
let cart = [];
const cartSidebar = document.getElementById("cartSidebar");
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");

function addToCart(product){
  cart.push(product);
  renderCart();
}

function renderCart(){
  cartList.innerHTML="";
  let total=0;
  cart.forEach((item,index)=>{
    const li = document.createElement("li");
    li.className="mb-2 flex justify-between";
    li.innerHTML=`<span>${item.name} - KSh ${item.price}</span> <button class="text-red-500" data-index="${index}">X</button>`;
    li.querySelector("button").addEventListener("click", ()=> {
      cart.splice(index,1);
      renderCart();
    });
    cartList.appendChild(li);
    total += parseFloat(item.price);
  });
  cartTotal.textContent = total;
}

document.getElementById("openCartBtn").addEventListener("click", ()=> cartSidebar.classList.remove("hidden"));
document.getElementById("closeCart").addEventListener("click", ()=> cartSidebar.classList.add("hidden"));
document.getElementById("checkoutBtn").addEventListener("click", ()=> alert("Checkout simulation: Total KSh "+cartTotal.textContent));

// ================== INITIAL FETCH ==================
fetchProducts();

// ================== GPT CHATBOT ==================
const chatbotBtn = document.getElementById("chatbotBtn");
const chatWindow = document.getElementById("chatWindow");
const chatHeader = document.getElementById("chatHeaderBubble");
const chatBody = document.getElementById("chatBodyBubble");
const chatInput = document.getElementById("chatInputBubble");
const chatSend = document.getElementById("chatSendBubble");

chatbotBtn.addEventListener("click", ()=> chatWindow.style.display="flex");
chatHeader.addEventListener("click", ()=> chatWindow.style.display="none");
chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", e=>{ if(e.key==="Enter") sendMessage(); });

function appendMessage(text, sender){
  const p = document.createElement("p");
  p.textContent=text;
  p.className = sender==="user"?"userMsg":"botMsg";
  chatBody.appendChild(p);
  chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendMessage(){
  const msg = chatInput.value.trim();
  if(!msg) return;
  appendMessage(msg,"user");
  chatInput.value="";
  appendMessage("🤖 Thinking...", "bot");
  
  try{
    const res = await fetch("https://YOUR_CLOUD_FUNCTION_URL/chatbotResponse", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    chatBody.lastChild.textContent = data.reply;
  } catch(err){
    chatBody.lastChild.textContent = "⚠️ Error fetching AI response.";
    console.error(err);
  }
}
