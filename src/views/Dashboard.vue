<template>
  <div class="dashboard-contenedor animate-fade">

    <!-- ENCABEZADO PRINCIPAL DEL DASHBOARD -->
    <header class="dashboard-header">
      <h2>Consulta de ficha clínica por RUT</h2>
      <p>
        Búsqueda en la base de datos local y despliegue histórico de las
        consultas médicas
      </p>
    </header>

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
                @input="formatearRutEnVivo"
                placeholder="Ej: 12.345.678-K"
                maxlength="12"
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

    <!-- MENSAJES DE ERROR, OPCIONES DE IMPORTACIÓN Y REGISTRO INICIAL -->
    <div v-if="mensajeError" class="alerta-clinica">
      <p class="texto-alerta-principal">{{ mensajeError }}</p>
      
      <!-- Escenario C: Paciente solo existe en la BD externa (Importación inicial) -->
      <div v-if="origenDatos === 'externo'" class="mt-2 contenedor-alerta-accion">
        <p class="texto-deteccion-destacado">
          📍 Se detectó un expediente clínico remoto en el <strong>CESFAM Las Compañías (La Serena)</strong>.
        </p>
        
        <button
          type="button"
          @click="ejecutarImportacionFHIRDesdeDashboard"
          class="btn-importar-fhir"
          :disabled="buscando"
        >
          {{ buscando ? "Procesando..." : "Importar Expediente Completo" }}
        </button>
      </div>

      <!-- Escenario A: Sin registros en la red asistencial (Registro Exprés) -->
      <div v-if="origenDatos === 'ninguno'" class="mt-2 contenedor-alerta-accion">
        <p class="small text-secondary mb-2">
          El paciente no registra historial clínico en centros médicos de la red pública ni privada.
        </p>
        <button
          type="button"
          @click="redirigirAlRegistroExpress"
          class="btn-importar-fhir"
        >
          Registrar nueva ficha clínica
        </button>
      </div>
    </div>

    <!-- RESULTADOS INTEGRADOS FICHA PACIENTE -->
    <div v-if="paciente" class="resultado-clinico animate-fade">

      <!-- 📍 ALERTA DE CONFIRMACIÓN MÉDICA PARA SMART MERGE (PACIENTE LOCAL CON ATENCIONES EXTERNAS PENDIENTES) -->
      <div 
        v-if="origenDatos === 'local_con_pendientes'" 
        class="alerta-clinica alerta-fusion-pendiente animate-fade" 
        style="margin-bottom: 20px; border-left: 5px solid #d97706; background-color: #fffbe0; padding: 15px; border-radius: 8px;"
      >
        <p class="texto-alerta-principal" style="color: #92400e; font-weight: 600; margin: 0;">
          ⚠️ <strong>Atenciones Externas Pendientes de Sincronización:</strong>
        </p>
        <p class="small" style="color: #b45309; margin: 6px 0 12px 0;">
          El paciente registra <strong>{{ atencionesPendientesCache.length }} consulta(s) reciente(s)</strong> en el <strong>CESFAM Las Compañías</strong> que aún no forman parte de esta ficha local. ¿Desea consolidar e importar las atenciones al expediente?
        </p>
        
        <div class="contenedor-alerta-accion" style="display: flex; gap: 10px;">
          <button
            type="button"
            @click="confirmarFusionIncremental"
            class="btn-importar-fhir"
            :disabled="buscando"
            style="background-color: #d97706; border-color: #b45309;"
          >
            {{ buscando ? "Unificando..." : "🔄 Integrar e Importar Historial Extendido" }}
          </button>
        </div>
      </div>

      <!-- CABECERA DEMOGRÁFICA DEL PACIENTE -->
      <div class="tarjeta-paciente-cabecera contenedor-flex-cabecera">
        <div class="datos-cabecera-paciente">
          <h3>
            Paciente: {{ paciente.nombre }}
            
            <!-- BADGE INDICADOR CUANDO LA FICHA YA FUE PREVIAMENTE UNIFICADA -->
            <span 
              v-if="origenDatos === 'local_unificado'" 
              class="badge-origen-fusion"
              title="Historial clínico unificado con eventos importados de la red externa"
            >
              🔄 Ficha Unificada (Smart Merge)
            </span>
          </h3>
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

      <!-- FORMULARIO MODULARIZADO DESACOPLADO -->
      <FormularioNuevaAtencion
        v-if="formularioNuevaAtencionAbierto"
        :paciente-id="paciente._id"
        :guardando="guardandoNuevaConsulta"
        @guardar-atencion="ejecutarGuardadoDesdeDashboard"
      />

      <!-- HISTORIAL CLÍNICO CRONOLÓGICO PAGINADO -->
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

              <!-- 📍 COLUMNA DE ESTABLECIMIENTO CON DETECCIÓN DINÁMICA DE RED EXTERNA -->
              <div class="columna-resumen-item">
                <span class="etiqueta-columna-lista">Establecimiento</span>
                <span class="valor-columna-lista highlight-centro">
                  {{
                    atencion.motivo_consulta?.includes('[RED EXTERNA]')
                      ? "CESFAM Las Compañías"
                      : (atencion.usuario_id?.centro_salud_id?.nombre_centro || "CESFAM Emilio Schaffhauser")
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

            <!-- ACCIONES DE LA ATENCIÓN -->
            <div class="accion-atencion-lista" style="display: flex; gap: 10px; align-items: center;">
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

              <PdfServiceDashboard :atencion-id="atencion._id" />
            </div>
          </div>

          <!-- CONTROLES DE PAGINACIÓN -->
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

            <!-- BLOQUE DE DIAGNÓSTICO CIE-10 -->
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

            <!-- BITÁCORA LEGAL DE AUDITORÍA DE ACCESOS ENCAPSULADA -->
            <BitacoraAuditoria 
              :bitacora="bitacoraAccesos" 
              :formatear-fecha-hora="formatearFechaHora" 
            />

          </div>
        </div>
      </article>

      <!-- AVISO DE PRIVACIDAD PARA ADMINISTRADORES -->
      <div
        v-else-if="authStore.obtenerRol === 'administrador'"
        class="aviso-privacidad animate-fade"
      >
        <strong>Aviso de Confidencialidad (Ley de Derechos del Paciente):</strong>
        Su perfil institucional (Administrador) le autoriza exclusivamente a
        gestionar los RR HH del personal de salud y al alta de infraestructura de centros de salud. 
        Las fichas médicas y códigos de diagnóstico CIE-10 se encuentran restringidos para personal
        clínico acreditado.
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

import FormularioNuevaAtencion from "@/components/VistaDashboard/FormularioNuevaVista.vue";
import PdfServiceDashboard from "@/components/VistaDashboard/pdfServiceDashboard.vue";
import BitacoraAuditoria from "@/components/VistaDashboard/BitacoraAuditoria.vue";

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

// CONTROL INTERACTIVO DE PASARELA
const origenDatos = ref("none"); // 'local', 'externo', 'ninguno', 'local_unificado', 'local_con_pendientes'
const pacienteIdExternoContingencia = ref(null);

// Contenedores atómicos
const paciente = ref(null);
const historial = ref([]);
const atencionSeleccionada = ref(null);
const bitacoraAccesos = ref([]);
const diagnosticos = ref([]);

// CACHÉ PERIMETRAL Y PENDIENTES DE SMART MERGE
const fhirBundleExternoCache = ref(null);
const atencionesPendientesCache = ref([]);

// Paginadores locales
const pagina = ref(1);
const porPagina = 3;

// Formateadores cronológicos
const formatearFecha = (stringFecha) => {
  if (!stringFecha) return "N/A";
  return new Date(stringFecha).toLocaleDateString("es-CL", { timeZone: "UTC" });
};

const formatearFechaHora = (stringFecha) => {
  if (!stringFecha) return "N/A";
  return new Date(stringFecha).toLocaleString("es-CL");
};

// ====================================================================
// FUNCIONES Y MANEJO DE FORMATO DE RUT
// ====================================================================

const obtenerRutLimpio = (val) => {
  if (!val) return '';
  return val.replace(/[^0-9kK]/g, '').toUpperCase();
};

const aplicarFormatoRut = (val) => {
  let limpio = obtenerRutLimpio(val);

  if (limpio.length > 9) {
    limpio = limpio.slice(0, 9);
  }

  if (limpio.length <= 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${cuerpoConPuntos}-${dv}`;
};

const formatearRutEnVivo = (e) => {
  if (!e || !e.target) return;
  const formateado = aplicarFormatoRut(e.target.value);
  rutBusqueda.value = formateado;
  e.target.value = formateado;
};

// ====================================================================
// PROPIEDADES COMPUTADAS
// ====================================================================
const totalPaginas = computed(() => Math.ceil((historial.value?.length || 0) / porPagina) || 1);
const historialPaginado = computed(() => {
  const inicio = (pagina.value - 1) * porPagina;
  return (historial.value || []).slice(inicio, inicio + porPagina);
});

// ====================================================================
// MOTORES DE BÚSQUEDA Y LÓGICA DE NEGOCIO
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

const consultarSistemaNacional = async () => {
  buscando.value = true;
  mensajeError.value = null;
  paciente.value = null;
  historial.value = [];
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
  pacienteIdExternoContingencia.value = null;
  fhirBundleExternoCache.value = null;
  atencionesPendientesCache.value = [];
  origenDatos.value = "none";
  cerrarFichaClinica();
  formularioNuevaAtencionAbierto.value = false;

  try {
    const rutSanitizado = aplicarFormatoRut(rutBusqueda.value);
    
    // Consulta a la API REST de Expedientes
    const resBusqueda = await authStore.fetchSeguro(`/pacientes/${rutSanitizado}`);
    if (!resBusqueda) return;
    
    const datosPac = await resBusqueda.json();
    origenDatos.value = datosPac.origen || "none";

    // ESCENARIO A: Paciente no existe en ningún centro
    if (!resBusqueda.ok || datosPac.origen === "ninguno") {
      origenDatos.value = "ninguno";
      throw new Error(datosPac.msg || "El RUT ingresado no está registrado en este centro de salud ni en la red externa.");
    }

    // ESCENARIO B: Paciente LOCAL (Soporta 'local', 'local_unificado' y 'local_con_pendientes')
    if (
      datosPac.origen === "local" || 
      datosPac.origen === "local_unificado" || 
      datosPac.origen === "local_con_pendientes"
    ) {
      const fhirBundle = datosPac.fhirBundle;

      // Almacenamos consultas pendientes si la API detectó diferencias
      if (datosPac.origen === "local_con_pendientes") {
        atencionesPendientesCache.value = datosPac.atencionesPendientes || [];
      }

      if (fhirBundle && fhirBundle.entry) {
        // Extraer datos del paciente desde el recurso 'Patient' de FHIR
        const entradaPatient = fhirBundle.entry.find(e => e.resource?.resourceType === "Patient");
        if (entradaPatient) {
          paciente.value = {
            _id: entradaPatient.resource.id,
            nombre: entradaPatient.resource.name?.[0]?.text || "Paciente Registrado",
            rut: entradaPatient.resource.identifier?.[0]?.value || rutSanitizado,
            fecha_nacimiento: entradaPatient.resource.birthDate ? formatearFecha(entradaPatient.resource.birthDate) : "N/A"
          };
        }

        // Extraer historial desde los recursos 'Encounter'
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

      // Registrar auditoría forense del acceso a la ficha
      if (paciente.value?._id) {
        await registrarAuditoriaForense(paciente.value._id, null);
      }
    }
    
    // ESCENARIO C: Registro puramente EXTERNO (Primera vez que se trae al paciente)
    else if (datosPac.origen === "externo") {
      fhirBundleExternoCache.value = datosPac.fhirBundle;
      const entradaPatientRemoto = datosPac.fhirBundle?.entry?.find(e => e.resource?.resourceType === "Patient");
      pacienteIdExternoContingencia.value = entradaPatientRemoto?.resource?.id || "contingencia-remota";
      
      mensajeError.value = `El RUT ${rutSanitizado} no posee registros locales en este CESFAM, pero se halló un expediente remoto.`;
    }

  } catch (error) {
    console.error("❌ Fallo en renderizado del Dashboard FHIR:", error.message);
    mensajeError.value = error.message;
    historial.value = [];
    diagnosticos.value = [];
    bitacoraAccesos.value = [];
    pacienteIdExternoContingencia.value = null;
    fhirBundleExternoCache.value = null;
    atencionesPendientesCache.value = [];
  } finally {
    buscando.value = false;
  }
};

const cerrarFichaClinica = () => {
  atencionSeleccionada.value = null;
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
};

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
      
      historial.value = datos.atenciones || [];
      diagnosticos.value = datos.diagnosticos || [];
      bitacoraAccesos.value = datos.bitacora || [];
      paciente.value = datos.paciente;
      rutBusqueda.value = datos.paciente?.rut || "";
      origenDatos.value = "local";
      
      pagina.value = 1;
    
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

const toggleFichaClinica = async (atencion) => {
  if (atencionSeleccionada.value?._id === atencion._id) {
    cerrarFichaClinica();
    return;
  }
  atencionSeleccionada.value = atencion;
  diagnosticos.value = [];
  bitacoraAccesos.value = [];
  cargandoDiagnostico.value = true;

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

const ejecutarImportacionFHIRDesdeDashboard = async () => {
  if (!fhirBundleExternoCache.value) return;
  buscando.value = true;
  mensajeError.value = "🔄 Conectando con la base de datos externa... Sincronizando e integrando historial en base local con transacciones ACID...";
  
  try {
    let resImportar;
    let rutasAProbar = ["/expedientes/fhir/importar", "/expedientes/importar"];
    
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
      alert(`¡Interoperabilidad Exitosa! El expediente clínico ha sido integrado con éxito en la base de datos del CESFAM Emilio Schaffhauser`);
      
      const idPacienteLocalNuevo = resultadoImportacion.paciente_id || resultadoImportacion.id || resultadoImportacion.expediente_id;
      
      rutBusqueda.value = "";
      pacienteIdExternoContingencia.value = null;
      fhirBundleExternoCache.value = null;
      origenDatos.value = "local"; 
      
      if (idPacienteLocalNuevo && idPacienteLocalNuevo.length === 24) {
        setTimeout(() => {
          componenteKey.value++;
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
const confirmarFusionIncremental = async () => {
  if (!paciente.value?._id || atencionesPendientesCache.value.length === 0) return;
  buscando.value = true;

  try {
    // 📍 PREFIJO CORRECTO: /api/pacientes/sincronizar-atenciones
    const resSync = await authStore.fetchSeguro("/api/pacientes/sincronizar-atenciones", {
      method: "POST",
      body: JSON.stringify({
        paciente_id: paciente.value._id,
        atencionesExternas: atencionesPendientesCache.value
      })
    });

    if (!resSync) return;

    // Validación para evitar parsear HTML de error en caso de fallo
    const contentType = resSync.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`El servidor devolvió una respuesta no válida (HTTP ${resSync.status}).`);
    }

    const datosRes = await resSync.json();

    if (resSync.ok) {
      alert("✅ Ficha unificada: Las atenciones externas fueron integradas exitosamente al expediente local.");
      atencionesPendientesCache.value = [];
      await consultarSistemaNacional(); // Refresca la vista
    } else {
      alert(`⚠️ No se pudo sincronizar: ${datosRes.msg || "Error en el servidor"}`);
    }
  } catch (error) {
    console.error("⚠️ Error en sincronización asistida:", error.message);
    alert(`⚠️ Error en sincronización: ${error.message}`);
  } finally {
    buscando.value = false;
  }
};


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
      payload.resetForm();
      formularioNuevaAtencionAbierto.value = false;
      await consultarSistemaNacional();
    } else {
      if (datos.detalles && Array.isArray(datos.detalles) && datos.detalles.length > 0) {
        const listaErrores = datos.detalles.map(d => `• ${d.mensaje}`).join('\n');
        alert(`No se pudo registrar la consulta médica:\n\n${listaErrores}`);
      } else {
        alert(`⚠️ ${datos.msg || "El clúster rechazó el registro."}`);
      }
    }
  } catch (error) {
    console.error("Error en guardado de atención médica:", error);
    alert(`No se pudo conectar con el servidor: ${error.message}`);
  } finally {
    guardandoNuevaConsulta.value = false;
  }
};

const redirigirAlRegistroExpress = () => {
  const rutParaLlevar = aplicarFormatoRut(rutBusqueda.value);
  sessionStorage.setItem("rut_urgencia", rutParaLlevar);
  router.push("/nueva-ficha");
};

// GANCHOS DE MONTADO Y OBSERVADORES
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
    buscando.value = false;
  }
};
</script>

<style scoped>
@import "../assets/css/dashboardStyles.css";


</style>