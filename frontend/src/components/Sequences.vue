<template>
  <div>
    <template  v-for="pgm in pgms">
      <button type="button" class="btn btn-outline-secondary pgm-button" v-bind:key="pgm" v-on:click="play(pgm)">{{ pgm }}</button>
    </template>
  </div>
</template>

<script>

import { PlayPGM } from '../simulator/pgmplayer.js'
import { pushFrame } from '../simulator/sim.js'

export default {
  name: "Sequences",
  components: {  },
  props: {
    sign: String,
  },
  created() {
    const api_base = "api/signs/" + this.sign;

     fetch(api_base + "/pgms.json").then(response => response.json()).then(data => {
       this.pgms = data;
    });
  },
  data() {
    return {
      pgms: []
    };
  },
  methods: {
    play(pgm_path) {
      const api_base = "api/signs/" + this.sign;
      PlayPGM(api_base + "/pgms/" + pgm_path, pushFrame);
    }
  }
}
</script>


<style>
  .pgm-button {
      margin: 0 0.1em;
  }
</style>