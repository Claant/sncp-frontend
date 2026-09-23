<template>
  <div class="registro-contenedor">
    <header class="registro-header">
      <h2>Inscripción Centralizada de Pacientes (CU-002)</h2>
      <p>Alta de perfiles ciudadanos en la Red Nacional de Salud.</p>
    </header>

    <!-- Notificaciones y Alertas Dinámicas del Sistema -->
    <div v-if="notificacion.texto" :class="['notificacion', notificacion.tipo]">
      {{ notificacion.texto }}
    </div>

    <form @submit.prevent="procesarRegistroPaciente" class="formulario-registro">
      
      <!-- SUBFORMULARIO 1: IDENTIFICACIÓN DEMOGRÁFICA -->
      <fieldset>
        <legend>👤 Antecedentes de Identidad</legend>
        <div class="grilla-formulario">
          <div class="campo-entrada">
            <label>RUT Nacional</label>
            <input
              type="text"
              v-model="rutFormateado"
              placeholder="Ej: 17.432.981-6" 
              required 
              :disabled="guardando" 
            />
          </div>
          <div class="campo-entrada">
            <label>Nombre Completo</label>
            <input type="text" v-model="paciente.nombre" placeholder="Juan Carlos Pérez" required :disabled="guardando" />
          </div>
          <div class="campo-entrada">
            <label>Fecha de Nacimiento</label>
            <input type="date" v-model="paciente.fecha_nacimiento" required :disabled="guardando" />
          </div>
          <div class="campo-entrada">
            <label>Centro de Salud de Origen</label>
            <select v-model="paciente.centro_salud_id" required :disabled="guardando">
              <option value="" disabled selected>Seleccione establecimiento...</option>
              <option v-for="centro in centros" :key="centro._id" :value="centro._id">
                {{ centro.nombre_centro }}
              </option>
            </select>
          </div>
        </div>
      </fieldset>

      <!-- SUBFORMULARIO 2: UBICACIÓN GEOGRÁFICA ADAPTATIVA -->
      <fieldset>
        <legend>Coordenadas de Residencia</legend>
        
        <!-- FLUJO EXCLUSIVO PARA MÉDICOS: Formulario completo de Dirección Nueva -->
        <div v-if="authStore.obtenerRol === 'medico'" class="grilla-formulario">
          <div class="campo-entrada">
            <label>Calle / Avenida</label>
            <input type="text" v-model="direccion.calle" placeholder="Avenida Arturo Prat" required :disabled="guardando" />
          </div>
          <div class="campo-entrada">
            <label>Número / Block / Depto</label>
            <input type="text" v-model="direccion.numero" placeholder="1040-B o S/N" required :disabled="guardando" />
          </div>
          <div class="campo-entrada">
            <label>Comuna</label>
            <input type="text" v-model="direccion.comuna" placeholder="La Serena" required :disabled="guardando" />
          </div>
          <div class="campo-entrada">
            <label>Ciudad</label>
            <input type="text" v-model="direccion.ciudad" placeholder="Coquimbo" required :disabled="guardando" />
          </div>
        </div>

        <!-- FLUJO EXCLUSIVO PARA ADMINISTRADORES: Vinculación relacional directa -->
        <div v-else class="campo-entrada unica-columna">
          <label>ID de Dirección Preexistente (Mongoose ObjectId)</label>
          <input 
            type="text" 
            v-model="paciente.direccion_id" 
            placeholder="Ej: 64b2f1a8e4b0c23a88f12345" 
            required 
            :disabled="guardando"
          />
          <p class="nota-administrativa">
            Su rol operativo requiere la vinculación de un registro domiciliario previamente validado en el centro de salud.
          </p>
        </div>
      </fieldset>

      <div class="acciones-formulario">
        <button type="submit" class="btn-registro-enviar" :disabled="guardando">
          {{ guardando ? 'Sincronizando Expediente...' : 'Inscribir Paciente en Sistema' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();

const guardando = ref(false);
const centros = ref([]);
const notificacion = reactive({ texto: '', tipo: '' });

// Modelo reactivo estructurado para el esquema del Paciente
const paciente = reactive({
  rut: '',
  nombre: '',
  fecha_nacimiento: '',
  direccion_id: '',
  centro_salud_id: ''
});

// Modelo reactivo para el esquema aislado de la Dirección
const direccion = reactive({
  calle: '',
  numero: '',
  comuna: '',
  ciudad: ''
});

let timeoutAlerta = null;

const lanzarAlertaLocal = (texto, tipo) => {
  if (timeoutAlerta) clearTimeout(timeoutAlerta);
  notificacion.texto = texto;
  notificacion.tipo = tipo;
  
  timeoutAlerta = setTimeout(() => {
    notificacion.texto = '';
    notificacion.tipo = '';
  }, 4000);
};

// FUNCIÓN DE FORMATO: Convierte "174329816" en "17.432.981-6"
const aplicarFormatoRut = (rutRaw) => {
  if (!rutRaw) return '';
  
  // Limpia cualquier carácter que no sea número o K/k
  let limpio = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length === 0) return '';
  if (limpio.length === 1) return limpio;

  // Separa el cuerpo numérico del dígito verificador
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  // Formatea el cuerpo con puntos de miles
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${cuerpoFormateado}-${dv}`;
};

// COMPUTED PROPERTY: Intercepta la escritura y actualiza paciente.rut con puntos y guion
const rutFormateado = computed({
  get() {
    return aplicarFormatoRut(paciente.rut);
  },
  set(nuevoValor) {
    paciente.rut = aplicarFormatoRut(nuevoValor);
  }
});

onMounted(async () => {
  try {
    const respuesta = await authStore.fetchSeguro('/centros-salud');
    if (respuesta && respuesta.ok) {
      centros.value = await respuesta.json();
    }
  } catch (error) {
    console.error('❌ Error al poblar catálogo asistencial:', error.message);
  }
});

const procesarRegistroPaciente = async () => {
  guardando.value = true;
  notificacion.texto = '';

  try {
    let direccionIdFinal = paciente.direccion_id;

    if (authStore.obtenerRol === 'medico') {
      const resDireccion = await authStore.fetchSeguro('/direcciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calle: direccion.calle.trim(),
          numero: direccion.numero.trim(),
          comuna: direccion.comuna.trim(),
          ciudad: direccion.ciudad.trim()
        })
      });

      if (!resDireccion) return;
      
      const datosDireccion = await resDireccion.json();

      if (!resDireccion.ok) {
        if (datosDireccion.detalles && Array.isArray(datosDireccion.detalles) && datosDireccion.detalles.length > 0) {
          throw new Error(datosDireccion.detalles[0].mensaje);
        }
        throw new Error(datosDireccion.msg || 'Falla crítica al registrar la dirección.');
      }

      direccionIdFinal = datosDireccion.direccion?._id || datosDireccion.direccion?.id;
    }

    const payloadFinal = {
      rut: paciente.rut.trim(),
      nombre: paciente.nombre.trim(),
      fecha_nacimiento: paciente.fecha_nacimiento,
      centro_salud_id: paciente.centro_salud_id,
      direccion_id: direccionIdFinal
    };

    const resPaciente = await authStore.fetchSeguro('/pacientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFinal)
    });

    if (!resPaciente) return; 

    const datosPaciente = await resPaciente.json();

    if (!resPaciente.ok) {
      if (datosPaciente.detalles && Array.isArray(datosPaciente.detalles) && datosPaciente.detalles.length > 0) {
        throw new Error(datosPaciente.detalles[0].mensaje);
      }
      throw new Error(datosPaciente.msg || 'Falla crítica al registrar la inscripción del paciente.');
    }

    lanzarAlertaLocal(datosPaciente.msg || 'Paciente inscrito exitosamente en este centro de salud.', 'exito');

    Object.keys(paciente).forEach(key => paciente[key] = '');
    Object.keys(direccion).forEach(key => direccion[key] = '');

  } catch (error) {
    lanzarAlertaLocal(error.message, 'error');
  } finally {
    guardando.value = false;
  }
};
</script>

<style scoped>
.acciones-formulario {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.btn-registro-enviar {
  width: auto;
  padding: 13px 30px;
}
.nota-administrativa {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  margin-top: 6px;
  font-style: italic;
}
</style>