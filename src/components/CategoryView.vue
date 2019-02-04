<template>
  <div>
    <h2>{{ name }}</h2>
    <p :style="leftForPeriod <= 0 ? { color : '#F75C03', fontWeight: 'bold' } : {}" class="mb-40">
      Осталось {{ formatMoney(leftForPeriod) }} {{ needToday ? '/ ' + formatMoney(avgForDay) : '' }}
    </p>
    <vue-circle
      :progress="0"
      :size="300"
      line-cap="round"
      :fill="fillPeriod"
      empty-fill="rgba(0, 0, 0, .05)"
      :start-angle="-Math.PI / 2"
      insert-mode="append"
      :thickness="20"
      :show-percent="false"
      :animation="false"
      :class="needToday ? 'circle-opacity' : ''"
      ref="circlePeriod">
      <vue-circle
        v-if="needToday"
        :progress="0"
        :size="240"
        line-cap="round"
        :fill="fillToday"
        empty-fill="rgba(0, 0, 0, .05)"
        :start-angle="-Math.PI / 2"
        insert-mode="append"
        :thickness="20"
        :show-percent="false"
        :animation="false"
        ref="circleToday">
          <b>На сегодня</b>
          <h1 :style="leftForToday <= 0 ? { color: '#E3B23C' } : {}">{{ formatMoney(leftForToday) }}</h1>
          <p>До получки {{ untilNextPay() }} {{ formatDays(untilNextPay()) }}</p>
      </vue-circle>
      <p v-else class="bigp">
        До получки {{ untilNextPay() }} {{ formatDays(untilNextPay()) }}
      </p>
    </vue-circle>
  </div>
</template>

<script>
import VueCircle from 'vue2-circle-progress'
import { utils } from 'ynab'

let colorRange = [
  '#2e8b57', '#2f8e56', '#309055', '#319354', '#329553', '#339752', '#349a51', '#359c50', '#369e4f', '#38a04e', '#39a24d',
  '#3ba54c', '#3ca74b', '#3ea94a', '#3fab49', '#41ac48', '#43ae47', '#45b047', '#47b246', '#49b445', '#4bb544', '#4db743',
  '#4fb842', '#52ba41', '#54bb40', '#56bd3f', '#59be3e', '#5bbf3d', '#5ec03c', '#60c23c', '#63c33b', '#65c43a', '#68c539',
  '#6bc638', '#6dc738', '#70c837', '#73c836', '#76c936', '#78ca35', '#7bca35', '#7ecb34', '#81cb34', '#84cc33', '#87cc33',
  '#8acc33', '#8dcd32', '#90cd32', '#93cd32', '#96cd32', '#99cd32', '#9dcc31', '#a2cb30', '#a6ca2e', '#abc82d', '#afc72c',
  '#b4c52a', '#b8c329', '#bcc227', '#bfc026', '#c3be24', '#c7bc23', '#caba21', '#cdb820', '#d0b61e', '#d3b41d', '#d6b11b',
  '#d9af1a', '#dcad18', '#deaa17', '#e1a815', '#e3a514', '#e5a212', '#e89f10', '#ea9d0f', '#ec9a0d', '#ee970c', '#ef930a',
  '#f19008', '#f38d07', '#f48905', '#f58604', '#f78203', '#f87f02', '#f97b01', '#fa7700', '#fb7300', '#fc6e00', '#fd6a00',
  '#fd6500', '#fe6000', '#fe5b00', '#ff5600', '#ff5000', '#ff4900', '#ff4300', '#ff3b00', '#ff3300', '#ff2800', '#ff1a00',
  '#ff0000'
]

export default {
  components: {
    VueCircle
  },
  name: 'CategoryView',
  props: {
    needToday: Boolean,
    name: String,
    totalForPeriod: Number,
    spentNotToday: Number,
    spentToday: Number
  },
  methods: {
    updatePeriod (val) {
      this.$refs.circlePeriod.updateProgress(+val)
      this.$refs.circlePeriod.updateFill(this.fillPeriod)
    },
    updateToday (val) {
      if (this.needToday) {
        this.$refs.circleToday.updateProgress(+val)
        this.$refs.circleToday.updateFill(this.fillToday)
      }
    },
    untilNextPay () {
      let today = new Date()
      var nextPay = new Date(today.getTime())

      if (today.getDate() > 5 && today.getDate() <= 20) {
        nextPay.setDate(20)
      } else {
        nextPay.setDate(5)
        if (today.getDate() > 20) {
          nextPay.setMonth(today.getMonth() + 1)
        }
      }

      let daysLeft = (nextPay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
      return daysLeft + 1
    },
    fromPrevPay () {
      let today = new Date()
      var prevPay = new Date(today.getTime())

      if (today.getDate() > 5 && today.getDate() <= 20) {
        prevPay.setDate(5)
      } else {
        prevPay.setDate(20)
        if (today.getDate() <= 5) {
          prevPay.setMonth(today.getMonth() - 1)
        }
      }

      let daysFrom = (today.getTime() - prevPay.getTime()) / (24 * 60 * 60 * 1000)
      return daysFrom - 1
    },
    formatDays (days) {
      let one = 'день'
      let two = 'дня'
      let few = 'дней'

      if (days > 4 && days < 20) return few
      if (days % 10 > 4) return few
      if (days % 10 > 1) return two
      if (days % 10 === 1) return one
      if (days % 10 === 0) return few
    },
    convertToIndex (num) {
      num = colorRange.length - (~~num) - 1
      return Math.max(0, Math.min(colorRange.length - 1, num))
    },
    formatMoney (val) {
      return utils.convertMilliUnitsToCurrencyAmount(val).toFixed(2) + '₽'
    }
  },
  computed: {
    spentPeriod () {
      return this.spentNotToday + (+this.spentToday)
    },
    percPeriod () {
      return Math.max(0, 100 - (this.spentPeriod / this.totalForPeriod * 100))
    },
    percToday () {
      if (this.maxForToday <= 0) {
        return 0
      }
      return Math.max(0, 100 - (this.spentToday / this.maxForToday * 100))
    },
    leftForPeriod () {
      return this.totalForPeriod - this.spentPeriod
    },
    avgForDay () {
      return this.totalForPeriod / (this.fromPrevPay() + this.untilNextPay())
    },
    maxForToday () {
      // avg + all not spent in prev days
      return this.avgForDay + (this.avgForDay * this.fromPrevPay() - this.spentNotToday)
    },
    leftForToday () {
      return this.maxForToday - this.spentToday
    },
    fillPeriod () {
      return {
        color: colorRange[this.convertToIndex(this.percPeriod)]
      }
    },
    fillToday () {
      return {
        color: colorRange[this.convertToIndex(this.percToday)]
      }
    }
  },
  mounted () {
    this.updatePeriod(this.percPeriod)
    this.updateToday(this.percToday)
  },
  watch: {
    percPeriod: function (val, old) {
      this.updatePeriod(val)
    },
    percToday: function (val, old) {
      this.updateToday(val)
    }
  }
}
</script>

<style scoped>
h1 {
  margin: 2px 0 20px;
}
h2 {
  margin-top: 0px;
  margin-bottom: 10px;
}
p {
  margin-top: 0px;
  margin-bottom: 0px;
}
.mt-20 {
  margin-bottom: 20px;
}
.mb-40 {
  margin-bottom: 40px;
}
.bigp {
  font-size: 20px;
}
</style>

<style>
div.circle-opacity > canvas {
  opacity: 0.5;
}
</style>
