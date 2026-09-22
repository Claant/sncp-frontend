<!-- src/components/VistaDashboard/BitacoraAuditoria.vue -->
<template>
  <div class="contenedor-logs-auditoria">
    <h5 class="titulo-bitacora">
      Consultas al Historial Clínico del Paciente
    </h5>

    <div v-if="bitacora.length === 0" class="sin-diagnostico-alerta">
      Sincronizando registros de auditoría...
    </div>

    <ul v-else class="lista-logs-auditoria">
      <li
        v-for="log in bitacoraPaginada"
        :key="log._id"
        class="item-log-auditoria"
      >
        <span>
          Dr(a). {{ log.nombre_medico || "Médico Consultante" }}
        </span>
        <span class="badge-rol-auditado">
          Rol: {{ log.rol_consultado || "medico" }}
        </span>
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
      v-if="bitacora.length > 0"
      class="paginacion"
      style="margin-top: 15px"
    >
      <button
        @click="paginaActual--"
        :disabled="paginaActual === 1"
      >
        Anterior
      </button>
      <span>Página {{ paginaActual }} de {{ totalPaginas }}</span>
      <button
        @click="paginaActual++"
        :disabled="paginaActual === totalPaginas"
      >
        Siguiente
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  bitacora: {
    type: Array,
    default: () => []
  },
  formatearFechaHora: {
    type: Function,
    required: true
  }
});

const paginaActual = ref(1);
const porPagina = 3;

const totalPaginas = computed(() => 
  Math.ceil((props.bitacora?.length || 0) / porPagina) || 1
);

const bitacoraPaginada = computed(() => {
  const inicio = (paginaActual.value - 1) * porPagina;
  return (props.bitacora || []).slice(inicio, inicio + porPagina);
});
</script>

<style scoped>
/* Importación del CSS para que aplique al componente desacoplado */
@import "@/assets/css/dashboardStyles.css";
</style>