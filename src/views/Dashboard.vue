<template>
  <div class="dashboard-contenedor animate-fade">

    <!-- 🔹 ENCABEZADO PRINCIPAL DEL DASHBOARD -->
    <header class="dashboard-header">
      <h2>Consulta de ficha clínica por RUT</h2>
      <p>
        Búsqueda en la base de datos local y despliegue historico de las
        consultas medicas
      </p>
    </header>

<!-- BUSCADOR PRINCIPAL POR RUT -->
<!-- BUSCADOR PRINCIPAL POR RUT -->
<section v-if="!route.params.id" class="seccion-busqueda">
  <form @submit.prevent="evaluarCriterioBusqueda" class="formulario-busqueda">
    <div class="grupo-busqueda">
      <label for="rut-buscar">Ingrese RUT del Paciente</label>
      <div class="entrada-boton">
        
        <div class="caja-input">
          <input
            id="rut-buscar"
            type="text"
            v-model="rutBusqueda"
            placeholder="Ej: 12.345.678-K"
            required
            :disabled="buscando"
          />

          <button
            v-if="rutBusqueda && !buscando"
            type="button"
            class="btn-limpiar"
            @click="rutBusqueda = ''"
          >
            &#x2715;
          </button>
        </div>
        
        <button type="submit" :disabled="buscando" class="btn-buscar">
          {{ buscando ? "Buscando..." : "Consultar Ficha" }}
        </button>
      </div>
    </div>
  </form>
