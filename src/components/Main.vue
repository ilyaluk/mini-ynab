<template>
  <div>
    <modals-container/>
    <v-dialog :click-to-close="false"/>

    <!-- <input type="range" v-model.number="categories[0].spentToday" min="0" max="500000"> -->

    <swiper ref="car" :options="swiperOption">
      <swiper-slide v-for="cat in categories" :key="cat.name">
        <CategoryView
          class="category-view"
          :need-today="cat.needToday"
          :name="cat.name"
          :total-for-period="cat.totalForPeriod"
          :spent-not-today="cat.spentNotToday"
          :spent-today="cat.spentToday"
        ></CategoryView>
      </swiper-slide>
      <div class="swiper-pagination" slot="pagination"></div>
    </swiper>
    <a href="#" :class="['btn', 'hvr-fade', modalOpen ? 'hvr-opened' : '' ]" @click="openModal">✚</a>
  </div>
</template>

<script>
import { disableBodyScroll } from 'body-scroll-lock'
import * as ynab from 'ynab'

import CategoryView from './CategoryView.vue'
import AddExpense from './AddExpense.vue'

export default {
  components: {
    CategoryView
  },
  name: 'Main',
  data () {
    return {
      modalOpen: false,
      swiperOption: {
        pagination: {
          el: '.swiper-pagination'
        }
      },
      ynab: {
        clientId: '3f3d6f11dd6226add984b78b64e6b9d8d81a6c363e5d39c8f630b687fc0e29c8',
        redirectUri: 'https://miniynab.luk.moe',
        token: null
      },
      api: null,
      loading: false,
      error: null,
      budgetId: 'df538690-8e9c-4103-b2cb-8d40ebe2e822',
      categories: [
        // {
        //   needToday: true,
        //   name: '🧝‍♀️ Карманные',
        //   totalForPeriod: 200000,
        //   spentNotToday: 45000,
        //   spentToday: 10000
        // },
        // {
        //   name: 'Продукты',
        //   totalForPeriod: 800000,
        //   spentNotToday: 610620,
        //   spentToday: 0
        // }
      ]
    }
  },
  mounted () {
    disableBodyScroll(this.$refs.car)
    this.ynab.token = this.findYNABToken()
    if (!this.ynab.token) {
      this.$modal.show('dialog', {
        title: 'Privacy Policy',
        text:
          'This website does not store any information from you or your YNAB account. ' +
          'All data retrieved from the YNAB API is stored only in your browser and ' +
          'is never transmitted to any other location or third-party.',
        buttons: [{
          title: 'Got it, take me to login',
          handler: () => {
            this.authorizeWithYNAB()
          }
        }]
      })
    } else {
      // eslint-disable-next-line
      this.api = new ynab.api(this.ynab.token)

      this.apiReq(this.api.budgets.getBudgetById(this.budgetId), (res) => {
        console.log(res.data)
        let categories = {}
        for (let cat of res.data.budget.categories) {
          if (cat.note) {
            let text = cat.note.replace(/ /g, '').split(',')
            console.log(text)
            if (text[0] === 'mini-ynab') {
              let category = {
                order: 1e9,
                id: cat.id,
                name: cat.name,
                totalForPeriod: cat.budgeted,
                spentNotToday: 0,
                spentToday: 0
              }
              for (let part of text) {
                let [arg, val] = part.split(':')
                if (arg === 'order') {
                  category.order = +val
                } else if (arg === 'budget') {
                  category.totalForPeriod = (+val) * 1000
                  category.needToday = true
                }
              }
              categories[cat.id] = category
            }
          }
        }

        let today = new Date()
        today.setHours(0, 0, 0, 0)
        var prevPay = new Date(today.getTime())

        if (today.getDate() > 5 && today.getDate() <= 20) {
          prevPay.setDate(5)
        } else {
          prevPay.setDate(20)
          if (today.getDate() <= 5) {
            prevPay.setMonth(today.getMonth() - 1)
          }
        }

        let checkAddTranDate = (date, catId, amount) => {
          let tranDate = new Date(date)
          tranDate.setHours(0, 0, 0, 0)
          console.log(today, tranDate)
          if (tranDate.getTime() === today.getTime()) {
            console.log('today')
            categories[catId].spentToday -= amount
          } else if (tranDate > prevPay) {
            console.log('fromPay')
            categories[catId].spentNotToday -= amount
          }
        }

        let transactionDates = {}
        for (let tran of res.data.budget.transactions) {
          transactionDates[tran.id] = tran.date
          if (categories[tran.category_id]) {
            console.log(tran)
            checkAddTranDate(tran.date, tran.category_id, tran.amount)
          }
        }
        for (let subtran of res.data.budget.subtransactions) {
          if (categories[subtran.category_id]) {
            console.log(subtran)
            let date = transactionDates[subtran.transaction_id]
            checkAddTranDate(date, subtran.category_id, subtran.amount)
          }
        }

        let tmp = Object.values(categories)
        tmp.sort((a, b) => a.order - b.order)
        console.log(tmp)
        this.categories = tmp
      })
    }
  },
  methods: {
    apiReq (promise, cb) {
      promise.then(cb).catch((err) => {
        console.log(err)
        this.$modal.show('dialog', {
          title: 'Не пугайся, случилась ошибочка',
          text:
            'YNAB сказал:<pre style="white-space: pre-wrap;">' +
              err.error.detail +
              '</pre>🤔🤷‍♂️<br>Отправь мне скриншот, пожалуйста',
          buttons: [{
            title: 'Хорошо, не буду паниковать',
            handler: () => {
              this.$modal.hide('dialog')
            }
          }]
        })
      }).finally(() => {
        this.loading = false
      })
    },
    openModal () {
      this.$modal.show(AddExpense, null, {
        name: 'add-expense',
        adaptive: true
      }, {
        'before-close': this.modalClosed
      })
      this.modalOpen = true
    },
    modalClosed () {
      this.modalOpen = false
    },
    // This builds a URI to get an access token from YNAB
    // https://api.youneedabudget.com/#outh-applications
    authorizeWithYNAB () {
      const uri = `https://app.youneedabudget.com/oauth/authorize?client_id=${this.ynab.clientId}&redirect_uri=${this.ynab.redirectUri}&response_type=token`
      location.replace(uri)
    },

    // Method to find a YNAB token
    // First it looks in the location.hash and then sessionStorage
    findYNABToken () {
      let token = null
      const search = window.location.hash.substring(1).replace(/&/g, '","').replace(/=/g, '":"')
      if (search && search !== '') {
        // Try to get access_token from the hash returned by OAuth
        const params = JSON.parse('{"' + search + '"}', function (key, value) {
          return key === '' ? value : decodeURIComponent(value)
        })
        token = params.access_token
        sessionStorage.setItem('ynab_access_token', token)
        window.location.hash = ''
      } else {
        // Otherwise try sessionStorage
        token = sessionStorage.getItem('ynab_access_token')
      }
      return token
    },
    // Clear the token and start authorization over
    resetToken () {
      sessionStorage.removeItem('ynab_access_token')
      this.ynab.token = null
      this.error = null
    }
  }
}
</script>

<style>
.category-view {
  margin-bottom: 45px;
}

.btn {
  margin-top: 10px;
  padding: .5em 2em;
  cursor: pointer;
  background: #FFA500;
  color: #666;
  font-size: 30px;
  text-decoration: none;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  border-radius: .5em;
}

.hvr-fade {
  display: inline-block;
  vertical-align: middle;
  -webkit-transform: perspective(1px) translateZ(0);
  transform: perspective(1px) translateZ(0);
  box-shadow: 0 0 1px rgba(0, 0, 0, 0);
  overflow: hidden;
  -webkit-transition-duration: 0.3s;
  transition-duration: 0.3s;
  -webkit-transition-property: color, background-color;
  transition-property: color, background-color;
}

.hvr-fade:hover, .hvr-fade:focus, .hvr-fade:active, .hvr-opened {
  background-color: #32CD32;
  color: white;
}
</style>
