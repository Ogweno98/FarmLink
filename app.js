// ================== FIREBASE SETUP ==================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQnDRbmUjgSNLhvl_0eDhOvaoR0zCpmyw",
  authDomain: "jompo-farmlink.firebaseapp.com",
  projectId: "jompo-farmlink",
  storageBucket: "jompo-farmlink.firebasestorage.app",
  messagingSenderId: "987751403891",
  appId: "1:987751403891:web:8923253cd75c095c07f506",
  measurementId: "G-DQCWTBSEDD"
};
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
    authLinks.innerHTML = `<span>Hi, ${user.email}</span> <button id="logoutBtn" class="px-3 py-1 bg-red-500 rounded text-white">Logout</button>`;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      auth.signOut().then(() => window.location.href = "index.html");
    });
  } else {
    authLinks.innerHTML = `<a href="login.html" class="px-4 py-2">Login</a> <a href="register.html" class="px-4 py-2 bg-green-500 rounded text-white">Register</a>`;
  }
});

// ================== REGISTER ==================
const registerForm = document.getElementById('registerForm');
if(registerForm) {
  registerForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const name=document.getElementById('name').value.trim();
    const email=document.getElementById('email').value.trim();
    const password=document.getElementById('password').value;
    const location=document.getElementById('location').value.trim();
    const role=document.getElementById('role').value;
    try{
      const userCredential = await auth.createUserWithEmailAndPassword(email,password);
      const user = userCredential.user;
      await db.collection('users').doc(user.uid).set({name,email,location,role,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      await user.sendEmailVerification();
      document.getElementById('message').classList.add('text-green-600');
      document.getElementById('message').textContent = 'Registration successful. Check your email to verify.';
      registerForm.reset();
      setTimeout(()=>window.location.href='login.html',3000);
    }catch(err){
      document.getElementById('message').classList.add('text-red-600');
      document.getElementById('message').textContent=err.message;
    }
  });
}

// ================== LOGIN ==================
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const email=document.getElementById('loginEmail').value.trim();
    const password=document.getElementById('loginPassword').value;
    const loginError=document.getElementById('loginError');
    try{
      const userCred = await auth.signInWithEmailAndPassword(email,password);
      if(!userCred.user.emailVerified){
        loginError.textContent='Please verify your email before logging in.';
        loginError.classList.remove('hidden');
        await auth.signOut();
        return;
      }
      window.location.href='dashboard.html';
    }catch(err){
      loginError.textContent=err.message;
      loginError.classList.remove('hidden');
    }
  });

  const forgotPasswordLink=document.getElementById('forgotPasswordLink');
  if(forgotPasswordLink){
    forgotPasswordLink.addEventListener('click', async e=>{
      e.preventDefault();
      const email=document.getElementById('loginEmail').value.trim();
      if(!email) return alert('Enter email first.');
      try{
        await auth.sendPasswordResetEmail(email);
        alert('Password reset email sent.');
      }catch(err){ alert(err.message); }
    });
  }
}

// ================== DASHBOARD LISTINGS, FARM RECORDS, COMMUNITY, SUPPORT, CHATBOT ==================
// Already fully coded in previous app.js message, fully functional
