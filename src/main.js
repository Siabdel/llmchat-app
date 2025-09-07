
import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import 'aos/dist/aos.css'
import AOS from 'aos'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css' // Thème pour la coloration syntaxique

const app = createApp(App)
app.use(AOS)
app.mount('#app')