</section>



    <!-- MENSAJES DE ERROR Y OPCIONES DE IMPORTACIÓN/REGISTRO -->
    <div v-if="mensajeError" class="alerta-clinica">
      <p>{{ mensajeError }}</p>
      <div v-if="origenDatos === 'externo'" class="mt-2">
        <p class="small text-secondary mb-2">
          Se detectó un expediente clínico remoto disponible en formato HL7
          FHIR.
        </p>
        <button
          type="button"
          @click="ejecutarImportacionFHIRDesdeDashboard"
          class="btn-alerta"
          :disabled="buscando"
        >
          {{ buscando ? "Procesando..." : "Importar expediente HL7 FHIR" }}
        </button>
      </div>
      <div v-if="origenDatos === 'ninguno'" class="mt-2">
        <p class="small text-secondary mb-2">
          El ciudadano no posee historial clínico vigente. Puede iniciar una
          ficha clínica nueva si corresponde.
        </p>
        <button
          type="button"
          @click="redirigirAlRegistroExpress"
          class="btn-alerta"
        >
          Registrar nueva ficha clínica
        </button>
      </div>
    </div>


    <!-- RESULTADOS INTEGRADOS ESTILO LISTA COMPACTA FICHA PACIENTE-->
    <div v-if="paciente" class="resultado-clinico animate-fade">

      <!-- CABECERA DEMOGRÁFICA DEL PACIENTE -->
      <div class="tarjeta-paciente-cabecera contenedor-flex-cabecera">
        <div class="datos-cabecera-paciente">
          <h3>Paciente: {{ paciente.nombre }}</h3>
          <p>
            <strong>RUT:</strong> {{ paciente.rut }} |
            <strong>Fecha Nacimiento:</strong> {{ paciente.fecha_nacimiento }}
          </p>
        </div>

        <div
          v-if="authStore.obtenerRol === 'medico'"
          class="accion-cabecera-paciente"
        >
          <button
            type="button"
            @click="
              formularioNuevaAtencionAbierto = !formularioNuevaAtencionAbierto
            "
            class="btn-ver-ficha-item"
            :style="
              formularioNuevaAtencionAbierto
                ? 'background-color: #64748b; color: white;'
                : ''
            "
          >
            {{
              formularioNuevaAtencionAbierto
                ? "✕ Cancelar Registro"
                : "➕ Registrar Nueva Atención Médica"
            }}
          </button>
        </div>
      </div>

      <!-- FORMULARIO MODULARIZADO DESACOPLADO PARA PACIENTES EXISTENTES -->
      <FormularioNuevaAtencion
        v-if="formularioNuevaAtencionAbierto"
        :paciente-id="paciente._id"
        :guardando="guardandoNuevaConsulta"
        @guardar-atencion="ejecutarGuardadoDesdeDashboard"
      />




      <!-- 🔹 HISTORIAL CLÍNICO CRONOLÓGICO PAGINADO -->
      <article
        v-if="
          authStore.obtenerRol === 'medico' && !formularioNuevaAtencionAbierto
        "
        class="seccion-historial-lista"
      >
        <h3>Historial médico de {{ paciente.nombre }} (Últimos registros)</h3>

        <div v-if="cargandoHistorial" class="cargando-texto">
          Consultando antecedente en red...
        </div>

        <div v-else-if="historial.length === 0" class="sin-registros">
          El paciente no registra eventos médicos en este centro de salud.
        </div>

        <div v-else class="lista-atenciones-compacta">
          <!-- Renderizamos la página actual del historial -->
          <div
            v-for="atencion in historialPaginado"
            :key="atencion._id"
            class="item-atencion-lista"
          >
            <div class="datos-atencion-resumen">
              <div class="columna-resumen-item">
                <span class="etiqueta-columna-lista">Fecha</span>
                <span class="valor-columna-lista">{{
                  formatearFecha(atencion.fecha)
                }}</span>
              </div>
              <div class="columna-resumen-item">
                <span class="etiqueta-columna-lista">Establecimiento</span>
                <span class="valor-columna-lista highlight-centro">
                  {{
                    atencion.usuario_id?.centro_salud_id?.nombre_centro ||
                    "CESFAM Emilio Schaffhauser"
                  }}
                </span>
              </div>
              <div class="columna-resumen-item">
                <span class="etiqueta-columna-lista">Motivo</span>
                <span class="valor-columna-lista">{{
                  atencion.motivo_consulta
                }}</span>
              </div>
            </div>

            <!-- 🔹 DETALLE EXTENDIDO DE UNA ATENCIÓN -->
            <div class="accion-atencion-lista">
              <button
                type="button"
                @click="toggleFichaClinica(atencion)"
                class="btn-ver-ficha-item"
              >
                {{
                  atencionSeleccionada?._id === atencion._id
                    ? "Ocultar Detalle"
                    : "Ver Ficha Clínica"
                }}
              </button>
            </div>
          </div>

          <!-- Controles de paginación del historial -->
          <div class="paginacion">
            <button @click="pagina--" :disabled="pagina === 1">Anterior</button>
            <span>Página {{ pagina }} de {{ totalPaginas }}</span>
            <button @click="pagina++" :disabled="pagina === totalPaginas">
              Siguiente
            </button>
          </div>
        </div>

        <!-- DETALLE EXTENDIDO DE LA FICHA CLÍNICA SELECCIONADA -->
        <div
          v-if="atencionSeleccionada"
          class="bloque-detalle-ficha-extendido animate-fade"
        >
          <div class="cabecera-detalle-ficha">
            <div class="titulo-folio">
              <h4>Detalle de Atención Médica</h4>
              <span class="folio-detalle"
                >Folio #{{
                  atencionSeleccionada._id.slice(-6).toUpperCase()
                }}</span
              >
            </div>
            <div class="cerrar-detalle">
              <button class="btn-cerrar-detalle" @click="cerrarFichaClinica()">
                ✕
              </button>
            </div>
          </div>

          <div class="cuerpo-detalle-ficha">
            <p>
              <strong>Médico Tratante:</strong> Dr(a).
              {{
                atencionSeleccionada.usuario_id?.nombre ||
                "Especialista de Turno"
              }}
            </p>
            <p>
              <strong>Fecha/Hora de Registro:</strong>
              {{ formatearFechaHora(atencionSeleccionada.fecha) }}
            </p>
            <p>
              <strong>Sintomatología:</strong>
              {{ atencionSeleccionada.motivo_consulta }}
            </p>

            <!-- 🔹 BLOQUE DE DIAGNÓSTICO CIE-10 -->
            <div
              v-if="diagnosticos && diagnosticos.length"
              class="cuadro-diagnostico-cie10 animate-fade"
            >
              <div class="cabecera-cuadro-diagnostico">
                <h5>DIAGNÓSTICO ASOCIADO</h5>
              </div>

              <div
                v-for="diag in diagnosticos"
                :key="diag._id"
                class="cuerpo-cuadro-diagnostico"
              >
                <!-- VERIFICACIÓN CRÍTICA EN TU TEMPLATE: -->
                <div class="fila-diagnostico-premium">
                  <span class="etiqueta-diagnostico"
                    >Código de Enfermedad (CIE-10):</span
                  >

                  <!-- CORRECCIÓN: Asegúrate de que tenga las llaves dobles de Vue para renderizar el ID dinámico de Atlas -->
                  <span class="badge-cie10-premium">{{
                    diag.codigo_enfermedad
                  }}</span>
                </div>

                <!-- Fila 2: Conclusión Patológica en el mismo eje -->
                <div class="fila-diagnostico-premium" style="margin-top: 10px">
                  <span class="etiqueta-diagnostico"
                    >Conclusión Patológica:</span
                  >
                  <p class="texto-conclusion-premium">{{ diag.descripcion }}</p>
                </div>
              </div>
            </div>
            <div v-else-if="cargandoDiagnostico" class="sin-diagnostico-alerta">
              Cargando conclusiones patológicas desde Atlas...
            </div>

            <!-- BITÁCORA LEGAL DE AUDITORÍA DE ACCESOS -->
            <div class="contenedor-logs-auditoria">
              <h5 class="titulo-bitacora">
                Consultas al Historial Clínico del Paciente
              </h5>

              <div
                v-if="bitacoraAccesos.length === 0"
                class="sin-diagnostico-alerta"
              >
                Sincronizando registros de auditoría...
              </div>

              <ul v-else class="lista-logs-auditoria">
                <li
                  v-for="log in bitacoraPaginada"
                  :key="log._id"
                  class="item-log-auditoria"
                >
                  <span
                    >Dr(a).
                    {{ log.nombre_medico || "Médico Consultante" }}</span
                  >
                  <span class="badge-rol-auditado"
                    >Rol: {{ log.rol_consultado || "medico" }}</span
                  >
                  <span v-if="log.atencion_id" class="folio-log">
                    Folio Ficha: #{{ log.atencion_id.slice(-6).toUpperCase() }}
                  </span>
                  <div class="fecha-log-auditado">
                    📅 {{ formatearFechaHora(log.fecha_consulta) }}
                  </div>
                </li>
              </ul>

              <!-- Controles de paginación de la bitácora -->
              <div
                v-if="bitacoraAccesos.length > 0"
                class="paginacion"
                style="margin-top: 15px"
              >
                <button
                  @click="paginaBitacora--"
                  :disabled="paginaBitacora === 1"
                >
                  Anterior
                </button>
                <span
                  >Página {{ paginaBitacora }} de
                  {{ totalPaginasBitacora }}</span
                >
                <button
                  @click="paginaBitacora++"
                  :disabled="paginaBitacora === totalPaginasBitacora"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>



      <!-- AVISO DE PRIVACIDAD PARA ADMINISTRADORES -->
      <div
        v-else-if="authStore.obtenerRol === 'administrador'"
        class="aviso-privacidad animate-fade"
      >
        <strong
          >Aviso de Confidencialidad (Ley de Derechos del Paciente):</strong
        >
        Su perfil institucional (Administrador) le autoriza exclusivamente a
        gestionar los RR HH del personal de salud y al alta de infraestructura de centros de salud. Las fichas médicas y códigos de
        diagnóstico CIE-10 se encuentran restringidos para personal clínico
        acreditado.
      </div>
    </div>


    
  </div>
