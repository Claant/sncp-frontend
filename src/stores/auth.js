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
 // estado global 
  getters: {
    estaAutenticado: (state) => !!state.token,  // esta autenticado ?
    obtenerRol: (state) =>   // obtiene el rol, trim quita los espacios, toLowerCase() convierte el texto en minuscualas si esta en mayuscula es el caso de ADM que pasa a ser admin
      state.usuario?.rol ? state.usuario.rol.trim().toLowerCase() : null,
    tiempoFormateado: (state) => {  // tiempo formateado, convierte un total de segundos a un formato legible
      const horas = Math.floor(state.tiempoSegundos / 3600);
      const minutos = Math.floor((state.tiempoSegundos % 3600) / 60);
      const segundos = state.tiempoSegundos % 60;
      const pad = (num) => String(num).padStart(2, "0");
      return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    },
  },


  actions: {
// ##################### RECUPERA SESION AL RECARGAR LA PAGINA (TECLA F5) ############### //

// lee el token del localStorage  y si el usuario sigue autenticado pero los relojes se detuvieron, vuelve a ejecutar inicializarRelojesSeguridad().

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
    // ########################### CIERRE ############################ //



// ######################### CONTROL DE TIEMPOS Y SEGURIDAD ######################### //

// activa en paralelo dos sistemas de proteccion usando temporizadores (reloj 1 y reloj 2) de javascript (setInterval)
    inicializarRelojesSeguridad() {
      this.detenerRelojesSeguridad();


      //######################### Reloj 1: tiempo de vida del Token ###############################//
      // carga tiempo guardado o asigna 5 minutos (300 segundos)
      // es un contador regresivo que por vencimiento del token.

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

      // Reloj 1: Descuenta 1 segundo al tiempo de vida del Token
      this.intervaloId = setInterval(() => {
        if (this.tiempoSegundos > 0) {
          this.tiempoSegundos--;
          localStorage.setItem("tiempoSegundos", this.tiempoSegundos);
          if (this.tiempoSegundos <= 30) {  // si llega a 30 segundos activa mostrarAlertaAnticipada  //
            this.mostrarAlertaAnticipada = true;
          }
        } else {
          this.detenerRelojesSeguridad();
          this.ejecutarSalidaForzada("expirado"); // aca expira el token
        }
      }, 1000);

  
      // Reloj 2: cuenta segundos sin interacción o inactividad //
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

        // Escuchadores que reinician el contador a 0 al detectar actividad física
        this.boundResetearContadorInactividad,
      );
      window.addEventListener("keydown", this.boundResetearContadorInactividad);
      window.addEventListener("click", this.boundResetearContadorInactividad);
      window.addEventListener("scroll", this.boundResetearContadorInactividad);
    },

    //############################# CIERRE ###########################################//


    // ##################  MANEJA CUENTA REGRESIVA FINAL CUANDO EL MODAL DE INACTIVDAD ESTA VISIBLE ############## //
    // Maneja la cuenta regresiva destructiva final cuando el modal de inactividad está visible //

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

  //############################# CIERRE ###########################################//

  // ####################### PONE segundosInactivo = 0 ##################### //

  resetearContadorInactividad() {
      if (!this.mostrarModalInactividad) {
        this.segundosInactivo = 0;
      }
    },
 //############################# CIERRE ###########################################//


//############################ ES LA ACCION DE RESCATE EJECUTADA CUANDO EL USUARIO PRESIONA EL BOTON  "EXTENDER SESION" EN LA INTERFAZ ######## //

    // se le muestra un modal, si el usuario hace click en extender sesion, se resetea el contador de inactividad //
  
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
      // Si el usuario presiona "Extender" desde la alerta de expiración de tiempo, le devolvemos sus 5 minutos.
      if (this.tiempoSegundos <= 30) {
        this.tiempoSegundos = 300;
        localStorage.setItem("tiempoSegundos", this.tiempoSegundos);
      }
    },
 //############################# CIERRE ###########################################//


 // ########################## CANCELA TODOS LOS setInterval ACTIVOS Y REMUEVE LOS ESCUCHADORES DE EVENTOS DEL WINDOWS #### //

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

     //############################# CIERRE ###########################################//

    // ############## AUTENTICACION DEL USUARIO ENVIANDO UNA PETICION POST AL BACKEND /auth/login ############ //

    // aca se implementa la logica de reintentos para el login, con un maximo de 3 intentos automaticos
    // esto quiere decir que si el backend no responde, se reintentara 3 veces antes de mostrar un error al usuario
    // Si las credenciales son válidas, guarda el token y el usuario en el estado de Pinia y en localStorage, e inicia los temporizadores de seguridad.
    // los tres intentos si el backend no responde son automaticos.
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

          if (respuesta.status === 429){
            return{
              exito: false,
              error: datos.msg || "Demasiados intentos. Su IP ha sido bloqueada temporalmente".
            }
          }

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

    // #################### CIERRE ################### //

    // ############## REALIZA LA LIMPIEZA DEL ESTADO LOCAL ################# //
    cerrarSesion() {
      this.detenerRelojesSeguridad();
      this.token = null;
      this.usuario = null;
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      localStorage.removeItem("tiempoSegundos"); 
    },
// #################### CIERRE ################### //



// ######################## CIERRA LA SESION Y REDIRIGE AL USUARIO A LA VISTA DE / LOGIN MEDIANTE VUE ROUTER //

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

// #################### CIERRE ################### //


// ############## FUNCIONA COMO UN INTERCEPTOR HTTP PARA REALIZAR PETICIONES PROTEGIDAS A LA API REST ########### //

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
    
// #################### CIERRE ################### //



  },
});
