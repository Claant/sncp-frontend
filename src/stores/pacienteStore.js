// stores/pacienteStore.js
import { defineStore } from 'pinia';
import { useAuthStore } from './auth.js';

export const usePacienteStore = defineStore('paciente', {
  state: () => ({
    pacienteActual: null,
    fhirBundle: null,
    origenHistorial: '', // 'local', 'externo', 'local_unificado'
    mensajeSincronizacion: '',
    cargando: false,
    error: null
  }),

  actions: {
    async buscarPacientePorRut(rut) {
      const authStore = useAuthStore();
      this.cargando = true;
      this.error = null;
      this.mensajeSincronizacion = '';

      try {
        const respuesta = await authStore.fetchSeguro(`/pacientes/${rut}`);
        
        if (!respuesta) return null; // Salida limpia si expira el token

        const datos = await respuesta.json();

        if (respuesta.ok) {
          this.fhirBundle = datos.fhirBundle;
          this.origenHistorial = datos.origen || 'local';
          this.mensajeSincronizacion = datos.msg || '';
          return datos;
        } else {
          this.error = datos.msg || 'No se encontró el paciente en el sistema.';
          this.fhirBundle = null;
          return null;
        }
      } catch (err) {
        console.error('⚠️ Error al consultar el expediente del paciente:', err.message);
        this.error = 'Error de comunicación con el servidor asistencial.';
        return null;
      } finally {
        this.cargando = false;
      }
    },

    limpiarEstado() {
      this.pacienteActual = null;
      this.fhirBundle = null;
      this.origenHistorial = '';
      this.mensajeSincronizacion = '';
      this.error = null;
    }
  }
});