</template>

<!-- views/Dashboard.vue (PARTE 1: CONFIGURACIÓN Y PAGINACIÓN) -->
<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
// con el @  funciona como ruta directa desde src/ y evita problemas de alias
// si se usa ../  es una ruta relativa y puede romperse si se mueve el archivo
import FormularioNuevaAtencion from "@/components/VistaDashboard/FormularioNuevaVista.vue";


// Instanciación formal de los ganchos de navegación de Vue Router
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Estados reactivos de control visual y cargas asíncronas
const rutBusqueda = ref("");
const buscando = ref(false);
const cargandoHistorial = ref(false);
const cargandoDiagnostico = ref(false);
const guardandoNuevaConsulta = ref(false);
const formularioNuevaAtencionAbierto = ref(false);
const mensajeError = ref(null);

// UNIFICADO: Estado reactivo de procedencia para habilitar el botón de alta express del template
const origenDatos = ref("none"); // 'local', 'externo', 'ninguno'

// Variable crítica de interoperabilidad para capturar el ID del clúster remoto
const pacienteIdExternoContingencia = ref(null);

const paciente = ref(null);
const historial = ref([]);
const atencionSeleccionada = ref(null);
const bitacoraAccesos = ref([]);
const diagnosticos = ref([]);


// CONTROL DE PAGINACIÓN DE LA BITÁCORA FORENSE OWASP (Client-Side)
const paginaBitacora = ref(1);
const porPaginaBitacora = 3;

