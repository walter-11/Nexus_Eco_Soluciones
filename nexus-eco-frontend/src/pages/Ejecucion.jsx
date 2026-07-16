import React, { useState, useEffect, useRef } from 'react';
import { 
    MdClose, MdSave, MdCloudUpload, MdImage, MdPictureAsPdf, 
    MdVisibility, MdArrowBack, MdDownload 
} from 'react-icons/md';
import { 
    getPlanificaciones, getEjecuciones, createEjecucion, 
    updateEjecucion, uploadMultipleEvidencias 
} from '../api/api';
import './Ejecucion.css';

const formatPlan = (id) => `PLAN-2026-${String(id).padStart(4, '0')}`;
const formatOS = (id) => `OS-2026-${String(id).padStart(4, '0')}`;

const Ejecucion = () => {
    const [view, setView] = useState('list'); // 'list', 'form'
    const [planificaciones, setPlanificaciones] = useState([]);
    const [executions, setExecutions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [resultFilter, setResultFilter] = useState('ALL');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, resultFilter, startDateFilter, endDateFilter]);
    
    // Selected Context
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [editingId, setEditingId] = useState(null);

    // Form fields
    const [form, setForm] = useState({
        fechaEjecucion: new Date().toISOString().split('T')[0],
        resultado: 'Exitoso',
        observacionesEj: '',
        mongoDocId: null,
        archivoSubido: null
    });
    
    // Details modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [detailedExecution, setDetailedExecution] = useState(null);
    const [detailedPlan, setDetailedPlan] = useState(null);

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [formErrors, setFormErrors] = useState({});
    const [selectedFiles, setSelectedFiles] = useState([]);

    useEffect(() => {
        if (view === 'list') {
            fetchData();
        }
    }, [view]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resPlans, resExecs] = await Promise.all([
                getPlanificaciones(),
                getEjecuciones()
            ]);
            const sortedPlans = [...resPlans.data].sort((a, b) => b.idPlanificacionServicio - a.idPlanificacionServicio);
            const sortedExecs = [...resExecs.data].sort((a, b) => b.idEjecucionServicio - a.idEjecucionServicio);
            setPlanificaciones(sortedPlans);
            setExecutions(sortedExecs);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (plan, exec = null) => {
        setSelectedPlan(plan);
        if (exec) {
            setEditingId(exec.idEjecucionService || exec.idEjecucionServicio);
            setForm({
                fechaEjecucion: exec.fechaEjecucion ? exec.fechaEjecucion.split('T')[0] : new Date().toISOString().split('T')[0],
                resultado: exec.resultado || 'Exitoso',
                observacionesEj: exec.observacionesEj || '',
                mongoDocId: exec.mongoDocId || null,
                archivoSubido: exec.mongoDocId ? 'Evidencia guardada en MongoDB' : null
            });
        } else {
            setEditingId(null);
            setForm({
                fechaEjecucion: new Date().toISOString().split('T')[0],
                resultado: 'Exitoso',
                observacionesEj: '',
                mongoDocId: null,
                archivoSubido: null
            });
        }
        setSelectedFiles([]);
        setFormErrors({});
        setView('form');
    };

    const handleFileChange = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setSelectedFiles(prev => [...prev, ...Array.from(files)]);
        setFormErrors(prev => ({ ...prev, mongoDocId: null }));
    };

    const handleGuardarEjecucion = async () => {
        const errors = {};
        if (!form.fechaEjecucion) {
            errors.fechaEjecucion = "Debe ingresar la fecha de ejecución.";
        }
        if (!form.resultado) {
            errors.resultado = "Debe registrar el resultado del servicio.";
        }
        if (!form.observacionesEj || !form.observacionesEj.trim()) {
            alert("Las observaciones de la ejecución son obligatorias.");
            return;
        }
        if (/[<>]/.test(form.observacionesEj)) {
            alert("Las observaciones no pueden contener caracteres HTML (< o >).");
            return;
        }
        if (!form.mongoDocId && selectedFiles.length === 0) {
            alert("Debe seleccionar al menos un archivo de evidencia (PDF o imagen) antes de guardar el registro.");
            return;
        }

        setUploading(true);
        let finalMongoDocId = form.mongoDocId;

        try {
            if (selectedFiles.length > 0) {
                const res = await uploadMultipleEvidencias(selectedFiles);
                finalMongoDocId = res.data.mongo_doc_id;
            }

            const payload = {
                idEjecucionServicio: editingId,
                fechaEjecucion: `${form.fechaEjecucion}T00:00:00`,
                resultado: form.resultado,
                observacionesEj: form.observacionesEj,
                mongoDocId: finalMongoDocId,
                planificacionServicio: { idPlanificacionServicio: selectedPlan.idPlanificacionServicio }
            };

            if (editingId) {
                await updateEjecucion(editingId, payload);
                alert("Registro de ejecución guardado y evidencias comprimidas en MongoDB correctamente!");
            } else {
                await createEjecucion(payload);
                alert("Ejecución del servicio registrada y evidencias comprimidas en MongoDB correctamente!");
            }
            
            setView('list');
        } catch (error) {
            console.error("Error al guardar ejecución", error);
            alert("Ocurrió un error al guardar la ejecución en la base de datos.");
        } finally {
            setUploading(false);
        }
    };

    const handleOpenDetails = (plan, exec) => {
        setDetailedPlan(plan);
        setDetailedExecution(exec);
        setShowDetailsModal(true);
    };

    const handleDownloadEvidencias = (execId) => {
        if (!execId) return;
        window.open(`http://localhost:8080/api/ejecucion-servicios/${execId}/evidencias/download`, '_blank');
    };

    if (view === 'list') {
        const filteredPlanificaciones = planificaciones.filter(p => {
            const exec = executions.find(e => e.planificacionServicio?.idPlanificacionServicio === p.idPlanificacionServicio);
            const clientName = (p.ordenServicio?.solicitudServicio?.cliente?.razonSocial || '').toLowerCase();
            const planId = formatPlan(p.idPlanificacionServicio).toLowerCase();
            const osId = p.ordenServicio ? formatOS(p.ordenServicio.idOrdenServicio).toLowerCase() : '';
            
            const matchesSearch = clientName.includes(searchQuery.toLowerCase()) ||
                                  planId.includes(searchQuery.toLowerCase()) ||
                                  osId.includes(searchQuery.toLowerCase());
                                  
            let matchesStatus = true;
            if (statusFilter === 'PENDIENTE') {
                matchesStatus = !exec;
            } else if (statusFilter === 'EJECUTADO') {
                matchesStatus = !!exec;
            }
            
            let matchesResult = true;
            if (resultFilter !== 'ALL') {
                const execResNormal = (exec?.resultado || '').toUpperCase().replace(/_/g, ' ').trim();
                const filterResNormal = resultFilter.toUpperCase().replace(/_/g, ' ').trim();
                matchesResult = exec && execResNormal === filterResNormal;
            }

            // Date Range Filter on fechaProgramada
            const planDateStr = p.fechaProgramada ? p.fechaProgramada.split('T')[0] : '';
            const matchesStartDate = !startDateFilter || planDateStr >= startDateFilter;
            const matchesEndDate = !endDateFilter || planDateStr <= endDateFilter;
            
            return matchesSearch && matchesStatus && matchesResult && matchesStartDate && matchesEndDate;
        });

        const itemsPerPage = 15;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentPlanificaciones = filteredPlanificaciones.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredPlanificaciones.length / itemsPerPage);

        const handleClearFilters = () => {
            setSearchQuery('');
            setStatusFilter('ALL');
            setResultFilter('ALL');
            setStartDateFilter('');
            setEndDateFilter('');
        };

        return (
            <div className="ejecucion-page">
                <div className="breadcrumb">OPERATIVO / EJECUCIÓN</div>
                
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Ejecución de Servicios (Planificaciones)</h1>
                        <p className="page-subtitle">Visualiza la lista de visitas programadas, registra resultados y administra evidencias.</p>
                    </div>
                </div>

                <div className="filters-bar">
                    <div className="filter-group search">
                        <span className="filter-label">Buscar Planificación</span>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Buscar por cliente, PLAN o OS..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Estado Registro</span>
                        <select 
                            className="filter-select" 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Todos</option>
                            <option value="PENDIENTE">Pendientes de Registro</option>
                            <option value="EJECUTADO">Registrados (Ejecutados)</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Resultado</span>
                        <select 
                            className="filter-select" 
                            value={resultFilter}
                            onChange={(e) => setResultFilter(e.target.value)}
                        >
                            <option value="ALL">Todos los Resultados</option>
                            <option value="Exitoso">Exitoso</option>
                            <option value="Con Observaciones">Con Observaciones</option>
                            <option value="No Exitoso">No Exitoso</option>
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
                    {(searchQuery || statusFilter !== 'ALL' || resultFilter !== 'ALL' || startDateFilter || endDateFilter) && (
                        <div className="filter-group action">
                            <button className="btn-filter-clear" onClick={handleClearFilters}>
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>

                <div className="table-container" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                                <th style={{ padding: '16px' }}>PLAN / ORDEN</th>
                                <th style={{ padding: '16px' }}>FECHA PROGRAMADA</th>
                                <th style={{ padding: '16px' }}>CLIENTE</th>
                                <th style={{ padding: '16px' }}>ESTADO PLAN</th>
                                <th style={{ padding: '16px' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                            ) : filteredPlanificaciones.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron planificaciones con los filtros aplicados.</td></tr>
                            ) : (
                                currentPlanificaciones.map(p => {
                                        const exec = executions.find(e => e.planificacionServicio?.idPlanificacionServicio === p.idPlanificacionServicio);
                                        const execId = exec ? (exec.idEjecucionService || exec.idEjecucionServicio) : null;
                                        
                                        return (
                                            <tr key={p.idPlanificacionServicio} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{formatPlan(p.idPlanificacionServicio)}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{p.ordenServicio ? formatOS(p.ordenServicio.idOrdenServicio) : '-'}</div>
                                                </td>
                                                <td style={{ padding: '16px' }}>{p.fechaProgramada ? p.fechaProgramada.split('T')[0] : '-'}</td>
                                                <td style={{ padding: '16px' }}>{p.ordenServicio?.solicitudServicio?.cliente?.razonSocial || 'Desconocido'}</td>
                                                <td style={{ padding: '16px' }}>
                                                    <span className={`status-badge status-${p.estadoPlan?.toLowerCase()}`}>
                                                        {p.estadoPlan}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    {exec ? (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button 
                                                                className="btn-table-details"
                                                                onClick={() => handleOpenDetails(p, exec)}
                                                                style={{ padding: '6px 12px', fontSize: '12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            >
                                                                <MdVisibility size={14} /> Ver
                                                            </button>
                                                            <button 
                                                                className="btn-table-edit"
                                                                onClick={() => handleSelectPlan(p, exec)}
                                                                style={{ padding: '6px 12px', fontSize: '12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer', borderRadius: '4px' }}
                                                            >
                                                                Editar Registro
                                                            </button>
                                                            <button 
                                                                className="btn-download"
                                                                onClick={() => handleDownloadEvidencias(execId)}
                                                                style={{ padding: '6px 12px', fontSize: '12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                title="Descargar Evidencias (.ZIP)"
                                                            >
                                                                <MdDownload size={14} /> Evidencias
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            className="btn-outline" 
                                                            style={{ padding: '6px 12px', fontSize: '12px', background: '#003b5c', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                                                            onClick={() => handleSelectPlan(p, null)}
                                                        >
                                                            Registrar Ejecución
                                                        </button>
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

                {/* Details Modal */}
                {showDetailsModal && detailedPlan && detailedExecution && (
                    <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000 }}>
                        <div className="modal-content" style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '550px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Detalles de Ejecución: {formatPlan(detailedPlan.idPlanificacionServicio)}</h2>
                                <button className="btn-close" onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                    <MdClose size={22} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div><strong>Planificación:</strong> {formatPlan(detailedPlan.idPlanificacionServicio)}</div>
                                    <div><strong>Orden de Servicio:</strong> {detailedPlan.ordenServicio ? formatOS(detailedPlan.ordenServicio.idOrdenServicio) : '-'}</div>
                                    <div><strong>Cliente:</strong> {detailedPlan.ordenServicio?.solicitudServicio?.cliente?.razonSocial || 'Desconocido'}</div>
                                    <div><strong>Ubicación:</strong> {detailedPlan.ubicacion ? `${detailedPlan.ubicacion.calle}, ${detailedPlan.ubicacion.distrito}` : '-'}</div>
                                    <div><strong>Fecha Ejecución:</strong> {detailedExecution.fechaEjecucion?.split('T')[0]}</div>
                                    <div><strong>Resultado de Servicio:</strong> <span style={{ fontWeight: 'bold', color: (detailedExecution.resultado || '').toUpperCase().replace(/_/g, ' ').trim() === 'EXITOSO' ? '#10b981' : ((detailedExecution.resultado || '').toUpperCase().replace(/_/g, ' ').trim() === 'CON OBSERVACIONES' ? '#f59e0b' : '#ef4444') }}>{detailedExecution.resultado}</span></div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                                    <strong>Observaciones de Ejecución:</strong>
                                    <p style={{ fontStyle: 'italic', margin: '4px 0 0 0' }}>{detailedExecution.observacionesEj || 'Sin observaciones registradas.'}</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '12px', borderRadius: '4px' }}>
                                    <div>
                                        <strong>Documentos Adjuntos (GridFS):</strong>
                                        <div style={{ fontSize: '12px', color: '#2563eb' }}>{detailedExecution.mongoDocId ? 'Evidencias subidas correctamente.' : 'Sin archivos adjuntos.'}</div>
                                    </div>
                                    {detailedExecution.mongoDocId && (
                                        <button 
                                            onClick={() => handleDownloadEvidencias(detailedExecution.idEjecucionService || detailedExecution.idEjecucionServicio)}
                                            style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <MdDownload size={14} /> Descargar ZIP
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="ejecucion-page">
            <div className="breadcrumb">OPERATIVO / EJECUCIÓN</div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{editingId ? 'Editar Ejecución' : 'Registrar Ejecución'}</h1>
                    <p className="page-subtitle">Suba archivos de evidencia firmados y detalle las observaciones encontradas.</p>
                    <button className="btn-cancelar" style={{ marginTop: '10px' }} onClick={() => setView('list')}>
                        <MdArrowBack size={16} /> Volver
                    </button>
                </div>
                <div className="header-actions">
                    <button className="btn-guardar" onClick={handleGuardarEjecucion} style={{ background: '#003b5c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <MdSave size={16} /> Guardar Registro
                    </button>
                </div>
            </div>

            <div className="top-layout">
                <div className="form-card">
                    <h2 className="card-title">Detalles de la ejecución</h2>
                    
                    <div className="form-group mb-16">
                        <label>Planificación Asociada (Referencia)</label>
                        <input type="text" readOnly value={`${formatPlan(selectedPlan?.idPlanificacionServicio)} - ${selectedPlan?.ordenServicio?.solicitudServicio?.cliente?.razonSocial || 'Cliente'}`} style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }} />
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Fecha de ejecución <span style={{color: 'red'}}>*</span></label>
                            <input 
                                type="date" 
                                className={formErrors.fechaEjecucion ? 'input-error' : ''}
                                value={form.fechaEjecucion} 
                                onChange={(e) => {
                                    setForm({...form, fechaEjecucion: e.target.value});
                                    setFormErrors(prev => ({ ...prev, fechaEjecucion: null }));
                                }} 
                            />
                            {formErrors.fechaEjecucion && <span className="error-message">{formErrors.fechaEjecucion}</span>}
                        </div>
                        <div className="form-group">
                            <label>Resultado <span style={{color: 'red'}}>*</span></label>
                            <select 
                                className={formErrors.resultado ? 'input-error' : ''}
                                value={form.resultado} 
                                onChange={(e) => {
                                    setForm({...form, resultado: e.target.value});
                                    setFormErrors(prev => ({ ...prev, resultado: null }));
                                }}
                            >
                                <option value="Exitoso">Exitoso</option>
                                <option value="Con Observaciones">Con Observaciones</option>
                                <option value="No Exitoso">No Exitoso</option>
                            </select>
                            {formErrors.resultado && <span className="error-message">{formErrors.resultado}</span>}
                        </div>
                    </div>

                    <div className="form-group mt-16">
                        <label>Observaciones del técnico <span style={{color: 'red'}}>*</span></label>
                        <textarea 
                            className={formErrors.observacionesEj ? 'input-error' : ''}
                            placeholder="Describa cualquier incidencia o detalle relevante durante la ejecución..."
                            rows="4"
                            value={form.observacionesEj}
                            onChange={(e) => {
                                setForm({...form, observacionesEj: e.target.value});
                                setFormErrors(prev => ({ ...prev, observacionesEj: null }));
                            }}
                        ></textarea>
                        {formErrors.observacionesEj && <span className="error-message">{formErrors.observacionesEj}</span>}
                    </div>
                </div>

                <div className="upload-card" style={{ border: formErrors.mongoDocId ? '1px solid #ef4444' : '1px dashed #cbd5e1' }}>
                    <div className="upload-header">
                        <h2 className="card-title inline-title">Evidencias del servicio <span style={{color: 'red'}}>*</span></h2>
                        <p className="upload-subtitle">Sube tu hoja de servicio firmada o fotos del campo a MongoDB.</p>
                        {formErrors.mongoDocId && <span className="error-message" style={{ display: 'block', marginTop: '5px' }}>{formErrors.mongoDocId}</span>}
                    </div>

                    <div className="dropzone" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.png,.jpeg"
                            multiple
                        />
                        <MdCloudUpload size={32} className="dropzone-icon" />
                        <h3>{uploading ? 'Subiendo...' : 'Haz clic para seleccionar archivos'}</h3>
                        <p>JPG, PNG, PDF (Max 15MB por archivo)</p>
                        <button className="btn-subir" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} disabled={uploading}>
                            {uploading ? 'Procesando...' : 'Seleccionar archivos'}
                        </button>
                    </div>

                    <div className="evidence-list" style={{ marginTop: '16px' }}>
                        {form.archivoSubido && (
                            <div className="evidence-item" style={{ marginBottom: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '4px' }}>
                                <div className="evidence-icon-wrapper blue-light" style={{ background: '#dcfce7' }}>
                                    <MdPictureAsPdf size={20} style={{ color: '#15803d' }} />
                                </div>
                                <div className="evidence-info">
                                    <h4 style={{ color: '#15803d' }}>Evidencia Existente en MongoDB</h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{form.archivoSubido}</p>
                                    {selectedFiles.length > 0 && (
                                        <div style={{ color: '#ea580c', fontSize: '11px', fontWeight: 'bold', marginTop: '6px' }}>
                                            ⚠️ Nota: Estos archivos serán reemplazados por los nuevos seleccionados al guardar.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedFiles.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>Nuevos archivos seleccionados a subir:</h4>
                                {selectedFiles.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <MdImage size={18} style={{ color: '#64748b' }} />
                                            <span style={{ fontSize: '13px', color: '#334155', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                                {file.name}
                                            </span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                            title="Quitar archivo"
                                        >
                                            <MdClose size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!form.archivoSubido && selectedFiles.length === 0 && (
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, textAlign: 'center' }}>Ningún archivo seleccionado o subido aún.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Ejecucion;
