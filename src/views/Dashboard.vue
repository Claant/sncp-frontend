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
          Se detectó un expediente clínico en el Cesfam Las Compañias, ciudad de la Serena.
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
          El paciente no registra historial clínico en centros médcios externos
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

            <!-- 🔹 ACCIONES DE LA ATENCIÓN: ACORDEÓN REACTIVO E IMPRESIÓN DEL DAU OFICIAL -->
            <div class="accion-atencion-lista" style="display: flex; gap: 10px; align-items: center;">
              <!-- Botón 1: Expande el acordeón visual para ver CIE-10 y Bitácora en Vue -->
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

              <!-- BOTÓN DAU PDF: Emisión e Impresión del Formato Oficial de Urgencia Chileno -->
              <button
                type="button"
                @click="imprimirDauOficial(atencion)"
                class="btn-siguiente"
                style="background-color: #10b981; border: none; padding: 10px 18px; font-size: 0.85rem; cursor: pointer; transition: background-color 0.2s; display: flex; align-items: center; gap: 5px; width: auto;"
                :disabled="buscando"
              >
                Imprimir Ficha clínica
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
                <div class="fila-diagnostico-premium">
                  <span class="etiqueta-diagnostico"
                    >Código de Enfermedad (CIE-10):</span
                  >
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
        gestionar los RR HH del personal de salud y al alta de infraestructura de centros de salud. 
        Las fichas médicas y códigos de diagnóstico CIE-10 se encuentran restringidos para personal
        clínico acreditado.
      </div>
    </div>


    
  </div>
</template>

<script setup>

// views/Dashboard.vue (PARTE 1: IMPORTACIONES, VARIABLES REACTIVAS Y PAGINADORES)
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

// Conexión directa mediante alias para evitar quiebres de rutas relativas
import FormularioNuevaAtencion from "@/components/VistaDashboard/FormularioNuevaVista.vue";

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
const componenteKey = ref(0);

// CONTROL INTERACTIVO DE PASARELA: Variables nativas de origen y aduana manual
const origenDatos = ref("none"); // Puede mutar a: 'local', 'externo', 'ninguno'
const pacienteIdExternoContingencia = ref(null);

// Contenedores atómicos para el despliegue del expediente relacional NoSQL
const paciente = ref(null);
const historial = ref([]);
const atencionSeleccionada = ref(null);
const bitacoraAccesos = ref([]);
const diagnosticos = ref([]);

// CACHÉ PERIMETRAL: Almacena el recurso clínico FHIR recibido desde el clúster remoto
const fhirBundleExternoCache = ref(null);

// Paginadores locales en la capa del navegador (Client-Side)
const paginaBitacora = ref(1);
const porPaginaBitacora = 3;
const pagina = ref(1);
const porPagina = 3;

// Formateadores cronológicos adaptados a la zona horaria institucional chilena (es-CL)
const formatearFecha = (stringFecha) => {
  if (!stringFecha) return "N/A";
  return new Date(stringFecha).toLocaleDateString("es-CL", { timeZone: "UTC" });
};

const formatearFechaHora = (stringFecha) => {
  if (!stringFecha) return "N/A";
  return new Date(stringFecha).toLocaleString("es-CL");
};

// Sanitizador de entrada: Fuerza el guion medio e impide el paso de caracteres basura
const limpiarRutBuscador = (rutRaw) => {
  if (!rutRaw) return "";
  let limpio = rutRaw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
};

// ====================================================================
// PROPIEDADES COMPUTADAS DE CONTROL: INTERFAZ REACTIVA DE REJILLAS
// ====================================================================
const totalPaginas = computed(() => Math.ceil((historial.value?.length || 0) / porPagina) || 1);
const historialPaginado = computed(() => {
  const inicio = (pagina.value - 1) * porPagina;
  return (historial.value || []).slice(inicio, inicio + porPagina);
});

const totalPaginasBitacora = computed(() => Math.ceil((bitacoraAccesos.value?.length || 0) / porPaginaBitacora) || 1);
const bitacoraPaginada = computed(() => {
  const inicio = (paginaBitacora.value - 1) * porPaginaBitacora;
  return (bitacoraAccesos.value || []).slice(inicio, inicio + porPaginaBitacora);
});