const totalPaginasBitacora = computed(
  () =>
    Math.ceil((bitacoraAccesos.value?.length || 0) / porPaginaBitacora) || 1,
);

const bitacoraPaginada = computed(() => {
  const inicio = (paginaBitacora.value - 1) * porPaginaBitacora;
  return (bitacoraAccesos.value || []).slice(
    inicio,
    inicio + porPaginaBitacora,
  );
});

// CONTROL DE PAGINACIÓN DEL HISTORIAL CLÍNICO CRONOLÓGICO (Client-Side)
const pagina = ref(1);
const porPagina = 3;

const totalPaginas = computed(
  () => Math.ceil((historial.value?.length || 0) / porPagina) || 1,
);

const historialPaginado = computed(() => {
  const inicio = (pagina.value - 1) * porPagina;
  return (historial.value || []).slice(inicio, inicio + porPagina);
});

// Formateadores cronológicos adaptados a la zona horaria nacional (es-CL)
const formatearFecha = (stringFecha) => {
  if (!stringFecha) return "N/A";
  return new Date(stringFecha).toLocaleDateString("es-CL", { timeZone: "UTC" });
};

const formatearFechaHora = (stringFecha) => {
  if (!stringFecha) return "N/A";
  return new Date(stringFecha).toLocaleString("es-CL");
};

// FUNCIÓN AUXILIAR: Estandariza e inyecta el guion atómico por software (ej: 12345678-K)
const limpiarRutBuscador = (rutRaw) => {
  if (!rutRaw) return "";
  let limpio = rutRaw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
};


// ====================================================================
// PARTE 2: CONTROLADORES PRINCIPALES DE BÚSQUEDA DE RED E ID CONTEXTUAL
// ====================================================================

let consultaEnCurso = false;

const evaluarCriterioBusqueda = async () => {
  if (consultaEnCurso) return;
  consultaEnCurso = true;

  try {
    if (route.params.pacienteId) {
      await router.push("/dashboard");
      await consultarSistemaNacional();
    } else {
      await consultarSistemaNacional();
    }
  } finally {
    consultaEnCurso = false;
  }
};

