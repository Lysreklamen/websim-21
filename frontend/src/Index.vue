<template>
    <div class="container-fluid">
      <navbar></navbar>
      <div class="row">
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <h1>Available Signs:</h1>
          <b-list-group>
            <b-list-group-item href="#" disabled>Loading signs...Please wait</b-list-group-item>
            <b-list-group-item href="#does-nothing" v-on:click="wat">UKA17</b-list-group-item>
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
    data() {
      return {
      }
    },
    methods: {
      wat() {
        this.$emit("loadSign", "UKA17");
      }
    }
  }
</script>

<style>
    
</style>
