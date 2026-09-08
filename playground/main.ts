import { createApp } from 'vue'
// 全量注册 Element Plus 及其样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 组件库样式（别名指向 src/styles/index.css）
import 'vue-el-protable/style.css'
import App from './App.vue'

createApp(App).use(ElementPlus).mount('#app')
