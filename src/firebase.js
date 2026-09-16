// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDMWGvj7hp2h2JS-8YepCp3dBH_1mXmB24",
  authDomain: "umsconfession-e6734.firebaseapp.com",
  projectId: "umsconfession-e6734",
  storageBucket: "umsconfession-e6734.firebasestorage.app",
  messagingSenderId: "333581007854",
  appId: "1:333581007854:web:6a59b61cc1f3c1d227ecff",
  measurementId: "G-PWK4DHGY99"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Eksport perkhidmatan database dan auth untuk digunakan dalam App.jsx
export const db = getFirestore(app);
export const auth = getAuth(app);