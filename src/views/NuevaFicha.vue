<template>
  <div class="ficha-contenedor">
    <header class="ficha-encabezado">
      <h1>Registro de Nueva Ficha Clínica</h1>
      <p class="descripcion">Registro de Atención Unificada (Paciente Nuevo Detectado)</p>
    </header>

    <!-- NOTIFICACIÓN / ALERTA DE SISTEMA CON SOPORTE PARA VIÑETAS DE ZOD -->
    <div v-if="notificacion.texto" :class="['notificacion', notificacion.tipo]">
      <p class="notificacion-titulo">{{ notificacion.texto }}</p>
      <ul v-if="notificacion.detalles && notificacion.detalles.length > 0" class="notificacion-lista">
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

    <!-- CUERPO DEL ASISTENTE DINÁMICO -->
    <div class="formulario-clinico">
      
      <!-- PASO 1: DOMICILIO -->
      <div v-if="pasoActual === 1" class="seccion-step animate-fade">
        <div class="formulario-seccion-bloque">
          <h3 class="titulo-fieldset">Paso 1: Domicilio del Paciente</h3>
          <h4 class="subtitulo-seccion">Ubicación Física Actual</h4>
          <div class="grilla-campos">
            <div class="campo">
              <label>Calle</label>
              <input type="text" v-model="formulario.calle" placeholder="Ej: Av. Providencia" />
            </div>
            <div class="campo">
              <label>Número</label>
              <input type="text" v-model="formulario.numero" placeholder="Ej: 1450" />
            </div>
            <div class="campo">
              <label>Comuna</label>
              <input type="text" v-model="formulario.comuna" placeholder="Ej: Providencia" />
            </div>
            <div class="campo">
              <label>Ciudad</label>
              <input type="text" v-model="formulario.ciudad" placeholder="Ej: Santiago" />
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
              <input 
                type="text" 
                v-model="formulario.rut" 
                @input="formatearRutEnVivo"
                placeholder="17.432.981-6" 
                maxlength="12"
              />
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
              <textarea v-model="formulario.descripcion" rows="3" placeholder="Escriba las conclusiones patológicas definitivas del alta..."></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTONERA DE CONTROL -->
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

// Objeto de notificación
const notificacion = reactive({ texto: '', tipo: '', detalles: [] });
let timeoutAlerta = null;

// Estructura ÚNICA reactiva de formulario
const formulario = reactive({
  calle: '', numero: '', comuna: '', ciudad: '',
  rut: '', nombre: '', fecha_nacimiento: '', centro_salud_id: '',
  motivo_consulta: '', fecha: '',
  codigo_enfermedad: '', descripcion: ''
});

// Helper interno para limpiar el RUT (mantiene únicamente números y K)
const obtenerRutLimpio = (rutRaw) => {
  if (!rutRaw) return '';
  return rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
};

// Formateador inmediato con reajuste visual en tiempo real
const formatearRutEnVivo = (e) => {
  if (!e || !e.target) return;

  const input = e.target;
  let limpio = obtenerRutLimpio(input.value);

  // Limitar a un máximo de 9 caracteres limpios (cuerpo 8 + DV 1)
  if (limpio.length > 9) {
    limpio = limpio.slice(0, 9);
  }

  let formateado = limpio;

  // Aplicar formato dinámico
  if (limpio.length > 1) {
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    
    // Agrega puntos de miles de derecha a izquierda
    const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    formateado = `${cuerpoConPuntos}-${dv}`;
  }

  // Asignamos tanto la variable reactiva como el valor directo del elemento del DOM
  formulario.rut = formateado;
  input.value = formateado;
};

// Helper de notificaciones locales
const lanzarAlertaLocal = (texto, tipo, detalles = []) => {
  if (timeoutAlerta) clearTimeout(timeoutAlerta);
  notificacion.texto = texto;
  notificacion.tipo = tipo;
  notificacion.detalles = detalles;
  
  const duracion = detalles.length > 0 ? 7000 : 4000;

  timeoutAlerta = setTimeout(() => {
    limpiarAlerta();
  }, duracion);
};

