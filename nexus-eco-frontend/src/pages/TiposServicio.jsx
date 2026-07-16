import React, { useState, useEffect } from 'react';
import { MdSettingsInputComponent, MdSave, MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';
import { getTiposServicio, createTipoServicio, updateTipoServicio, deleteTipoServicio } from '../api/api';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import './TiposServicio.css';

const schema = yup.object().shape({
    nombreServicio: yup.string().required('El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    descripcionTs: yup.string().nullable(),
    precioBase: yup.number().typeError('Debe ser un número válido').required('El precio base es obligatorio').positive('El precio debe ser mayor a 0')
});

const TiposServicio = () => {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, minPrice, maxPrice]);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            nombreServicio: '',
            descripcionTs: '',
            precioBase: ''
        }
    });

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        try {
            setLoading(true);
            const response = await getTiposServicio();
            const sortedData = [...response.data].sort((a, b) => b.idTipoServicio - a.idTipoServicio);
            setTipos(sortedData);
        } catch (error) {
            console.error("Error al obtener tipos de servicio", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        reset();
        setShowModal(true);
    };

    const handleOpenEdit = (t) => {
        setEditingId(t.idTipoServicio);
        setValue('nombreServicio', t.nombreServicio || '');
        setValue('descripcionTs', t.descripcionTs || '');
        setValue('precioBase', t.precioBase || '');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar este tipo de servicio?")) {
            try {
                await deleteTipoServicio(id);
                alert("Tipo de servicio eliminado exitosamente");
                fetchTipos();
            } catch (error) {
                console.error("Error al eliminar tipo de servicio", error);
                alert("No se pudo eliminar el tipo de servicio. Verifique que no esté asociado a solicitudes existentes.");
            }
        }
    };

    const onSubmit = async (data) => {
        const payload = {
            idTipoServicio: editingId,
            nombreServicio: data.nombreServicio,
            descripcionTs: data.descripcionTs,
            precioBase: parseFloat(data.precioBase)
        };

        try {
            if (editingId) {
                await updateTipoServicio(editingId, payload);
                alert("Tipo de servicio actualizado exitosamente");
            } else {
                await createTipoServicio(payload);
                alert("Tipo de servicio guardado exitosamente");
            }
            setShowModal(false);
            fetchTipos();
        } catch (error) {
            console.error("Error al guardar tipo de servicio", error);
            if (error.response?.data && typeof error.response.data === 'object') {
                alert("Error de validación del servidor:\n" + JSON.stringify(error.response.data, null, 2));
            } else {
                alert("Ocurrió un error al guardar el tipo de servicio.");
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
    };

    const filteredTipos = tipos.filter(t => {
        const matchesSearch = t.nombreServicio.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (t.descripcionTs || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.idTipoServicio.toString() === searchQuery;
                              
        const matchesMin = minPrice === '' || t.precioBase >= parseFloat(minPrice);
        const matchesMax = maxPrice === '' || t.precioBase <= parseFloat(maxPrice);
        
        return matchesSearch && matchesMin && matchesMax;
    });

    const itemsPerPage = 15;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTipos = filteredTipos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTipos.length / itemsPerPage);

    const handleClearFilters = () => {
        setSearchQuery('');
        setMinPrice('');
        setMaxPrice('');
    };

    return (
        <div className="tipos-servicio-page">
            <div className="breadcrumb">ADMINISTRACIÓN / TIPOS DE SERVICIO</div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Catálogo de Servicios</h1>
                    <p className="page-subtitle">Administra los tipos de servicios ambientales, saneamiento y control de plagas que ofrece Econexus.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-nuevo" onClick={handleOpenCreate}>
                        <MdAdd size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Nuevo Servicio
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="filter-group search">
                    <span className="filter-label">Buscar Servicio</span>
                    <input 
                        type="text" 
                        className="filter-input" 
                        placeholder="Buscar por nombre, descripción o ID..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <span className="filter-label">Precio Mínimo (S/)</span>
                    <input 
                        type="number" 
                        className="filter-input" 
                        placeholder="Min..." 
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <span className="filter-label">Precio Máximo (S/)</span>
                    <input 
                        type="number" 
                        className="filter-input" 
                        placeholder="Max..." 
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                    />
                </div>
                {(searchQuery || minPrice !== '' || maxPrice !== '') && (
                    <div className="filter-group action">
                        <button className="btn-filter-clear" onClick={handleClearFilters}>
                            Limpiar
                        </button>
                    </div>
                )}
            </div>

            <div className="table-container">
                <table className="tipos-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Precio Base</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                        ) : filteredTipos.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>No se encontraron servicios con los filtros aplicados.</td></tr>
                        ) : (
                            currentTipos.map(t => (
                                <tr key={t.idTipoServicio}>
                                    <td>{t.idTipoServicio}</td>
                                    <td style={{ fontWeight: '600' }}>{t.nombreServicio}</td>
                                    <td>{t.descripcionTs || '-'}</td>
                                    <td style={{ color: '#0b7a75', fontWeight: '600' }}>{formatCurrency(t.precioBase)}</td>
                                    <td>
                                        <button className="btn-table-edit" onClick={() => handleOpenEdit(t)}>Editar</button>
                                        <button className="btn-table-delete" onClick={() => handleDelete(t.idTipoServicio)}>Eliminar</button>
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

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                            <button className="btn-close" onClick={() => setShowModal(false)}>
                                <MdClose size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="form-group">
                                <label>Nombre del Servicio <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="text" 
                                    className={errors.nombreServicio ? 'input-error' : ''}
                                    {...register('nombreServicio')} 
                                />
                                {errors.nombreServicio && <span className="error-message">{errors.nombreServicio.message}</span>}
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea 
                                    className={errors.descripcionTs ? 'input-error' : ''}
                                    {...register('descripcionTs')} 
                                    rows="3" 
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
                                />
                                {errors.descripcionTs && <span className="error-message">{errors.descripcionTs.message}</span>}
                            </div>
                            <div className="form-group">
                                <label>Precio Base (S/) <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="number" 
                                    className={errors.precioBase ? 'input-error' : ''}
                                    step="0.01" 
                                    {...register('precioBase')} 
                                />
                                {errors.precioBase && <span className="error-message">{errors.precioBase.message}</span>}
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-guardar"><MdSave size={16} /> Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TiposServicio;
