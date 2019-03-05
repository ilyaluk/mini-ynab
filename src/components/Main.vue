<template>
  <div>
    <div v-if="!loading">
      <modal
        name="add-expense"
        :adaptive="true"
        @before-close="modalClosed"
      >
        <AddExpense
          @expense="addExpenseHandler"
        ></AddExpense>
      </modal>
      <v-dialog :click-to-close="false"/>

      <swiper ref="car" :options="swiperOption">
        <swiper-slide v-for="cat in categoryList" :key="cat.id">
          <CategoryView
            class="category-view"
            :need-today="cat.needAllowance"
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
      categoryList: []
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
      let parseOptions = (note) => {
        let res = null
        if (!note) return res
        let options = note.replace(/ /g, '').split(',')
        if (options[0] === 'mini-ynab') {
          res = {}
          for (let part of options) {
            let [arg, val] = part.split(':')
            res[arg] = val
          }
        }
        return res
      }
      let parseCaterories = (rawCategories) => {
        let res = {}
        for (let cat of rawCategories) {
          if (cat.note) {
            let options = parseOptions(cat.note)
            if (options) {
              let category = {
                id: cat.id,
                name: cat.name,
                order: +options.order || 1e9,
                totalForPeriod: cat.balance - cat.activity,
                spentNotToday: -cat.activity,
                spentToday: 0,
                needAllowance: false
              }
              if (options.budget) {
                category.totalForPeriod = (+options.budget) * 1000
                category.spentNotToday = 0
                category.needAllowance = true
              }
              res[cat.id] = category
            }
          }
        }
        return res
      }
      let getTransactionsForAllowance = (budget, categories) => {
        let transactionDates = {}
        let res = []
        let needAllowance = (catId) => categories[catId] && categories[catId].needAllowance

        for (let tran of budget.transactions) {
          transactionDates[tran.id] = tran.date // save dates for subtransactions
          if (needAllowance(tran.category_id)) {
            res.push([tran.date, tran.category_id, tran.amount])
          }
        }
        for (let subtran of budget.subtransactions) {
          if (needAllowance(subtran.category_id)) {
            let date = transactionDates[subtran.transaction_id]
            res.push([date, subtran.category_id, subtran.amount])
          }
        }
        console.log('trans for allow', res)
        return res
      }
      let getPrevPay = (today) => {
        let prevPay = new Date(today.getTime())

        if (today.getDate() > 5 && today.getDate() <= 20) {
          prevPay.setDate(5)
        } else {
          prevPay.setDate(20)
          if (today.getDate() <= 5) {
            prevPay.setMonth(today.getMonth() - 1)
          }
        }
        return prevPay
      }
      let processTransactions = (transactions, categories) => {
        let today = new Date()
        today.setHours(0, 0, 0, 0)
        let prevPay = getPrevPay(today)

        for (let [date, catId, amount] of transactions) {
          let tranDate = ynab.utils.convertFromISODateString(date)
          tranDate.setHours(0, 0, 0, 0)
          let cat = categories[catId]
          if (tranDate.getTime() === today.getTime()) {
            cat.spentToday -= amount
          } else if (tranDate > prevPay) {
            cat.spentNotToday -= amount
          }
        }
      }
      let sortCategories = (categories) => {
        let cats = Object.values(categories)
        cats.sort((a, b) => a.order - b.order)
        console.log('sorted cats', cats)
        return cats
      }

      this.apiReq(this.api.budgets.getBudgetById(this.budgetId), (res) => {
        console.log('api data', res.data)

        let categories = parseCaterories(res.data.budget.categories)
        let transactions = getTransactionsForAllowance(res.data.budget, categories)
        processTransactions(transactions, categories)
        this.categoryList = sortCategories(categories)
      })
    },
    addExpenseHandler (data) {
      this.addExpense(data.amount, data.comment)
    },
    addExpense (amount, comment) {
      let curCat = this.categoryList[this.$refs.car.swiper.activeIndex]

      let tran = {
        transaction: {
          account_id: 'eb924ac3-bd0f-4e25-be15-59e77cca0915',
          date: ynab.utils.getCurrentDateInISOFormat(),
          amount: -amount,
          payee_name: 'Расходы из MiniYNAB',
          category_id: curCat.id,
          memo: comment,
          approved: true
        }
      }
      this.apiReq(this.api.transactions.createTransaction(this.budgetId, tran), (res) => {
        console.log('created tran resp', res.data)
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
          title: this.$t('error.text'),
          text:
            '<pre style="white-space: pre-wrap;">' +
              (err.error ? err.error.detail : err) +
              '</pre>🤔🤷‍♂️<br>' + this.$t('error.info'),
          buttons: [{
            title: this.$t('error.ok'),
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
