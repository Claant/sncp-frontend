<!-- views/AdminUsuarios.vue (PARTE 1: TEMPLATE) -->
<template>
  <div class="admin-contenedor">
    <header class="admin-encabezado">
      <h2>Módulo de Gestión de Personal Clínico</h2>
      <p>Alta de funcionarios, asignación de especialidades y vinculación de centros asistenciales.</p>
    </header>

    <!-- Alertas del Sistema -->
    <div v-if="notificacion.texto" :class="['notificacion', notificacion.tipo]">
      {{ notificacion.texto }}
    </div>

    <div class="panel-cooperativo">
      <!-- FORMULARIO DE REGISTRO (Columna Izquierda) -->
      <section class="tarjeta-formulario">
        <h3>Registrar Nuevo Funcionario</h3>
        <form @submit.prevent="registrarFuncionario" class="formulario-admin">
          <div class="campo">
            <label>RUT Nacional</label>
            <input type="text" v-model="nuevoUsuario.rut" autocomplete="nuevoUsuario.rut" placeholder="12345678-9" required :disabled="guardando" />
          </div>

          <div class="campo">
            <label>Nombre Completo</label>
            <input type="text" v-model="nuevoUsuario.nombre" autocomplete="nuevoUsuario.nombre" placeholder="Ej: Dra. María Alejandra" required :disabled="guardando" />
          </div>

          <div class="campo">
            <label>Correo Electrónico</label>
            <input type="email" v-model="nuevoUsuario.correo" autocomplete="nuevoUsuario.correo" placeholder="usuario@sncp.cl" required :disabled="guardando" />
          </div>

          <div class="campo">
            <label>Nombre de Usuario (Username)</label>
            <input type="text" v-model="nuevoUsuario.username" autocomplete="nuevoUsuario.username" placeholder="m.alejandra" required :disabled="guardando" />
          </div>

          <div class="campo">
            <label>Contraseña Inicial</label>
            <input type="password" v-model="nuevoUsuario.password" autocomplete="nuevoUsuario.password" placeholder="••••••••" required :disabled="guardando" />
          </div>

          <div class="campo">
            <label>Rol en el Sistema</label>
            <select v-model="nuevoUsuario.rol" required :disabled="guardando">
              <option value="" disabled selected>Seleccione un rol...</option>
              <option value="medico">Médico / Especialista</option>
              <option value="administrador">Administrador del Sistema</option>
            </select>
          </div>

          <!-- Campo Especialidad: Obligatorio si el rol es Médico según el esquema de tu backend -->
          <div class="campo">
            <label>Especialidad Médica (Solo si es Médico)</label>
            <input 
              type="text" 
              v-model="nuevoUsuario.especialidad" 
              placeholder="Ej: Pediatría" 
              :required="nuevoUsuario.rol === 'medico'"
              :disabled="guardando"
            />
          </div>

          <div class="campo">
            <label>Centro de Salud Base</label>
            <select v-model="nuevoUsuario.centro_salud_id" required :disabled="guardando">
              <option value="" disabled selected>Vincular a establecimiento...</option>
              <option v-for="centro in centros" :key="centro._id" :value="centro._id">
                {{ centro.nombre_centro }}
              </option>
            </select>
          </div>

          <button type="submit" class="btn-crear" :disabled="guardando">
            {{ guardando ? 'Registrando Funcionario...' : 'Dar de Alta en Sistema' }}
          </button>
        </form>
      </section>

      <!-- LISTADO DE USUARIOS EXISTENTES PAGINADO (Columna Derecha) -->
      <section class="tarjeta-listado">
        <h3>Personal Clínico Activo</h3>
        <div v-if="cargandoUsuarios" class="cargando-tabla">Consultando nómina nacional...</div>
        
        <div v-else-if="usuarios.length === 0" class="cargando-tabla">No hay funcionarios registrados.</div>

        <div v-else class="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Nombre / RUT</th>
                <th>Rol</th>
                <th>Especialidad</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in usuarios" :key="user._id">
                <td>
                  <div class="celda-principal">{{ user.nombre }}</div>
                  <div class="celda-secundaria">{{ user.rut }}</div>
                </td>
                <td>
                  <span :class="['badge-rol', user.rol]">
                    {{ user.rol }}
                  </span>
                </td>
                <td class="celda-especialidad">{{ user.especialidad || 'N/A (Administrativo)' }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 📊 CONTROLES DE PAGINACIÓN A NIVEL DE SERVIDOR -->
          <div class="paginacion" style="margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 15px;">
            <button 
              type="button" 
              @click="cambiarPagina(metaPaginacion.paginaActual - 1)" 
              :disabled="metaPaginacion.paginaActual === 1 || cargandoUsuarios"
              style="padding: 6px 12px; cursor: pointer;"
            >
              Anterior
            </button>
            <span style="font-weight: 500; font-size: 0.9rem;">
              Página {{ metaPaginacion.paginaActual }} de {{ metaPaginacion.paginasTotales }}
            </span>
            <button 
              type="button" 
              @click="cambiarPagina(metaPaginacion.paginaActual + 1)" 
              :disabled="metaPaginacion.paginaActual === metaPaginacion.paginasTotales || cargandoUsuarios"
              style="padding: 6px 12px; cursor: pointer;"
            >
              Siguiente
            </button>
          </div>

        </div>
      </section>
    </div>
  </div>
</template>
<!-- views/AdminUsuarios.vue (PARTE 2: SCRIPT SETUP - OPTIMIZADO) -->
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();

// Estados reactivos locales de control de flujo
const usuarios = ref([]);
const centros = ref([]);
const guardando = ref(false);
const cargandoUsuarios = ref(false);
const notificacion = reactive({ texto: '', tipo: '' });

// Temporizador interno para desvanecer las alertas clínicas de la UI
let timeoutNotificacion = null;

// 📊 ESTADOS DE CONTROL PARA LA PAGINACIÓN REQUERIDA
const metaPaginacion = reactive({
  paginaActual: 1,
  paginasTotales: 1,
  limite: 10
});

// Modelo para el envío estructurado hacia crearUsuario
const nuevoUsuario = reactive({
  rut: '', 
  nombre: '', 
  correo: '', 
  rol: '', // Valor inicial vacío para el placeholder del select
  especialidad: '', 
  centro_salud_id: '', 
  username: '', 
  password: ''
});

// Helper de notificaciones efímeras para limpiar el terminal clínico automáticamente
const lanzarNotificacion = (texto, tipo) => {
  if (timeoutNotificacion) clearTimeout(timeoutNotificacion);
  notificacion.texto = texto;
  notificacion.tipo = tipo;
  
  timeoutNotificacion = setTimeout(() => {
    notificacion.texto = '';
    notificacion.tipo = '';
  }, 4000); // 4 segundos en pantalla y se disipa de la vista
};

// FUNCIÓN DE SANITIZACIÓN MAESTRA DEL RUT: Fuerza el formato XXXXXXXX-X
const limpiarRutCliente = (rutRaw) => {
  if (!rutRaw) return '';
  let limpio = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo}-${dv}`;
};

// Carga asíncrona para consultar exclusivamente la nómina de usuarios según la página
const consultarUsuariosPaginados = async (numPagina = 1) => {
  cargandoUsuarios.value = true;
  try {
    const respuesta = await authStore.fetchSeguro(`/usuarios?page=${numPagina}&limit=${metaPaginacion.limite}`);
    if (respuesta && respuesta.ok) {
      const payload = await respuesta.json();
      
      // Sincronizamos las filas de la tabla y los metadatos de control de Atlas
      usuarios.value = payload.usuarios || [];
      metaPaginacion.paginaActual = payload.paginacion.paginaActual;
      metaPaginacion.paginasTotales = payload.paginacion.paginasTotales;
    }
  } catch (error) {
    console.error('❌ Error al cargar la nómina paginada:', error.message);
    lanzarNotificacion('No se pudo establecer contacto con el servidor de recursos humanos.', 'error');
  } finally {
    cargandoUsuarios.value = false;
  }
};

// Orquestador inicial de carga en paralelo para poblar la vista por primera vez
const cargarDatosAdministrativos = async () => {
  cargandoUsuarios.value = true;
  try {
    const [resUsers, resCentros] = await Promise.all([
      authStore.fetchSeguro(`/usuarios?page=1&limit=${metaPaginacion.limite}`),
      authStore.fetchSeguro('/centros-salud')
    ]);

    if (resUsers && resUsers.ok) {
      const payload = await resUsers.json();
      usuarios.value = payload.usuarios || [];
      metaPaginacion.paginaActual = payload.paginacion.paginaActual;
      metaPaginacion.paginasTotales = payload.paginacion.paginasTotales;
    }
    if (resCentros && resCentros.ok) centros.value = await resCentros.json();
  } catch (error) {
    console.error('❌ Error al poblar el módulo administrativo de personal:', error.message);
    lanzarNotificacion('Error al inicializar los catálogos del módulo.', 'error');
  } finally {
    cargandoUsuarios.value = false;
  }
};

onMounted(cargarDatosAdministrativos);

// Manejador reactivo para saltar de páginas sin recargar el catálogo de centros de salud
const cambiarPagina = async (nuevaPagina) => {
  if (nuevaPagina >= 1 && nuevaPagina <= metaPaginacion.paginasTotales) {
    await consultarUsuariosPaginados(nuevaPagina);
  }
};

// Disparo del formulario seguro POST hacia /api/usuarios
const registrarFuncionario = async () => {
  guardando.value = true;
  notificacion.texto = '';

  // 1. Clonamos el payload reactivo para realizar manipulaciones sin alterar los inputs visuales
  const payloadEnvio = { ...nuevoUsuario };
  
  // 2. SANITIZACIÓN FRONTERA: Limpiamos y forzamos el guion intermedio antes de despacharlo por red
  payloadEnvio.rut = limpiarRutCliente(payloadEnvio.rut);
  payloadEnvio.nombre = payloadEnvio.nombre.trim();
  payloadEnvio.correo = payloadEnvio.correo.trim();
  payloadEnvio.username = payloadEnvio.username.trim();

  // Si el rol elegido no es médico, purgamos explícitamente el campo especialidad por consistencia
  if (payloadEnvio.rol !== 'medico') {
    payloadEnvio.especialidad = undefined;
  } else if (payloadEnvio.especialidad) {
    payloadEnvio.especialidad = payloadEnvio.especialidad.trim();
  }

  try {
    const respuesta = await authStore.fetchSeguro('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payloadEnvio)
    });

    if (!respuesta) return; // Detención controlada si el token expiró (401/403)

    const datos = await respuesta.json();

    if (respuesta.ok) {
      lanzarNotificacion(datos.msg || 'Funcionario dado de alta exitosamente.', 'exito');

      // Limpiar de forma atómica y reactiva todos los campos del formulario regresando al estado inicial limpio
      Object.keys(nuevoUsuario).forEach(key => nuevoUsuario[key] = '');
      
      // Forzamos el refresco devolviendo al administrador a la página 1 para ver el nuevo registro en la grilla
      await consultarUsuariosPaginados(1);
    } else {
      throw new Error(datos.msg || 'Error interno al procesar el alta del usuario.');
    }
  } catch (error) {
    lanzarNotificacion(error.message, 'error');
  } finally {
    guardando.value = false;
  }
};
</script>


<style scoped>
/* Estilos locales complementarios para estructurar los paneles cooperativos */
.formulario-admin {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tarjeta-formulario, .tarjeta-listado {
  background: #ffffff;
  padding: 10px;
}

.cargando-tabla {
  color: var(--texto-secundario);
  font-size: 0.9rem;
  font-style: italic;
  padding: 20px 0;
}

.celda-principal {
  font-weight: 600;
}

.celda-secundaria {
  font-size: 0.8rem;
  color: var(--texto-secundario);
}

.celda-especialidad {
  color: #475569;
}

.btn-crear {
  margin-top: 10px;
}

/* ====================================================================
   🚀 NUEVOS ESTILOS PARA LA PAGINACIÓN ASISTENCIAL DE RRHH
   Garantiza un diseño responsivo, limpio y alineado al estándar de la Red Nacional
   ==================================================================== */
.paginacion {
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px solid #e2e8f0; /* Línea sutil divisoria bajo la tabla */
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.paginacion button {
  background-color: #0284c7; /* Azul clínico institucional idéntico a tus botones de búsqueda */
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
  background-color: #0369a1; /* Tono más oscuro al pasar el cursor */
}

/* Estado deshabilitado para evitar quiebres de páginas fuera de rango */
.paginacion button:disabled {
  background-color: #cbd5e1; /* Gris apagado */
  color: #94a3b8;
  cursor: not-allowed; /* Cambia el cursor a un símbolo de bloqueo */
  opacity: 0.7;
}

.paginacion span {
  font-size: 0.9rem;
  color: #334155;
  font-weight: 600;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
}
</style>
