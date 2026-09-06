<!-- views/Login.vue (PARTE 1: TEMPLATE MODIFICADO) -->
<template>
  <div class="contenedor-login">
    <div class="tarjeta-autenticacion">
      
      <!-- ENCABEZADO CLÍNICO CON LOGOTIPO VECTORIAL CORPORATIVO -->
      <div class="encabezado-clinico">
        <!-- 🚀 NUEVO LOGO INCORPORADO (Asegúrate de guardar tu imagen como 'logo-clinico.png' en tus assets) -->
        <img 
          src="../assets/logo-clinico.png" 
          alt="Logotipo Sistema Nacional Clínico" 
          class="logo-institucional-login"
        />
        
        <h2 class="titulo-establecimiento">CESFAM Emilio Schaffhauser</h2>
        <h3 class="etiqueta-sistema">INICIO DE SESIÓN</h3>
      </div>

      <!-- Cuadro de Alerta para Errores del Backend -->
      <div v-if="error" class="alerta error">
        {{ error }}
      </div>

      <form @submit.prevent="procesarAcceso" class="formulario-acceso">
        <div class="grupo-entrada">
          <label for="correo">Correo Electrónico Institucional</label>
          <input 
            id="correo"
            type="email" 
            v-model="credenciales.correo" 
            placeholder="andres@medico.cl"
            required
            :disabled="estaCargando"
          />
        </div>

        <div class="grupo-entrada">
          <label for="contrasena">Contraseña de Acceso</label>
          <input 
            id="contrasena"
            type="password" 
            v-model="credenciales.password" 
            placeholder="••••••••••••"
            required
            :disabled="estaCargando"
          />
        </div>

        <button type="submit" :disabled="estaCargando">
          <span v-if="estaCargando">
            <span class="spinner">⏳</span> Verificando...
          </span>
          <span v-else>Ingresar al Sistema Clínico</span>
        </button>
      </form>
    </div>
  </div>
</template>

<!-- views/Login.vue (PARTE 2: SCRIPT SETUP - CORREGIDO) -->
<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router'; // 🚀 ADICIÓN: useRoute obligatorio para leer el query string
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const route = useRoute(); // Instanciamos la ruta activa
const authStore = useAuthStore();

// Estados reactivos locales de control de flujo
const estaCargando = ref(false);
const error = ref(null);

const credenciales = reactive({
  correo: '',
  password: ''
});

// 🚀 CAPTURA INTELEGENTE: Captura alertas forenses enviadas en la URL por Pinia ante cierres forzados
onMounted(() => {
  const alertaMotivo = route.query.alerta;
  
  if (alertaMotivo) {
    if (alertaMotivo === 'inactivo') {
      error.value = 'Su sesión ha sido cerrada automáticamente debido a inactividad en la estación de trabajo para resguardar la privacidad clínica.';
    } else if (alertaMotivo === 'suspendido') {
      error.value = 'Su cuenta de usuario se encuentra suspendida o deshabilitada temporalmente en la Red Nacional. Contacte a Soporte.';
    } else if (alertaMotivo === 'seguridad') {
      error.value = 'Acceso denegado de forma perimetral: Intento de violación de políticas de privilegios RBAC.';
    } else if (alertaMotivo === 'expirado') {
      error.value = 'Su sesión ha expirado tras cumplir el límite reglamentario de 8 horas de turno médico continuo. Por favor, re-autentique.';
    }
  }
});

// Despacho seguro del formulario hacia la acción central de Pinia
const procesarAcceso = async () => {
  estaCargando.value = true;
  error.value = null;

  // Sanitización perimetral rápida
  const correoSanitizado = credenciales.correo.trim().toLowerCase();
  const passwordIngresada = credenciales.password;

  try {
    const resultado = await authStore.iniciarSesion(correoSanitizado, passwordIngresada);

    if (resultado.exito) {
      const rolUsuario = authStore.obtenerRol;
      
      // Redirección inteligente gobernada por Pinia y router/index.js
      if (rolUsuario === 'administrador') {
        await router.push('/admin/usuarios');
      } else if (rolUsuario === 'medico') {
        await router.push('/dashboard');
      } else {
        throw new Error('Rol institucional no identificado. No se puede conceder acceso a los módulos.');
      }
    } else {
      // Captura el error de credenciales incorrectas o rate-limit de la API
      throw new Error(resultado.error || 'Credenciales inválidas proporcionadas.');
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    // 🚀 CORRECCIÓN: Garantiza el restablecimiento del estado de carga siempre
    estaCargando.value = false;
  }
};
</script>

<style scoped>
/* Importación aislada y local del CSS exclusivo del Login */
@import '../assets/css/loginStyles.css';
</style>
