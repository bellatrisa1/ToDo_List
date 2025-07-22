<template>
  <div class="todo-app">
    <LoginRegister v-if="!user" @login-success="loadTasks" />

    <div v-else>
      <!-- Header -->
      <header class="header">
        <h1>To do list</h1>
        <div class="controls">
          <button @click="openModal" class="add-button">
            <i class="fas fa-plus"></i> Добавить задачу
          </button>
          <button @click="signOut" class="signout-button">Выйти</button>
        </div>
      </header>

      <!-- Search -->
      <div class="search-sort">
        <div class="search-container">
          <i class="fas fa-search search-icon"></i>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Поиск Имени, статуса или даты"
            class="search-input"
          />
        </div>
        <div class="sort-controls">
          <span>Сортировать по:</span>
          <select v-model="sortBy" class="sort-select">
            <option value="date">Дата</option>
            <option value="status">Статус</option>
          </select>
        </div>
      </div>

      <!-- Task Table -->
      <div class="table-container">
        <div v-if="isLoading" class="loading-indicator">Загрузка...</div>
        <table v-else class="task-table">
          <thead>
            <tr>
              <th class="checkbox-col"></th>
              <th>Описание</th>
              <th>Статус</th>
              <th>Дата</th>
              <th class="actions-col">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in filteredTasks"
              :key="task.id"
              :class="{ 'completed-task': task.completed }"
            >
              <td class="checkbox-col">
                <input
                  type="checkbox"
                  :checked="task.completed"
                  @change="toggleTaskCompletion(task)"
                  class="task-checkbox"
                />
              </td>
              <td class="description-col">
                <span :class="{ 'completed-text': task.completed }">
                  {{ task.description }}
                </span>
              </td>
              <td>
                <span
                  :class="{
                    'status-completed': task.status === 'Выполнено',
                    'status-in-progress': task.status === 'В работе',
                  }"
                >
                  {{ task.status }}
                </span>
              </td>
              <td>{{ task.date }}</td>
              <td class="actions-col">
                <button @click="deleteTask(task.id)" class="delete-button">
                  ×
                </button>
              </td>
            </tr>
            <tr v-if="filteredTasks.length === 0">
              <td colspan="5" class="no-tasks">Нет задач для отображения</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Task Modal -->
      <transition name="modal">
        <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
          <div class="modal">
            <div class="modal-header">
              <h2>Создать новую задачу</h2>
              <button @click="closeModal" class="modal-close">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <form @submit.prevent="addTask" class="modal-form">
              <div class="input-group">
                <label for="description-input" class="input-label"
                  >Описание</label
                >
                <input
                  id="description-input"
                  type="text"
                  v-model="newTaskDescription"
                  placeholder="Введите описание задачи"
                  class="modal-input"
                  required
                />
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  @click="closeModal"
                  class="modal-button cancel"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  class="modal-button confirm"
                  :disabled="!newTaskDescription.trim()"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { db, auth } from "@/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import LoginRegister from "./components/LoginRegister.vue";

export default {
  components: {
    LoginRegister,
  },
  data() {
    return {
      tasks: [],
      newTaskDescription: "",
      searchQuery: "",
      sortBy: "date",
      showModal: false,
      isLoading: false,
      user: null,
    };
  },
  created() {
    auth.onAuthStateChanged((user) => {
      this.user = user;
      if (user) {
        this.loadTasks();
      } else {
        this.tasks = [];
      }
    });
  },
  computed: {
    filteredTasks() {
      const query = this.searchQuery.toLowerCase();
      let filtered = this.tasks.filter((task) =>
        Object.values(task).some(
          (value) =>
            typeof value === "string" && value.toLowerCase().includes(query)
        )
      );

      if (this.sortBy === "date") {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (this.sortBy === "status") {
        filtered.sort((a, b) => a.status.localeCompare(b.status));
      }

      return filtered;
    },
  },
  methods: {
    handleLoginSuccess() {
      this.loadTasks();
    },
    async loadTasks() {
      if (!this.user) return;

      this.isLoading = true;
      try {
        const q = query(
          collection(db, "tasks"),
          where("uid", "==", this.user.uid)
        );
        const querySnapshot = await getDocs(q);
        this.tasks = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Ошибка загрузки задач:", error);
        alert("Не удалось загрузить задачи: " + error.message);
      } finally {
        this.isLoading = false;
      }
    },
    async toggleTaskCompletion(task) {
      try {
        await updateDoc(doc(db, "tasks", task.id), {
          completed: !task.completed,
          status: !task.completed ? "Выполнено" : "В работе",
        });
        await this.loadTasks();
      } catch (error) {
        console.error("Ошибка обновления задачи:", error);
        alert("Не удалось обновить задачу: " + error.message);
      }
    },
    async addTask() {
      if (!this.newTaskDescription.trim()) {
        alert("Введите описание задачи");
        return;
      }
      if (!this.user) {
        alert("Пожалуйста, авторизуйтесь");
        return;
      }

      try {
        await addDoc(collection(db, "tasks"), {
          description: this.newTaskDescription,
          status: "В работе",
          date: new Date().toLocaleDateString("ru-RU"),
          completed: false,
          uid: this.user.uid,
        });
        this.newTaskDescription = "";
        this.closeModal();
        await this.loadTasks();
      } catch (error) {
        console.error("Ошибка добавления задачи:", error);
        alert("Не удалось добавить задачу: " + error.message);
      }
    },
    async deleteTask(taskId) {
      if (!confirm("Вы уверены, что хотите удалить эту задачу?")) return;

      try {
        await deleteDoc(doc(db, "tasks", taskId));
        await this.loadTasks();
      } catch (error) {
        console.error("Ошибка удаления задачи:", error);
        alert("Не удалось удалить задачу: " + error.message);
      }
    },
    openModal() {
      this.showModal = true;
      this.$nextTick(() => {
        const input = document.getElementById("description-input");
        if (input) input.focus();
      });
    },
    closeModal() {
      this.showModal = false;
      this.newTaskDescription = "";
    },
    async signOut() {
      try {
        await signOut(auth);
        this.user = null;
      } catch (error) {
        console.error("Ошибка выхода:", error);
        alert("Ошибка выхода: " + error.message);
      }
    },
  },
};
</script>

<style scoped>
/* Base styles */
.todo-app {
  font-family: "Inter", sans-serif;
  max-width: 1000px;
  margin: 40px auto;
  padding: 30px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #2c3e50;
}

.loading-indicator {
  padding: 20px;
  text-align: center;
  color: #666;
}

.no-tasks {
  text-align: center;
  padding: 20px;
  color: #666;
}

.add-button {
  background-color: #4b6eff;
  border: none;
  color: white;
  padding: 10px 16px;
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(75, 110, 255, 0.2);
}

.add-button:hover {
  background-color: #3a5cef;
  transform: translateY(-1px);
}

.add-button:active {
  transform: translateY(0);
}

/* Search and sort */
.search-sort {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 16px;
}

.search-container {
  position: relative;
  flex-grow: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9aa4bf;
  font-size: 14px;
}

.search-input {
  padding: 10px 15px 10px 36px;
  width: 100%;
  border: 1px solid #e0e4ed;
  border-radius: 8px;
  background-color: #f8fafc;
  font-size: 14px;
  color: #2c3e50;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4b6eff;
  box-shadow: 0 0 0 2px rgba(75, 110, 255, 0.2);
  background-color: #fff;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #5a6376;
}

.sort-select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e0e4ed;
  font-size: 14px;
  background-color: #f8fafc;
  color: #2c3e50;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #4b6eff;
}

