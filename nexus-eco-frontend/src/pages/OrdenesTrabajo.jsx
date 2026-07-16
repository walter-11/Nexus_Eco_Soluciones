import React, { useState, useEffect } from 'react';
import { MdListAlt, MdSave, MdAdd, MdArrowBack } from 'react-icons/md';
import { getOrdenesTrabajo, createOrdenTrabajo, updateOrdenTrabajo, deleteOrdenTrabajo, getOrdenes, getClientes } from '../api/api';
import './OrdenesTrabajo.css';

const formatOS = (id) => `OS-2026-${String(id).padStart(4, '0')}`;
const formatOT = (id) => `OT-2026-${String(id).padStart(4, '0')}`;

const OrdenesTrabajo = () => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [ordenesTrabajo, setOrdenesTrabajo] = useState([]);
    const [ordenesServicio, setOrdenesServicio] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [clientFilter, setClientFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, priorityFilter, statusFilter, clientFilter]);
    const [filterClientes, setFilterClientes] = useState([]);

    const [form, setForm] = useState({
        idOrdenServicio: '',
        descripcionOt: '',
        prioridad: 'MEDIA',
        estadoOt: 'PENDIENTE'
    });

    // Searchable dropdown states
    const [osSearch, setOsSearch] = useState('');
    const [showOSDropdown, setShowOSDropdown] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (view === 'list') {
            fetchOrdenesTrabajo();
            fetchFilterClientes();
        } else {
            fetchOrdenesServicio();
        }
    }, [view]);

    const fetchFilterClientes = async () => {
        try {
            const response = await getClientes();
            setFilterClientes(response.data);
        } catch (error) {
            console.error("Error fetching filter clients", error);
        }
    };

    const fetchOrdenesTrabajo = async () => {
        try {
            setLoading(true);
            const response = await getOrdenesTrabajo();
            const sortedData = [...response.data].sort((a, b) => b.idOrdenTrabajo - a.idOrdenTrabajo);
            setOrdenesTrabajo(sortedData);
        } catch (error) {
            console.error("Error al obtener órdenes de trabajo", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdenesServicio = async () => {
        try {
            const response = await getOrdenes();
            // Sort OS descending (most recent first)
            const sortedOS = response.data.sort((a, b) => b.idOrdenServicio - a.idOrdenServicio);
            setOrdenesServicio(sortedOS);
            
            // Empty by default for new creations
            if (!editingId) {
                setForm(f => ({ ...f, idOrdenServicio: '' }));
                setOsSearch('');
            }
        } catch (error) {
            console.error("Error al obtener órdenes de servicio", error);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setFormErrors(prev => ({ ...prev, [e.target.name]: null }));
    };

    const handleNew = () => {
        setEditingId(null);
        setForm({
            idOrdenServicio: '',
            descripcionOt: '',
            prioridad: 'MEDIA',
            estadoOt: 'PENDIENTE'
        });
        setOsSearch('');
        setFormErrors({});
        setView('form');
    };

    const handleEdit = (ot) => {
        setEditingId(ot.idOrdenTrabajo);
        setForm({
            idOrdenServicio: ot.ordenServicio ? ot.ordenServicio.idOrdenServicio.toString() : '',
            descripcionOt: ot.descripcionOt || '',
            prioridad: ot.prioridad || 'MEDIA',
            estadoOt: ot.estadoOt || 'PENDIENTE'
        });
        if (ot.ordenServicio) {
            setOsSearch(`${formatOS(ot.ordenServicio.idOrdenServicio)} - ${ot.ordenServicio.solicitudServicio?.cliente?.razonSocial || 'Cliente'}`);
        } else {
            setOsSearch('');
        }
        setFormErrors({});
        setView('form');
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta orden de trabajo?")) {
            try {
                await deleteOrdenTrabajo(id);
                alert("Orden de trabajo eliminada exitosamente");
                fetchOrdenesTrabajo();
            } catch (error) {
                console.error("Error al eliminar orden de trabajo", error);
                alert("No se pudo eliminar la orden de trabajo. Verifique que no esté planificada.");
            }
        }
    };

    const handleSave = async () => {
        const errors = {};
        if (!form.idOrdenServicio) {
            errors.idOrdenServicio = "Debe seleccionar una Orden de Servicio Asociada.";
        }
        if (!form.descripcionOt || !form.descripcionOt.trim()) {
            errors.descripcionOt = "La descripción de la tarea de la OT es obligatoria.";
        }
        if (/[<>]/.test(form.descripcionOt || '')) {
            errors.descripcionOt = "La descripción no puede contener caracteres HTML (< o >).";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        const payload = {
            idOrdenTrabajo: editingId,
            descripcionOt: form.descripcionOt,
            prioridad: form.prioridad,
            estadoOt: form.estadoOt,
            ordenServicio: {
                idOrdenServicio: parseInt(form.idOrdenServicio)
            }
        };

        try {
            if (editingId) {
                await updateOrdenTrabajo(editingId, payload);
                alert("Orden de trabajo actualizada exitosamente");
            } else {
                await createOrdenTrabajo(payload);
                alert("Orden de trabajo guardada exitosamente");
            }
            setView('list');
        } catch (error) {
            console.error("Error al guardar orden de trabajo", error);
            alert("Ocurrió un error al guardar la orden de trabajo.");
        }
    };

    if (view === 'list') {
        const filteredOTs = ordenesTrabajo.filter(ot => {
            const matchesSearch = (ot.descripcionOt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  formatOT(ot.idOrdenTrabajo).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (ot.ordenServicio ? formatOS(ot.ordenServicio.idOrdenServicio).toLowerCase().includes(searchQuery.toLowerCase()) : false);
            const matchesPriority = priorityFilter === 'ALL' || ot.prioridad === priorityFilter;
            const matchesStatus = statusFilter === 'ALL' || ot.estadoOt === statusFilter;
            
            // Client filter
            const matchesClient = clientFilter === 'ALL' || (ot.ordenServicio?.solicitudServicio?.cliente?.idCliente?.toString() === clientFilter);

            return matchesSearch && matchesPriority && matchesStatus && matchesClient;
        });

        const itemsPerPage = 15;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentOTs = filteredOTs.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredOTs.length / itemsPerPage);

        const handleClearFilters = () => {
            setSearchQuery('');
            setPriorityFilter('ALL');
            setStatusFilter('ALL');
            setClientFilter('ALL');
        };

        return (
            <div className="ot-page">
                <div className="breadcrumb">OPERATIVO / ÓRDENES DE TRABAJO</div>
                
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Órdenes de Trabajo (OT)</h1>
                        <p className="page-subtitle">Genera y asigna las tareas operativas de saneamiento en base a los contratos y órdenes de servicio aprobadas.</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn-nuevo" onClick={handleNew}>
                            <MdAdd size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Nueva OT
                        </button>
                    </div>
                </div>

                <div className="filters-bar">
                    <div className="filter-group search">
                        <span className="filter-label">Buscar Orden de Trabajo</span>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Buscar por descripción, OT o OS..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Cliente</span>
                        <select 
                            className="filter-select" 
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                        >
                            <option value="ALL">Todos los clientes</option>
                            {filterClientes.map(c => (
                                <option key={c.idCliente} value={c.idCliente}>{c.razonSocial}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Prioridad</span>
                        <select 
                            className="filter-select" 
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="ALL">Todas las prioridades</option>
                            <option value="BAJA">BAJA</option>
                            <option value="MEDIA">MEDIA</option>
                            <option value="ALTA">ALTA</option>
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
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="EN_PROCESO">EN PROCESO</option>
                            <option value="COMPLETADO">COMPLETADO</option>
                        </select>
                    </div>
                    {(searchQuery || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || clientFilter !== 'ALL') && (
                        <div className="filter-group action">
                            <button className="btn-filter-clear" onClick={handleClearFilters}>
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </div>

                <div className="table-container">
                    <table className="ot-table">
                        <thead>
                            <tr>
                                <th>Código OT</th>
                                <th>Orden Servicio</th>
                                <th>Descripción</th>
                                <th>Prioridad</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                            ) : filteredOTs.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron órdenes de trabajo con los filtros aplicados.</td></tr>
                            ) : (
                                currentOTs.map(ot => (
                                    <tr key={ot.idOrdenTrabajo}>
                                        <td style={{ fontWeight: '600' }}>{formatOT(ot.idOrdenTrabajo)}</td>
                                        <td>{ot.ordenServicio ? formatOS(ot.ordenServicio.idOrdenServicio) : '-'}</td>
                                        <td>{ot.descripcionOt}</td>
                                        <td>
                                            <span className={`priority-badge priority-${ot.prioridad?.toLowerCase()}`}>
                                                {ot.prioridad}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${ot.estadoOt?.toLowerCase().replace('_', '')}`}>
                                                {ot.estadoOt}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-table-edit" onClick={() => handleEdit(ot)}>Editar</button>
                                            <button className="btn-table-delete" onClick={() => handleDelete(ot.idOrdenTrabajo)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))
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
            </div>
        );
    }

    return (
        <div className="ot-page">
            <div className="breadcrumb">OPERATIVO / DETALLE ORDEN DE TRABAJO</div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">{editingId ? 'Editar Orden de Trabajo' : 'Generar Orden de Trabajo'}</h1>
                    <p className="page-subtitle">Configure los detalles específicos para la realización de los trabajos contratados.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-cancelar" onClick={() => setView('list')}>
                        <MdArrowBack size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Volver
                    </button>
                    <button className="btn-guardar" onClick={handleSave}>
                        <MdSave size={18} /> Guardar Orden
                    </button>
                </div>
            </div>

            <div className="form-card">
                <div className="card-badge">ORDEN_TRABAJO</div>
                <div className="card-header">
                    <MdListAlt size={22} className="card-icon" />
                    <h2>Detalles de la Tarea</h2>
                </div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Orden de Servicio Asociada <span style={{color: 'red'}}>*</span></label>
                        <div className="searchable-dropdown-wrapper" style={{ position: 'relative' }}>
                            <input 
                                type="text"
                                className={formErrors.idOrdenServicio ? 'input-error' : ''}
                                placeholder="Escribe para buscar Orden de Servicio..."
                                value={osSearch}
                                onFocus={() => setShowOSDropdown(true)}
                                onChange={(e) => {
                                    setOsSearch(e.target.value);
                                    const matched = ordenesServicio.find(os => `${formatOS(os.idOrdenServicio)} - ${os.solicitudServicio?.cliente?.razonSocial || 'Cliente'}` === e.target.value);
                                    setForm(f => ({ ...f, idOrdenServicio: matched ? matched.idOrdenServicio.toString() : '' }));
                                    setFormErrors(prev => ({ ...prev, idOrdenServicio: null }));
                                }}
                                onBlur={() => {
                                    setTimeout(() => setShowOSDropdown(false), 200);
                                }}
                                required
                            />
                            {formErrors.idOrdenServicio && <span className="error-message">{formErrors.idOrdenServicio}</span>}
                            {showOSDropdown && (
                                <div className="dropdown-options-list">
                                    {ordenesServicio.filter(os => 
                                        `${formatOS(os.idOrdenServicio)} ${os.solicitudServicio?.cliente?.razonSocial || ''}`.toLowerCase().includes(osSearch.toLowerCase())
                                    ).map(os => (
                                        <div 
                                            key={os.idOrdenServicio}
                                            className="dropdown-option-item"
                                            onMouseDown={() => {
                                                const text = `${formatOS(os.idOrdenServicio)} - ${os.solicitudServicio?.cliente?.razonSocial || 'Cliente'}`;
                                                setOsSearch(text);
                                                setForm(f => ({ ...f, idOrdenServicio: os.idOrdenServicio.toString() }));
                                                setShowOSDropdown(false);
                                            }}
                                        >
                                            <div style={{ fontWeight: '500', color: '#1e293b' }}>{formatOS(os.idOrdenServicio)}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{os.solicitudServicio?.cliente?.razonSocial || 'Cliente'}</div>
                                        </div>
                                    ))}
                                    {ordenesServicio.filter(os => 
                                        `${formatOS(os.idOrdenServicio)} ${os.solicitudServicio?.cliente?.razonSocial || ''}`.toLowerCase().includes(osSearch.toLowerCase())
                                    ).length === 0 && (
                                        <div style={{ padding: '10px 12px', color: '#64748b', fontStyle: 'italic' }}>
                                            No se encontraron Órdenes de Servicio
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Prioridad</label>
                        <select name="prioridad" value={form.prioridad} onChange={handleChange}>
                            <option value="BAJA">BAJA</option>
                            <option value="MEDIA">MEDIA</option>
                            <option value="ALTA">ALTA</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Estado</label>
                        <input 
                            type="text" 
                            name="estadoOt" 
                            readOnly 
                            value={form.estadoOt} 
                            style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }} 
                        />
                    </div>
                    <div className="form-group full-width">
                        <label>Descripción de la Tarea <span style={{color: 'red'}}>*</span></label>
                        <textarea 
                            className={formErrors.descripcionOt ? 'input-error' : ''}
                            name="descripcionOt" 
                            value={form.descripcionOt} 
                            onChange={handleChange} 
                            placeholder="Detallar tareas a realizar..." 
                            rows="5" 
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical'
                            }} 
                            required 
                        />
                        {formErrors.descripcionOt && <span className="error-message">{formErrors.descripcionOt}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdenesTrabajo;