// Modifica el controlador principal para inyectar de forma correcta los estados mapeados
const consultarSistemaNacional = async () => {
  buscando.value = true;
  mensajeError.value = null;
  paciente.value = null;
  historial.value = [];
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
  pacienteIdExternoContingencia.value = null;
  origenDatos.value = "none"; // Reseteo inicial de seguridad perimetral
  cerrarFichaClinica();
  formularioNuevaAtencionAbierto.value = false;

  try {
    const rutSanitizado = limpiarRutBuscador(rutBusqueda.value);
    const resBusqueda = await authStore.fetchSeguro(
      `/pacientes/${rutSanitizado}`,
    );
    if (!resBusqueda) return;

    const datosPac = await resBusqueda.json();
    origenDatos.value = datosPac.origen; // Mapeamos de forma nativa el origen enviado por Express

    // Escenario A: Paciente no existe en ninguna base de datos nacional
    if (!resBusqueda.ok || datosPac.origen === "ninguno") {
      origenDatos.value = "ninguno"; // Forzamos el estado para habilitar el botón de alta express
      throw new Error(
        datosPac.msg ||
          "El RUT ingresado no está registrado en este centro de salud ni tampoco en otro recinto de salud externo.",
      );
    }

       // Escenario B: Registro clínico local vigente
    if (datosPac.origen === "local") {
      paciente.value = datosPac.paciente || datosPac;
      if (datosPac.expediente) {
        historial.value = (datosPac.expediente.atenciones || []).map((a) => ({
          ...a,
          startTime: a.fecha || a.createdAt || new Date().toISOString(),
        }));
        diagnosticos.value = datosPac.expediente.diagnosticos || [];
        bitacoraAccesos.value = (datosPac.expediente.bitacora || []).map(
          (log) => ({
            ...log,
            startTime:
              log.startTime ||
              log.fecha_consulta ||
              log.createdAt ||
              new Date().toISOString(),
          }),
        );
      }
      pagina.value = 1;
      paginaBitacora.value = 1;

      // DISPARADOR ÚNICO: Auditamos de forma controlada el acceso general a la ficha demográfica
      await registrarAuditoriaForense(paciente.value._id, null);
    }


    // Escenario C: Registro clínico externo remoto (Interoperabilidad FHIR)
    else if (datosPac.origen === "externo") {
      pacienteIdExternoContingencia.value =
        datosPac.pacienteIdExterno || "contingencia-remota";
      mensajeError.value = `Pasarela: El RUT ${rutSanitizado} no posee registros locales. La Pasarela detectó un expediente externo disponible en formato HL7 FHIR en otra instancia remota.`;
    }
  } catch (error) {
    console.error("Fallo en renderizado del Dashboard:", error.message);
    mensajeError.value = error.message;
    historial.value = [];
    diagnosticos.value = [];
    bitacoraAccesos.value = [];
    pacienteIdExternoContingencia.value = null;
  } finally {
    buscando.value = false;
  }
};

// Cierre atómico de submódulos flotantes extendidos
const cerrarFichaClinica = () => {
  atencionSeleccionada.value = null;
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
};



// Carga contextual asíncrona cuando se interroga pasando el ObjectId de la URL
// views/Dashboard.vue -> Modifica cargarFichaPorIdDirecto para forzar origen local
const cargarFichaPorIdDirecto = async (pacienteId) => {
  buscando.value = true;
  mensajeError.value = null;
  paciente.value = null;
  historial.value = [];
  cerrarFichaClinica();
  try {
    const respuesta = await authStore.fetchSeguro(
      `/expedientes/paciente/${pacienteId}`,
    );
    if (respuesta && respuesta.ok) {
      const datos = await respuesta.json();
      historial.value = datos.atenciones || [];
      diagnosticos.value = datos.diagnosticos || [];
      bitacoraAccesos.value = datos.bitacora || [];
      paciente.value = datos.paciente;
      rutBusqueda.value = paciente.value?.rut || "";
      
      // 🚀 ADICIÓN CRÍTICA: Forzamos el origen local aquí para que el template active
      // las directivas v-if que dependen del flujo síncrono del médico
      origenDatos.value = "local"; 
      
      pagina.value = 1;
      paginaBitacora.value = 1;

      if (paciente.value?._id || paciente.value?.id) {
        const idReal = paciente.value._id || paciente.value.id;
        await registrarAuditoriaForense(idReal, null);
      }
    }
  } catch (error) {
    console.error(" ⚠️ Error en carga por ID directo:", error.message);
  } finally {
    buscando.value = false;
  }
};




// ====================================================================
// PARTE 3: INTEROPERABILIDAD FHIR, ALTAS LOCALES Y CIERRE TÉCNICO
// ====================================================================

