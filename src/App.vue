<template>
  <div class="aplicacion-base">
    <!-- Barra de navegación global (Gobernada internamente por v-if de autenticación) -->
    <Navbar />
    
    <!-- Contenedor dinámico donde Vue Router montará la vista activa (Login, Dashboard, etc.) -->
    <main class="contenedor-principal">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
</script>

<style scoped>
/* Estructura de caja modular para el layout clínico nacional */
.aplicacion-base {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.contenedor-principal {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box; /* Asegura que el padding no altere las dimensiones máximas */
}
</style>
