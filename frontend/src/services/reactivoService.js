// services/reactivoService.js

import api from './api';

const reactivoService = {

  // Listar reactivos con filtros opcionales
  // params puede incluir: busqueda, estado, pagina, limite, controlado
  listar: async (params = {}) => {
    const { data } = await api.get('/reactivos', { params });
    return data;
  },

  // Obtener un reactivo con todos sus detalles y pictogramas
  obtener: async (id) => {
    const { data } = await api.get(`/reactivos/${id}`);
    return data;
  },

  // Crear reactivo — usa FormData porque puede incluir un PDF
  crear: async (formData) => {
    const { data } = await api.post('/reactivos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Actualizar reactivo — también puede actualizar el PDF
  actualizar: async (id, formData) => {
    const { data } = await api.put(`/reactivos/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Eliminar reactivo (solo admin)
  eliminar: async (id) => {
    const { data } = await api.delete(`/reactivos/${id}`);
    return data;
  },

  // Reactivos próximos a vencer
  proximosVencer: async (dias = 90) => {
    const { data } = await api.get('/reactivos/proximos-vencer', {
      params: { dias },
    });
    return data;
  },
};

export default reactivoService;