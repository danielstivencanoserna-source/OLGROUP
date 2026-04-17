// services/sicoqService.js

import api from './api';

const sicoqService = {

  // Registrar un consumo de reactivo controlado
  registrarConsumo: async (datos) => {
    const { data } = await api.post('/sicoq/consumos', datos);
    return data;
  },

  // Listar historial de consumos
  // params: reactivo_id, nombre_responsable, desde, hasta, pagina, limite
  listarConsumos: async (params = {}) => {
    const { data } = await api.get('/sicoq/consumos', { params });
    return data;
  },

  // Obtener un consumo específico
  obtenerConsumo: async (id) => {
    const { data } = await api.get(`/sicoq/consumos/${id}`);
    return data;
  },

  // Listar reactivos controlados disponibles (para el buscador)
  listarReactivosControlados: async (busqueda = '') => {
    const { data } = await api.get('/sicoq/reactivos', {
      params: { q: busqueda },
    });
    return data;
  },
};

export default sicoqService;