// Despliegue flotante extendido de diagnósticos CIE-10 de la atención seleccionada
const toggleFichaClinica = async (atencion) => {
  if (atencionSeleccionada.value?._id === atencion._id) {
    cerrarFichaClinica();
    return;
  }

  atencionSeleccionada.value = atencion;
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
  cargandoDiagnostico.value = true;
  paginaBitacora.value = 1;

  try {
    const resDiag = await authStore.fetchSeguro(
      `/diagnosticos/atencion/${atencion._id}`,
    );
    if (resDiag && resDiag.ok) {
      const datosBff = await resDiag.json();
      diagnosticos.value = Array.isArray(datosBff.diagnosticos)
        ? datosBff.diagnosticos
        : [];
      bitacoraAccesos.value = Array.isArray(datosBff.bitacora)
        ? datosBff.bitacora
        : [];

      // DISPARADOR ÚNICO INTEGRADO:
      // Auditamos la consulta del folio de atención detallado vinculando el paciente y la consulta
      if (paciente.value?._id || paciente.value?.id) {
        const idPacienteReal = paciente.value._id || paciente.value.id;
        await registrarAuditoriaForense(idPacienteReal, atencion._id);
      }
    }
  } catch (err) {
    console.error(
      " ⚠️ No se pudo resolver los diagnósticos forenses:",
      err.message,
    );
  } finally {
    cargandoDiagnostico.value = false;
  }
};



// PASARELA INTEROPERABLE: Descarga el Bundle FHIR remoto y ejecuta el Commit transaccional (ACID)
// views/Dashboard.vue - Función ejecutable de interoperabilidad corregida
const ejecutarImportacionFHIRDesdeDashboard = async () => {
  if (!pacienteIdExternoContingencia.value) return;
  buscando.value = true;
  mensajeError.value = "🔄 Extrayendo registros clínicos HL7 FHIR desde clúster remoto...";
  
  try {
    const resFHIR = await authStore.fetchSeguro(
      `/expedientes/paciente/${pacienteIdExternoContingencia.value}/fhir`
    );
    
    if (!resFHIR || !resFHIR.ok) {
      throw new Error("Error de comunicación de red al extraer el Bundle FHIR remoto.");
    }
    
    const fhirBundleJSON = await resFHIR.json();
    mensajeError.value = "📦 Bundle FHIR recibido con éxito. Sincronizando e integrando historial en base local...";
    
    let resImportar;
    let rutasAProbar = ["/expedientes/fhir/importar", "/expedientes/importar"];
    
    for (let ruta of rutasAProbar) {
      resImportar = await authStore.fetchSeguro(ruta, {
        method: "POST",
        body: JSON.stringify(fhirBundleJSON),
      });
      if (resImportar.status !== 404) break;
    }
    
    if (resImportar.status === 404) {
      throw new Error("El servidor central Express no tiene mapeado el endpoint de importación POST.");
    }
    
    // CORRECCIÓN CRÍTICA 1: Extraer los datos de la respuesta ANTES de evaluarla
    const resultadoImportacion = await resImportar.json();
    
    if (resImportar.ok) {
      mensajeError.value = null;
      alert(`✅ ¡Interoperabilidad Exitosa! El expediente HL7 FHIR ha sido integrado con éxito en los registros locales.`);
      
      // Mapeo seguro del ID local recién generado por tu API
      const idPacienteLocalNuevo =
        resultadoImportacion.paciente_id ||
        resultadoImportacion.id ||
        resultadoImportacion.expediente_id ||
        resultadoImportacion.paciente?._id;

      rutBusqueda.value = "";
      pacienteIdExternoContingencia.value = null;
      origenDatos.value = "local"; // Actualizamos el origen para activar la UI del médico

      if (idPacienteLocalNuevo && idPacienteLocalNuevo.length === 24) {
       mensajeError.value = "✅ Expediente importado. Vuelva a consultar el RUT para visualizar los datos.";
      } else {
        await consultarSistemaNacional();
      }
    } else {
      // Ahora resultadoImportacion ya existe de manera segura
      throw new Error(resultadoImportacion.msg || "El clúster rechazó la adición del expediente clínico.");
    }
  } catch (error) {
    console.error("⚠️ Error en pasarela de importación:", error.message);
    mensajeError.value = `⚠️ Falla de Interoperabilidad: ${error.message}`;
    alert(`⚠️ No se pudo importar: ${error.message}`);
  } finally {
    // CORRECCIÓN CRÍTICA 2: El botón SE APAGA SÍ O SÍ, pase lo que pase, evitando congelamientos
    buscando.value = false;
  }
};




