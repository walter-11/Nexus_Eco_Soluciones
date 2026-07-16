import React, { useState, useEffect } from 'react';
import { MdCorporateFare, MdPerson, MdSave, MdInfoOutline, MdAdd, MdArrowBack } from 'react-icons/md';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../api/api';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import './Clientes.css';

const schema = yup.object().shape({
    ruc: yup.string().required('El RUC es obligatorio').matches(/^\d{11}$/, 'El RUC debe tener exactamente 11 dígitos numéricos'),
    razonSocial: yup.string().required('La razón social es obligatoria').max(255, 'Máximo 255 caracteres').matches(/^[^<>]*$/, 'La razón social no puede contener caracteres HTML (< o >)'),
    direccion: yup.string().required('La dirección es obligatoria').max(255, 'Máximo 255 caracteres'),
    correo: yup.string().required('El correo electrónico es obligatorio').email('Debe ser un correo válido'),
    estado: yup.string().required('El estado es obligatorio'),
    contactoNombre: yup.string().required('El nombre del contacto es obligatorio').max(100, 'Máximo 100 caracteres').matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo debe contener letras'),
    contactoCargo: yup.string().required('El cargo del contacto es obligatorio').max(100, 'Máximo 100 caracteres').matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El cargo solo debe contener letras'),
    contactoTelefono: yup.string().required('El teléfono del contacto es obligatorio').matches(/^9\d{8}$/, 'El teléfono debe ser un celular de Perú (9 dígitos)'),
    contactoCorreo: yup.string().required('El correo del contacto es obligatorio').email('Debe ser un correo válido')
});