// ====================================================================
// PARTE 2: MOTORES DE BÚSQUEDA ASÍNCRONOS Y TRADUCCIÓN INTERNA
// ====================================================================
let consultaEnCurso = false;

const evaluarCriterioBusqueda = async () => {
  if (consultaEnCurso) return;
  consultaEnCurso = true;
  try {
    if (route.params.pacienteId || route.params.id) {
      await router.push("/dashboard");
      await consultarSistemaNacional();
    } else {
      await consultarSistemaNacional();
    }
  } finally {
    consultaEnCurso = false;
  }
};

// ADUANA INTERACTIVA ASISTENCIAL: Sincroniza y discrimina orígenes de red
const consultarSistemaNacional = async () => {
  buscando.value = true;
  mensajeError.value = null;
  paciente.value = null;
  historial.value = [];
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
  pacienteIdExternoContingencia.value = null;
  fhirBundleExternoCache.value = null;
  origenDatos.value = "none";
  cerrarFichaClinica();
  formularioNuevaAtencionAbierto.value = false;

  try {
    const rutSanitizado = limpiarRutBuscador(rutBusqueda.value);
    
    // Consulta a la pasarela híbrida distribuida en Node.js (puerto 4001)
    const resBusqueda = await authStore.fetchSeguro(`/pacientes/${rutSanitizado}`);
    if (!resBusqueda) return;
    
    const datosPac = await resBusqueda.json();
    origenDatos.value = datosPac.origen || "none";

    // Escenario A: El RUT no registra eventos médicos en ningún clúster clínico nacional
    if (!resBusqueda.ok || datosPac.origen === "ninguno") {
      origenDatos.value = "ninguno";
      throw new Error(datosPac.msg || "El RUT ingresado no está registrado en este centro de salud ni tampoco en otro recinto de salud externo.");
    }

    // 🚀 Escenario B: Registro clínico LOCAL vigente (Desempaquetado y Renderizado Directo)
    if (datosPac.origen === "local") {
      const fhirBundle = datosPac.fhirBundle;
      if (fhirBundle && fhirBundle.entry) {
        
        // 1. Extraer y estructurar recurso Patient para retrocompatibilidad demográfica
        const entradaPatient = fhirBundle.entry.find(e => e.resource?.resourceType === "Patient");
        if (entradaPatient) {
          paciente.value = {
            _id: entradaPatient.resource.id,
            nombre: entradaPatient.resource.name?.[0]?.text || "Paciente Registrado",
            rut: entradaPatient.resource.identifier?.[0]?.value || rutSanitizado,
            fecha_nacimiento: entradaPatient.resource.birthDate ? formatearFecha(entradaPatient.resource.birthDate) : "N/A"
          };
        }

        // 2. Extraer y estructurar recursos Encounter (Historial de consultas locales)
        historial.value = fhirBundle.entry
          .filter(e => e.resource?.resourceType === "Encounter")
          .map(e => ({
            _id: e.resource.id,
            fecha: e.resource.period?.start,
            motivo_consulta: e.resource.reasonCode?.[0]?.text || "Consulta Asistencial Estandarizada",
            usuario_id: {
              nombre: e.resource.participant?.[0]?.individual?.display || "Especialista de Turno"
            }
          }));
      }

      pagina.value = 1;
      paginaBitacora.value = 1;

      // Disparamos la bitácora legal vinculando el ID único extraído del recurso Patient
      if (paciente.value?._id) {
        await registrarAuditoriaForense(paciente.value._id, null);
      }
    }
    
    // 🚀 Escenario C: Registro clínico EXTERNO remoto (Bloqueo preventivo y Activación de Alerta)
    else if (datosPac.origen === "externo") {
      // Almacenamos el fhirBundle de forma íntegra en la caché local para el posterior commit
      fhirBundleExternoCache.value = datosPac.fhirBundle;

      // Mapeamos el ID remoto del recurso Patient para la inyección transaccional
      const entradaPatientRemoto = datosPac.fhirBundle?.entry?.find(e => e.resource?.resourceType === "Patient");
      pacienteIdExternoContingencia.value = entradaPatientRemoto?.resource?.id || "contingencia-remota";
      
      // RESTAURACIÓN DEL MENSAJE ORIGINAL QUE ENCIENDE EL BOTÓN MANUAL
      mensajeError.value = `Pasarela: El RUT ${rutSanitizado} no posee registros locales. La plataforma detectó un expediente disponible en el cesfam Las Compañias de la Serena.`;
    }

  } catch (error) {
    console.error("❌ Fallo en renderizado del Dashboard FHIR:", error.message);
    mensajeError.value = error.message;
    historial.value = [];
    diagnosticos.value = [];
    bitacoraAccesos.value = [];
    pacienteIdExternoContingencia.value = null;
    fhirBundleExternoCache.value = null;
  } {
    buscando.value = false;
  }
};

