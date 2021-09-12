<template>
    <div class="container-fluid">
      <navbar></navbar>
      <div class="row">
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <h1>Available Signs:</h1>
          <b-list-group>
            <b-list-group-item href="#" v-if="signs.length == 0" disabled>Loading signs...Please wait</b-list-group-item>
            <template v-for="sign in signs">
              <b-list-group-item href="#" v-on:click="loadSign(sign)">{{ sign.toUpperCase() }}</b-list-group-item>
            </template>
          </b-list-group>
        </main>
      </div>
    </div>
</template>

<script>
  import Navbar from './components/Navbar.vue';

  export default {
    name: 'index',
    components: {
      Navbar,
    },
    created() {
      fetch("api/signs.json")
        .then(response => response.json())
        .then(data => (this.signs = data));
    },
    data() {
      return {
        signs: []
      }
    },
    methods: {
      loadSign(sign) {
        this.$emit("loadSign", sign);
      }
    }
  }
</script>

<style>
    
</style>
