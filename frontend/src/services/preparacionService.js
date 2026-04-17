// services/preparacionService.js

import api from './api';

const preparacionService = {

  listar: async (params = {}) => {
    const { data } = await api.get('/preparaciones', { params });
    return data;
  },

  obtener: async (id) => {
    const { data } = await api.get(`/preparaciones/${id}`);
    return data;
  },

  crear: async (datos) => {
    const { data } = await api.post('/preparaciones', datos);
    return data;
  },

  actualizar: async (id, datos) => {
    const { data } = await api.put(`/preparaciones/${id}`, datos);
    return data;
  },

  eliminar: async (id) => {
    const { data } = await api.delete(`/preparaciones/${id}`);
    return data;
  },
};

export default preparacionService;