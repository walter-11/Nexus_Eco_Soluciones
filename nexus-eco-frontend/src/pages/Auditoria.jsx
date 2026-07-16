import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MdOutlineChecklist, 
    MdWarningAmber, 
    MdCheckCircleOutline, 
    MdOutlinePictureAsPdf,
    MdFileDownload,
    MdPowerSettingsNew,
    MdStar,
    MdStarBorder,
    MdAddAlert,
    MdKeyboardArrowRight,
    MdHelpOutline,
    MdArrowBack,
    MdSearch,
    MdClose,
    MdSave,
    MdCloudUpload,
    MdVisibility,
    MdSubject
} from 'react-icons/md';
import { 
    getEjecuciones, getAuditorias, createAuditoria, updateAuditoria, deleteAuditoria,
    getIncidentes, createIncidente, updateIncidente, deleteIncidente, getEmpleados,
    getSeguimientosIncidente, createSeguimientoIncidente, updateSeguimientoIncidente, deleteSeguimientoIncidente,
    getInspecciones, createInspeccion, updateInspeccion, deleteInspeccion, uploadEvidencia, createInforme
} from '../api/api';
import './Auditoria.css';

const formatOS = (id) => `OS-2026-${String(id).padStart(4, '0')}`;

const Auditoria = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('list'); // 'list', 'detail'
    const [ejecuciones, setEjecuciones] = useState([]);
    const [selectedEjecucion, setSelectedEjecucion] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [resultFilter, setResultFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, resultFilter]);
    
    // Detail Data
    const [auditorias, setAuditorias] = useState([]);
    const [incidentes, setIncidentes] = useState([]);
    const [inspecciones, setInspecciones] = useState([]);
    const [seguimientos, setSeguimientos] = useState([]);
    const [empleados, setEmpleados] = useState([]);

    // Tab inside detail
    const [activeDetailTab, setActiveDetailTab] = useState('auditorias'); // 'auditorias', 'inspecciones'

    // Modal State
    const [showAuditoriaModal, setShowAuditoriaModal] = useState(false);
    const [editingAuditoriaId, setEditingAuditoriaId] = useState(null);
    
    const [showIncidenteModal, setShowIncidenteModal] = useState(false);
    const [editingIncidenteId, setEditingIncidenteId] = useState(null);

    const [showInspeccionModal, setShowInspeccionModal] = useState(false);
    const [editingInspeccionId, setEditingInspeccionId] = useState(null);

    const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
    const [selectedIncidente, setSelectedIncidente] = useState(null);
    const [editingSeguimientoId, setEditingSeguimientoId] = useState(null);

    // Form states
    const [newAuditoria, setNewAuditoria] = useState({ calificacion: 5, observacionesAud: '', idEmpleado: '' });
    const [newIncidente, setNewIncidente] = useState({ tipoIncidente: '', descripcionInc: '', gravedad: 'MEDIA', estadoInc: 'REPORTADO' });
    const [newInspeccion, setNewInspeccion] = useState({ areaInspeccionada: '', resultadoInsp: 'Aceptable', idAuditoria: '', mongoDocIdInsp: '', file: null });
    const [newSeguimiento, setNewSeguimiento] = useState({ accionTomada: '', estadoSeg: 'EN_PROCESO' });

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (view === 'list') {
            fetchEjecuciones();
        } else if (view === 'detail' && selectedEjecucion) {
            fetchDetailData();
        }
    }, [view, selectedEjecucion]);

    const fetchEjecuciones = async () => {
        setLoading(true);
        try {
            const res = await getEjecuciones();
            const sortedData = [...res.data].sort((a, b) => b.idEjecucionServicio - a.idEjecucionServicio);
            setEjecuciones(sortedData);
        } catch (error) {
            console.error("Error fetching ejecuciones", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetailData = async () => {
        try {
            const [audRes, incRes, empRes, inspRes, segRes] = await Promise.all([
                getAuditorias(),
                getIncidentes(),
                getEmpleados(),
                getInspecciones(),
                getSeguimientosIncidente()
            ]);
            
            // Filter by selected execution locally
            const filteredAuds = audRes.data.filter(a => a.ejecucionServicio?.idEjecucionServicio === selectedEjecucion.idEjecucionServicio);
            setAuditorias(filteredAuds);
            
            const filteredIncs = incRes.data.filter(i => i.ejecucionServicio?.idEjecucionServicio === selectedEjecucion.idEjecucionServicio);
            setIncidentes(filteredIncs);
            
            // Filter inspections linked to any of the filtered audits
            const audIds = filteredAuds.map(a => a.idAuditoria);
            setInspecciones(inspRes.data.filter(insp => insp.auditoria && audIds.includes(insp.auditoria.idAuditoria)));
            
            // Filter seguimientos linked to any of the filtered incidents
            const incIds = filteredIncs.map(i => i.idIncidente);
            setSeguimientos(segRes.data.filter(s => s.incidente && incIds.includes(s.incidente.idIncidente)));

            setEmpleados(empRes.data);
            
            if (empRes.data.length > 0 && !newAuditoria.idEmpleado) {
                setNewAuditoria(prev => ({ ...prev, idEmpleado: empRes.data[0].idEmpleado }));
            }
            if (filteredAuds.length > 0) {
                setNewInspeccion(prev => ({ ...prev, idAuditoria: filteredAuds[0].idAuditoria.toString() }));
            }
        } catch (error) {
            console.error("Error fetching detail data", error);
        }
    };

    const handleSelectEjecucion = (ejec) => {
        setSelectedEjecucion(ejec);
        setView('detail');
        setActiveDetailTab('auditorias');
    };

    // --- AUDITORIAS CRUD ---
    const handleOpenCreateAuditoria = () => {
        setEditingAuditoriaId(null);
        setNewAuditoria({ 
            calificacion: 5, 
            observacionesAud: '', 
            idEmpleado: empleados.length > 0 ? empleados[0].idEmpleado.toString() : '' 
        });
        setShowAuditoriaModal(true);
    };

    const handleOpenEditAuditoria = (aud) => {
        setEditingAuditoriaId(aud.idAuditoria);
        setNewAuditoria({
            calificacion: aud.calificacion || 5,
            observacionesAud: aud.observacionesAud || '',
            idEmpleado: aud.empleado ? aud.empleado.idEmpleado.toString() : (empleados[0]?.idEmpleado || '')
        });
        setShowAuditoriaModal(true);
    };

    const handleDeleteAuditoria = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta auditoría?")) {
            try {
                await deleteAuditoria(id);
                alert("Auditoría eliminada exitosamente");
                fetchDetailData();
            } catch (error) {
                console.error("Error al eliminar auditoría", error);
                alert("No se pudo eliminar la auditoría. Verifique si tiene inspecciones vinculadas.");
            }
        }
    };

    const handleSaveAuditoria = async () => {
        if (!newAuditoria.idEmpleado) {
            alert("Seleccione un empleado auditor.");
            return;
        }

        try {
            const payload = {
                idAuditoria: editingAuditoriaId,
                fechaAuditoria: new Date().toISOString(),
                calificacion: newAuditoria.calificacion,
                observacionesAud: newAuditoria.observacionesAud,
                ejecucionServicio: { idEjecucionServicio: selectedEjecucion.idEjecucionServicio },
                empleado: { idEmpleado: parseInt(newAuditoria.idEmpleado) }
            };

            if (editingAuditoriaId) {
                await updateAuditoria(editingAuditoriaId, payload);
                alert("Auditoría actualizada exitosamente!");
            } else {
                await createAuditoria(payload);
                alert("Auditoría registrada exitosamente!");
            }
            setShowAuditoriaModal(false);
            fetchDetailData();
        } catch (error) {
            console.error("Error saving auditoria", error);
            alert("Error al guardar la auditoría");
        }
    };

    // --- INCIDENTES CRUD ---
    const handleOpenCreateIncidente = () => {
        setEditingIncidenteId(null);
        setNewIncidente({ tipoIncidente: '', descripcionInc: '', gravedad: 'MEDIA', estadoInc: 'REPORTADO' });
        setShowIncidenteModal(true);
    };

    const handleOpenEditIncidente = (inc) => {
        setEditingIncidenteId(inc.idIncidente);
        setNewIncidente({
            tipoIncidente: inc.tipoIncidente || '',
            descripcionInc: inc.descripcionInc || '',
            gravedad: inc.gravedad || 'MEDIA',
            estadoInc: inc.estadoInc || 'REPORTADO'
        });
        setShowIncidenteModal(true);
    };

    const handleDeleteIncidente = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar este incidente?")) {
            try {
                await deleteIncidente(id);
                alert("Incidente eliminado exitosamente");
                fetchDetailData();
            } catch (error) {
                console.error("Error al eliminar incidente", error);
                alert("No se pudo eliminar el incidente. Verifique si tiene acciones de seguimiento.");
            }
        }
    };

    const handleSaveIncidente = async () => {
        if (!newIncidente.tipoIncidente || !newIncidente.descripcionInc) {
            alert("Tipo de Incidente y Descripción son obligatorios.");
            return;
        }

        try {
            const payload = {
                idIncidente: editingIncidenteId,
                tipoIncidente: newIncidente.tipoIncidente,
                descripcionInc: newIncidente.descripcionInc,
                gravedad: newIncidente.gravedad,
                estadoInc: newIncidente.estadoInc,
                ejecucionServicio: { idEjecucionServicio: selectedEjecucion.idEjecucionServicio }
            };

            if (editingIncidenteId) {
                await updateIncidente(editingIncidenteId, payload);
                alert("Incidente actualizado exitosamente!");
            } else {
                await createIncidente(payload);
                alert("Incidente registrado exitosamente!");
            }
            setShowIncidenteModal(false);
            fetchDetailData();
        } catch (error) {
            console.error("Error saving incidente", error);
            alert("Error al guardar el incidente");
        }
    };

    // --- INSPECCIONES CRUD ---
    const handleOpenCreateInspeccion = () => {
        if (auditorias.length === 0) {
            alert("Registre al menos una auditoría antes de realizar inspecciones.");
            return;
        }
        setEditingInspeccionId(null);
        setNewInspeccion({
            areaInspeccionada: '',
            resultadoInsp: 'Aceptable',
            idAuditoria: auditorias[0].idAuditoria.toString(),
            mongoDocIdInsp: '',
            file: null
        });
        setShowInspeccionModal(true);
    };

    const handleOpenEditInspeccion = (insp) => {
        setEditingInspeccionId(insp.idInspeccion);
        setNewInspeccion({
            areaInspeccionada: insp.areaInspeccionada || '',
            resultadoInsp: insp.resultadoInsp || 'Aceptable',
            idAuditoria: insp.auditoria ? insp.auditoria.idAuditoria.toString() : '',
            mongoDocIdInsp: insp.mongoDocIdInsp || '',
            file: null
        });
        setShowInspeccionModal(true);
    };

    const handleDeleteInspeccion = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta inspección?")) {
            try {
                await deleteInspeccion(id);
                alert("Inspección eliminada exitosamente");
                fetchDetailData();
            } catch (error) {
                console.error("Error al eliminar inspección", error);
                alert("No se pudo eliminar la inspección.");
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await uploadEvidencia(file);
            // Save the returned GridFS document ID
            setNewInspeccion(prev => ({ ...prev, mongoDocIdInsp: res.data.id }));
            alert("Evidencia fotográfica subida a MongoDB!");
        } catch (error) {
            console.error("Error al subir archivo", error);
            alert("Error al subir la evidencia a MongoDB.");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveInspeccion = async () => {
        if (!newInspeccion.areaInspeccionada || !newInspeccion.idAuditoria) {
            alert("Área Inspeccionada y Auditoría de Referencia son obligatorios.");
            return;
        }

        try {
            const payload = {
                idInspeccion: editingInspeccionId,
                areaInspeccionada: newInspeccion.areaInspeccionada,
                resultadoInsp: newInspeccion.resultadoInsp,
                mongoDocIdInsp: newInspeccion.mongoDocIdInsp,
                auditoria: { idAuditoria: parseInt(newInspeccion.idAuditoria) }
            };

            if (editingInspeccionId) {
                await updateInspeccion(editingInspeccionId, payload);
                alert("Inspección actualizada exitosamente!");
            } else {
                await createInspeccion(payload);
                alert("Inspección registrada exitosamente!");
            }
            setShowInspeccionModal(false);
            fetchDetailData();
        } catch (error) {
            console.error("Error al guardar inspección", error);
            alert("Error al guardar la inspección.");
        }
    };

    // --- SEGUIMIENTOS CRUD ---
    const handleOpenSeguimientoModal = (inc) => {
        setSelectedIncidente(inc);
        setEditingSeguimientoId(null);
        setNewSeguimiento({ accionTomada: '', estadoSeg: 'EN_PROCESO' });
        setShowSeguimientoModal(true);
    };

    const handleOpenEditSeguimiento = (seg) => {
        setEditingSeguimientoId(seg.idSeguimientoIncidente);
        setNewSeguimiento({
            accionTomada: seg.accionTomada || '',
            estadoSeg: seg.estadoSeg || 'EN_PROCESO'
        });
    };

    const handleDeleteSeguimiento = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta acción de seguimiento?")) {
            try {
                await deleteSeguimientoIncidente(id);
                alert("Seguimiento eliminado");
                fetchDetailData();
            } catch (error) {
                console.error("Error al eliminar seguimiento", error);
            }
        }
    };

    const handleSaveSeguimiento = async () => {
        if (!newSeguimiento.accionTomada) {
            alert("Describa la acción tomada.");
            return;
        }

        try {
            const payload = {
                idSeguimientoIncidente: editingSeguimientoId,
                fechaSeguimiento: new Date().toISOString(),
                accionTomada: newSeguimiento.accionTomada,
                estadoSeg: newSeguimiento.estadoSeg,
                incidente: { idIncidente: selectedIncidente.idIncidente }
            };

            if (editingSeguimientoId) {
                await updateSeguimientoIncidente(editingSeguimientoId, payload);
            } else {
                await createSeguimientoIncidente(payload);
            }

            // Also, update the main incident's status to match the tracking status
            const updatedInc = {
                ...selectedIncidente,
                estadoInc: newSeguimiento.estadoSeg === 'RESUELTO' ? 'RESUELTO' : 'EN_PROCESO'
            };
            await updateIncidente(selectedIncidente.idIncidente, updatedInc);

            alert("Bitácora de seguimiento guardada exitosamente!");
            setEditingSeguimientoId(null);
            setNewSeguimiento({ accionTomada: '', estadoSeg: 'EN_PROCESO' });
            fetchDetailData();
        } catch (error) {
            console.error("Error al guardar seguimiento", error);
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars.push(<MdStar key={i} className="star-filled" />);
            } else {
                stars.push(<MdStarBorder key={i} className="star-empty" />);
            }
        }
        return stars;
    };

    if (view === 'list') {
        const filteredEjecuciones = ejecuciones.filter(ej => {
            const clientName = (ej.planificacionServicio?.ordenServicio?.solicitudServicio?.cliente?.razonSocial || '').toLowerCase();
            const orderIdStr = formatOS(ej.planificacionServicio?.ordenServicio?.idOrdenServicio || ej.idEjecucionServicio).toLowerCase();
            
            const matchesSearch = clientName.includes(searchQuery.toLowerCase()) || orderIdStr.includes(searchQuery.toLowerCase());
            const ejResNormal = (ej.resultado || '').toUpperCase().replace(/_/g, ' ').trim();
            const filterResNormal = resultFilter.toUpperCase().replace(/_/g, ' ').trim();
            const matchesResult = resultFilter === 'ALL' || ejResNormal === filterResNormal;
            
            return matchesSearch && matchesResult;
        });

        const itemsPerPage = 15;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentEjecuciones = filteredEjecuciones.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredEjecuciones.length / itemsPerPage);

        const handleClearFilters = () => {
            setSearchQuery('');
            setResultFilter('ALL');
        };

        return (
            <div className="auditoria-page">
                <div className="breadcrumb">GESTIÓN / AUDITORÍAS</div>
                
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Seleccionar Ejecución de Servicio</h1>
                        <p className="page-subtitle">Seleccione una ejecución para auditar o reportar incidentes.</p>
                    </div>
                </div>

                <div className="filters-bar">
                    <div className="filter-group search">
                        <span className="filter-label">Buscar Ejecución</span>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Buscar por cliente u orden..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Resultado de Ejecución</span>
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
                    {(searchQuery || resultFilter !== 'ALL') && (
                        <div className="filter-group action">
                            <button className="btn-filter-clear" onClick={handleClearFilters}>
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </div>

                <div className="table-container">
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b'}}>
                                <th style={{padding: '16px'}}>ID ORDEN (EJECUCIÓN)</th>
                                <th style={{padding: '16px'}}>FECHA EJECUCIÓN</th>
                                <th style={{padding: '16px'}}>RESULTADO</th>
                                <th style={{padding: '16px'}}>CLIENTE</th>
                                <th style={{padding: '16px'}}>ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>Cargando...</td></tr>
                            ) : filteredEjecuciones.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No se encontraron ejecuciones con los filtros aplicados.</td></tr>
                            ) : (
                                currentEjecuciones.map(ej => (
                                    <tr key={ej.idEjecucionServicio} style={{borderBottom: '1px solid #f1f5f9'}}>
                                        <td style={{padding: '16px', fontWeight: 'bold'}}>{formatOS(ej.planificacionServicio?.ordenServicio?.idOrdenServicio || ej.idEjecucionServicio)}</td>
                                        <td style={{padding: '16px'}}>{new Date(ej.fechaEjecucion).toLocaleDateString()}</td>
                                        <td style={{padding: '16px'}}>
                                            {(() => {
                                                const resNormal = (ej.resultado || '').toUpperCase().replace(/_/g, ' ').trim();
                                                const isExitoso = resNormal === 'EXITOSO';
                                                const isObservaciones = resNormal === 'CON OBSERVACIONES';
                                                return (
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        textTransform: 'uppercase',
                                                        background: isExitoso ? '#dcfce7' : (isObservaciones ? '#fef3c7' : '#fee2e2'),
                                                        color: isExitoso ? '#15803d' : (isObservaciones ? '#b45309' : '#b91c1c')
                                                    }}>
                                                        {ej.resultado || 'N/A'}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td style={{padding: '16px'}}>{ej.planificacionServicio?.ordenServicio?.solicitudServicio?.cliente?.razonSocial || 'N/A'}</td>
                                        <td style={{padding: '16px'}}>
                                            <button 
                                                className="btn-table-edit"
                                                onClick={() => {
                                                    setSelectedEjecucion(ej);
                                                    setView('detail');
                                                }}
                                            >
                                                Auditar / Incidentes
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 1 && (
                    <div className="pagination-bar" style={{padding: '20px', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center'}}>
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

    const handleGenerarInforme = async () => {
        try {
            const payload = {
                fechaGeneracion: new Date().toISOString(),
                tipoInforme: 'FINAL_AUDITADO',
                estadoEnvio: 'PENDIENTE',
                ejecucionServicio: { idEjecucionServicio: selectedEjecucion.idEjecucionServicio }
            };
            await createInforme(payload);
            alert("¡Informe Final de Servicio generado con éxito!");
            navigate('/informes');
        } catch (error) {
            console.error("Error al generar informe", error);
            alert("Ocurrió un error al generar el informe.");
        }
    };

    return (
        <div className="auditoria-page">
            <div className="breadcrumb">
                SERVICIOS / <span className="breadcrumb-highlight">ORDEN_SERVICIO #{formatOS(selectedEjecucion?.planificacionServicio?.ordenServicio?.idOrdenServicio || selectedEjecucion?.idEjecucionServicio)}</span>
            </div>
            
            <div className="page-header">
                <div>
                    <h1 className="page-title">Auditoría y Calidad del Servicio</h1>
                    <button className="btn-outline" style={{marginTop: '10px'}} onClick={() => setView('list')}>
                        <MdArrowBack size={16} /> Volver a lista
                    </button>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {auditorias.length > 0 && (
                        <button 
                            className="btn-outline" 
                            onClick={handleGenerarInforme}
                            style={{ background: '#059669', color: 'white', border: 'none', fontWeight: 'bold' }}
                        >
                            Generar Informe Final
                        </button>
                    )}
                    <button className="btn-outline" onClick={handleOpenCreateAuditoria}>
                        <MdOutlineChecklist size={18} /> Registrar auditoría
                    </button>
                    <button className="btn-outline" onClick={handleOpenCreateIncidente}>
                        <MdWarningAmber size={18} /> Registrar incidente
                    </button>
                </div>
            </div>

            <div className="top-layout">
                <div className="left-column">
                    <div>
                        <div className="section-title">
                            <MdOutlineChecklist size={20} />
                            HISTORIAL DE AUDITORÍAS (TABLE: AUDITORIA)
                        </div>
                        <div className="table-card">
                            <table className="auditoria-table">
                                <thead>
                                    <tr>
                                        <th>EMPLEADO AUDITOR</th>
                                        <th>FECHA</th>
                                        <th>CALIFICACIÓN</th>
                                        <th>OBSERVACIONES</th>
                                        <th>ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditorias.length === 0 ? (
                                        <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No hay auditorías registradas</td></tr>
                                    ) : (
                                        auditorias.map(aud => (
                                            <tr key={aud.idAuditoria}>
                                                <td>
                                                    <div className="auditor-info">
                                                        <div className="avatar blue-bg">{aud.empleado?.nombreEmp?.charAt(0) || 'U'}</div>
                                                        <span className="auditor-name">{aud.empleado?.nombreEmp}<br/>{aud.empleado?.apellidoEmp}</span>
                                                    </div>
                                                </td>
                                                <td>{new Date(aud.fechaAuditoria).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="rating">
                                                        {renderStars(aud.calificacion)}
                                                        <span className="rating-score">{aud.calificacion}.0</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <p className="obs-text">{aud.observacionesAud}</p>
                                                </td>
                                                <td>
                                                    <button className="btn-table-edit" onClick={() => handleOpenEditAuditoria(aud)}>Editar</button>
                                                    <button className="btn-table-delete" onClick={() => handleDeleteAuditoria(aud.idAuditoria)}>Eliminar</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="section-title mt-24">
                <MdWarningAmber size={20} />
                GESTIÓN DE INCIDENCIAS E HISTORIAL DE SEGUIMIENTO (TABLE: INCIDENTE)
            </div>
            
            <div className="incidencias-grid">
                {incidentes.map(inc => {
                    const incSeguimientos = seguimientos.filter(s => s.incidente?.idIncidente === inc.idIncidente);
                    return (
                        <div className="incidencia-card" key={inc.idIncidente}>
                            <div className="incidencia-header">
                                <span className={`badge-${inc.gravedad?.toLowerCase() === 'alta' ? 'critica' : inc.gravedad?.toLowerCase() === 'media' ? 'media' : 'baja'}`}>
                                    {inc.gravedad || 'MEDIA'}
                                </span>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <button style={{background: 'none', border: 'none', cursor: 'pointer', color: '#475569'}} onClick={() => handleOpenEditIncidente(inc)}>✏️</button>
                                    <button style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444'}} onClick={() => handleDeleteIncidente(inc.idIncidente)}>❌</button>
                                </div>
                            </div>
                            <h3 className="incidencia-title">{inc.tipoIncidente}</h3>
                            <p className="incidencia-desc">{inc.descripcionInc}</p>
                            
                            <div className="incidencia-tracking" style={{marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px'}}>
                                <div style={{fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px'}}>SEGUIMIENTO ({incSeguimientos.length} acciones):</div>
                                {incSeguimientos.map(s => (
                                    <div key={s.idSeguimientoIncidente} style={{fontSize: '12px', color: '#475569', marginBottom: '4px'}}>
                                        • [{s.estadoSeg}] {s.accionTomada}
                                    </div>
                                ))}
                            </div>

                            <div className="incidencia-footer" style={{marginTop: '16px'}}>
                                <span className={`status-${inc.estadoInc?.toLowerCase() === 'resuelto' ? 'resuelta' : 'pendiente'}`}>
                                    <span className={inc.estadoInc?.toLowerCase() === 'resuelto' ? 'dot-green' : 'dot-red'}></span> {inc.estadoInc}
                                </span>
                                <button className="btn-link" style={{background: 'none', border: 'none', color: '#0b7a75', fontWeight: '600', cursor: 'pointer'}} onClick={() => handleOpenSeguimientoModal(inc)}>
                                    Bitácora <MdKeyboardArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                <div className="incidencia-card dashed" onClick={handleOpenCreateIncidente} style={{cursor: 'pointer'}}>
                    <div className="add-icon-wrapper">
                        <MdAddAlert size={24} />
                    </div>
                    <h3 className="incidencia-title text-center">Registrar Nueva Incidencia</h3>
                    <p className="incidencia-desc text-center">Documentar fallo operativo o desviación de protocolo de seguridad.</p>
                </div>
            </div>

            {/* Modal Auditoría */}
            {showAuditoriaModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingAuditoriaId ? 'Editar Auditoría' : 'Registrar Auditoría'}</h3>
                            <MdClose style={{cursor: 'pointer'}} onClick={() => setShowAuditoriaModal(false)} />
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Empleado Auditor</label>
                                <select 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newAuditoria.idEmpleado} 
                                    onChange={(e) => setNewAuditoria({...newAuditoria, idEmpleado: e.target.value})}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {empleados.map(emp => (
                                        <option key={emp.idEmpleado} value={emp.idEmpleado}>{emp.nombreEmp} {emp.apellidoEmp}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Calificación (1-5)</label>
                                <input 
                                    type="number" min="1" max="5" 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newAuditoria.calificacion} 
                                    onChange={(e) => setNewAuditoria({...newAuditoria, calificacion: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Observaciones</label>
                                <textarea 
                                    rows="4" 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical'}}
                                    value={newAuditoria.observacionesAud}
                                    onChange={(e) => setNewAuditoria({...newAuditoria, observacionesAud: e.target.value})}
                                />
                            </div>
                            <button className="btn-primary" style={{width: '100%', padding: '10px'}} onClick={handleSaveAuditoria}>
                                Guardar Auditoría
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Incidente */}
            {showIncidenteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingIncidenteId ? 'Editar Incidente' : 'Registrar Incidente'}</h3>
                            <MdClose style={{cursor: 'pointer'}} onClick={() => setShowIncidenteModal(false)} />
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Tipo de Incidente</label>
                                <input 
                                    type="text"
                                    placeholder="Ej. Fuga de químicos"
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newIncidente.tipoIncidente}
                                    onChange={(e) => setNewIncidente({...newIncidente, tipoIncidente: e.target.value})}
                                />
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Gravedad</label>
                                <select 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newIncidente.gravedad}
                                    onChange={(e) => setNewIncidente({...newIncidente, gravedad: e.target.value})}
                                >
                                    <option value="BAJA">Baja</option>
                                    <option value="MEDIA">Media</option>
                                    <option value="ALTA">Alta</option>
                                </select>
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Estado</label>
                                <select 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newIncidente.estadoInc}
                                    onChange={(e) => setNewIncidente({...newIncidente, estadoInc: e.target.value})}
                                >
                                    <option value="REPORTADO">REPORTADO</option>
                                    <option value="EN_PROCESO">EN PROCESO</option>
                                    <option value="RESUELTO">RESUELTO</option>
                                </select>
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Descripción</label>
                                <textarea 
                                    rows="4" 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical'}}
                                    value={newIncidente.descripcionInc}
                                    onChange={(e) => setNewIncidente({...newIncidente, descripcionInc: e.target.value})}
                                />
                            </div>
                            <button className="btn-primary" style={{width: '100%', padding: '10px'}} onClick={handleSaveIncidente}>
                                Guardar Incidente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Inspección */}
            {showInspeccionModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingInspeccionId ? 'Editar Inspección' : 'Registrar Inspección de Área'}</h3>
                            <MdClose style={{cursor: 'pointer'}} onClick={() => setShowInspeccionModal(false)} />
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Auditoría de Referencia</label>
                                <select 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newInspeccion.idAuditoria}
                                    onChange={(e) => setNewInspeccion({...newInspeccion, idAuditoria: e.target.value})}
                                >
                                    {auditorias.map(aud => (
                                        <option key={aud.idAuditoria} value={aud.idAuditoria}>
                                            Auditoría #{aud.idAuditoria} - {aud.empleado?.nombreEmp} ({aud.calificacion}⭐)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Área Inspeccionada</label>
                                <input 
                                    type="text"
                                    placeholder="Ej: Cocina principal, Almacén"
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newInspeccion.areaInspeccionada}
                                    onChange={(e) => setNewInspeccion({...newInspeccion, areaInspeccionada: e.target.value})}
                                />
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Resultado</label>
                                <select 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newInspeccion.resultadoInsp}
                                    onChange={(e) => setNewInspeccion({...newInspeccion, resultadoInsp: e.target.value})}
                                >
                                    <option value="Favorable">Favorable (Pasa)</option>
                                    <option value="Desfavorable">Desfavorable (Falla)</option>
                                </select>
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Subir Evidencia Fotográfica (MongoDB Compass)</label>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        style={{display: 'none'}} 
                                        accept="image/*"
                                    />
                                    <button 
                                        type="button" 
                                        className="btn-outline"
                                        onClick={() => fileInputRef.current.click()}
                                        disabled={uploading}
                                    >
                                        <MdCloudUpload size={18} /> {uploading ? 'Subiendo...' : 'Cargar foto'}
                                    </button>
                                    {newInspeccion.mongoDocIdInsp && (
                                        <span style={{fontSize: '12px', color: '#166534', fontWeight: 'bold'}}>✓ Subido</span>
                                    )}
                                </div>
                            </div>
                            <button className="btn-primary" style={{width: '100%', padding: '10px'}} onClick={handleSaveInspeccion}>
                                Guardar Inspección
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Seguimiento Incidente */}
            {showSeguimientoModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Bitácora de Seguimiento — INC-{selectedIncidente?.idIncidente}</h3>
                            <MdClose style={{cursor: 'pointer'}} onClick={() => setShowSeguimientoModal(false)} />
                        </div>
                        <div className="modal-body">
                            <div style={{fontSize: '13px', color: '#475569', marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '4px'}}>
                                <strong>Incidente:</strong> {selectedIncidente?.tipoIncidente} <br/>
                                <strong>Descripción:</strong> {selectedIncidente?.descripcionInc}
                            </div>
                            
                            {/* Actions list */}
                            <div style={{maxHeight: '150px', overflowY: 'auto', marginBottom: '16px'}}>
                                <div style={{fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px'}}>ACCIONES TOMADAS:</div>
                                {seguimientos.filter(s => s.incidente?.idIncidente === selectedIncidente?.idIncidente).map(s => (
                                    <div key={s.idSeguimientoIncidente} style={{padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <div style={{fontSize: '12px', color: '#1e293b'}}>
                                            <strong>[{s.estadoSeg}]</strong> {s.accionTomada}
                                        </div>
                                        <button 
                                            style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '10px'}}
                                            onClick={() => handleDeleteSeguimiento(s.idSeguimientoIncidente)}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Nueva Acción Tomada / Bitácora</label>
                                <textarea 
                                    rows="3" 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical'}}
                                    value={newSeguimiento.accionTomada}
                                    onChange={(e) => setNewSeguimiento({...newSeguimiento, accionTomada: e.target.value})}
                                    placeholder="Ej: Se aplicó sellante en la tubería y se limpió el derrame."
                                />
                            </div>
                            <div className="form-group mb-20">
                                <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>Estado del Seguimiento</label>
                                <select 
                                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                    value={newSeguimiento.estadoSeg}
                                    onChange={(e) => setNewSeguimiento({...newSeguimiento, estadoSeg: e.target.value})}
                                >
                                    <option value="EN_PROCESO">En Proceso</option>
                                    <option value="RESUELTO">Resuelto (Cierra incidencia)</option>
                                </select>
                            </div>
                            <button className="btn-primary" style={{width: '100%', padding: '10px'}} onClick={handleSaveSeguimiento}>
                                Agregar Acción
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button className="fab-help-btn">
                <MdHelpOutline size={24} />
            </button>
        </div>
    );
};

export default Auditoria;
