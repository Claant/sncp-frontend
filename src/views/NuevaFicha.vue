<template>
  <div class="ficha-contenedor">
    <header class="ficha-encabezado">
      <h1>Registro de Nueva Ficha Clínica</h1>
      <p class="descripcion">Registro de Atención Unificada (Paciente Nuevo Detectado)</p>
    </header>

    <!-- Notificaciones y Alertas del Sistema -->
    <div v-if="notificacion.texto" :class="['notificacion', notificacion.tipo]">
      {{ notificacion.texto }}
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
              <textarea v-model="formulario.descripcion" rows="3" placeholder="Escriba las conclusiones patológicas definitivas del alta..."></textarea>
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

<!-- views/NuevaFicha.vue (SCRIPT SETUP - OPTIMIZADO) -->
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();

// Estados reactivos de control visual y carga
const pasoActual = ref(1);
const centrosSalud = ref([]);
const procesando = ref(false);
const notificacion = reactive({ texto: '', tipo: '' });
let timeoutAlerta = null;

// Estructura de variables reactivas mapeada al req.body del Backend
const formulario = reactive({
  calle: '', numero: '', comuna: '', ciudad: '',
  rut: '', nombre: '', fecha_nacimiento: '', centro_salud_id: '',
  motivo_consulta: '', fecha: '',
  codigo_enfermedad: '', descripcion: ''
});

// Helper de notificaciones efímeras para limpiar la UI médica de forma autónoma
const lanzarAlertaLocal = (texto, tipo) => {
  if (timeoutAlerta) clearTimeout(timeoutAlerta);
  notificacion.texto = texto;
  notificacion.tipo = tipo;
  
  timeoutAlerta = setTimeout(() => {
    notificacion.texto = '';
    notificacion.tipo = '';
  }, 4000); // 4 segundos en pantalla y se desvanece solo
};

const obtenerNombrePaso = (step) => {
  const nombres = { 1: '1. Dirección', 2: '2. Datos Personales', 3: '3. Motivo', 4: '4. Diagnóstico' };
  return nombres[step];
};

// FUNCIÓN MAESTRA DE SANITIZACIÓN: Asegura el formato de forma estricta (ej: 17432981-6)
const limpiarRutFicha = (rutRaw) => {
  if (!rutRaw) return '';
  
  // 1. Filtra y limpia puntos, espacios o guiones mal puestos, dejando solo números y la letra K
  let limpio = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;

  // 2. Extrae el dígito verificador (último carácter) y el cuerpo numérico
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  
  // 3. Retorna la cadena unificada garantizando el guion intermedio
  return `${cuerpo}-${dv}`; 
};

// Carga asíncrona al montar el componente para poblar el selector del Paso 2
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
    pasoActual.value--;
  }
};

// Validador perimetral de campos requeridos antes de avanzar en el Stepper
const evaluarPasoSiguiente = () => {
  notificacion.texto = '';

  if (pasoActual.value === 1) {
    if (!formulario.calle.trim() || !formulario.numero.trim() || !formulario.comuna.trim() || !formulario.ciudad.trim()) {
      lanzarAlertaLocal('Por favor, complete todos los campos de ubicación geográfica del Paso 1.', 'error');
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

// Despacho del expediente compuesto hacia el endpoint unificado /atenciones/completa
const enviarExpedienteConsolidado = async () => {
  procesando.value = true;
  notificacion.texto = '';

  // 1. Clonamos el formulario local para manipular el payload de forma segura sin romper la reactividad
  const datosEnvio = {
    calle: formulario.calle.trim(),
    numero: formulario.numero.trim(),
    comuna: formulario.comuna.trim(),
    ciudad: formulario.ciudad.trim(),
    rut: limpiarRutFicha(formulario.rut), // Fuerza el formato estricto con guion intermedio
    nombre: formulario.nombre.trim(),
    fecha_nacimiento: formulario.fecha_nacimiento,
    centro_salud_id: formulario.centro_salud_id,
    motivo_consulta: formulario.motivo_consulta.trim(),
    codigo_enfermedad: formulario.codigo_enfermedad.trim().toUpperCase(), // Normalizado a CIE-10 exacto
    descripcion: formulario.descripcion.trim()
  };

  // 2. Si hay fecha opcional, la limpiamos, de lo contrario la omitimos para usar el default de Atlas
  if (formulario.fecha) {
    datosEnvio.fecha = formulario.fecha;
  }

  try {
    // 3. Petición POST despachada a través de tu cliente seguro de Pinia
    const respuesta = await authStore.fetchSeguro('/atenciones/completa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosEnvio)
    });

    if (!respuesta) return; // Detención controlada si el token expiró (401/403)

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.msg || 'Error transaccional al procesar el expediente integrado.');
    }

    // 4. RESPUESTA DE ÉXITO GOVERNADA POR TU CONTROLADOR RESILIENTE
    lanzarAlertaLocal(datos.msg || 'Expediente compuesto registrado con éxito.', 'exito');

    // 5. Limpieza atómica y reactiva de los campos locales mediante reasignación masiva segura
    Object.assign(formulario, {
      calle: '', numero: '', comuna: '', ciudad: '',
      rut: '', nombre: '', fecha_nacimiento: '', centro_salud_id: '',
      motivo_consulta: '', fecha: '',
      codigo_enfermedad: '', descripcion: ''
    });

    // Devolvemos el asistente visual al Paso 1 de forma limpia
    pasoActual.value = 1;

  } catch (error) {
    lanzarAlertaLocal(error.message, 'error');
  } finally {
    procesando.value = false;
  }
};
</script>