/* Table */
.table-container {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e0e4ed;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 600px;
}

.task-table th {
  text-align: left;
  padding: 12px 16px;
  background-color: #f8fafc;
  font-weight: 500;
  color: #5a6376;
  border-bottom: 1px solid #e0e4ed;
}

.task-table td {
  padding: 16px;
  border-bottom: 1px solid #e0e4ed;
  vertical-align: middle;
  color: #2c3e50;
}

.task-table tr:last-child td {
  border-bottom: none;
}

.task-table tr:hover {
  background-color: #f8f9fc;
}

/* Columns */
.checkbox-col {
  width: 40px;
  padding-right: 0;
}

.description-col {
  min-width: 250px;
}

.actions-col {
  width: 60px;
  text-align: center;
}

/* Checkbox */
.task-checkbox {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid #c4c4c4;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  margin: 0;
}

.task-checkbox:checked {
  border-color: #4b6eff;
  background-color: #4b6eff;
  box-shadow: 0px 4px 4px rgba(19, 78, 193, 0.15);
}

.task-checkbox:checked::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 6px;
  width: 4px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* Task text */
.completed-text {
  text-decoration: line-through;
  color: #9aa4bf;
}

/* Status */
.status-completed {
  background-color: #e8f0fe;
  color: #124ec1;
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 500;
  font-size: 13px;
  display: inline-block;
}

.status-in-progress {
  background-color: #fff4e8;
  color: #f29b33;
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 500;
  font-size: 13px;
  display: inline-block;
}

/* Delete button */
.delete-button {
  background: none;
  border: none;
  color: #ff5c5c;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 14px;
}

.delete-button:hover {
  background-color: #ffeeee;
  color: #ff3b3b;
}

.delete-button:active {
  transform: scale(0.95);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e4ed;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
}

.modal-form {
  padding: 20px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #5a6376;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #2c3e50;
}

.input-group {
  margin-bottom: 20px;
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e4ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.modal-input:focus {
  outline: none;
  border-color: #4b6eff;
  box-shadow: 0 0 0 2px rgba(75, 110, 255, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
}

.modal-button {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-button.cancel {
  background-color: #f8fafc;
  color: #5a6376;
  border: 1px solid #e0e4ed;
}

.modal-button.cancel:hover {
  background-color: #f1f4f9;
}

.modal-button.confirm {
  background-color: #4b6eff;
  color: white;
  border: none;
}

.modal-button.confirm:hover {
  background-color: #3a5cef;
}

.modal-button.confirm:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.controls {
  display: flex;
  gap: 10px;
}

.signout-button {
  background-color: #ff5c5c;
  border: none;
  color: white;
  padding: 10px 16px;
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(255, 92, 92, 0.2);
}

.signout-button:hover {
  background-color: #ff3b3b;
  transform: translateY(-1px);
}

.signout-button:active {
  transform: translateY(0);
}

/* Анимации */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}
.modal-enter,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.3s;
}
.modal-enter .modal,
.modal-leave-to .modal {
  transform: translateY(-20px);
}

/* Responsive */
@media (max-width: 768px) {
  .todo-app {
    padding: 20px;
    margin: 20px;
  }

  .search-sort {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    max-width: 100%;
  }

  .header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .controls {
    flex-wrap: wrap;
  }
}
</style>
