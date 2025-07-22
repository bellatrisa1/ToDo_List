<template>
  <div class="auth-container">
    <h2>{{ isLogin ? "Вход" : "Регистрация" }}</h2>
    <form @submit.prevent="handleSubmit">
      <input type="email" v-model="email" placeholder="Email" required />
      <input type="password" v-model="password" placeholder="Пароль" required />
      <button type="submit">
        {{ isLogin ? "Войти" : "Зарегистрироваться" }}
      </button>
    </form>

    <p @click="toggleMode" class="toggle-mode">
      {{
        isLogin
          ? "Нет аккаунта? Зарегистрируйтесь"
          : "Уже есть аккаунт? Войдите"
      }}
    </p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { auth } from "@/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const emit = defineEmits(["login-success"]);

const email = ref("");
const password = ref("");
const isLogin = ref(true);

const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      await signInWithEmailAndPassword(auth, email.value, password.value);
      alert("Успешный вход!");
      emit("login-success");
    } else {
      await createUserWithEmailAndPassword(auth, email.value, password.value);
      alert("Успешная регистрация!");
      emit("login-success");
    }
  } catch (error) {
    console.error("Ошибка авторизации:", error.code, error.message);
    alert(`Ошибка: ${error.message}`);
  }
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  email.value = "";
  password.value = "";
};
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 40px auto;
  padding: 30px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

input {
  display: block;
  width: 100%;
  margin-bottom: 15px;
  padding: 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
}

button {
  padding: 12px;
  width: 100%;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background: #2563eb;
}

.toggle-mode {
  text-align: center;
  margin-top: 15px;
  color: #555;
  cursor: pointer;
  transition: color 0.3s;
}

.toggle-mode:hover {
  color: #3b82f6;
  text-decoration: underline;
}
</style>
