<!-- components/Navbar.vue -->
<template>
  <nav class="barra-navegacion" v-if="authStore.estaAutenticado">
    <div class="contenedor-nav">
      
      <!-- MARCA IDENTIFICATORIA UNIFICADA EN CELESTE CIAN PREMIUM -->
      <div class="marca-sistema" @click="irAlDashboard">
        <!-- Escenario A: Perfil Médico / Clínico -->
        <template v-if="authStore.obtenerRol === 'medico'">        
          <span class="texto-logo tipo-clinico">Módulo Clínico</span>
        </template>
        
        <!-- Escenario B: Perfil Administrador / Gestión -->
        <template v-else-if="authStore.obtenerRol === 'administrador'">
          <span class="texto-logo tipo-clinico">Módulo Administrativo</span>
        </template>       
      </div>

      <!-- Enlaces de navegación reactivos por rol -->
      <div class="enlaces-navegacion">
        <router-link 
          v-if="authStore.obtenerRol === 'medico'"
          to="/dashboard"  
          class="enlace-nav" 
          active-class="activo"
        >
          🔍 Consulta Clínica
        </router-link>
                 
        <router-link 
          v-if="authStore.obtenerRol === 'medico'" 
          to="/nueva-ficha" 
          class="enlace-nav" 
          active-class="activo"
        >
          Registro Atención Médica
        </router-link>

        <router-link 
          v-if="authStore.obtenerRol === 'administrador'" 
          to="/admin/usuarios" 
          class="enlace-nav" 
          active-class="activo"
        >
          Registro RRHH
        </router-link>

        <router-link 
          v-if="authStore.obtenerRol === 'administrador'" 
          to="/admin/medicos" 
          class="enlace-nav" 
          active-class="activo"
        >
          Gestión RRHH
        </router-link>

        <router-link 
          v-if="authStore.obtenerRol === 'administrador'" 
          to="/admin/centros" 
          class="enlace-nav" 
          active-class="activo"
        >
          Gestión Centros Salud
        </router-link>
      </div>

      <!-- CONTENEDOR DE PERFIL APILADO VERTICALMENTE CON MÁXIMO ESPACIADO -->
      <div class="perfil-sesion-extremo">
        
        <!-- Caja vertical que ordena el reloj arriba y el usuario abajo -->
        <div class="caja-vertical-credenciales">
          
          <!-- Fila Superior: Temporizador de Seguridad Lineal -->
          <div class="temporizador-seguridad" aria-live="polite">
            <span class="reloj-icono">⏳ SU SESION EXPIRA EN:</span>
            <span :class="['tiempo-restante', { 'alerta-critica': authStore.tiempoSegundos < 1800 }]">
              {{ authStore.tiempoFormateado }}
            </span>
          </div>

          <!-- Fila Inferior: Antecedentes de Identidad en un solo plano -->
          <div class="info-usuario-lineal">
            <span class="nombre-medico-nav">{{ authStore.usuario?.nombre || 'Funcionario' }}</span>
            <span class="separador-nav">-</span>
            <span class="rol-medico-nav">{{ authStore.obtenerRol }}</span>
          </div>

        </div>

        <!-- BOTÓN INDEPENDIENTE CON CLÁUSULA DE EMPUJE HORIZONTAL EXTREMO -->
        <button @click="ejecutarSalidaManual" class="boton-cerrar-sesion">
          Cerrar Sesión
        </button>

      </div>

    </div>

    <!-- INTEROPERABILIDAD: Cintillo de Notificaciones de la Pasarela FHIR -->
    <div v-if="mensajeAlerta" :class="['cintillo-alerta-interop', tipoAlerta]">
      <p>{{ mensajeAlerta }}</p>
    </div>

    <!-- MODAL DE ADVERTENCIA ANTES DE CERRAR SESIÓN POR INACTIVIDAD (60 SEGUNDOS) -->
    <div v-if="authStore.mostrarModalInactividad" class="modal-sobrecapa-seguridad">
      <div class="modal-ventana-seguridad animate-scale">
        <div class="modal-cabecera-alerta">
          <span>⚠️</span>
          <h4>¡Advertencia de Alerta por Inactividad!</h4>
        </div>
        <div class="modal-cuerpo-alerta">
          <p>Se ha detectado ausencia de interacción en el terminal clínico durante el último minuto.</p>
          <p class="texto-cuenta-regresiva">
            Su sesión se cerrará de forma automática en: <strong>{{ authStore.cuentaRegresivaCierre }} segundos</strong>.
          </p>
          <p class="nota-legal">Para resguardar el secreto clínico, confirme si se encuentra operativo.</p>
        </div>
        <div class="modal-acciones-alerta">
          <button type="button" @click="authStore.extenderSesionClinica" class="btn-extender-activo">
            🔄 Continuar Trabajando
          </button>
          <button type="button" @click="() => authStore.ejecutarSalidaForzada('inactividad')" class="btn-abortar-activo">
            Cerrar Sesión Ahora
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

// ADICIÓN: Variables reactivas para el cintillo de interoperabilidad FHIR
// Puedes conectarlas más adelante al store global si la pasarela gatilla eventos
const mensajeAlerta = ref(''); 
const tipoAlerta = ref('info'); // Puede ser 'info', 'success', 'warning' o 'error'

const irAlDashboard = () => {
  if (authStore.obtenerRol === 'administrador') {
    router.push('/admin/usuarios');
  } else {
    router.push('/dashboard');
  }
};

const ejecutarSalidaManual = () => authStore.ejecutarSalidaForzada('manual');
</script>

<style scoped>
/* Importación de tu hoja de estilos unificada con verde quirúrgico */
@import '../assets/css/navbarStyles.css';
</style>
