<template>
    <div class="container-fluid">
      <navbar></navbar>
      <div class="row">
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <h1>Simulator:</h1>
        </main>
      </div>
    </div>
</template>

<script>
  import Navbar from './components/Navbar.vue';

  export default {
    name: 'simulator',
    components: {
      Navbar,
    },
    data() {
      return {
      }
    }
  }
</script>

<style>
    
</style>
