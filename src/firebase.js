import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCpJwjlonfFY-VZZuqb21t8_lwje6T2ZHY",
  authDomain: "todo-vue-app-c401e.firebaseapp.com",
  projectId: "todo-vue-app-c401e",
  storageBucket: "todo-vue-app-c401e.appspot.com",
  messagingSenderId: "182403011601",
  appId: "1:182403011601:web:3d39877343c1f523a38db0",
  measurementId: "G-71S6H7T4JQ",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);