const cerrarFichaClinica = () => {
  atencionSeleccionada.value = null;
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
};
// ====================================================================
// PARTE 3: SOPORTE CONTEXTUAL, IMPORTACIÓN TRANSACCIONAL Y LOGS LEY 20.584
// ====================================================================

// Carga contextual asíncrona cuando se interroga pasando el ID de la URL (Navbar de expedientes)
const cargarFichaPorIdDirecto = async (pacienteId) => {
  buscando.value = true;
  mensajeError.value = null;
  paciente.value = null;
  historial.value = [];
  cerrarFichaClinica();
  try {
    const respuesta = await authStore.fetchSeguro(`/expedientes/paciente/${pacienteId}`);
    if (respuesta && respuesta.ok) {
      const datos = await respuesta.json();
      
      // Sincronización en cascada de estructuras tradicionales de la base local
      historial.value = datos.atenciones || [];
      diagnosticos.value = datos.diagnosticos || [];
      bitacoraAccesos.value = datos.bitacora || [];
      paciente.value = datos.paciente;
      rutBusqueda.value = datos.paciente?.rut || "";
      origenDatos.value = "local"; // Habilita reactivamente los v-if asistenciales del médico
      
      pagina.value = 1;
      paginaBitacora.value = 1;
      if (paciente.value?._id) {
        await registrarAuditoriaForense(paciente.value._id, null);
      }
    }
  } catch (error) {
    console.error("⚠️ Error en carga por ID directo de expedientes:", error.message);
  } finally {
    buscando.value = false;
  }
};

// Despliega reactivamente los diagnósticos CIE-10 (Condition) amarrados al Encounter seleccionado
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
    const resDiag = await authStore.fetchSeguro(`/diagnosticos/atencion/${atencion._id}`);
    if (resDiag && resDiag.ok) {
      const datosBff = await resDiag.json();
      diagnosticos.value = Array.isArray(datosBff.diagnosticos) ? datosBff.diagnosticos : [];
      bitacoraAccesos.value = Array.isArray(datosBff.bitacora) ? datosBff.bitacora : [];
      
      if (paciente.value?._id) {
        await registrarAuditoriaForense(paciente.value._id, atencion._id);
      }
    }
  } catch (err) {
    console.error("⚠️ Error controlado al resolver diagnósticos forenses:", err.message);
  } finally {
    cargandoDiagnostico.value = false;
  }
};

// PASARELA INTEROPERABLE RESTAURADA: Consume el fhirBundle de la caché y gatilla la inyección ACID
const ejecutarImportacionFHIRDesdeDashboard = async () => {
  if (!fhirBundleExternoCache.value) return;
  buscando.value = true;
  mensajeError.value = "🔄 Conectando con la base de datos externa sistema-informacion-clinica-demo... Sincronizando e integrando historial en base local con transacciones ACID...";
  
  try {
    let resImportar;
    let rutasAProbar = ["/expedientes/fhir/importar", "/expedientes/importar"];
    
    // Ejecuta la inyección pasándole el fhirBundle limpio acumulado de la aduana
    for (let ruta of rutasAProbar) {
      resImportar = await authStore.fetchSeguro(ruta, {
        method: "POST",
        body: JSON.stringify(fhirBundleExternoCache.value),
      });
      if (resImportar.status !== 404) break;
    }
    
    if (resImportar.status === 404) {
      throw new Error("El servidor central Express no tiene mapeado el endpoint transaccional de importación.");
    }
    
    const resultadoImportacion = await resImportar.json();
    
    if (resImportar.ok) {
      mensajeError.value = null;
      alert(`✅ ¡Interoperabilidad Exitosa! El expediente clínico ha sido integrado con éxito en la base de datos del CESFAM Emilio Schaffhauser`);
      
      const idPacienteLocalNuevo = resultadoImportacion.paciente_id || resultadoImportacion.id || resultadoImportacion.expediente_id;
      
      // Limpieza atómica de la caché asistencial perimetral
      rutBusqueda.value = "";
      pacienteIdExternoContingencia.value = null;
      fhirBundleExternoCache.value = null;
      origenDatos.value = "local"; 
      
      if (idPacienteLocalNuevo && idPacienteLocalNuevo.length === 24) {
        setTimeout(() => {
          componenteKey.value++; // Limpia el DOM y elimina residuos reactivos de memoria
          router.push(`/paciente/${idPacienteLocalNuevo}`);
        }, 50);
      } else {
        await consultarSistemaNacional();
      }
    } else {
      throw new Error(resultadoImportacion.msg || "El clúster transaccional rechazó la adición del expediente.");
    }
  } catch (error) {
    console.error("⚠️ Error en pasarela de importación asistencial:", error.message);
    mensajeError.value = `⚠️ Falla de Interoperabilidad: ${error.message}`;
    alert(`⚠️ No se pudo importar: ${error.message}`);
  } finally {
    buscando.value = false;
  }
};