const Clientes = () => {
    const [view, setView] = useState('list');
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [idContactoCliente, setIdContactoCliente] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [contactNameFilter, setContactNameFilter] = useState('');
    const [contactPhoneFilter, setContactPhoneFilter] = useState('');

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, contactNameFilter, contactPhoneFilter]);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            ruc: '', razonSocial: '', direccion: '', correo: '', estado: 'Activo',
            contactoNombre: '', contactoCargo: '', contactoTelefono: '', contactoCorreo: ''
        }
    });

    useEffect(() => {
        if (view === 'list') {
            fetchClientes();
        }
    }, [view]);

    const fetchClientes = async () => {
        try {
            setLoading(true);
            const response = await getClientes();
            const sortedData = [...response.data].sort((a, b) => b.idCliente - a.idCliente);
            setClientes(sortedData);
        } catch (error) {
            console.error("Error al obtener clientes", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (c) => {
        setEditingId(c.idCliente);
        const contact = c.contactos && c.contactos.length > 0 ? c.contactos[0] : {};
        setIdContactoCliente(contact.idContactoCliente || null);
        setValue('ruc', c.ruc || '');
        setValue('razonSocial', c.razonSocial || '');
        setValue('direccion', c.direccion || '');
        setValue('correo', c.emailCliente || '');
        setValue('estado', c.estado === 'ACTIVO' ? 'Activo' : 'Inactivo');
        setValue('contactoNombre', contact.nombreCon || '');
        setValue('contactoCargo', contact.cargo || '');
        setValue('contactoTelefono', contact.telefonoCon || '');
        setValue('contactoCorreo', contact.emailContacto || '');
        setView('form');
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar este cliente?")) {
            try {
                await deleteCliente(id);
                alert("Cliente eliminado exitosamente");
                fetchClientes();
            } catch (error) {
                console.error("Error al eliminar cliente", error);
                alert("No se pudo eliminar el cliente. Verifique que no tenga solicitudes asociadas.");
            }
        }
    };

    const handleNew = () => {
        setEditingId(null);
        setIdContactoCliente(null);
        reset();
        setView('form');
    };

    const onSubmit = async (data) => {
        const payload = {
            idCliente: editingId,
            ruc: data.ruc,
            razonSocial: data.razonSocial,
            direccion: data.direccion,
            emailCliente: data.correo,
            estado: data.estado === 'Activo' ? 'ACTIVO' : 'INACTIVO',
            contactos: [
                {
                    idContactoCliente: idContactoCliente,
                    nombreCon: data.contactoNombre,
                    cargo: data.contactoCargo,
                    telefonoCon: data.contactoTelefono,
                    emailContacto: data.contactoCorreo
                }
            ]
        };

        try {
            if (editingId) {
                await updateCliente(editingId, payload);
                alert("Cliente actualizado exitosamente");
            } else {
                await createCliente(payload);
                alert("Cliente guardado exitosamente");
            }
            setView('list');
            setEditingId(null);
            reset();
        } catch (error) {
            console.error("Error al guardar cliente", error);
            if (error.response?.data && typeof error.response.data === 'object') {
                alert("Error de validación del servidor:\n" + JSON.stringify(error.response.data, null, 2));
            } else {
                alert("Ocurrió un error al guardar el cliente.");
            }
        }
    };

    const cargosList = [...new Set(clientes.flatMap(c => c.contactos || []).map(cont => cont.cargo).filter(Boolean))];

    if (view === 'list') {
        const filteredClientes = clientes.filter(c => {
            const matchesSearch = (c.razonSocial || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (c.ruc || '').includes(searchQuery);
            const matchesStatus = statusFilter === 'ALL' || c.estado === statusFilter;
            
            const contact = c.contactos && c.contactos.length > 0 ? c.contactos[0] : {};
            const matchesName = !contactNameFilter || (contact.nombreCon || '').toLowerCase().includes(contactNameFilter.toLowerCase());
            const matchesPhone = !contactPhoneFilter || (contact.telefonoCon || '').includes(contactPhoneFilter);

            return matchesSearch && matchesStatus && matchesName && matchesPhone;
        });

        const itemsPerPage = 15;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentClientes = filteredClientes.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);

        const handleClearFilters = () => {
            setSearchQuery('');
            setStatusFilter('ALL');
            setContactNameFilter('');
            setContactPhoneFilter('');
        };

        return (
            <div className="clientes-page">
                <div className="breadcrumb">GESTIÓN / CLIENTES</div>
                
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Directorio de Clientes</h1>
                        <p className="page-subtitle">Visualiza y administra todos los clientes registrados en el sistema.</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn-nuevo" onClick={handleNew}>
                            <MdAdd size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Nuevo Cliente
                        </button>
                    </div>
                </div>

                <div className="filters-bar">
                    <div className="filter-group search">
                        <span className="filter-label">Buscar RUC / Razón Social</span>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Buscar por Razón Social o RUC..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Nombre de Contacto</span>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Nombre del contacto..." 
                            value={contactNameFilter}
                            onChange={(e) => setContactNameFilter(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Teléfono</span>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Teléfono..." 
                            value={contactPhoneFilter}
                            onChange={(e) => setContactPhoneFilter(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Estado</span>
                        <select 
                            className="filter-select" 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Todos los estados</option>
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                        </select>
                    </div>
                    {(searchQuery || statusFilter !== 'ALL' || contactNameFilter || contactPhoneFilter) && (
                        <div className="filter-group action">
                            <button className="btn-filter-clear" onClick={handleClearFilters}>
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </div>

                <div className="table-container">
                    <table className="clientes-table">
                        <thead>
                            <tr>
                                <th>RUC</th>
                                <th>Razón Social</th>
                                <th>Contacto Principal</th>
                                <th>Teléfono</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                            ) : filteredClientes.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron clientes con los filtros aplicados.</td></tr>
                            ) : (
                                currentClientes.map(c => (
                                    <tr key={c.idCliente}>
                                        <td>{c.ruc}</td>
                                        <td>{c.razonSocial}</td>
                                        <td>{c.contactos && c.contactos.length > 0 ? c.contactos[0].nombreCon : 'Sin contacto'}</td>
                                        <td>{c.contactos && c.contactos.length > 0 ? c.contactos[0].telefonoCon : '-'}</td>
                                        <td>
                                            <span className={`status-badge status-${c.estado?.toLowerCase()}`}>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-table-edit" onClick={() => handleEdit(c)}>Editar</button>
                                            <button className="btn-table-delete" onClick={() => handleDelete(c.idCliente)}>Eliminar</button>
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
        <div className="clientes-page">
            <div className="breadcrumb">GESTIÓN / REGISTRO DE CLIENTE</div>
            
            <div className="page-header">
                <div>
                    <h1 className="page-title">{editingId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h1>
                    <p className="page-subtitle">Complete la información requerida para dar de alta o modificar un cliente y su contacto principal.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-cancelar" onClick={() => setView('list')}>
                        <MdArrowBack size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Volver
                    </button>
                    <button className="btn-guardar" onClick={handleSubmit(onSubmit)}>
                        <MdSave size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Guardar cliente
                    </button>
                </div>
            </div>

            <div className="form-card">
                <div className="card-badge">CLIENTE</div>
                <div className="card-header">
                    <MdCorporateFare size={22} className="card-icon" />
                    <h2>Información Corporativa</h2>
                </div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>RUC <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            maxLength={11}
                            className={errors.ruc ? 'input-error' : ''}
                            placeholder="20XXXXXXXXX" 
                            disabled={!!editingId}
                            {...register('ruc', {
                                onChange: (e) => {
                                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                                }
                            })} 
                        />
                        {errors.ruc && <span className="error-message">{errors.ruc.message}</span>}
                    </div>
                    <div className="form-group">
                        <label>Razón social <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            className={errors.razonSocial ? 'input-error' : ''}
                            placeholder="Nombre legal de la empresa" 
                            {...register('razonSocial')} 
                        />
                        {errors.razonSocial && <span className="error-message">{errors.razonSocial.message}</span>}
                    </div>
                    <div className="form-group full-width">
                        <label>Dirección <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            className={errors.direccion ? 'input-error' : ''}
                            placeholder="Av. Principal 123, Distrito, Ciudad" 
                            {...register('direccion')} 
                        />
                        {errors.direccion && <span className="error-message">{errors.direccion.message}</span>}
                    </div>
                    <div className="form-group">
                        <label>Correo del cliente <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="email" 
                            className={errors.correo ? 'input-error' : ''}
                            placeholder="administracion@empresa.com" 
                            {...register('correo')} 
                        />
                        {errors.correo && <span className="error-message">{errors.correo.message}</span>}
                    </div>
                    {editingId && (
                        <div className="form-group">
                            <label>Estado <span style={{color: 'red'}}>*</span></label>
                            <select className={errors.estado ? 'input-error' : ''} {...register('estado')}>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                            {errors.estado && <span className="error-message">{errors.estado.message}</span>}
                        </div>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="card-badge">CONTACTO_CLIENTE</div>
                <div className="card-header">
                    <MdPerson size={22} className="card-icon" />
                    <h2>Contacto Principal</h2>
                </div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Nombre del contacto <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            className={errors.contactoNombre ? 'input-error' : ''}
                            placeholder="Nombre completo" 
                            {...register('contactoNombre')} 
                        />
                        {errors.contactoNombre && <span className="error-message">{errors.contactoNombre.message}</span>}
                    </div>
                    <div className="form-group">
                        <label>Cargo del contacto <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            className={errors.contactoCargo ? 'input-error' : ''}
                            placeholder="Ej: Gerente de Operaciones" 
                            {...register('contactoCargo')} 
                        />
                        {errors.contactoCargo && <span className="error-message">{errors.contactoCargo.message}</span>}
                    </div>
                    <div className="form-group">
                        <label>Teléfono del contacto <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="text" 
                            maxLength={9}
                            className={errors.contactoTelefono ? 'input-error' : ''}
                            placeholder="9XX XXX XXX" 
                            {...register('contactoTelefono', {
                                onChange: (e) => {
                                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                                }
                            })} 
                        />
                        {errors.contactoTelefono && <span className="error-message">{errors.contactoTelefono.message}</span>}
                    </div>
                    <div className="form-group">
                        <label>Correo del contacto <span style={{color: 'red'}}>*</span></label>
                        <input 
                            type="email" 
                            className={errors.contactoCorreo ? 'input-error' : ''}
                            placeholder="contacto@empresa.com" 
                            {...register('contactoCorreo')} 
                        />
                        {errors.contactoCorreo && <span className="error-message">{errors.contactoCorreo.message}</span>}
                    </div>
                </div>
            </div>

            <div className="info-alert">
                <MdInfoOutline size={24} className="alert-icon" />
                <p>Asegúrese de que el <strong>RUC</strong> sea válido para evitar errores en la facturación electrónica. Los campos marcados con asterisco (*) son obligatorios.</p>
            </div>
        </div>
    );
};

export default Clientes;
