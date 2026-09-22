<template>
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
      v-if="bitacoraAccesos.length > 0"
      class="paginacion"
      style="margin-top: 15px"
    >
      <button
        type="button"
        @click="paginaBitacora--"
        :disabled="paginaBitacora === 1"
      >
        Anterior
      </button>
      <span>Página {{ paginaBitacora }} de {{ totalPaginasBitacora }}</span>
      <button
        type="button"
        @click="paginaBitacora++"
        :disabled="paginaBitacora === totalPaginasBitacora"
      >
        Siguiente
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  bitacoraAccesos: {
    type: Array,
    default: () => []
  },
  formatearFechaHora: {
    type: Function,
    required: true
  }
});

// Paginación exacta original del Dashboard
const paginaBitacora = ref(1);
const porPaginaBitacora = 3;

// Reinicia la página al cambiar el paciente o la atención seleccionada
watch(
  () => props.bitacoraAccesos,
  () => {
    paginaBitacora.value = 1;
  }
);

const totalPaginasBitacora = computed(() => 
  Math.ceil((props.bitacoraAccesos?.length || 0) / porPaginaBitacora) || 1
);

const bitacoraPaginada = computed(() => {
  const inicio = (paginaBitacora.value - 1) * porPaginaBitacora;
  return (props.bitacoraAccesos || []).slice(inicio, inicio + porPaginaBitacora);
});
</script>