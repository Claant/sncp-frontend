import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

// Importación de las vistas del Sistema Nacional Clínico
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import NuevaFicha from '../views/NuevaFicha.vue';
import RegistroPaciente from '../views/RegistroPaciente.vue';
import AdminUsuarios from '../views/AdminUsuarios.vue';
import AdminCentros from '../views/AdminCentros.vue';
import AdminMedicosCrud from '../views/AdminMedicosCrud.vue';

const routes = [
  { 
    path: '/', 
    name: 'Raiz'
    // Redirección dinámica gobernada por el guard global abajo
  },
  { 
    path: '/login', 
    name: 'Login', 
    component: Login, 
    meta: { requiereInvitado: true } 
  },
  { 
    path: '/dashboard', 
    name: 'Dashboard', 
    component: Dashboard, 
    meta: { 
      requiereAuth: true,
      roles: ['medico'] // Acceso exclusivo para el perfil de atención clínica
    } 
  },
  { 
    path: '/dashboard/paciente/:pacienteId', 
    name: 'DashboardPaciente', 
    component: Dashboard, 
    meta: { 
      requiereAuth: true,
      roles: ['medico'] 
    } 
  },
  { 
    path: '/nueva-ficha', 
    name: 'NuevaFicha', 
    component: NuevaFicha, 
    meta: { 
      requiereAuth: true, 
      roles: ['medico'] 
    } 
  },
  {
    path: '/registro-paciente',
    name: 'RegistroPaciente',
    component: RegistroPaciente,
    meta: {
      requiereAuth: true,
      roles: ['medico', 'administrador'] 
    }
  },
  {
    path: '/admin/usuarios',
    name: 'AdminUsuarios',
    component: AdminUsuarios,
    meta: {
      requiereAuth: true,
      roles: ['administrador'] 
    }
  },
  {
    path: '/admin/centros',
    name: 'AdminCentros',
    component: AdminCentros,
    meta: {
      requiereAuth: true,
      roles: ['administrador'] 
    }
  },
  {
    path: '/admin/medicos',
    name: 'AdminMedicosCrud',
    component: AdminMedicosCrud,
    meta: {
      requiereAuth: true,
      roles: ['administrador'] 
    }
  },
  // 🚀 ADICIÓN: Capturador universal para rutas no definidas (Evita vistas rotas en blanco)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guardia Global de Navegación (Escudo de seguridad inteligente en el Cliente)
router.beforeEach((to, from) => {
  const authStore = useAuthStore();
  
  // Normalizamos el rol a minúsculas de forma segura para evitar inconsistencias de tipeo
  const usuarioRol = authStore.obtenerRol ? authStore.obtenerRol.toLowerCase() : null;

  // 1. Bloqueo inmediato si un usuario anónimo intenta forzar una URL privada
  if (to.meta.requiereAuth && !authStore.estaAutenticado) {
    return '/login';
  }

  // 2. Redirección Inteligente si intenta ir al Login o a la Raíz estando ya autenticado
  if ((to.meta.requiereInvitado || to.name === 'Raiz') && authStore.estaAutenticado) {
    if (usuarioRol === 'administrador') {
      return '/admin/usuarios'; // Destino natural y seguro del administrador
    } else {
      return '/dashboard'; // Destino natural del médico
    }
  }

  // 3. Si un usuario no está logueado e ingresa a la raíz sin sesión, lo enviamos al Login
  if (to.name === 'Raiz' && !authStore.estaAutenticado) {
    return '/login';
  }

  // 4. Validación estricta de Permisos RBAC
  if (to.meta.roles) {
    // Normalizamos la lista blanca de la ruta para comparar de forma estricta en minúsculas
    const rolesPermitidos = to.meta.roles.map(r => r.toLowerCase());

    if (!rolesPermitidos.includes(usuarioRol)) {
      // 🚀 OPTIMIZACIÓN: Notificamos de forma asíncrona a través del store en lugar de congelar la UI con alert()
      console.warn(`🛑 Acceso denegado: El rol institucional (${usuarioRol || 'No definido'}) intentó forzar la ruta ${to.path}`);
      
      if (usuarioRol === 'administrador') {
        return '/admin/usuarios';
      } else if (usuarioRol === 'medico') {
        return '/dashboard';
      } else {
        authStore.ejecutarSalidaForzada('seguridad'); // Si el rol está corrupto, forzamos expulsión segura
        return '/login';
      }
    }
  }

  // Si supera todas las capas de control, autoriza el despliegue nativo del componente Vue
  return true;
});

export default router;
