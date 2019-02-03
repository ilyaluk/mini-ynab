import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'

import VModal from 'vue-js-modal'
import VueAwesomeSwiper from 'vue-awesome-swiper'
import 'swiper/dist/css/swiper.css'

Vue.use(VModal, {
  dialog: true
})
Vue.use(VueAwesomeSwiper)

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