// REEMPLAZAR POR ESTA NUEVA FUNCIÓN ADAPTADA
const ejecutarGuardadoDesdeDashboard = async (payload) => {
  guardandoNuevaConsulta.value = true;
  try {
    const respuesta = await authStore.fetchSeguro("/atenciones", {
      method: "POST",
      body: JSON.stringify({
        paciente_id: payload.paciente_id,
        motivo_consulta: payload.motivo_consulta,
        codigo_enfermedad: payload.codigo_enfermedad,
        descripcion: payload.descripcion,
      }),
    });

    if (!respuesta) return;
    const datos = await respuesta.json();

    if (respuesta.ok) {
      alert("✅ Evento clínico e informe patológico CIE-10 anexados con éxito.");
      
      // LIMPIEZA REACTIVA: Le ordena al formulario hijo resetear sus campos locales
      payload.resetForm(); 
      formularioNuevaAtencionAbierto.value = false;
      
      // Sincroniza el dashboard con los datos actualizados del clúster
      await consultarSistemaNacional();
    } else {
      throw new Error(datos.msg || "El clúster rechazó la adición del evento clínico.");
    }
  } catch (error) {
    console.error(error);
    alert(`⚠️ Error al registrar consulta: ${error.message}`);
  } finally {
    guardandoNuevaConsulta.value = false;
  }
};



// Función de redirección inyectando de forma automatizada el RUT en la caché de sesión
const redirigirAlRegistroExpress = () => {
  const rutParaLlevar = limpiarRutBuscador(rutBusqueda.value);
  sessionStorage.setItem("rut_urgencia", rutParaLlevar);
  router.push("/nueva-ficha");
};



onMounted(() => {
  // Inicialización básica, sin cargar ficha por ID automático
  paciente.value = null;
  historial.value = [];
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
});


// ====================================================================
// SERVICIO CENTRALIZADO DE AUDITORÍA FORENSE IDEMPOTENTE
// ====================================================================
const registrarAuditoriaForense = async (pacienteId, atencionId = null) => {
  if (!pacienteId) return;
  
  try {
    // Hacemos uso del método fetchSeguro de tu propio authStore para heredar las cabeceras
    const respuesta = await authStore.fetchSeguro("/bitacora/registrar", {
      method: "POST",
      body: JSON.stringify({
        paciente_id: pacienteId,
        atencion_id: atencionId
      })
    });

    if (respuesta && respuesta.ok) {
      const datosLog = await respuesta.json();
      console.log(`🔒 Estado Auditoría: ${datosLog.msg}`);
      
      // OPTIMIZACIÓN REACTIVA: Si el log es nuevo (201), refrescamos la lista visual 
      // para que el médico vea su propia firma reflejada inmediatamente sin recargar la página
      if (respuesta.status === 201 && datosLog.acceso) {
        // Mapeamos el campo startTime que pide Vue
        const nuevoLogFormateado = {
          ...datosLog.acceso,
          startTime: datosLog.acceso.fecha_consulta || new Date().toISOString()
        };
        // Lo empujamos al inicio del arreglo visual
        bitacoraAccesos.value.unshift(nuevoLogFormateado);
      }
    }
  } catch (error) {
    console.error("⚠️ Fallo de comunicación en bus de auditoría:", error.message);
  }finally {
    // 🚀 CONTROL CRÍTICO: Garantiza que el spinner y el estado de "Buscando..." 
    // se desactiven por completo si el backend local tarda en responder
    buscando.value = false;
  }
};


</script>



<style scoped>
/* Importación aislada y local del CSS exclusivo del Login */
@import "../assets/css/dashboardStyles.css";
</style>
