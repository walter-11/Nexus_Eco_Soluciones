import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Clientes API
export const getClientes = () => api.get('/clientes');
export const getClienteById = (id) => api.get(`/clientes/${id}`);
export const createCliente = (data) => api.post('/clientes', data);
export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const deleteCliente = (id) => api.delete(`/clientes/${id}`);

// Contacto Clientes API
export const getContactos = () => api.get('/contacto-clientes');
export const createContacto = (data) => api.post('/contacto-clientes', data);
export const updateContacto = (id, data) => api.put(`/contacto-clientes/${id}`, data);
export const deleteContacto = (id) => api.delete(`/contacto-clientes/${id}`);

// Solicitudes API
export const getSolicitudes = () => api.get('/solicitud-servicios');
export const createSolicitud = (data) => api.post('/solicitud-servicios', data);
export const updateSolicitud = (id, data) => api.put(`/solicitud-servicios/${id}`, data);
export const deleteSolicitud = (id) => api.delete(`/solicitud-servicios/${id}`);

// Ordenes API (Orden de Servicio)
export const getOrdenes = () => api.get('/orden-servicios');
export const createOrdenServicio = (data) => api.post('/orden-servicios', data);
export const updateOrdenServicio = (id, data) => api.put(`/orden-servicios/${id}`, data);
export const deleteOrdenServicio = (id) => api.delete(`/orden-servicios/${id}`);

// Ejecucion / Evidencias API
export const getEjecuciones = () => api.get('/ejecucion-servicios');
export const createEjecucion = (data) => api.post('/ejecucion-servicios', data);
export const updateEjecucion = (id, data) => api.put(`/ejecucion-servicios/${id}`, data);
export const deleteEjecucion = (id) => api.delete(`/ejecucion-servicios/${id}`);
export const uploadEvidencia = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/evidencias/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

export const uploadMultipleEvidencias = (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    return api.post('/evidencias/upload-multiple', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

// Empleados API
export const getEmpleados = () => api.get('/empleados');
export const createEmpleado = (data) => api.post('/empleados', data);
export const updateEmpleado = (id, data) => api.put(`/empleados/${id}`, data);
export const deleteEmpleado = (id) => api.delete(`/empleados/${id}`);

// Tipos Servicio API
export const getTiposServicio = () => api.get('/tipo-servicios');
export const createTipoServicio = (data) => api.post('/tipo-servicios', data);
export const updateTipoServicio = (id, data) => api.put(`/tipo-servicios/${id}`, data);
export const deleteTipoServicio = (id) => api.delete(`/tipo-servicios/${id}`);

// Especialidades API
export const getEspecialidades = () => api.get('/especialidads');
export const createEspecialidad = (data) => api.post('/especialidads', data);
export const updateEspecialidad = (id, data) => api.put(`/especialidads/${id}`, data);
export const deleteEspecialidad = (id) => api.delete(`/especialidads/${id}`);

// Tecnicos API
export const getTecnicos = () => api.get('/tecnicos');
export const createTecnico = (data) => api.post('/tecnicos', data);
export const updateTecnico = (id, data) => api.put(`/tecnicos/${id}`, data);
export const deleteTecnico = (id) => api.delete(`/tecnicos/${id}`);

// Ordenes de Trabajo API
export const getOrdenesTrabajo = () => api.get('/orden-trabajos');
export const createOrdenTrabajo = (data) => api.post('/orden-trabajos', data);
export const updateOrdenTrabajo = (id, data) => api.put(`/orden-trabajos/${id}`, data);
export const deleteOrdenTrabajo = (id) => api.delete(`/orden-trabajos/${id}`);

// Ubicaciones API
export const getUbicaciones = () => api.get('/ubicacions');
export const createUbicacion = (data) => api.post('/ubicacions', data);
export const updateUbicacion = (id, data) => api.put(`/ubicacions/${id}`, data);
export const deleteUbicacion = (id) => api.delete(`/ubicacions/${id}`);

// Tecnico Planificaciones API
export const getTecnicoPlanificaciones = () => api.get('/tecnico-planificacions');
export const createTecnicoPlanificacion = (data) => api.post('/tecnico-planificacions', data);
export const updateTecnicoPlanificacion = (id, data) => api.put(`/tecnico-planificacions/${id}`, data);
export const deleteTecnicoPlanificacion = (id) => api.delete(`/tecnico-planificacions/${id}`);

// Planificacion API
export const getPlanificaciones = () => api.get('/planificacion-servicios');
export const createPlanificacion = (data) => api.post('/planificacion-servicios', data);
export const updatePlanificacion = (id, data) => api.put(`/planificacion-servicios/${id}`, data);
export const deletePlanificacion = (id) => api.delete(`/planificacion-servicios/${id}`);

// Auditorias API
export const getAuditorias = () => api.get('/auditorias');
export const getAuditoriasByEjecucion = (idEjecucion) => api.get(`/auditorias?ejecucionId=${idEjecucion}`);
export const createAuditoria = (data) => api.post('/auditorias', data);
export const updateAuditoria = (id, data) => api.put(`/auditorias/${id}`, data);
export const deleteAuditoria = (id) => api.delete(`/auditorias/${id}`);

// Incidentes API
export const getIncidentes = () => api.get('/incidentes');
export const getIncidentesByEjecucion = (idEjecucion) => api.get(`/incidentes?ejecucionId=${idEjecucion}`);
export const createIncidente = (data) => api.post('/incidentes', data);
export const updateIncidente = (id, data) => api.put(`/incidentes/${id}`, data);
export const deleteIncidente = (id) => api.delete(`/incidentes/${id}`);

// Seguimiento Incidentes API
export const getSeguimientosIncidente = () => api.get('/seguimiento-incidentes');
export const createSeguimientoIncidente = (data) => api.post('/seguimiento-incidentes', data);
export const updateSeguimientoIncidente = (id, data) => api.put(`/seguimiento-incidentes/${id}`, data);
export const deleteSeguimientoIncidente = (id) => api.delete(`/seguimiento-incidentes/${id}`);

// Inspecciones API
export const getInspecciones = () => api.get('/inspeccions');
export const createInspeccion = (data) => api.post('/inspeccions', data);
export const updateInspeccion = (id, data) => api.put(`/inspeccions/${id}`, data);
export const deleteInspeccion = (id) => api.delete(`/inspeccions/${id}`);

// Informes API
export const getInformes = () => api.get('/informe-servicios');
export const createInforme = (data) => api.post('/informe-servicios', data);
export const updateInforme = (id, data) => api.put(`/informe-servicios/${id}`, data);
export const deleteInforme = (id) => api.delete(`/informe-servicios/${id}`);

// Encuestas Satisfaccion (MongoDB) API
export const getEncuestasSatisfaccion = () => api.get('/encuesta-satisfaccions');
export const deleteEncuestaSatisfaccion = (id) => api.delete(`/encuesta-satisfaccions/${id}`);
export const getEncuestasResumen = () => api.get('/encuesta-satisfaccions/resumen');

export default api;
