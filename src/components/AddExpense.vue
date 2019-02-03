<template>
  <div class="container">
    <div class="input-block">
      <input
        v-model.number="roubles"
        class="pretty-input right-align"
        pattern="[0-9]*"
        placeholder="0"
        type="tel"
        size="5"
        maxlength="5">
      <b style="font-size: 30px;">.</b>
      <input
        v-model.number="pennies"
        class="pretty-input right-align"
        pattern="[0-9]*"
        placeholder="00"
        type="tel"
        size="2"
        maxlength="2">
      <span style="font-size: 30px;">₽</span>
    </div>
    <div class="input-block">
      <input
        v-model.number="comment"
        class="pretty-input"
        type="text"
        style="text-align: center; width: 300px;"
        placeholder="Комментарий">
    </div>
    <a href="#" class="btn hvr-fade" @click="saveExpense">Сохранить</a>
  </div>
</template>

<script>
export default {
  name: 'AddExpense',
  data () {
    return {
      roubles: null,
      pennies: null,
      comment: null
    }
  },
  methods: {
    saveExpense () {
      console.log('expense', this.roubles, this.pennies, this.comment)
      this.$emit('expense', {
        amount: this.roubles * 1000 + this.pennies * 10,
        comment: this.comment
      })
    }
  }
}
</script>

<style scoped>
.container {
  text-align: center;
  padding: 20px;
}
.input-block {
  margin: 20px 0;
}
.pretty-input {
  border: 0;
  font-size: 30px;
}
.right-align {
  text-align:right;
}
::placeholder {
  color: #ccc;
  opacity: 1;
}
</style>
