<template>
  <div>
    <!-- Сумма: <input type="number" step="0.01" min="0" pattern="\\d*"/> -->
    <input pattern="[0-9]*" type="text">
    <br>
    Комментарий: <input type="text"/>
    <br>
    <button type="button">Сохранить</button>
  </div>
</template>

<script>
export default {
  name: 'AddExpense',
  data () {
    return {
      test: 0
    }
  }
}
</script>
