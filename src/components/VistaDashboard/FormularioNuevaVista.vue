<template>
  <section class="seccion-step animate-fade formulario-atencion-medica">
    <h3>Registrar Nueva Atención Médica</h3>
    <p>
      Ingreso de evento clínico y conclusiones patológicas para este
      paciente preexistente.
    </p>

    <form @submit.prevent="enviarFormulario">
      <div class="grid-formulario">
        <div class="campo-formulario full-width">
          <label>Motivo de Consulta</label>
          <textarea
            v-model="nuevaConsulta.motivo_consulta"
            rows="3"
            placeholder="Describa el motivo de la consulta actual..."
            required
            :disabled="guardando"
          ></textarea>
        </div>

        <div class="campo-formulario">
          <label>Código de Enfermedad (CIE-10)</label>
          <input
            type="text"
            v-model="nuevaConsulta.codigo_enfermedad"
            placeholder="Ej: I10"
            required
            :disabled="guardando"
          />
        </div>

        <div class="campo-formulario">
          <label>Descripción Diagnóstica Detallada</label>
          <input
            type="text"
            v-model="nuevaConsulta.descripcion_diagnostico"
            placeholder="Conclusiones patológicas definitivas..."
            required
            :disabled="guardando"
          />
        </div>
      </div>

      <div class="acciones-formulario">
        <button
          type="submit"
          class="btn-guardar"
          :disabled="guardando"
        >
          {{ guardando ? "Sincronizando..." : "💾 Guardar Registro Clínico" }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive } from "vue";

// Definición formal de las Props de entrada de datos
const props = defineProps({
  pacienteId: {
    type: String,
    required: true
  },
  guardando: {
    type: Boolean,
    default: false
  }
});

// Definición de los eventos de salida hacia el Dashboard maestro
const emit = defineEmits(["guardar-atencion"]);

// Formulario reactivo local encapsulado idéntico a tu estructura original
const nuevaConsulta = reactive({
  motivo_consulta: "",
  codigo_enfermedad: "",
  descripcion_diagnostico: "",
});

// Despacha los datos limpios hacia el componente padre mediante el Emit
const enviarFormulario = () => {
  if (
    !nuevaConsulta.motivo_consulta.trim() ||
    !nuevaConsulta.codigo_enfermedad.trim() ||
    !nuevaConsulta.descripcion_diagnostico.trim()
  ) {
    alert("Por favor, complete todos los campos obligatorios.");
    return;
  }

  // Emitimos el evento pasando un objeto estructurado idóneo para la API
  emit("guardar-atencion", {
    paciente_id: props.pacienteId,
    motivo_consulta: nuevaConsulta.motivo_consulta.trim(),
    codigo_enfermedad: nuevaConsulta.codigo_enfermedad.trim().toUpperCase(),
    descripcion: nuevaConsulta.descripcion_diagnostico.trim(),
    // Función de limpieza para resetear el formulario local tras el éxito
    resetForm: () => {
      nuevaConsulta.motivo_consulta = "";
      nuevaConsulta.codigo_enfermedad = "";
      nuevaConsulta.descripcion_diagnostico = "";
    }
  });
};
</script>
