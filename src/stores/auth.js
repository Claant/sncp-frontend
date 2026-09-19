// stores/auth.js
import { defineStore } from "pinia";
import router from "../router/index.js"; // ADICIÓN: Importamos el router para transiciones limpias de SPA

const API_URL = import.meta.env.VITE_API_BASE_URL;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    usuario: (() => {
      try {
        return JSON.parse(localStorage.getItem("usuario"));
      } catch {
        return null;
      }
    })(),
    tiempoSegundos: 300, // 5 minutos = 300 segundos
    segundosInactivo: 0, // 60 segundos = 1 minuto
    mostrarAlertaAnticipada: false,
    mostrarModalInactividad: false,
    cuentaRegresivaCierre: 15,
    intervaloId: null,
    intervaloInactivityId: null,
    intervaloAlertaCierreId: null,
    boundResetearContadorInactividad: null,
  }),

  getters: {
    estaAutenticado: (state) => !!state.token,
    obtenerRol: (state) =>
      state.usuario?.rol ? state.usuario.rol.trim().toLowerCase() : null,
    tiempoFormateado: (state) => {
      const horas = Math.floor(state.tiempoSegundos / 3600);
      const minutos = Math.floor((state.tiempoSegundos % 3600) / 60);
      const segundos = state.tiempoSegundos % 60;
      const pad = (num) => String(num).padStart(2, "0");
      return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    },
  },

  actions: {
    cargarTokenPersistido() {
      if (!this.token && localStorage.getItem("token")) {
        this.token = localStorage.getItem("token");
        try {
          this.usuario = JSON.parse(localStorage.getItem("usuario"));
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

      const tiempoPersistido = localStorage.getItem("tiempoSegundos");
      if (tiempoPersistido) {
        this.tiempoSegundos = parseInt(tiempoPersistido, 10);
      } else {
        this.tiempoSegundos = 300;
      }

      this.segundosInactivo = 0;
      this.mostrarAlertaAnticipada = false;
      this.mostrarModalInactividad = false;
      this.cuentaRegresivaCierre = 15;

      this.intervaloId = setInterval(() => {
        if (this.tiempoSegundos > 0) {
          this.tiempoSegundos--;
          localStorage.setItem("tiempoSegundos", this.tiempoSegundos);
          if (this.tiempoSegundos <= 30) {
            this.mostrarAlertaAnticipada = true;
          }
        } else {
          this.detenerRelojesSeguridad();
          this.ejecutarSalidaForzada("expirado");
        }
      }, 1000);

      this.intervaloInactivityId = setInterval(() => {
        if (!this.mostrarModalInactividad) {
          this.segundosInactivo++;
          if (this.segundosInactivo >= 60) {
            this.mostrarModalInactividad = true;
            this.gatillarCuentaRegresivaCierre();
          }
        }
      }, 1000);

      this.boundResetearContadorInactividad =
        this.resetearContadorInactividad.bind(this);
      window.addEventListener(
        "mousemove",
        this.boundResetearContadorInactividad,
      );
      window.addEventListener("keydown", this.boundResetearContadorInactividad);
      window.addEventListener("click", this.boundResetearContadorInactividad);
      window.addEventListener("scroll", this.boundResetearContadorInactividad);
    },

    gatillarCuentaRegresivaCierre() {
      if (this.intervaloAlertaCierreId)
        clearInterval(this.intervaloAlertaCierreId);
      this.intervaloAlertaCierreId = setInterval(() => {
        if (this.cuentaRegresivaCierre > 1) {
          this.cuentaRegresivaCierre--;
        } else {
          this.detenerRelojesSeguridad();
          this.ejecutarSalidaForzada("inactividad");
        }
      }, 1000);
    },

    resetearContadorInactividad() {
      if (!this.mostrarModalInactividad) {
        this.segundosInactivo = 0;
      }
    },
    // aca se implementa la logica para extender la sesion de la clinica, esto se hace cuando el usuario esta inactivo y
    // se le muestra un modal, si el usuario hace click en extender sesion, se resetea el contador de inactividad y se cierra
    // el modal
    extenderSesionClinica() {
      // 1. Ocultamos los componentes visuales de alerta
      this.mostrarModalInactividad = false;
      this.mostrarAlertaAnticipada = false;

      // 2. Reseteamos el contador de inactividad física de la interfaz
      this.segundosInactivo = 0;
      this.cuentaRegresivaCierre = 15;

      // 3. Limpiamos el intervalo de la cuenta regresiva de inactividad si existiera
      if (this.intervaloAlertaCierreId) {
        clearInterval(this.intervaloAlertaCierreId);
        this.intervaloAlertaCierreId = null;
      }

      // 4. SOLUCIÓN CRÍTICA: Validamos si el tiempo de sesión general está en zona de riesgo (30 segundos o menos).
      // Si el usuario presiona "Extender" desde la alerta de expiración de tiempo, le devolvemos sus 3 minutos.
      if (this.tiempoSegundos <= 30) {
        this.tiempoSegundos = 300;
        localStorage.setItem("tiempoSegundos", this.tiempoSegundos);
      }
    },

    detenerRelojesSeguridad() {
      if (this.intervaloId) clearInterval(this.intervaloId);
      if (this.intervaloInactivityId) clearInterval(this.intervaloInactivityId);
      if (this.intervaloAlertaCierreId)
        clearInterval(this.intervaloAlertaCierreId);

      this.intervaloId = null;
      this.intervaloInactivityId = null;
      this.intervaloAlertaCierreId = null;

      if (this.boundResetearContadorInactividad) {
        window.removeEventListener(
          "mousemove",
          this.boundResetearContadorInactividad,
        );
        window.removeEventListener(
          "keydown",
          this.boundResetearContadorInactividad,
        );
        window.removeEventListener(
          "click",
          this.boundResetearContadorInactividad,
        );
        window.removeEventListener(
          "scroll",
          this.boundResetearContadorInactividad,
        );
      }
    },

    // aca se implementa la logica de reintentos para el login, con un maximo de 3 intentos
    // esto quiere decir que si el backend no responde, se reintentara 3 veces antes de mostrar un error al usuario
    async iniciarSesion(correo, password) {
      const maxReintentos = 3;
      let intentoActual = 0;
      let respuesta = null;
      let datos = null;

      while (intentoActual < maxReintentos) {
        try {
          respuesta = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo, password }),
          });

          datos = await respuesta.json();
          break; // Si la petición fue exitosa (con o sin error de credenciales), rompemos el bucle
        } catch (error) {
          intentoActual++;
          console.warn(
            `⚠️ Intento ${intentoActual} fallido en canal de autenticación local. Reintentando...`,
          );

          if (intentoActual >= maxReintentos) {
            return {
              exito: false,
              error:
                "El servidor clínico local no responde. Verifique que el Backend esté encendido.",
            };
          }

          // Espera 1.5 segundos antes de lanzar el siguiente intento para darle aire al Backend
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      try {
        if (!respuesta.ok)
          throw new Error(datos.msg || "Credenciales inválidas.");

        this.token = datos.token;
        this.usuario = datos.usuario;
        localStorage.setItem("token", datos.token);
        localStorage.setItem("usuario", JSON.stringify(datos.usuario));
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
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      localStorage.removeItem("tiempoSegundos"); // 🔹 Limpieza absoluta
    },

    // REFACTORIZADO: Rutas dinámicas de SPA usando Vue Router sin destruir la UI en blanco
    ejecutarSalidaForzada(motivo = "expirado") {
      this.cerrarSesion();

      if (motivo === "manual") {
        router.push("/login"); // Cierre de sesión limpio sin alertas confusas
      } else if (motivo === "inactividad") {
        router.push("/login?alerta=inactivo");
      } else if (motivo === "suspendido") {
        router.push("/login?alerta=suspendido");
      } else if (motivo === "seguridad") {
        router.push("/login?alerta=seguridad");
      } else {
        router.push("/login?alerta=expirado");
      }
    },

    async fetchSeguro(endpointRelativo, opciones = {}) {
      const cabeceras = {
        "Content-Type": "application/json",
        ...opciones.headers,
      };
      if (this.token) cabeceras["Authorization"] = `Bearer ${this.token}`;
      try {
        const respuesta = await fetch(`${API_URL}${endpointRelativo}`, {
          ...opciones,
          headers: cabeceras,
        });
        if (respuesta.status === 401) {
          this.ejecutarSalidaForzada("expirado");
          return null;
        }
        if (respuesta.status === 403) {
          const respuestaClonada = respuesta.clone();
          const datosError = await respuestaClonada.json();
          const mensajeError = datosError.msg || "";
          if (
            mensajeError.toLowerCase().includes("suspendida") ||
            mensajeError.toLowerCase().includes("deshabilitada") ||
            mensajeError.toLowerCase().includes("suspendido")
          ) {
            this.ejecutarSalidaForzada("suspendido");
            return null;
          }
          return respuesta;
        }
        return respuesta;
      } catch (error) {
        console.error("⚠️ Error en canal seguro fetchSeguro:", error.message);
        throw error;
      }
    },
  },
});
