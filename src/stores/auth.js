// stores/auth.js
import { defineStore } from 'pinia';
import router from '../router/index.js'; // 🚀 ADICIÓN: Importamos el router para transiciones limpias de SPA

const API_URL = import.meta.env.VITE_API_BASE_URL;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    usuario: (() => {
      try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
    })(),
    tiempoSegundos: 28800,   // 8 horas = 28800 segundos
    segundosInactivo: 0,     // 60 segundos = 1 minuto
    mostrarAlertaAnticipada: false,   
    mostrarModalInactividad: false,  
    cuentaRegresivaCierre: 15,
    intervaloId: null,
    intervaloInactivityId: null,
    intervaloAlertaCierreId: null,
    boundResetearContadorInactividad: null
  }),
  
  getters: {
    estaAutenticado: (state) => !!state.token,
    obtenerRol: (state) => state.usuario?.rol ? state.usuario.rol.trim().toLowerCase() : null,
    tiempoFormateado: (state) => {
      const horas = Math.floor(state.tiempoSegundos / 3600);  
      const minutos = Math.floor((state.tiempoSegundos % 3600) / 60);  
      const segundos = state.tiempoSegundos % 60; 
      const pad = (num) => String(num).padStart(2, '0');  
      return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;  
    }
  },
  
  actions: {
    cargarTokenPersistido() {
      if (!this.token && localStorage.getItem('token')) {
        this.token = localStorage.getItem('token');
        try {
          this.usuario = JSON.parse(localStorage.getItem('usuario'));
        } catch {
          this.usuario = null;
        }
      }
      if (this.estaAutenticado && !this.intervaloId) {
        this.inicializarRelojesSeguridad();
      }
    },

    inicializarRelojesSeguridad() {
      this.detenerRelojesSeguridad(); 
      
      this.tiempoSegundos = 28800;
      this.segundosInactivo = 0;
      this.mostrarAlertaAnticipada = false;
      this.mostrarModalInactividad = false;
      this.cuentaRegresivaCierre = 15;

      // 1. CRONÓMETRO DE TURNO GENERAL (8 HORAS)
      this.intervaloId = setInterval(() => {
        if (this.tiempoSegundos > 0) {
          this.tiempoSegundos--;
          if (this.tiempoSegundos <= 1800) {
            this.mostrarAlertaAnticipada = true;
          }
        } else {
          this.detenerRelojesSeguridad();
          this.ejecutarSalidaForzada('expirado');
        }
      }, 1000);

      // 2. DETECTOR DE INACTIVIDAD DE INTERFAZ (60 SEGUNDOS)
      this.intervaloInactivityId = setInterval(() => {
        if (!this.mostrarModalInactividad) {
          this.segundosInactivo++;
          if (this.segundosInactivo >= 60) {
            this.mostrarModalInactividad = true;
            this.gatillarCuentaRegresivaCierre();
          }
        }
      }, 1000);

      this.boundResetearContadorInactividad = this.resetearContadorInactividad.bind(this);

      window.addEventListener('mousemove', this.boundResetearContadorInactividad);
      window.addEventListener('keydown', this.boundResetearContadorInactividad);
      window.addEventListener('click', this.boundResetearContadorInactividad);
      window.addEventListener('scroll', this.boundResetearContadorInactividad);
    },

    gatillarCuentaRegresivaCierre() {
      if (this.intervaloAlertaCierreId) clearInterval(this.intervaloAlertaCierreId);
      this.intervaloAlertaCierreId = setInterval(() => {
        if (this.cuentaRegresivaCierre > 1) {
          this.cuentaRegresivaCierre--;
        } else {
          this.detenerRelojesSeguridad();
          this.ejecutarSalidaForzada('inactividad');
        }
      }, 1000);
    },
    
    resetearContadorInactividad() {
      if (!this.mostrarModalInactividad) {
        this.segundosInactivo = 0;
      }
    },

    extenderSesionClinica() {
      this.mostrarModalInactividad = false;
      this.segundosInactivo = 0;
      this.cuentaRegresivaCierre = 15;
      if (this.intervaloAlertaCierreId) clearInterval(this.intervaloAlertaCierreId);
    },

    detenerRelojesSeguridad() {
      if (this.intervaloId) clearInterval(this.intervaloId);
      if (this.intervaloInactivityId) clearInterval(this.intervaloInactivityId);
      if (this.intervaloAlertaCierreId) clearInterval(this.intervaloAlertaCierreId);
      
      this.intervaloId = null;
      this.intervaloInactivityId = null;
      this.intervaloAlertaCierreId = null;

      if (this.boundResetearContadorInactividad) {
        window.removeEventListener('mousemove', this.boundResetearContadorInactividad);
        window.removeEventListener('keydown', this.boundResetearContadorInactividad);
        window.removeEventListener('click', this.boundResetearContadorInactividad);
        window.removeEventListener('scroll', this.boundResetearContadorInactividad);
      }
    },

    async iniciarSesion(correo, password) {
      try {
        const respuesta = await fetch(`${API_URL}/auth/login`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, password })
        });
        
        const datos = await respuesta.json();
        
        if (!respuesta.ok) throw new Error(datos.msg || 'Credenciales inválidas.');

        this.token = datos.token;
        this.usuario = datos.usuario;
        localStorage.setItem('token', datos.token);
        localStorage.setItem('usuario', JSON.stringify(datos.usuario));

        this.inicializarRelojesSeguridad();
        return { exito: true };

      } catch (error) {
        return { exito: false, error: error.message };
      }
    },

    cerrarSesion() {
      this.detenerRelojesSeguridad();
      this.token = null;
      this.usuario = null;
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    },

    // 🚀 REFACTORIZADO: Rutas dinámicas de SPA usando Vue Router sin destruir la UI en blanco
    ejecutarSalidaForzada(motivo = 'expirado') {
      this.cerrarSesion();
      
      if (motivo === 'manual') {
        router.push('/login'); // Cierre de sesión limpio sin alertas confusas
      } else if (motivo === 'inactividad') {
        router.push('/login?alerta=inactivo');
      } else if (motivo === 'suspendido') {
        router.push('/login?alerta=suspendido');
      } else if (motivo === 'seguridad') {
        router.push('/login?alerta=seguridad');
      } else {
        router.push('/login?alerta=expirado');
      }
    },

    async fetchSeguro(endpointRelativo, opciones = {}) {
      const cabeceras = { 'Content-Type': 'application/json', ...opciones.headers };
      if (this.token) cabeceras['Authorization'] = `Bearer ${this.token}`;
      try {
        const respuesta = await fetch(`${API_URL}${endpointRelativo}`, { ...opciones, headers: cabeceras });
        if (respuesta.status === 401) {
          this.ejecutarSalidaForzada('expirado');
          return null;
        }
        if (respuesta.status === 403) {
          const respuestaClonada = respuesta.clone();
          const datosError = await respuestaClonada.json();
          const mensajeError = datosError.msg || '';
          if (mensajeError.toLowerCase().includes('suspendida') || mensajeError.toLowerCase().includes('deshabilitada') || mensajeError.toLowerCase().includes('suspendido')) {
            this.ejecutarSalidaForzada('suspendido');
            return null;
          }
          return respuesta;
        }
        return respuesta;
      } catch (error) {
        console.error('❌ Error en canal seguro fetchSeguro:', error.message);
        throw error;
      }
    }
  }
});
