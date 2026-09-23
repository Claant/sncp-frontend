<template>
  <div class="ficha-contenedor">
    <header class="ficha-encabezado">
      <h1>Registro de Nueva Ficha Clínica</h1>
      <p class="descripcion">Registro de Atención Unificada (Paciente Nuevo Detectado)</p>
    </header>

    <!-- Notificaciones y Alertas del Sistema -->
    <div v-if="notificacion.texto" :class="['notificacion', notificacion.tipo]">
      <p class="notificacion-titulo">{{ notificacion.texto }}</p>
      
      <!-- Viñetas con detalles específicos de validación (ej: error en formato CIE-10) -->
      <ul v-if="notificacion.detalles && notificacion.detalles.length > 0" class="notificacion-detalles">
        <li v-for="(detalle, idx) in notificacion.detalles" :key="idx">
          • {{ detalle }}
        </li>
      </ul>
    </div>

    <!-- INDICADOR VISUAL DE PASOS (STEPPER) -->
    <div class="stepper-contenedor">
      <div v-for="step in 4" :key="step" :class="['step-item', { 'activo': pasoActual === step, 'completado': pasoActual > step }]">
        <div class="step-numero">{{ step }}</div>
        <div class="step-texto">{{ obtenerNombrePaso(step) }}</div>
      </div>
    </div>

    <!-- CUERPO DEL ASISTENTE DINÁMICO CON BLOQUES DIVS LIMPIOS -->
    <div class="formulario-clinico">
      
      <!-- PASO 1: DOMICILIO -->
      <div v-if="pasoActual === 1" class="seccion-step animate-fade">
        <div class="formulario-seccion-bloque">
          <h3 class="titulo-fieldset">Paso 1: Domicilio del Paciente</h3>
          <h4 class="subtitulo-seccion">Ubicación Física Actual</h4>
          <div class="grilla-campos">
            <div class="campo">
              <label>Calle</label>
              <input type="text" v-model="formulario.calle" autocomplete="formulario.calle" placeholder="Ej: Av. Providencia" />
            </div>
            <div class="campo">
              <label>Número</label>
              <input type="text" v-model="formulario.numero" autocomplete="formulario.numero" placeholder="Ej: 1450" />
            </div>
            <div class="campo">
              <label>Comuna</label>
              <input type="text" v-model="formulario.comuna" autocomplete="formulario.comuna" placeholder="Ej: Providencia" />
            </div>
            <div class="campo">
              <label>Ciudad</label>
              <input type="text" v-model="formulario.ciudad" autocomplete="formulario.ciudad" placeholder="Ej: Santiago" />
            </div>
          </div>
        </div>
      </div>

      <!-- PASO 2: DATOS PERSONALES -->
      <div v-if="pasoActual === 2" class="seccion-step animate-fade">
        <div class="formulario-seccion-bloque">
          <h3 class="titulo-fieldset">Paso 2: Datos Personales del Paciente</h3>
          <h4 class="subtitulo-seccion">Perfil Demográfico Nacional</h4>
          <div class="grilla-campos">
            <div class="campo">
              <label>RUT Nacional</label>
              <input type="text" v-model="formulario.rut" placeholder="17.432.981-6" />
            </div>
            <div class="campo">
              <label>Nombre Completo</label>
              <input type="text" v-model="formulario.nombre" placeholder="Ana María González" />
            </div>
            <div class="campo">
              <label>Fecha de Nacimiento</label>
              <input type="date" v-model="formulario.fecha_nacimiento" />
            </div>
            <div class="campo">
              <label>Centro de Salud de Origen</label>
              <select v-model="formulario.centro_salud_id">
                <option value="" disabled selected>Seleccione establecimiento asistencial...</option>
                <option v-for="centro in centrosSalud" :key="centro._id" :value="centro._id">
                  {{ centro.nombre_centro }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- PASO 3: MOTIVO -->
      <div v-if="pasoActual === 3" class="seccion-step animate-fade">
        <div class="formulario-seccion-bloque">
          <h3 class="titulo-fieldset">Paso 3: Motivo de la Atención Médica</h3>
          <h4 class="subtitulo-seccion">Evento Clínico Actual</h4>
          <div class="grilla-campos unica-columna">
            <div class="campo">
              <label>Sintomatología Inicial / Motivo de Consulta</label>
              <textarea v-model="formulario.motivo_consulta" rows="4" placeholder="Describa el cuadro clínico presentado por el paciente..."></textarea>
            </div>
            <div class="campo">
              <label>Fecha y Hora de Atención (Opcional)</label>
              <input type="datetime-local" v-model="formulario.fecha" />
            </div>
          </div>
        </div>
      </div>

      <!-- PASO 4: DIAGNÓSTICO -->
      <div v-if="pasoActual === 4" class="seccion-step animate-fade">
        <div class="formulario-seccion-bloque">
          <h3 class="titulo-fieldset">Paso 4: Diagnóstico Concluyente</h3>
          <h4 class="subtitulo-seccion">Conclusiones Médicas Finales</h4>
          <div class="grilla-campos">
            <div class="campo">
              <label>Código de Enfermedad (CIE-10)</label>
              <input type="text" v-model="formulario.codigo_enfermedad" placeholder="Ej: I10" />
            </div>
            <div class="campo expandido">
              <label>Descripción Diagnóstica Detallada</label>
              <textarea v-model="formulario.descripcion" rows="3" placeholder="Escriba las conclusiones patológicas para el alta del paciente"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTONERA DE CONTROL CON BOTONES PLANOS TIPO BUTTON -->
      <div class="contenedor-acciones-step">
        <button type="button" v-if="pasoActual > 1" @click="volverPaso" class="btn-volver" :disabled="procesando">
          Volver
        </button>
        
        <button type="button" @click="evaluarPasoSiguiente" class="btn-siguiente" :disabled="procesando">
          <span v-if="procesando">Sincronizando...</span>
          <span v-else-if="pasoActual === 4">Finalizar Registro</span>
          <span v-else>Siguiente (Paso {{ pasoActual + 1 }})</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();

// Estados reactivos de control visual y carga
const pasoActual = ref(1);
const centrosSalud = ref([]);
const procesando = ref(false);
const notificacion = reactive({ texto: '', tipo: '', detalles: [] });
let timeoutAlerta = null;

// Estructura de variables reactivas mapeada al req.body del Backend
const formulario = reactive({
  calle: '', numero: '', comuna: '', ciudad: '',
  rut: '', nombre: '', fecha_nacimiento: '', centro_salud_id: '',
  motivo_consulta: '', fecha: '',
  codigo_enfermedad: '', descripcion: ''
});

// Helper de notificaciones efímeras para limpiar la UI médica de forma autónoma
const lanzarAlertaLocal = (texto, tipo, detalles = []) => {
  if (timeoutAlerta) clearTimeout(timeoutAlerta);
  notificacion.texto = texto;
  notificacion.tipo = tipo;
  notificacion.detalles = detalles;
  
  // Si hay múltiples errores de validación, se aumenta ligeramente el tiempo visible
  const tiempoVisibilidad = detalles.length > 0 ? 8000 : 4000;

  timeoutAlerta = setTimeout(() => {
    notificacion.texto = '';
    notificacion.tipo = '';
    notificacion.detalles = [];
  }, tiempoVisibilidad);
};

const obtenerNombrePaso = (step) => {
  const nombres = { 1: '1. Dirección', 2: '2. Datos Personales', 3: '3. Motivo', 4: '4. Diagnóstico' };
  return nombres[step];
};

// FUNCIÓN MAESTRA DE SANITIZACIÓN: Asegura el formato de forma estricta (ej: 17432981-6)
const limpiarRutFicha = (rutRaw) => {
  if (!rutRaw) return '';
  
  let limpio = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  
  return `${cuerpo}-${dv}`; 
};

onMounted(async () => {
  try {
    const respuesta = await authStore.fetchSeguro('/centros-salud');
    if (respuesta && respuesta.ok) {
      centrosSalud.value = await respuesta.json();
    }
  } catch (error) {
    console.error('❌ Error de red al cargar la red asistencial:', error.message);
  }
});

const volverPaso = () => {
  if (pasoActual.value > 1) {
    notificacion.texto = '';
    notificacion.detalles = [];
    pasoActual.value--;
  }
};

const evaluarPasoSiguiente = () => {
  notificacion.texto = '';
  notificacion.detalles = [];

  if (pasoActual.value === 1) {
    if (!formulario.calle.trim() || !formulario.numero.trim() || !formulario.comuna.trim() || !formulario.ciudad.trim()) {
      lanzarAlertaLocal('Por favor, complete todos los campos de su residencia del Paso 1.', 'error');
      return;
    }
    pasoActual.value = 2;
  } 
  
  else if (pasoActual.value === 2) {
    if (!formulario.rut.trim() || !formulario.nombre.trim() || !formulario.fecha_nacimiento || !formulario.centro_salud_id) {
      lanzarAlertaLocal('Por favor, complete todos los antecedentes de identidad del Paso 2.', 'error');
      return;
    }
    pasoActual.value = 3;
  } 
  
  else if (pasoActual.value === 3) {
    if (!formulario.motivo_consulta.trim()) {
      lanzarAlertaLocal('Por favor, ingrese la sintomatología o motivo de la consulta en el Paso 3.', 'error');
      return;
    }
    pasoActual.value = 4;
  } 
  
  else if (pasoActual.value === 4) {
    if (!formulario.codigo_enfermedad.trim() || !formulario.descripcion.trim()) {
      lanzarAlertaLocal('Por favor, complete el código CIE-10 y la descripción del alta en el Paso 4.', 'error');
      return;
    }
    enviarExpedienteConsolidado();
  }
};

const enviarExpedienteConsolidado = async () => {
  procesando.value = true;
  notificacion.texto = '';
  notificacion.detalles = [];

  const datosEnvio = {
    calle: formulario.calle.trim(),
    numero: formulario.numero.trim(),
    comuna: formulario.comuna.trim(),
    ciudad: formulario.ciudad.trim(),
    rut: limpiarRutFicha(formulario.rut),
    nombre: formulario.nombre.trim(),
    fecha_nacimiento: formulario.fecha_nacimiento,
    centro_salud_id: formulario.centro_salud_id,
    motivo_consulta: formulario.motivo_consulta.trim(),
    codigo_enfermedad: formulario.codigo_enfermedad.trim().toUpperCase(),
    descripcion: formulario.descripcion.trim()
  };

  if (formulario.fecha) {
    datosEnvio.fecha = formulario.fecha;
  }

  try {
    const respuesta = await authStore.fetchSeguro('/atenciones/completa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosEnvio)
    });

    if (!respuesta) return;

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      // 💡 CAPTURA INTELIGENTE DE ERRORES DETALLADOS (ZOD):
      if (datos.detalles && Array.isArray(datos.detalles) && datos.detalles.length > 0) {
        const listaErrores = datos.detalles.map(d => d.mensaje || d.message);
        lanzarAlertaLocal('No se pudo registrar la ficha médica:', 'error', listaErrores);
      } else {
        lanzarAlertaLocal(datos.msg || 'Error transaccional al procesar el expediente integrado.', 'error');
      }
      return;
    }

    lanzarAlertaLocal(datos.msg || 'Expediente compuesto registrado con éxito.', 'exito');

    Object.assign(formulario, {
      calle: '', numero: '', comuna: '', ciudad: '',
      rut: '', nombre: '', fecha_nacimiento: '', centro_salud_id: '',
      motivo_consulta: '', fecha: '',
      codigo_enfermedad: '', descripcion: ''
    });

    pasoActual.value = 1;

  } catch (error) {
    lanzarAlertaLocal(error.message, 'error');
  } finally {
    procesando.value = false;
  }
};
</script>

<style scoped>
@import "../assets/css/nuevaFichaStyles.css";


</style>