// Guardado tradicional de consultas para pacientes recurrentes (Validación de Zod en la API)
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
      payload.resetForm(); // Le ordena al formulario hijo limpiar sus inputs locales
      formularioNuevaAtencionAbierto.value = false;
      await consultarSistemaNacional();
    } else {
      throw new Error(datos.msg || "El clúster rechazó el registro.");
    }
  } catch (error) {
    alert(`⚠️ Error al registrar consulta: ${error.message}`);
  } finally {
    guardandoNuevaConsulta.value = false;
  }
};

const redirigirAlRegistroExpress = () => {
  const rutParaLlevar = limpiarRutBuscador(rutBusqueda.value);
  sessionStorage.setItem("rut_urgencia", rutParaLlevar);
  router.push("/nueva-ficha");
};

// GANCHOS DE MONTADO Y OBSERVADORES CRÍTICOS EN CALIENTE
onMounted(() => {
  const idPacienteURL = route.params.pacienteId || route.params.id;
  if (idPacienteURL && idPacienteURL.length === 24) {
    cargarFichaPorIdDirecto(idPacienteURL);
  }
});

watch(
  () => route.params.id || route.params.pacienteId,
  (nuevoId) => {
    if (nuevoId && nuevoId.length === 24) {
      cargarFichaPorIdDirecto(nuevoId);
    } else if (!nuevoId) {
      paciente.value = null;
      historial.value = [];
      cerrarFichaClinica();
    }
  },
  { immediate: true },
);

// SERVICIO CENTRALIZADO DE AUDITORÍA FORENSE IDEMPOTENTE (OWASP / DEIS LEY 20.584)
const registrarAuditoriaForense = async (pacienteId, atencionId = null) => {
  if (!pacienteId) return;
  try {
    const respuesta = await authStore.fetchSeguro("/bitacora/registrar", {
      method: "POST",
      body: JSON.stringify({ paciente_id: pacienteId, atencion_id: atencionId })
    });
    if (respuesta && respuesta.ok) {
      const datosLog = await respuesta.json();
      if (respuesta.status === 201 && datosLog.acceso) {
        const nuevoLogFormateado = {
          ...datosLog.acceso,
          startTime: datosLog.acceso.fecha_consulta || new Date().toISOString()
        };
        bitacoraAccesos.value.unshift(nuevoLogFormateado);
      }
    }
  } catch (error) {
    console.error("⚠️ Fallo de comunicación en bus de auditoría:", error.message);
  } finally {
    buscando.value = false; // Desactiva de forma segura el estado de carga
  }
};

// src/views/Dashboard.vue (Función en el <script setup> de Vue 3)
const imprimirDauOficial = async (atencion) => {
  try {
    // LLamado seguro inyectando las cabeceras Bearer del token clínico de Pinia
    const respuesta = await authStore.fetchSeguro(`/atenciones/${atencion._id}/pdf`);
    
    if (respuesta && respuesta.ok) {
      const blob = await respuesta.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DAU-Folio-${atencion._id.slice(-6).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } catch (error) {
    alert(`⚠️ No se pudo imprimir el reporte: ${error.message}`);
  }
};


</script>




<style scoped>
/* Importación aislada y local del CSS exclusivo del Login */
@import "../assets/css/dashboardStyles.css";
</style>
