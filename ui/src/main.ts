import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import './styles/provisioning.css'
import './styles/task-creation.css'
import './styles/workspace-management.css'

createApp(App).use(createPinia()).use(router).mount('#app')
