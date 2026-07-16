import React, { useState, useEffect } from 'react';
import { MdPerson, MdStars, MdSave, MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';
import { getTecnicos, createTecnico, updateTecnico, deleteTecnico, getEspecialidades, createEspecialidad, updateEspecialidad, deleteEspecialidad } from '../api/api';
import './Tecnicos.css';

const Tecnicos = () => {
    const [activeTab, setActiveTab] = useState('tecnicos'); // 'tecnicos' or 'especialidades'
    const [tecnicos, setTecnicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [specFilter, setSpecFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, specFilter, statusFilter, activeTab]);

    // Modal state for Tecnicos
    const [showTecnicoModal, setShowTecnicoModal] = useState(false);
    const [editingTecnicoId, setEditingTecnicoId] = useState(null);
    const [tecnicoForm, setTecnicoForm] = useState({
        nombreTec: '',
        apellidoTec: '',
        estadoTec: 'ACTIVO',
        idEspecialidad: ''
    });

    // Modal state for Especialidades
    const [showEspecialidadModal, setShowEspecialidadModal] = useState(false);
    const [editingEspecialidadId, setEditingEspecialidadId] = useState(null);
    const [especialidadForm, setEspecialidadForm] = useState({
        nombreEspec: '',
        descripcion: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resTecnicos, resEspecialidades] = await Promise.all([
                getTecnicos(),
                getEspecialidades()
            ]);
            const sortedTecnicos = [...resTecnicos.data].sort((a, b) => b.idTecnico - a.idTecnico);
            setTecnicos(sortedTecnicos);
            setEspecialidades(resEspecialidades.data);
        } catch (error) {
            console.error("Error al obtener datos", error);
        } finally {
            setLoading(false);
        }
    };

    // --- TECNICOS CRUD ---
    const handleTecnicoChange = (e) => {
        setTecnicoForm({ ...tecnicoForm, [e.target.name]: e.target.value });
    };

    const handleOpenCreateTecnico = () => {
        setEditingTecnicoId(null);
        setTecnicoForm({
            nombreTec: '',
            apellidoTec: '',
            estadoTec: 'ACTIVO',
            idEspecialidad: especialidades.length > 0 ? especialidades[0].idEspecialidad.toString() : ''
        });
        setShowTecnicoModal(true);
    };

    const handleOpenEditTecnico = (tec) => {
        setEditingTecnicoId(tec.idTecnico);
        setTecnicoForm({
            nombreTec: tec.nombreTec || '',
            apellidoTec: tec.apellidoTec || '',
            estadoTec: tec.estadoTec || 'ACTIVO',
            idEspecialidad: tec.especialidad ? tec.especialidad.idEspecialidad.toString() : ''
        });
        setShowTecnicoModal(true);
    };

    const handleDeleteTecnico = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar este técnico?")) {
            try {
                await deleteTecnico(id);
                alert("Técnico eliminado exitosamente");
                fetchData();
            } catch (error) {
                console.error("Error al eliminar técnico", error);
                alert("No se pudo eliminar el técnico. Verifique que no esté asignado a planificaciones.");
            }
        }
    };

    const handleSaveTecnico = async (e) => {
        e.preventDefault();
        if (!tecnicoForm.nombreTec || !tecnicoForm.apellidoTec) {
            alert("Nombre y Apellido son requeridos.");
            return;
        }

        const payload = {
            idTecnico: editingTecnicoId,
            nombreTec: tecnicoForm.nombreTec,
            apellidoTec: tecnicoForm.apellidoTec,
            estadoTec: tecnicoForm.estadoTec,
            especialidad: tecnicoForm.idEspecialidad ? {
                idEspecialidad: parseInt(tecnicoForm.idEspecialidad)
            } : null
        };

        try {
            if (editingTecnicoId) {
                await updateTecnico(editingTecnicoId, payload);
                alert("Técnico actualizado exitosamente");
            } else {
                await createTecnico(payload);
                alert("Técnico guardado exitosamente");
            }
            setShowTecnicoModal(false);
            fetchData();
        } catch (error) {
            console.error("Error al guardar técnico", error);
            alert("Ocurrió un error al guardar el técnico.");
        }
    };

    // --- ESPECIALIDADES CRUD ---
    const handleEspecialidadChange = (e) => {
        setEspecialidadForm({ ...especialidadForm, [e.target.name]: e.target.value });
    };

    const handleOpenCreateEspecialidad = () => {
        setEditingEspecialidadId(null);
        setEspecialidadForm({ nombreEspec: '', descripcion: '' });
        setShowEspecialidadModal(true);
    };

    const handleOpenEditEspecialidad = (esp) => {
        setEditingEspecialidadId(esp.idEspecialidad);
        setFormEspecialidad({
            nombreEspec: esp.nombreEspec || '',
            descripcion: esp.descripcion || ''
        });
        setShowEspecialidadModal(true);
    };

    const setFormEspecialidad = (data) => {
        setEspecialidadForm(data);
    };

    const handleDeleteEspecialidad = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta especialidad?")) {
            try {
                await deleteEspecialidad(id);
                alert("Especialidad eliminada exitosamente");
                fetchData();
            } catch (error) {
                console.error("Error al eliminar especialidad", error);
                alert("No se pudo eliminar la especialidad. Verifique que no esté asignada a técnicos.");
            }
        }
    };

    const handleSaveEspecialidad = async (e) => {
        e.preventDefault();
        if (!especialidadForm.nombreEspec) {
            alert("Nombre de especialidad es requerido.");
            return;
        }

        const payload = {
            idEspecialidad: editingEspecialidadId,
            nombreEspec: especialidadForm.nombreEspec,
            descripcion: especialidadForm.descripcion
        };

        try {
            if (editingEspecialidadId) {
                await updateEspecialidad(editingEspecialidadId, payload);
                alert("Especialidad actualizada exitosamente");
            } else {
                await createEspecialidad(payload);
                alert("Especialidad guardada exitosamente");
            }
            setShowEspecialidadModal(false);
            fetchData();
        } catch (error) {
            console.error("Error al guardar especialidad", error);
            alert("Ocurrió un error al guardar la especialidad.");
        }
    };

    const filteredTecnicos = tecnicos.filter(tec => {
        const fullName = `${tec.nombreTec} ${tec.apellidoTec}`.toLowerCase();
        const specName = (tec.especialidad?.nombreEspec || '').toLowerCase();
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                              specName.includes(searchQuery.toLowerCase()) ||
                              tec.idTecnico.toString() === searchQuery;
                              
        const matchesSpec = specFilter === 'ALL' || (tec.especialidad && tec.especialidad.idEspecialidad.toString() === specFilter);
        const matchesStatus = statusFilter === 'ALL' || tec.estadoTec === statusFilter;
        
        return matchesSearch && matchesSpec && matchesStatus;
    });

    const itemsPerPage = 15;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTecnicos = filteredTecnicos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTecnicos.length / itemsPerPage);

    const handleClearFilters = () => {
        setSearchQuery('');
        setSpecFilter('ALL');
        setStatusFilter('ALL');
    };

    return (
        <div className="tecnicos-page">
            <div className="breadcrumb">ADMINISTRACIÓN / TÉCNICOS Y ESPECIALIDADES</div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Personal Técnico</h1>
                    <p className="page-subtitle">Gestiona el equipo de técnicos de campo y sus respectivas especialidades operativas.</p>
                </div>
                <div className="header-actions">
                    {activeTab === 'tecnicos' ? (
                        <button className="btn-nuevo" onClick={handleOpenCreateTecnico}>
                            <MdAdd size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Nuevo Técnico
                        </button>
                    ) : (
                        <button className="btn-nuevo" onClick={handleOpenCreateEspecialidad}>
                            <MdAdd size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Nueva Especialidad
                        </button>
                    )}
                </div>
            </div>

            <div className="tabs-container">
                <button 
                    className={`tab-btn ${activeTab === 'tecnicos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tecnicos')}
                >
                    <MdPerson size={18} style={{ marginRight: '6px' }} /> Técnicos
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'especialidades' ? 'active' : ''}`}
                    onClick={() => setActiveTab('especialidades')}
                >
                    <MdStars size={18} style={{ marginRight: '6px' }} /> Especialidades
                </button>
            </div>

            {activeTab === 'tecnicos' ? (
                <>
                    <div className="filters-bar">
                        <div className="filter-group search">
                            <span className="filter-label">Buscar Técnico</span>
                            <input 
                                type="text" 
                                className="filter-input" 
                                placeholder="Buscar por nombre, especialidad o ID..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Especialidad</span>
                            <select 
                                className="filter-select" 
                                value={specFilter}
                                onChange={(e) => setSpecFilter(e.target.value)}
                            >
                                <option value="ALL">Todas las especialidades</option>
                                {especialidades.map(esp => (
                                    <option key={esp.idEspecialidad} value={esp.idEspecialidad}>{esp.nombreEspec}</option>
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
                                <option value="ACTIVO">ACTIVO</option>
                                <option value="INACTIVO">INACTIVO</option>
                            </select>
                        </div>
                        {(searchQuery || specFilter !== 'ALL' || statusFilter !== 'ALL') && (
                            <div className="filter-group action">
                                <button className="btn-filter-clear" onClick={handleClearFilters}>
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="table-container">
                        <table className="tecnicos-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombres</th>
                                    <th>Apellidos</th>
                                    <th>Especialidad</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                                ) : filteredTecnicos.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron técnicos con los filtros aplicados.</td></tr>
                                ) : (
                                    currentTecnicos.map(tec => (
                                        <tr key={tec.idTecnico}>
                                            <td>{tec.idTecnico}</td>
                                            <td>{tec.nombreTec}</td>
                                            <td>{tec.apellidoTec}</td>
                                            <td>{tec.especialidad ? tec.especialidad.nombreEspec : 'Sin especialidad'}</td>
                                            <td>
                                                <span className={`status-badge status-${tec.estadoTec?.toLowerCase()}`}>
                                                    {tec.estadoTec}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-table-edit" onClick={() => handleOpenEditTecnico(tec)}>Editar</button>
                                                <button className="btn-table-delete" onClick={() => handleDeleteTecnico(tec.idTecnico)}>Eliminar</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-bar" style={{ marginTop: '16px' }}>
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
                <div className="table-container">
                    <table className="especialidades-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Especialidad</th>
                                <th>Descripción</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                            ) : especialidades.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay especialidades registradas.</td></tr>
                            ) : (
                                especialidades.map(esp => (
                                    <tr key={esp.idEspecialidad}>
                                        <td>{esp.idEspecialidad}</td>
                                        <td style={{ fontWeight: '600' }}>{esp.nombreEspec}</td>
                                        <td>{esp.descripcion || '-'}</td>
                                        <td>
                                            <button className="btn-table-edit" onClick={() => handleOpenEditEspecialidad(esp)}>Editar</button>
                                            <button className="btn-table-delete" onClick={() => handleDeleteEspecialidad(esp.idEspecialidad)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Técnico Modal */}
            {showTecnicoModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingTecnicoId ? 'Editar Técnico' : 'Nuevo Técnico'}</h2>
                            <button className="btn-close" onClick={() => setShowTecnicoModal(false)}>
                                <MdClose size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTecnico}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input type="text" name="nombreTec" value={tecnicoForm.nombreTec} onChange={handleTecnicoChange} required />
                            </div>
                            <div className="form-group">
                                <label>Apellido</label>
                                <input type="text" name="apellidoTec" value={tecnicoForm.apellidoTec} onChange={handleTecnicoChange} required />
                            </div>
                            <div className="form-group">
                                <label>Especialidad</label>
                                <select name="idEspecialidad" value={tecnicoForm.idEspecialidad} onChange={handleTecnicoChange} required>
                                    <option value="">-- Seleccionar Especialidad --</option>
                                    {especialidades.map(esp => (
                                        <option key={esp.idEspecialidad} value={esp.idEspecialidad}>
                                            {esp.nombreEspec}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Estado</label>
                                <select name="estadoTec" value={tecnicoForm.estadoTec} onChange={handleTecnicoChange}>
                                    <option value="ACTIVO">Activo</option>
                                    <option value="INACTIVO">Inactivo</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancelar" onClick={() => setShowTecnicoModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-guardar"><MdSave size={16} /> Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Especialidad Modal */}
            {showEspecialidadModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingEspecialidadId ? 'Editar Especialidad' : 'Nueva Especialidad'}</h2>
                            <button className="btn-close" onClick={() => setShowEspecialidadModal(false)}>
                                <MdClose size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEspecialidad}>
                            <div className="form-group">
                                <label>Nombre de Especialidad</label>
                                <input type="text" name="nombreEspec" value={especialidadForm.nombreEspec} onChange={handleEspecialidadChange} required />
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea name="descripcion" value={especialidadForm.descripcion} onChange={handleEspecialidadChange} rows="3" style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    fontFamily: 'inherit',
                                    fontSize: '14px',
                                    outline: 'none',
                                    resize: 'vertical'
                                }} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancelar" onClick={() => setShowEspecialidadModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-guardar"><MdSave size={16} /> Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tecnicos;
