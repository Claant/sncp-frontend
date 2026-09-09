<!-- views/AdminCentros.vue -->
<template>
  <div class="centros-contenedor">
    <header class="centros-header">
      <h2>Gestión de Establecimientos Asistenciales</h2>
      <p>Alta e incorporación de nuevos centros asistenciales a la Red Nacional de Salud.</p>
    </header>

    <!-- Alertas de Estado del Sistema -->
    <transition name="fade">
      <div v-if="notificacion.texto" :class="['notificacion', notificacion.tipo]" role="alert">
        {{ notificacion.texto }}
      </div>
    </transition>

    <div class="panel-cooperativo">
      <!-- FORMULARIO DE ALTA (Columna Izquierda) -->
      <section class="tarjeta-formulario">
        <h3>Registrar Nuevo Centro</h3>
        <form @submit.prevent="registrarEstablecimiento" class="formulario_clinico">
          <div class="campo">
            <label>Nombre del Establecimiento</label>
            <input 
              type="text" 
              v-model="centro.nombre_centro" 
              placeholder="Ej: CESFAM Emilio Schaffhauser" 
              required 
              :disabled="guardando"
            />
          </div>

          <div class="campo">
            <label>Tipo de Prestador</label>
            <select v-model="centro.tipo_prestador" required :disabled="guardando">
              <option value="" disabled selected>Seleccione tipo...</option>
              <option value="Publico">Público (FONASA / Red Asistencial)</option>
              <option value="Privado">Privado (Clínicas / Centros Médicos)</option>
            </select>
          </div>

          <button type="submit" class="btn-crear" :disabled="guardando">
            {{ guardando ? 'Registrando Infraestructura...' : 'Dar de Alta Centro' }}
          </button>
        </form>
      </section>

      <!-- LISTADO DE INFRAESTRUCTURA HOSPITALARIA (Columna Derecha) -->
      <section class="tarjeta-listado">
        <h3>Establecimientos Vigentes</h3>
        <div v-if="cargando" class="cargando-tabla">Consultando registros...</div>
        
        <div v-else class="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Nombre del Establecimiento</th>
                <th>Tipo de Prestador</th>
              </tr>
            </thead>
            <tbody>
              <!-- Renderizado condicional si el catálogo nacional viene vacío -->
              <tr v-if="listaCentros.length === 0">
                <td colspan="2" class="tabla-vacia">No hay establecimientos registrados.</td>
              </tr>
              <tr v-for="item in listaCentros" :key="item._id">
                <td class="celda-principal">{{ item.nombre_centro }}</td>
                <td>
                  <span :class="['badge-prestador', item.tipo_prestador]">
                    {{ item.tipo_prestador }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import '../assets/css/baseStyles.css';

const authStore = useAuthStore();

// Estados reactivos locales
const guardando = ref(false);
const cargando = ref(false);
const listaCentros = ref([]);
const notificacion = reactive({ texto: '', tipo: '' });

// Variable interna para controlar el desmontaje del temporizador
let timeoutNotificacion = null;

// Modelo reactivo estructurado según tu centroSaludSchema
const centro = reactive({
  nombre_centro: '',
  tipo_prestador: ''
});

// Helper para lanzar notificaciones efímeras y evitar fatiga visual en el terminal clínico
const lanzarNotificacion = (texto, tipo) => {
  if (timeoutNotificacion) clearTimeout(timeoutNotificacion);
  notificacion.texto = texto;
  notificacion.tipo = tipo;
  
  timeoutNotificacion = setTimeout(() => {
    notificacion.texto = '';
    notificacion.tipo = '';
  }, 4000); // 4 segundos en pantalla y se desvanece de forma autónoma
};

// consultar el catálogo de centros de salud a través de tu API REST.
const consultarCatalogo = async () => {
  cargando.value = true;
  try {
    const respuesta = await authStore.fetchSeguro('/centros-salud');
    if (respuesta && respuesta.ok) {
      listaCentros.value = await respuesta.json();
    }
  } catch (error) {
    console.error('❌ Error al cargar los centros de salud:', error.message);
  } finally {
    cargando.value = false;
  }
};

onMounted(consultarCatalogo);

// Disparo del formulario seguro mediante Fetch POST hacia tu ruta /api/centros-salud
const registrarEstablecimiento = async () => {
  guardando.value = true;
  notificacion.texto = '';

  // NORMALIZACIÓN: Sanitizamos la entrada de texto antes de empaquetar el payload hacia Atlas
  const payloadSustancioso = {
    nombre_centro: centro.nombre_centro.trim(),
    tipo_prestador: centro.tipo_prestador
  };

  try {
    const respuesta = await authStore.fetchSeguro('/centros-salud', {
      method: 'POST',
      body: JSON.stringify(payloadSustancioso)
    });

    if (!respuesta) return; // Detención controlada si falló o caducó el token

    const datos = await respuesta.json();

    if (respuesta.ok) {
      lanzarNotificacion(datos.msg || 'Establecimiento dado de alta con éxito.', 'exito');

      // Limpieza limpia de campos reactivos
      centro.nombre_centro = '';
      centro.tipo_prestador = '';
      
      // Recargar la nómina de la tabla en tiempo real sin congelar la UI
      await consultarCatalogo();
    } else {
      throw new Error(datos.msg || 'Error al procesar el alta de infraestructura.');
    }
  } catch (error) {
    lanzarNotificacion(error.message, 'error');
  } finally {
    guardando.value = false;
  }
};
</script>

<style scoped>
/* Transición opcional de desvanecimiento suave para el cartel de notificación */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.tabla-vacia {
  text-align: center;
  padding: 1.5rem;
  color: #7f8c8d;
  font-style: italic;
}
</style>


<style scoped>

.cargando-tabla {
  color: var(--texto-secundario);
  font-size: 0.9rem;
  font-style: italic;
  padding: 20px 0;
}
.celda-principal {
  font-weight: 600;
  text-transform: capitalize;
}
.btn-crear {
  margin-top: 10px;
}
</style>
