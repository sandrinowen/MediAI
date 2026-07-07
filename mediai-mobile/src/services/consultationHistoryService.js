import api, { extractApiError } from './api';

export const getHistory = async (filters = {}) => {
  try {
    const { data } = await api.get('/historique', { params: filters });
    return { success: true, data: data.data || [], meta: data };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};
