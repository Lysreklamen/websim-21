<template>
    <div class="container-fluid">
      <nav class="navbar navbar-expand-lg navbar-light bg-light">
          <a class="navbar-brand" href="/">Home</a>
          <form class="d-flex" action="/login" method="POST">
            <input class="form-control me-2" type="password" placeholder="Password" name="password" aria-label="Password">
            <button class="btn btn-outline-success" type="submit">Login</button>
          </form>
      </nav>
    </div>
</template>

<script>
  export default {
    name: 'app',
    components: {
    },
    data() {
      return {
      }
    }
  }
</script>

<style>
    
</style>
