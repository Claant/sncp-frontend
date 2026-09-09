<!-- views/AdminMedicosCrud.vue (TEMPLATE INTEGRADO) -->
<template>
  <div class="admin-contenedor animate-fade">
    <header class="admin-encabezado">
      <h2>Módulo de Control y CRUD de Personal Médico</h2>
      <p>
        Auditoría de especialidades, actualización de datos base y control de
        vigencia en el centro de salud.
      </p>
    </header>

    <!-- Alertas Dinámicas del Sistema -->
    <div v-if="notificacion.texto" :class="['notificacion', notificacion.tipo]">
      {{ notificacion.texto }}
    </div>

    <!-- PANEL CENTRAL DEL CRUD -->
    <section class="tarjeta-listado" style="padding: 0">
      <div v-if="cargando" class="cargando-tabla">
        Consultando nómina de especialistas en MongoDB Atlas...
      </div>

      <div
        v-else-if="medicosFiltrados.length === 0"
        class="cargando-tabla"
        style="font-style: normal"
      >
        No se encuentran profesionales médicos registrados en el sistema
        actualmente.
      </div>

      <div v-else class="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Identificación</th>
              <th>Contacto</th>
              <th>Especialidad</th>
              <th>Estado</th>
              <th>Panel Administrativo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="medico in medicosFiltrados" :key="medico._id">
              <td>
                <div
                  class="celda-principal"
                  style="font-weight: 700; color: var(--clinico-oscuro)"
                >
                  Dra/Dr. {{ medico.nombre }}
                </div>
                <div
                  class="celda-secundaria"
                  style="font-size: 0.85rem; font-weight: 600"
                >
                  RUT: {{ medico.rut }}
                </div>
              </td>
              <td>
                <div
                  class="celda-secundaria"
                  style="color: #0284c7; font-weight: 500"
                >
                 {{ medico.correo }}
                </div>
              </td>
              <td>
                <span
                  class="badge-rol medico"
                  style="margin-bottom: 5px; display: inline-block"
                >
                  {{ medico.especialidad }}
                </span>
              </td>
              <td>
                <span
                  :class="[
                    'badge-prestador',
                    medico.activo !== false ? 'Publico' : 'Privado',
                  ]"
                >
                  {{ medico.activo !== false ? "Habilitado" : "Suspendido" }}
                </span>
              </td>
              <td class="celda-acciones">
                <!-- Botón 1: Abrir Modal de Edición -->
                <button
                  type="button"
                  @click="abrirEditor(medico)"
                  class="btn-siguiente"
                  style="
                    width: auto;
                    padding: 6px 12px;
                    font-size: 0.8rem;
                    background-color: #0284c7;
                  "
                >
                  Editar
                </button>

                <!-- Botón 2: Alternar Estado Lógico (Activo/Inactivo) -->
                <button
                  type="button"
                  @click="alternarEstadoMedico(medico)"
                  :class="[
                    'boton-cerrar-sesion',
                    { 'btn-suspender': medico.activo !== false },
                  ]"
                  style="
                    width: auto;
                    padding: 6px 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                  "
                  :disabled="procesandoId === medico._id"
                >
                  {{ medico.activo !== false ? "Suspender" : "✅ Activar" }}
                </button>

                <!-- Botón 3: Eliminación física definitiva en Atlas -->
                <button
                  type="button"
                  @click="eliminarMedicoDefinitivo(medico)"
                  class="boton-cerrar-sesion btn-eliminar-critico"
                  style="
                    width: auto;
                    padding: 6px 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                  "
                  :disabled="procesandoId === medico._id"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- CONTROLES DE PAGINACIÓN ASISTENCIAL (Inyectados con éxito en la grilla derecha) -->
        <div class="paginacion" style="margin: 20px 0; padding: 15px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; align-items: center; gap: 15px;">
          <button 
            type="button" 
            @click="cambiarPagina(metaPaginacion.paginaActual - 1)" 
            :disabled="metaPaginacion.paginaActual === 1 || cargando"
            style="padding: 8px 16px; cursor: pointer; background-color: #0284c7; color: white; border: none; border-radius: 4px; font-weight: 600;"
          >
            Anterior
          </button>
          <span style="font-weight: 600; font-size: 0.9rem; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; border: 1px solid #e2e8f0; color: #334155;">
            Página {{ metaPaginacion.paginaActual }} de {{ metaPaginacion.paginasTotales }}
          </span>
          <button 
            type="button" 
            @click="cambiarPagina(metaPaginacion.paginaActual + 1)" 
            :disabled="metaPaginacion.paginaActual === metaPaginacion.paginasTotales || cargando"
            style="padding: 8px 16px; cursor: pointer; background-color: #0284c7; color: white; border: none; border-radius: 4px; font-weight: 600;"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>

    <!-- VENTANA MODAL FLOTANTE PARA EDICIÓN DE MÉDICO -->
    <div v-if="modalAbierto" class="modal-sobrecapa">
      <div class="modal-ventana animate-fade">
        <div class="modal-cabecera">
          <h3>Editar Perfil de Especialista</h3>
          <button type="button" @click="cerrarModal" class="btn-cerrar-modal">
            ✕
          </button>
        </div>

        <form @submit.prevent="guardarCambiosMedico" class="formulario-modal">
          <p
            style="
              font-size: 0.85rem;
              color: var(--texto-secundario);
              margin-top: 0;
            "
          >
            Modificando antecedentes del profesional:
            <strong>{{ medicoSeleccionado.nombre }}</strong> (RUT:
            {{ medicoSeleccionado.rut }})
          </p>

          <div class="campo">
            <label>Especialidad Clínica</label>
            <input
              type="text"
              v-model="medicoSeleccionado.especialidad"
              autocomplete="medicoSeleccionado.especialidad"
              placeholder="Ej: Neurología Infantil"
              required
            />
          </div>

          <div class="campo" style="margin-top: 12px">
            <label>Centro Asistencial Base</label>
            <select v-model="medicoSeleccionado.centro_salud_id" required>
              <option value="" disabled>Seleccione establecimiento...</option>
              <option
                v-for="centro in centros"
                :key="centro._id"
                :value="centro._id"
              >
                {{ centro.nombre_centro }}
              </option>
            </select>
          </div>

          <div class="modal-acciones">
            <button
              type="button"
              @click="cerrarModal"
              class="btn-volver"
              style="padding: 10px 20px"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-siguiente"
              style="padding: 10px 20px"
              :disabled="guardandoCambios"
            >
              {{
                guardandoCambios ? "Guardando..." : "Actualizar Especialista"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>



<!-- views/AdminMedicosCrud.vue -->
<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();

// Estados reactivos generales del CRUD
const listaCompleta = ref([]);
const centros = ref([]);
const cargando = ref(false);
const guardandoCambios = ref(false);
const procesandoId = ref(null);
const notificacion = reactive({ texto: '', tipo: '' });

// ESTADOS DE CONTROL PARA LA PAGINACIÓN DESDE EL SERVIDOR
const metaPaginacion = reactive({
  paginaActual: 1, // en que pagina estas 
  paginasTotales: 1, // cuantas paginas hay en total de las paginaActual 
  limite: 10 // cuantos registros por pagina se van a mostrar
});

// Estados del Formulario Modal de Edición
const modalAbierto = ref(false);
const medicoSeleccionado = reactive({
  _id: '', nombre: '', rut: '', especialidad: '', centro_salud_id: ''
});

// Temporizador interno para la disipación autónoma de alertas clínicas
let timerNotificacion = null;

const lanzarNotificacionLocal = (texto, tipo) => {
  if (timerNotificacion) clearTimeout(timerNotificacion);
  notificacion.texto = texto;
  notificacion.tipo = tipo;
  
  timerNotificacion = setTimeout(() => {
    notificacion.texto = '';
    notificacion.tipo = '';
  }, 4000); // 4 segundos en pantalla y se desvanece solo para limpiar el terminal
};

// FILTRO COMPUTADO: Filtra la nómina de Atlas para dejar solo al personal médico en pantalla
const medicosFiltrados = computed(() => {
  return listaCompleta.value.filter(usuario => usuario.rol === 'medico');
});

// Carga asíncrona para consultar exclusivamente la nómina de usuarios según la página
const consultarMedicosPaginados = async (numPagina = 1) => {
  cargando.value = true;
  try {
    const respuesta = await authStore.fetchSeguro(`/usuarios?page=${numPagina}&limit=${metaPaginacion.limite}`);
    if (respuesta && respuesta.ok) {
      const payload = await respuesta.json();
      listaCompleta.value = payload.usuarios || [];
      metaPaginacion.paginaActual = payload.paginacion.paginaActual;
      metaPaginacion.paginasTotales = payload.paginacion.paginasTotales;
    }
  } catch (error) {
    console.error('Error al cargar la lista paginada de médicos:', error.message);
    lanzarNotificacionLocal('Error de comunicación con la base de datos central.', 'error');
  } finally {
    cargando.value = false;
  }
};

// Orquestador de carga asíncrona en paralelo para poblar el ecosistema de la vista al inicio
const cargarEcosistemaMedicos = async () => {
  cargando.value = true;
  try {
    const [resUsuarios, resCentros] = await Promise.all([
      authStore.fetchSeguro(`/usuarios?page=1&limit=${metaPaginacion.limite}`),
      authStore.fetchSeguro('/centros-salud')
    ]);

    if (resUsuarios && resUsuarios.ok) {
      const payload = await resUsuarios.json();
      listaCompleta.value = payload.usuarios || [];
      metaPaginacion.paginaActual = payload.paginacion.paginaActual;
      metaPaginacion.paginasTotales = payload.paginacion.paginasTotales;
    }
    if (resCentros && resCentros.ok) centros.value = await resCentros.json();
  } catch (error) {
    console.error('Error al poblar el CRUD de médicos:', error.message);
    lanzarNotificacionLocal('Fallo al inicializar el catálogo asistencial.', 'error');
  } finally {
    cargando.value = false;
  }
};

onMounted(cargarEcosistemaMedicos);

// Manejador reactivo para saltar de páginas de forma inmediata
const cambiarPagina = async (nuevaPagina) => {
  if (nuevaPagina >= 1 && nuevaPagina <= metaPaginacion.paginasTotales) {
    await consultarMedicosPaginados(nuevaPagina);
  }
};

// CONTROLADOR DE ESTADO (Habilitar / Suspender facultades clínicas)
const alternarEstadoMedico = async (medico) => {
  const nuevoEstado = medico.activo === false;
  const accionTexto = nuevoEstado ? 'ACTIVAR' : 'SUSPENDER';
  
  const confirmar = confirm(`¿Está seguro de que desea ${accionTexto} las facultades del profesional ${medico.nombre}?`);
  if (!confirmar) return;

  procesandoId.value = medico._id;
  notificacion.texto = '';

  try {
    const respuesta = await authStore.fetchSeguro(`/usuarios/${medico._id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ activo: nuevoEstado })
    });

    const datos = await respuesta.json();

    if (respuesta && respuesta.ok) {
      lanzarNotificacionLocal(datos.msg || 'Estado de vigencia clínico actualizado con éxito.', 'exito');
      await consultarMedicosPaginados(metaPaginacion.paginaActual); 
    } else {
      throw new Error(datos.msg || 'Falla al alterar el estado del profesional.');
    }
  } catch (error) {
    lanzarNotificacionLocal(error.message, 'error');
  } finally {
    procesandoId.value = null;
  }
};

// LÓGICA DE ACTUALIZACIÓN (Abrir, cerrar y guardar cambios desde el Modal)
const abrirEditor = (medico) => {
  notificacion.texto = '';
  // CORRECCIÓN VUE 3 Proxy: Mutamos propiedad por propiedad para mantener la reactividad del formulario
  medicoSeleccionado._id = medico._id;
  medicoSeleccionado.nombre = medico.nombre;
  medicoSeleccionado.rut = medico.rut;
  medicoSeleccionado.especialidad = medico.especialidad || '';
  medicoSeleccionado.centro_salud_id = medico.centro_salud_id?._id || medico.centro_salud_id || '';
  
  modalAbierto.value = true;
};

const cerrarModal = () => {
  modalAbierto.value = false;
};

const guardarCambiosMedico = async () => {
  guardandoCambios.value = true;
  const payload = {
    especialidad: medicoSeleccionado.especialidad.trim(),
    centro_salud_id: medicoSeleccionado.centro_salud_id
  };

  try {
    const respuesta = await authStore.fetchSeguro(`/usuarios/${medicoSeleccionado._id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    const datos = await respuesta.json();

    if (respuesta && respuesta.ok) {
      lanzarNotificacionLocal(datos.msg || 'Cambios del perfil consolidados en Atlas.', 'exito');
      cerrarModal();
      await consultarMedicosPaginados(metaPaginacion.paginaActual); 
    } else {
      throw new Error(datos.msg || 'Falla interna al actualizar los datos del médico.');
    }
  } catch (error) {
    // CORRECCIÓN: Evitamos congelar la UI de Vue y despachamos el error al contenedor reactivo unificado
    lanzarNotificacionLocal(error.message, 'error');
  } finally {
    guardandoCambios.value = false;
  }
};

// ACCIÓN CRUD ELIMINAR: Baja física definitiva del profesional en MongoDB Atlas
const eliminarMedicoDefinitivo = async (medico) => {
  const primerFiltro = confirm(`ADVERTENCIA CRÍTICA: ¿Está seguro de eliminar permanentemente al profesional ${medico.nombre}?`);
  if (!primerFiltro) return;

  const segundoFiltro = confirm(`ESTA ACCIÓN NO SE PUEDE DESHACER. Se borrará el RUT ${medico.rut} de toda la base de datos de este centro de salud. ¿Desea proceder?`);
  if (!segundoFiltro) return;

  procesandoId.value = medico._id;
  notificacion.texto = '';

  try {
    const respuesta = await authStore.fetchSeguro(`/usuarios/${medico._id}`, {
      method: 'DELETE'
    });

    const datos = await respuesta.json();

    if (respuesta && respuesta.ok) {
      lanzarNotificacionLocal(datos.msg || 'Registro de profesional de salud eliminado de la base de datos.', 'exito');
      
      const paginaDestino = (medicosFiltrados.value.length === 1 && metaPaginacion.paginaActual > 1) 
        ? metaPaginacion.paginaActual - 1 
        : metaPaginacion.paginaActual;

      await consultarMedicosPaginados(paginaDestino); 
    } else {
      throw new Error(datos.msg || 'El servidor rechazó la solicitud de eliminación física del usuario.');
    }
  } catch (error) {
    lanzarNotificacionLocal(error.message, 'error');
  } finally {
    procesandoId.value = null;
  }
};
</script>


<style scoped>
/* ====================================================================
   ESTILOS DE LA TABLA Y NÓMINA DE MÉDICOS
   ==================================================================== */
.cargando-tabla {
  text-align: center;
  color: var(--texto-secundario);
  padding: 35px;
  font-size: 0.95rem;
  font-style: italic;
}

.celda-principal {
  font-size: 0.95rem;
}

.celda-secundaria {
  font-size: 0.8rem;
  color: var(--texto-secundario);
  margin-top: 2px;
}

.celda-acciones {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ====================================================================
   CONTROLADORES DINÁMICOS DE BOTONES (CRUD / ACCIONES)
   ==================================================================== */
/* Botón en estado Habilitado (Muestra opción de Suspender en Gris/Rojo) */
.boton-cerrar-sesion.btn-suspender {
  background-color: #64748b;
}

.boton-cerrar-sesion.btn-suspender:hover {
  background-color: var(--error);
}

/* Botón en estado Suspendido (Muestra opción de Activar en Verde/Turquesa) */
.boton-cerrar-sesion:not(.btn-suspender) {
  background-color: var(--exito);
}

.boton-cerrar-sesion:not(.btn-suspender):hover {
  background-color: var(--clinico-oscuro);
}

/* ====================================================================
   CAPA MODAL (VENTANA FLOTANTE DE ACTUALIZACIÓN INTEGRADA)
   ==================================================================== */
.modal-sobrecapa {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.4); /* Fondo semi-transparente oscuro */
  backdrop-filter: blur(3px); /* Efecto esmerilado de fondo */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-ventana {
  background: var(--blanco-puro);
  padding: 30px;
  border-radius: 10px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--borde-suave);
  box-sizing: border-box;
}

.modal-cabecera {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f0fdfa;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.modal-cabecera h3 {
  margin: 0;
  color: var(--clinico-oscuro);
  font-size: 1.2rem;
}

.btn-cerrar-modal {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--texto-secundario);
  cursor: pointer;
}

.btn-cerrar-modal:hover {
  color: var(--error);
}

.formulario-modal {
  display: flex;
  flex-direction: column;
}

.modal-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 25px;
}

/* ====================================================================
   🚀 COMPLEMENTO: ESTILOS PARA LA BOTONERA DE PAGINACIÓN DE MÉDICOS
   ==================================================================== */
.paginacion button {
  background-color: #0284c7;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.paginacion button:hover:not(:disabled) {
  background-color: #0369a1;
}

.paginacion button:disabled {
  background-color: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