const limpiarAlerta = () => {
  if (timeoutAlerta) clearTimeout(timeoutAlerta);
  notificacion.texto = '';
  notificacion.tipo = '';
  notificacion.detalles = [];
};

const obtenerNombrePaso = (step) => {
  const nombres = { 1: '1. Dirección', 2: '2. Datos Personales', 3: '3. Motivo', 4: '4. Diagnóstico' };
  return nombres[step];
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
    limpiarAlerta();
    pasoActual.value--;
  }
};

const evaluarPasoSiguiente = () => {
  limpiarAlerta();

  if (pasoActual.value === 1) {
    if (!formulario.calle.trim() || !formulario.numero.trim() || !formulario.comuna.trim() || !formulario.ciudad.trim()) {
      lanzarAlertaLocal('Por favor, complete todos los campos de residencia del Paso 1.', 'error');
      return;
    }
    pasoActual.value = 2;
  } 
  else if (pasoActual.value === 2) {
    const rutLimpio = obtenerRutLimpio(formulario.rut);

    if (!formulario.rut.trim() || !formulario.nombre.trim() || !formulario.fecha_nacimiento || !formulario.centro_salud_id) {
      lanzarAlertaLocal('Por favor, complete todos los datos personales del Paso 2.', 'error');
      return;
    }

    // Validación previa de longitud (entre 8 y 9 caracteres limpios)
    if (rutLimpio.length < 8 || rutLimpio.length > 9) {
      lanzarAlertaLocal('El RUT ingresado debe tener entre 8 y 9 caracteres (ej: 17.432.981-6).', 'error');
      return;
    }

    pasoActual.value = 3;
  } 
  else if (pasoActual.value === 3) {
    if (!formulario.motivo_consulta.trim()) {
      lanzarAlertaLocal('Por favor, ingrese el motivo de consulta en el Paso 3.', 'error');
      return;
    }
    pasoActual.value = 4;
  } 
  else if (pasoActual.value === 4) {
    if (!formulario.codigo_enfermedad.trim() || !formulario.descripcion.trim()) {
      lanzarAlertaLocal('Por favor, complete el código CIE-10 y la descripción en el Paso 4.', 'error');
      return;
    }
    enviarExpedienteConsolidado();
  }
};

// Envío a la API utilizando ventanas emergentes alert()
const enviarExpedienteConsolidado = async () => {
  procesando.value = true;

  const datosEnvio = {
    calle: formulario.calle.trim(),
    numero: formulario.numero.trim(),
    comuna: formulario.comuna.trim(),
    ciudad: formulario.ciudad.trim(),
    rut: formulario.rut.trim(),
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
      if (datos.detalles && Array.isArray(datos.detalles) && datos.detalles.length > 0) {
        const listaErrores = datos.detalles.map(d => `• ${d.mensaje || d}`).join('\n');
        alert(`No se pudo registrar la ficha clínica:\n\n${listaErrores}`);
      } else {
        alert(`⚠️ ${datos.msg || 'Ocurrió un error al procesar el registro.'}`);
      }
      return;
    }

    alert(`✅ ${datos.msg || 'Ficha clínica registrada con éxito.'}`);

    // Limpieza de campos
    Object.assign(formulario, {
      calle: '', numero: '', comuna: '', ciudad: '',
      rut: '', nombre: '', fecha_nacimiento: '', centro_salud_id: '',
      motivo_consulta: '', fecha: '',
      codigo_enfermedad: '', descripcion: ''
    });

    pasoActual.value = 1;

  } catch (error) {
    console.error('Error al enviar el expediente:', error);
    alert(`No se pudo conectar con el servidor: ${error.message}`);
  } finally {
    procesando.value = false;
  }
};
</script>

<style scoped>
@import "../assets/css/nuevaFichaStyles.css";
</style>