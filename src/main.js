import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'

import VModal from 'vue-js-modal'
import VueAwesomeSwiper from 'vue-awesome-swiper'
import 'swiper/dist/css/swiper.css'
import VueI18n from 'vue-i18n'

import ru from '@/lang/ru.json'
import en from '@/lang/en.json'

Vue.use(VModal, {
  dialog: true
})
Vue.use(VueAwesomeSwiper)
Vue.use(VueI18n)

Vue.config.productionTip = false

const i18n = new VueI18n({
  locale: 'en',
  messages: { ru: ru, en: en }
})

new Vue({
  el: '#app',
  i18n,
  render: h => h(App),
})