<style scoped>
/* ====================================================================
   DISEÑO MODULAR DEL ASISTENTE CLÍNICO INTEGRADO (STEPPER WIZARD)
   ==================================================================== */

/* Bloques contenedores que reemplazan a los fieldsets tradicionales */
.formulario-seccion-bloque {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 30px;
  margin-bottom: 25px;
  background: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
}

.titulo-fieldset {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #115e59; /* Verde oscuro clínico */
}

/* Indicador de Línea de Tiempo Superior (Pasos 1 al 4) */
.stepper-contenedor {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  position: relative;
  background-color: #f8fafc;
  padding: 18px 25px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

/* Nodos numéricos del Stepper */
.step-numero {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background-color: #cbd5e1; /* Gris inactivo por defecto */
  color: #64748b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.25s ease-in-out;
}

.step-texto {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  margin-top: 8px;
  text-align: center;
}

/* Estado Activo: Paso en el que se encuentra digitando el médico */
.step-item.activo .step-numero {
  background-color: #0d9488; /* Turquesa corporativo */
  color: #ffffff;
  box-shadow: 0 0 0 5px rgba(13, 148, 136, 0.2);
}

.step-item.activo .step-texto {
  color: #0d9488;
  font-weight: 700;
}

/* Estado Completado: Etapas superadas con éxito */
.step-item.completado .step-numero {
  background-color: #14b8a6;
  color: #ffffff;
}

.step-item.completado .step-texto {
  color: #14b8a6;
}

/* Subtítulos decorativos internos */
.subtitulo-seccion {
  margin: 0 0 20px 0;
  color: #0d9488;
  font-size: 0.95rem;
  font-weight: 600;
  border-bottom: 2px solid #f0fdfa;
  padding-bottom: 8px;
}

/* Botonera de Control de Pasos (Volver / Siguiente) */
.contenedor-acciones-step {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
}

.btn-volver {
  background-color: #64748b; /* Gris neutro para el retroceso */
  color: #ffffff;
  border: none;
  padding: 12px 26px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: auto; /* Anula el 100% de la hoja base */
}

.btn-volver:hover:not(:disabled) {
  background-color: #475569;
}

.btn-siguiente {
  background-color: #0284c7; /* Azul corporativo idéntico a tu modelo */
  color: #ffffff;
  border: none;
  padding: 12px 30px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: auto; /* Anula el 100% de la hoja base */
}

.btn-siguiente:hover:not(:disabled) {
  background-color: #0369a1;
}

/* Estructura para inputs en fila única como los Textareas */
.unica-columna {
  grid-template-columns: 1fr;
}

/* Animación sutil de entrada para suavizar las transiciones entre pantallas */
.animate-fade {
  animation: fadeIn 0.28s ease-in-out;
}

@keyframes fadeIn {
  from { 
    opacity: 0; 
    transform: translateY(3px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}
</style>
