<template>
  <button
    type="button"
    class="btn-imprimir-pdf"
    :disabled="cargando"
    @click="generarEImprimirPdf"
  >
    <span v-if="cargando">Generando PDF...</span>
    <span v-else>Imprimir</span>
  </button>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth.js";

const props = defineProps({
  atencionId: {
    type: String,
    required: true
  }
});

const authStore = useAuthStore();
const cargando = ref(false);

const generarEImprimirPdf = async () => {
  if (!props.atencionId) return;

  cargando.value = true;
  try {
    // 1. Solicitud del PDF autenticada desde el store
    const respuesta = await authStore.fetchSeguro(`/atenciones/${props.atencionId}/pdf`);

    if (!respuesta || !respuesta.ok) {
      throw new Error("No se pudo obtener el documento del servidor.");
    }

    // 2. Procesamiento del Blob binario
    const blob = await respuesta.blob();
    const url = window.URL.createObjectURL(blob);

    // 3. Descarga en el navegador
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `DAU-Folio-${props.atencionId.slice(-6).toUpperCase()}.pdf`
    );

    document.body.appendChild(link);
    link.click();

    // 4. Limpieza de memoria
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(`⚠️ Error al imprimir reporte: ${error.message}`);
  } finally {
    cargando.value = false;
  }
};
</script>

<style scoped>
.btn-imprimir-pdf {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 10px 18px;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  width: auto;
}

.btn-imprimir-pdf:hover {
  background-color: #059669;
}

.btn-imprimir-pdf:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
</style>