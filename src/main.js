import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Cargamos la hoja base estructural en CSS Puro
import './assets/css/baseStyles.css';

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
