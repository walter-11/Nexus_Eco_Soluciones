import React, { useState, useEffect } from 'react';
import { MdEvent, MdSave, MdAdd, MdArrowBack, MdLocationOn, MdPeople, MdVisibility, MdClose } from 'react-icons/md';
import { 
    getPlanificaciones, createPlanificacion, updatePlanificacion, deletePlanificacion,
    getOrdenes, getTecnicos, createUbicacion, updateUbicacion,
    getTecnicoPlanificaciones, createTecnicoPlanificacion, deleteTecnicoPlanificacion 
} from '../api/api';
import './Planificacion.css';

const formatOS = (id) => `OS-2026-${String(id).padStart(4, '0')}`;
const formatPlan = (id) => `PLAN-2026-${String(id).padStart(4, '0')}`;

const Planificacion = () => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [planificaciones, setPlanificaciones] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [districtFilter, setDistrictFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, startDateFilter, endDateFilter, districtFilter]);

    // Details Modal State
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedPlanTechs, setSelectedPlanTechs] = useState([]);

    // Form fields
    const [form, setForm] = useState({
        idOrdenServicio: '',
        fechaProgramada: new Date().toISOString().split('T')[0],
        horaInicio: '08:00',
        estadoPlan: 'PROGRAMADO',
        // Ubicacion nested fields
        distrito: '',
        provincia: 'Lima',
        calle: '',
        referencia: '',
        idUbicacion: null
    });

    const [selectedTecnicos, setSelectedTecnicos] = useState([]); // List of technician IDs
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (view === 'list') {
            fetchPlanificaciones();
        } else {
            fetchFormData();
        }
    }, [view]);

    const fetchPlanificaciones = async () => {
         setLoading(true);
         try {
             const res = await getPlanificaciones();
             const sortedData = [...res.data].sort((a, b) => b.idPlanificacionServicio - a.idPlanificacionServicio);
             setPlanificaciones(sortedData);
         } catch (error) {
             console.error("Error fetching planificaciones", error);
         } finally {
             setLoading(false);
         }
     };

    const fetchFormData = async () => {
        try {
            const [resOrdenes, resTecnicos, resPlans] = await Promise.all([
                getOrdenes(),
                getTecnicos(),
                getPlanificaciones()
            ]);
            
            // Exclude already planned orders (unless we are editing the current plan)
            const planificadasIds = resPlans.data
                .map(pl => pl.ordenServicio?.idOrdenServicio)
                .filter(Boolean);
            
            const filtered = resOrdenes.data.filter(os => {
                if (editingId) {
                    const currentPlan = resPlans.data.find(pl => pl.idPlanificacionServicio === editingId);
                    if (currentPlan && currentPlan.ordenServicio?.idOrdenServicio === os.idOrdenServicio) {
                        return true; // Keep currently selected order when editing
                    }
                }
                return !planificadasIds.includes(os.idOrdenServicio);
            });

            setOrdenes(filtered);
            setTecnicos(resTecnicos.data.filter(t => t.estadoTec === 'ACTIVO'));

            if (filtered.length > 0 && !form.idOrdenServicio) {
                setForm(f => ({ ...f, idOrdenServicio: filtered[0].idOrdenServicio.toString() }));
            }
        } catch (error) {
            console.error("Error fetching form options", error);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setFormErrors(prev => ({ ...prev, [e.target.name]: null }));
    };

    const handleTechCheckboxChange = (id) => {
        let newTechs;
        if (selectedTecnicos.includes(id)) {
            newTechs = selectedTecnicos.filter(tid => tid !== id);
        } else {
            newTechs = [...selectedTecnicos, id];
        }
        setSelectedTecnicos(newTechs);
        setFormErrors(prev => ({ ...prev, tecnicos: null }));
    };

    const handleNew = () => {
        setEditingId(null);
        setSelectedTecnicos([]);
        setForm({
            idOrdenServicio: '',
            fechaProgramada: new Date().toISOString().split('T')[0],
            horaInicio: '08:00',
            estadoPlan: 'PROGRAMADO',
            distrito: '',
            provincia: 'Lima',
            calle: '',
            referencia: '',
            idUbicacion: null
        });
        setFormErrors({});
        setView('form');
    };

    const handleEdit = async (plan) => {
        setEditingId(plan.idPlanificacionServicio);
        
        // Find existing technician planifications for this plan
        let techIds = [];
        try {
            const res = await getTecnicoPlanificaciones();
            const assignments = res.data.filter(tp => tp.planificacionServicio?.idPlanificacionServicio === plan.idPlanificacionServicio);
            techIds = assignments.map(a => a.tecnico?.idTecnico);
        } catch (e) {
            console.error("Error fetching assignments", e);
        }

        setSelectedTecnicos(techIds);

        const u = plan.ubicacion || {};
        setForm({
            idOrdenServicio: plan.ordenServicio ? plan.ordenServicio.idOrdenServicio.toString() : '',
            fechaProgramada: plan.fechaProgramada ? plan.fechaProgramada.split('T')[0] : '',
            horaInicio: plan.horaInicio ? plan.horaInicio.slice(0, 5) : '08:00',
            estadoPlan: plan.estadoPlan || 'PROGRAMADO',
            distrito: u.distrito || '',
            provincia: u.provincia || 'Lima',
            calle: u.calle || '',
            referencia: u.referencia || '',
            idUbicacion: u.idUbicacion || null
        });
        setFormErrors({});
        setView('form');
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta planificación?")) {
            try {
                // Delete tech assignments first
                const resTP = await getTecnicoPlanificaciones();
                const assignments = resTP.data.filter(tp => tp.planificacionServicio?.idPlanificacionServicio === id);
                for (const a of assignments) {
                    await deleteTecnicoPlanificacion(a.idTecnicoPlanificacion);
                }
                
                await deletePlanificacion(id);
                alert("Planificación eliminada exitosamente");
                fetchPlanificaciones();
            } catch (error) {
                console.error("Error deleting planificacion", error);
                alert("No se pudo eliminar la planificación.");
            }
        }
    };

    const handleSave = async () => {
        const errors = {};
        if (!form.idOrdenServicio) {
            errors.idOrdenServicio = "Debe seleccionar una Orden de Servicio Asociada.";
        }
        if (!form.fechaProgramada) {
            errors.fechaProgramada = "Debe programar la fecha de la visita.";
        }
        if (!form.horaInicio) {
            errors.horaInicio = "Debe especificar la hora de inicio.";
        }
        if (!form.calle || !form.calle.trim()) {
            errors.calle = "La calle de la dirección es obligatoria.";
        }
        if (!form.distrito || !form.distrito.trim()) {
            errors.distrito = "El distrito de la dirección es obligatorio.";
        }
        if (!form.provincia || !form.provincia.trim()) {
            errors.provincia = "La provincia de la dirección es obligatoria.";
        }
        
        // Prevent code injection
        if (/[<>]/.test(form.calle || '')) errors.calle = "La calle no puede contener caracteres HTML (< o >).";
        if (/[<>]/.test(form.distrito || '')) errors.distrito = "El distrito no puede contener caracteres HTML (< o >).";
        if (/[<>]/.test(form.provincia || '')) errors.provincia = "La provincia no puede contener caracteres HTML (< o >).";
        if (/[<>]/.test(form.referencia || '')) errors.referencia = "La referencia no puede contener caracteres HTML (< o >).";

        if (selectedTecnicos.length === 0) {
            errors.tecnicos = "Debe asignar al menos un técnico (el primero será el Líder del equipo).";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        try {
            // Step 1: Save Ubicacion
            let ubicacionId = form.idUbicacion;
            const ubicPayload = {
                idUbicacion: form.idUbicacion,
                distrito: form.distrito,
                provincia: form.provincia,
                calle: form.calle,
                referencia: form.referencia
            };

            if (ubicacionId) {
                await updateUbicacion(ubicacionId, ubicPayload);
            } else {
                const resUbic = await createUbicacion(ubicPayload);
                ubicacionId = resUbic.data.idUbicacion;
            }

            // Step 2: Save PlanificacionServicio
            const formattedTime = form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio;
            
            const planPayload = {
                idPlanificacionServicio: editingId,
                fechaProgramada: `${form.fechaProgramada}T00:00:00`,
                horaInicio: formattedTime,
                estadoPlan: form.estadoPlan,
                ubicacion: { idUbicacion: ubicacionId },
                ordenServicio: { idOrdenServicio: parseInt(form.idOrdenServicio) }
            };

            let planId = editingId;
            if (editingId) {
                await updatePlanificacion(editingId, planPayload);
                
                // Clear previous tech assignments
                const resTP = await getTecnicoPlanificaciones();
                const assignments = resTP.data.filter(tp => tp.planificacionServicio?.idPlanificacionServicio === editingId);
                for (const a of assignments) {
                    await deleteTecnicoPlanificacion(a.idTecnicoPlanificacion);
                }
            } else {
                const resPlan = await createPlanificacion(planPayload);
                planId = resPlan.data.idPlanificacionServicio;
            }

            // Step 3: Save new tech assignments
            for (let i = 0; i < selectedTecnicos.length; i++) {
                const techId = selectedTecnicos[i];
                const assignmentPayload = {
                    rol: i === 0 ? 'LIDER' : 'ASISTENTE',
                    planificacionServicio: { idPlanificacionServicio: planId },
                    tecnico: { idTecnico: techId }
                };
                await createTecnicoPlanificacion(assignmentPayload);
            }

            alert(editingId ? "Planificación actualizada exitosamente" : "Planificación creada exitosamente");
            setView('list');
        } catch (error) {
            console.error("Error al guardar planificación", error);
            alert("Ocurrió un error al guardar la planificación. Revise si la orden ya tiene otra planificación.");
        }
    };

    const handleOpenDetails = async (plan) => {
        setSelectedPlan(plan);
        setSelectedPlanTechs([]);
        setShowDetailsModal(true);
        try {
            const res = await getTecnicoPlanificaciones();
            const assignments = res.data.filter(tp => tp.planificacionServicio?.idPlanificacionServicio === plan.idPlanificacionServicio);
            setSelectedPlanTechs(assignments);
        } catch (error) {
            console.error("Error loading assignments for details modal", error);
        }
    };

    const distritosList = [...new Set(planificaciones.map(p => p.ubicacion?.distrito).filter(Boolean))];

    const filteredPlanificaciones = planificaciones.filter(p => {
        const clientName = (p.ordenServicio?.solicitudServicio?.cliente?.razonSocial || '').toLowerCase();
        const locationDist = (p.ubicacion?.distrito || '').toLowerCase();
        const locationCalle = (p.ubicacion?.calle || '').toLowerCase();
        const planId = formatPlan(p.idPlanificacionServicio).toLowerCase();
        
        const matchesSearch = clientName.includes(searchQuery.toLowerCase()) ||
                              locationDist.includes(searchQuery.toLowerCase()) ||
                              locationCalle.includes(searchQuery.toLowerCase()) ||
                              planId.includes(searchQuery.toLowerCase());
                              
        const matchesStatus = statusFilter === 'ALL' || p.estadoPlan === statusFilter;
        
        // Date range
        const planDateStr = p.fechaProgramada ? p.fechaProgramada.split('T')[0] : '';
        const matchesStartDate = !startDateFilter || planDateStr >= startDateFilter;
        const matchesEndDate = !endDateFilter || planDateStr <= endDateFilter;

        // District filter
        const matchesDistrict = districtFilter === 'ALL' || (p.ubicacion?.distrito === districtFilter);
        
        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesDistrict;
    });

    const itemsPerPage = 15;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPlanificaciones = filteredPlanificaciones.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPlanificaciones.length / itemsPerPage);

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setStartDateFilter('');
        setEndDateFilter('');
        setDistrictFilter('ALL');
    };

    const getFilteredTecnicos = () => {
        if (!form.idOrdenServicio) {
            return tecnicos;
        }
        const selectedOrderObj = ordenes.find(o => o.idOrdenServicio.toString() === form.idOrdenServicio.toString());
        const serviceNames = selectedOrderObj?.detalles?.map(d => d.tipoServicio?.nombreServicio).filter(Boolean) || [];
        
        if (serviceNames.length === 0) {
            return tecnicos;
        }

        const isSimilar = (specName, srvNames) => {
            if (!specName) return false;
            const spec = specName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return srvNames.some(srvName => {
                const srv = srvName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                // 1. Insectos/Desinsectacion
                if (spec.includes("insecto") && (srv.includes("insect") || srv.includes("termit") || srv.includes("plaga") || srv.includes("polilla") || srv.includes("murcielago"))) return true;
                
                // 2. Roedores/Desratizacion
                if (spec.includes("roedor") && (srv.includes("roedor") || srv.includes("rat") || srv.includes("plaga") || srv.includes("ave") || srv.includes("murcielago"))) return true;
                
                // 3. Desinfeccion/Sanitizacion
                if (spec.includes("desinfecc") && (srv.includes("desinfecc") || srv.includes("sanitiz") || srv.includes("agua") || srv.includes("pozo") || srv.includes("trampa"))) return true;
                
                // 4. Altura
                if (spec.includes("altura") && (srv.includes("altura") || srv.includes("alta") || srv.includes("techo") || srv.includes("fachada") || srv.includes("ducto"))) return true;
                
                // 5. Sustancias Quimicas / Manejo
                if (spec.includes("quimic") && (srv.includes("quimic") || srv.includes("fumig") || srv.includes("grano") || srv.includes("madera") || srv.includes("contenedor"))) return true;

                // 6. General / Operaciones / General specialty
                if (spec.includes("general") || spec.includes("operaciones") || spec === "general") return true;

                // Basic word match
                const specWords = spec.split(/\s+/).filter(w => w.length > 3);
                const srvWords = srv.split(/\s+/).filter(w => w.length > 3);
                return specWords.some(sw => srvWords.some(rw => rw.includes(sw) || sw.includes(rw)));
            });
        };

        return tecnicos.filter(t => isSimilar(t.especialidad?.nombreEspec, serviceNames));
    };

    const filteredTecnicos = getFilteredTecnicos();

    return (
        <div className="planificacion-page">
            <div className="breadcrumb">OPERATIVO / PLANIFICACIÓN</div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Planificación de Servicios</h1>
                    <p className="page-subtitle">Calendariza las visitas técnicas y asigna los equipos de técnicos a cada servicio.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-nuevo" onClick={handleNew}>
                        <MdAdd size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Programar Servicio
                    </button>
                </div>
            </div>

            {view === 'list' ? (
                <>
                    <div className="filters-bar">
                        <div className="filter-group search">
                            <span className="filter-label">Buscar Planificación</span>
                            <input 
                                type="text" 
                                className="filter-input" 
                                placeholder="Buscar por cliente, distrito o calle..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Distrito</span>
                            <select 
                                className="filter-select" 
                                value={districtFilter}
                                onChange={(e) => setDistrictFilter(e.target.value)}
                            >
                                <option value="ALL">Todos los distritos</option>
                                {distritosList.map((dist, idx) => (
                                    <option key={idx} value={dist}>{dist}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Estado</span>
                            <select 
                                className="filter-select" 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Todos los estados</option>
                                <option value="PROGRAMADO">PROGRAMADO</option>
                                <option value="EJECUTADO">EJECUTADO</option>
                                <option value="CANCELADO">CANCELADO</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Desde</span>
                            <input 
                                type="date" 
                                className="filter-input" 
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Hasta</span>
                            <input 
                                type="date" 
                                className="filter-input" 
                                value={endDateFilter}
                                onChange={(e) => setEndDateFilter(e.target.value)}
                            />
                        </div>
                        {(searchQuery || statusFilter !== 'ALL' || startDateFilter || endDateFilter || districtFilter !== 'ALL') && (
                            <div className="filter-group action">
                                <button className="btn-filter-clear" onClick={handleClearFilters}>
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="table-container">
                        <table className="planificaciones-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th>ID Plan</th>
                                    <th>Orden Servicio</th>
                                    <th>Fecha Programada</th>
                                    <th>Hora Inicio</th>
                                    <th>Ubicación</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                                ) : filteredPlanificaciones.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center' }}>No se encontraron planificaciones con los filtros aplicados.</td></tr>
                                ) : (
                                    currentPlanificaciones.map(p => {
                                        const canEditDelete = p.estadoPlan === 'PROGRAMADO';
                                        return (
                                            <tr key={p.idPlanificacionServicio}>
                                                <td style={{ fontWeight: '600' }}>{formatPlan(p.idPlanificacionServicio)}</td>
                                                <td>{p.ordenServicio ? formatOS(p.ordenServicio.idOrdenServicio) : '-'}</td>
                                                <td>{p.fechaProgramada ? p.fechaProgramada.split('T')[0] : '-'}</td>
                                                <td>{p.horaInicio || '-'}</td>
                                                <td>{p.ubicacion ? `${p.ubicacion.calle}, ${p.ubicacion.distrito}` : '-'}</td>
                                                <td>
                                                    <span className={`status-badge status-${p.estadoPlan?.toLowerCase()}`}>
                                                        {p.estadoPlan}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn-table-details" onClick={() => handleOpenDetails(p)} style={{ marginRight: '8px' }}>
                                                        <MdVisibility size={14} style={{ marginRight: '4px' }} /> Ver
                                                    </button>
                                                    {canEditDelete && (
                                                        <>
                                                            <button className="btn-table-edit" onClick={() => handleEdit(p)} style={{ marginRight: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Editar</button>
                                                            <button className="btn-table-delete" onClick={() => handleDelete(p.idPlanificacionServicio)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Eliminar</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-bar">
                            <button 
                                disabled={currentPage === 1} 
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="pagination-btn"
                            >
                                Anterior
                            </button>
                            <span className="pagination-info">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button 
                                disabled={currentPage === totalPages} 
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="pagination-btn"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="form-container">
                    <div className="header-actions" style={{ marginBottom: '20px', justifyContent: 'flex-end' }}>
                        <button className="btn-cancelar" onClick={() => setView('list')}>
                            <MdArrowBack size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Volver
                        </button>
                        <button className="btn-guardar" onClick={handleSave} style={{ background: '#003b5c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <MdSave size={18} /> Guardar Planificación
                        </button>
                    </div>

                    <div className="form-card">
                        <div className="card-badge">DATOS GENERALES</div>
                        <div className="card-header">
                            <MdEvent size={22} className="card-icon" />
                            <h2>Programación de Fecha y Hora</h2>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Orden de Servicio <span style={{color: 'red'}}>*</span></label>
                                <select 
                                    className={formErrors.idOrdenServicio ? 'input-error' : ''} 
                                    name="idOrdenServicio" 
                                    value={form.idOrdenServicio} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="">-- Seleccionar Orden --</option>
                                    {ordenes.map(os => (
                                        <option key={os.idOrdenServicio} value={os.idOrdenServicio}>
                                            {formatOS(os.idOrdenServicio)} - {os.solicitudServicio?.cliente?.razonSocial || 'Cliente'}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.idOrdenServicio && <span className="error-message">{formErrors.idOrdenServicio}</span>}
                            </div>
                            <div className="form-group">
                                <label>Fecha Programada <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="date" 
                                    className={formErrors.fechaProgramada ? 'input-error' : ''} 
                                    name="fechaProgramada" 
                                    value={form.fechaProgramada} 
                                    onChange={handleChange} 
                                    required 
                                />
                                {formErrors.fechaProgramada && <span className="error-message">{formErrors.fechaProgramada}</span>}
                            </div>
                            <div className="form-group">
                                <label>Hora de Inicio <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="time" 
                                    className={formErrors.horaInicio ? 'input-error' : ''} 
                                    name="horaInicio" 
                                    value={form.horaInicio} 
                                    onChange={handleChange} 
                                    required 
                                />
                                {formErrors.horaInicio && <span className="error-message">{formErrors.horaInicio}</span>}
                            </div>
                            <div className="form-group">
                                <label>Estado</label>
                                <input 
                                    type="text" 
                                    name="estadoPlan" 
                                    readOnly 
                                    value={form.estadoPlan} 
                                    style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-card">
                        <div className="card-badge">UBICACIÓN</div>
                        <div className="card-header">
                            <MdLocationOn size={22} className="card-icon" />
                            <h2>Dirección del Servicio</h2>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Calle / Avenida / Jr. <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="text" 
                                    className={formErrors.calle ? 'input-error' : ''} 
                                    name="calle" 
                                    value={form.calle} 
                                    onChange={handleChange} 
                                    placeholder="Ej: Av. Arenales 456" 
                                    required 
                                />
                                {formErrors.calle && <span className="error-message">{formErrors.calle}</span>}
                            </div>
                            <div className="form-group">
                                <label>Distrito <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="text" 
                                    className={formErrors.distrito ? 'input-error' : ''} 
                                    name="distrito" 
                                    value={form.distrito} 
                                    onChange={handleChange} 
                                    placeholder="Ej: Miraflores" 
                                    required 
                                />
                                {formErrors.distrito && <span className="error-message">{formErrors.distrito}</span>}
                            </div>
                            <div className="form-group">
                                <label>Provincia <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="text" 
                                    className={formErrors.provincia ? 'input-error' : ''} 
                                    name="provincia" 
                                    value={form.provincia} 
                                    onChange={handleChange} 
                                    placeholder="Ej: Lima" 
                                    required 
                                />
                                {formErrors.provincia && <span className="error-message">{formErrors.provincia}</span>}
                            </div>
                            <div className="form-group">
                                <label>Referencia</label>
                                <input 
                                    type="text" 
                                    className={formErrors.referencia ? 'input-error' : ''} 
                                    name="referencia" 
                                    value={form.referencia} 
                                    onChange={handleChange} 
                                    placeholder="Ej: Frente al parque central" 
                                />
                                {formErrors.referencia && <span className="error-message">{formErrors.referencia}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-card">
                        <div className="card-badge">TECNICOS</div>
                        <div className="card-header">
                            <MdPeople size={22} className="card-icon" />
                            <h2>Asignación de Técnicos <span style={{color: 'red'}}>*</span> (El primero seleccionado será LÍDER, los demás ASISTENTES)</h2>
                        </div>
                        {formErrors.tecnicos && <span className="error-message" style={{ display: 'block', marginBottom: '15px' }}>{formErrors.tecnicos}</span>}
                        <div className="technicians-grid">
                            {filteredTecnicos.length === 0 ? (
                                <p style={{ fontSize: '14px', color: '#64748b' }}>
                                    {form.idOrdenServicio 
                                        ? "No hay técnicos activos con especialidad afín a los servicios de esta orden." 
                                        : "No hay técnicos disponibles. Registre algunos en la sección Técnicos primero."}
                                </p>
                            ) : (
                                filteredTecnicos.map(t => (
                                    <label key={t.idTecnico} className="tech-checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTecnicos.includes(t.idTecnico)}
                                            onChange={() => handleTechCheckboxChange(t.idTecnico)} 
                                        />
                                        <span className="tech-name">{t.nombreTec} {t.apellidoTec}</span>
                                        <span className="tech-speciality">({t.especialidad?.nombreEspec || 'General'})</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedPlan && (
                <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '550px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Detalles de Planificación: {formatPlan(selectedPlan.idPlanificacionServicio)}</h2>
                            <button className="btn-close" onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <MdClose size={22} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div><strong>Orden de Servicio:</strong> {selectedPlan.ordenServicio ? formatOS(selectedPlan.ordenServicio.idOrdenServicio) : '-'}</div>
                                <div><strong>Cliente:</strong> {selectedPlan.ordenServicio?.solicitudServicio?.cliente?.razonSocial || 'Desconocido'}</div>
                                <div><strong>Fecha Programada:</strong> {selectedPlan.fechaProgramada?.split('T')[0]}</div>
                                <div><strong>Hora Inicio:</strong> {selectedPlan.horaInicio}</div>
                                <div><strong>Estado Planificación:</strong> <span style={{ fontWeight: 'bold' }}>{selectedPlan.estadoPlan}</span></div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                                <strong>Ubicación Geográfica:</strong>
                                <div style={{ marginTop: '6px' }}>{selectedPlan.ubicacion ? `${selectedPlan.ubicacion.calle}, ${selectedPlan.ubicacion.distrito}, ${selectedPlan.ubicacion.provincia}` : 'No registrada'}</div>
                                {selectedPlan.ubicacion?.referencia && <div style={{ fontSize: '12px', color: '#64748b' }}>Referencia: {selectedPlan.ubicacion.referencia}</div>}
                            </div>
                            <div>
                                <strong>Equipo Técnico Asignado:</strong>
                                {selectedPlanTechs.length === 0 ? (
                                    <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '6px' }}>No hay técnicos asignados.</div>
                                ) : (
                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {selectedPlanTechs.map((tp, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: '4px' }}>
                                                <span>{tp.tecnico?.nombreTec} {tp.tecnico?.apellidoTec}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: tp.rol === 'LIDER' ? '#0f766e' : '#64748b', background: tp.rol === 'LIDER' ? '#ccfbf1' : '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                                                    {tp.rol}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planificacion;
