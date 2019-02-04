<template>
  <div id="app">
    <Main/>
  </div>
</template>

<script>
import Main from './components/Main.vue'

export default {
  name: 'app',
  components: {
    Main
  }
}
</script>

<style>
body {
  margin: 0;
  padding: 20px 10px;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(315deg, #ADE25D, #0CCE6B);
  background-color: #05d6dc;
  cursor: default;
  box-sizing: border-box;
}

#app {
  font-family: Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #363537;

  background: #fffff7;
  padding: 20px 10px;
  border-radius: 3px;
  box-shadow: 0 4px 36px rgba(50,50,93,.11),
    0 1px 33px rgba(0,0,0,.08);

  /*disable text selection*/
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  /*disable grayish thing*/
  -webkit-tap-highlight-color: rgba(0,0,0,0);
}

@media (min-width: 1100px) {
  body {
    padding: 40px 40px;
  }

  #app {
    padding: 40px 40px;
  }
}

</style>
