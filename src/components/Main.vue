<template>
  <div>
    <div v-if="!loading">
      <modal
        name="add-expense"
        :adaptive="true"
        @before-close="modalClosed"
      >
        <AddExpense
          @expense="addExpense"
        ></AddExpense>
      </modal>
      <v-dialog :click-to-close="false"/>

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
    <div v-else>
      🔲
    </div>
  </div>
</template>

<script>
import { disableBodyScroll } from 'body-scroll-lock'
import * as ynab from 'ynab'

import CategoryView from './CategoryView.vue'
import AddExpense from './AddExpense.vue'

export default {
  components: {
    CategoryView,
    AddExpense
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
        token: null
      },
      api: null,
      loading: true,
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
    disableBodyScroll(this.$el)
    // this.resetToken()
    this.ynab.token = this.findYNABToken()
    if (this.ynab.token) {
      // eslint-disable-next-line
      this.api = new ynab.api(this.ynab.token)
      this.updateYNAB()
    }
  },
  methods: {
    updateYNAB () {
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
    },
    addExpense (data) {
      let curCat = this.categories[this.$refs.car.swiper.activeIndex]
      let today = new Date()
      let month = '' + (today.getMonth() + 1)
      let day = '' + today.getDate()
      let year = today.getFullYear()

      if (month.length < 2) month = '0' + month
      if (day.length < 2) day = '0' + day

      let todayStr = [year, month, day].join('-')

      let tran = {
        transaction: {
          account_id: 'eb924ac3-bd0f-4e25-be15-59e77cca0915',
          date: todayStr,
          amount: -data.amount,
          payee_name: 'Расходы из MiniYNAB',
          category_id: curCat.id,
          memo: data.comment,
          approved: true
        }
      }
      this.apiReq(this.api.transactions.createTransaction(this.budgetId, tran), (res) => {
        console.log(res.data)
        this.updateYNAB()
      })
    },
    apiReq (promise, cb) {
      this.loading = true
      promise.then(cb).catch((err) => {
        console.log(err)
        if (err.error && err.error.id === '401') {
          this.resetToken()
          location.reload()
        }
        this.$modal.show('dialog', {
          title: 'Не пугайся, случилась ошибочка',
          text:
            'YNAB сказал:<pre style="white-space: pre-wrap;">' +
              (err.error ? err.error.detail : err) +
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
      this.$modal.show('add-expense')
      this.modalOpen = true
    },
    modalClosed () {
      this.modalOpen = false
    },
    findYNABToken () {
      let token = localStorage.getItem('ynab_access_token')
      if (!token || token === 'null') {
        token = prompt('Token')
        localStorage.setItem('ynab_access_token', token)
      }
      return token
    },
    resetToken () {
      localStorage.removeItem('ynab_access_token')
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
  background: #FC9F5B;
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
  background-color: #ADE25D;
  color: white;
}
</style>
