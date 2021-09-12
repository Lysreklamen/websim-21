<template>
    <div class="container-fluid">
      <div class="row">
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <h1>Simulator:</h1>
          <h2>{{ sign }}</h2>
        </main>
      </div>
    </div>
</template>

<script>
  export default {
    name: 'simulator',
    components: {
    },
    props: {
      sign: String
    },
    data() {
      return {
      }
    },
  }
</script>

<style>
    
</style>