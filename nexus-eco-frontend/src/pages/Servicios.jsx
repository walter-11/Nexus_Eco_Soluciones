import React, { useState, useEffect } from 'react';
import { 
    MdClose, MdAssignment, MdSearch, MdEvent, MdDeleteOutline, MdHistory, 
    MdLocalOffer, MdPrint, MdAdd, MdArrowBack, MdSave, MdVisibility 
} from 'react-icons/md';
import { 
    MdAdd as MdAddIcon, MdArrowBack as MdBackIcon, MdSave as MdSaveIcon, 
    MdDeleteOutline as MdDeleteIcon, MdVisibility as MdEyeIcon, MdAssignment as MdOrderIcon 
} from 'react-icons/md';
import { 
    getClientes, getEmpleados, getTiposServicio, getOrdenes, 
    createSolicitud, createOrdenServicio, updateOrdenServicio, deleteOrdenServicio 
} from '../api/api';
import './Servicios.css';

const formatOS = (id) => `OS-2026-${String(id).padStart(4, '0')}`;

const Servicios = () => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [ordenes, setOrdenes] = useState([]);
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [clientFilter, setClientFilter] = useState('ALL');
    const [filterClientes, setFilterClientes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, minAmount, maxAmount, startDate, endDate, clientFilter]);
    
    // Dropdown Data
    const [clientes, setClientes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [tiposServicio, setTiposServicio] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Details Modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedOrden, setSelectedOrden] = useState(null);

    // Form State
    const [solicitud, setSolicitud] = useState({
        idCliente: '',
        fecha: new Date().toISOString().split('T')[0],
        idEmpleado: '',
        estado: 'PENDIENTE',
        descripcion: ''
    });

    const [servicios, setServicios] = useState([]); // Selected services
    const [selectedTipo, setSelectedTipo] = useState('');
    const [cantidadSelected, setCantidadSelected] = useState(1);

    // Searchable dropdown states
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);

    // Form errors state
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (view === 'list') {
            fetchOrdenes();
            fetchFilterClientes();
        } else {
            fetchFormData();
        }
    }, [view]);

    const fetchFilterClientes = async () => {
        try {
            const res = await getClientes();
            setFilterClientes(res.data);
        } catch (error) {
            console.error("Error fetching filter clients", error);
        }
    };

    const fetchOrdenes = async () => {
        try {
            setLoading(true);
            const res = await getOrdenes();
            const sortedData = [...res.data].sort((a, b) => b.idOrdenServicio - a.idOrdenServicio);
            setOrdenes(sortedData);
        } catch (error) {
            console.error("Error fetching ordenes", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFormData = async () => {
        try {
            const [resClientes, resEmpleados, resTipos] = await Promise.all([
                getClientes(),
                getEmpleados(),
                getTiposServicio()
            ]);
            
            // Sort clients from most recent to oldest (descending by idCliente)
            const sortedClientes = resClientes.data.filter(c => c.estado === 'ACTIVO')
                .sort((a, b) => b.idCliente - a.idCliente);
                
            setClientes(sortedClientes);
            setEmpleados(resEmpleados.data);
            setTiposServicio(resTipos.data);
            
            // Keep searchable inputs empty by default so they display the placeholder guide text
            setSolicitud(s => ({ ...s, idCliente: '' }));
            setClientSearch('');
            
            if (resEmpleados.data.length > 0) {
                setSolicitud(s => ({ ...s, idEmpleado: resEmpleados.data[0].idEmpleado }));
            }
            
            setSelectedTipo('');
            setServiceSearch('');
            
        } catch (error) {
            console.error("Error fetching form data", error);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
    };

    const getClientStats = () => {
        if (!solicitud.idCliente) {
            return {
                lastService: 'Sin seleccionar',
                frequency: 'Sin seleccionar',
                comment: 'Seleccione un cliente para ver su contacto e información.'
            };
        }
        
        const selectedClientObj = clientes.find(c => c.idCliente.toString() === solicitud.idCliente.toString());
        const clientOrders = ordenes.filter(o => o.solicitudServicio?.cliente?.idCliente?.toString() === solicitud.idCliente.toString());
        
        let lastService = 'Ninguno';
        if (clientOrders.length > 0) {
            const sortedClientOrders = [...clientOrders].sort((a, b) => new Date(b.fechaOrden) - new Date(a.fechaOrden));
            lastService = new Date(sortedClientOrders[0].fechaOrden).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        
        const orderCount = clientOrders.length;
        let frequency = 'Nuevo Cliente';
        if (orderCount > 0 && orderCount <= 2) frequency = 'Ocasional';
        else if (orderCount > 2 && orderCount <= 5) frequency = 'Frecuente';
        else if (orderCount > 5) frequency = 'VIP (Recurrente)';
        
        const contactObj = selectedClientObj?.contactos?.[0] || {};
        const comment = contactObj.nombreCon 
            ? `Contacto: ${contactObj.nombreCon} (${contactObj.cargo || 'Contacto'}) - Cel: ${contactObj.telefonoCon || 'Sin número'}`
            : 'Este cliente aún no tiene un contacto principal registrado.';
            
        return { lastService, frequency, comment };
    };
    
    const clientStats = getClientStats();

    const handleGenerarPDFOrden = async (ord) => {
        try {
            const sol = ord.solicitudServicio;
            const cliente = sol?.cliente;
            const empleado = sol?.empleado;
            const detalles = ord.detalles || [];
            
            const htmlContent = `
                <html>
                <head>
                    <title>Orden de Servicio - ${formatOS(ord.idOrdenServicio)}</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            color: #1e293b;
                            line-height: 1.6;
                            padding: 40px;
                            background: white;
                        }
                        .header-table {
                            width: 100%;
                            border-bottom: 3px solid #0b7a75;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .company-name {
                            font-size: 26px;
                            font-weight: 800;
                            color: #003b5c;
                        }
                        .company-sub {
                            font-size: 11px;
                            font-weight: 600;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .report-title {
                            text-align: right;
                            font-size: 20px;
                            font-weight: 700;
                            color: #0b7a75;
                            letter-spacing: -0.5px;
                        }
                        .report-code {
                            text-align: right;
                            font-size: 13px;
                            font-weight: 700;
                            color: #334155;
                            margin-top: 4px;
                        }
                        .section-title {
                            font-size: 13px;
                            font-weight: 800;
                            color: #003b5c;
                            background: #f8fafc;
                            padding: 8px 12px;
                            margin-top: 25px;
                            margin-bottom: 12px;
                            border-left: 4px solid #0b7a75;
                            text-transform: uppercase;
                        }
                        .grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 10px;
                            margin-bottom: 15px;
                        }
                        .field {
                            font-size: 12px;
                        }
                        .label {
                            font-weight: 700;
                            color: #475569;
                        }
                        table.details-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 15px;
                            font-size: 12px;
                        }
                        table.details-table th {
                            background: #003b5c;
                            color: white;
                            padding: 8px 10px;
                            text-align: left;
                            font-weight: 700;
                        }
                        table.details-table td {
                            padding: 8px 10px;
                            border-bottom: 1px solid #e2e8f0;
                        }
                        .total-section {
                            text-align: right;
                            margin-top: 20px;
                            font-size: 15px;
                            font-weight: 700;
                            color: #003b5c;
                        }
                        .terms {
                            margin-top: 35px;
                            font-size: 10px;
                            color: #64748b;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 15px;
                        }
                        .signature-container {
                            margin-top: 60px;
                            display: flex;
                            justify-content: space-around;
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        .signature-box {
                            width: 200px;
                            border-top: 1px solid #cbd5e1;
                            text-align: center;
                            padding-top: 8px;
                            font-size: 11px;
                            color: #475569;
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        .footer {
                            margin-top: 50px;
                            text-align: center;
                            font-size: 10px;
                            color: #94a3b8;
                            border-top: 1px solid #f1f5f9;
                            padding-top: 15px;
                        }
                    </style>
                </head>
                <body>
                    <table class="header-table">
                        <tr>
                            <td>
                                <div class="company-name">Econex<span style="color: #0b7a75">us</span></div>
                                <div class="company-sub">Soluciones Ambientales e Higiene Integrada</div>
                            </td>
                            <td>
                                <div class="report-title">ORDEN DE SERVICIO / CONTRATO COMERCIAL</div>
                                <div class="report-code">Código: ${formatOS(ord.idOrdenServicio)}</div>
                            </td>
                        </tr>
                    </table>

                    <div class="section-title">1. Datos del Cliente</div>
                    <div class="grid">
                        <div class="field"><span class="label">Razón Social:</span> ${cliente?.razonSocial || '-'}</div>
                        <div class="field"><span class="label">RUC:</span> ${cliente?.ruc || '-'}</div>
                        <div class="field"><span class="label">Dirección Fiscal:</span> ${cliente?.direccion || 'No registrada'}</div>
                        <div class="field"><span class="label">Email Cliente:</span> ${cliente?.emailCliente || '-'}</div>
                        <div class="field"><span class="label">Contacto Principal:</span> ${cliente?.contactos?.[0]?.nombreCon || 'No registrado'}</div>
                        <div class="field"><span class="label">Teléfono Contacto:</span> ${cliente?.contactos?.[0]?.telefonoCon || '-'}</div>
                    </div>

                    <div class="section-title">2. Datos de la Operación</div>
                    <div class="grid">
                        <div class="field"><span class="label">Fecha de Emisión:</span> ${new Date(ord.fechaOrden).toLocaleDateString()}</div>
                        <div class="field"><span class="label">Ejecutivo a Cargo:</span> ${empleado?.nombreEmp} ${empleado?.apellidoEmp} (${empleado?.cargoEmp || 'Asesor'})</div>
                        <div class="field"><span class="label">Estado del Contrato:</span> ${ord.estadoOrden || 'PENDIENTE'}</div>
                    </div>

                    <div class="section-title">3. Detalle de Servicios Contratados</div>
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th style="text-align: center;">Cantidad</th>
                                <th style="text-align: right;">Precio Unitario</th>
                                <th style="text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalles.length === 0 ? `
                                <tr><td colSpan="4" style="text-align: center; color: #64748b;">No hay servicios detallados en esta orden.</td></tr>
                            ` : detalles.map(d => `
                                <tr>
                                    <td>${d.tipoServicio?.nombreServicio || 'Servicio'}</td>
                                    <td style="text-align: center;">${d.cantidad}</td>
                                    <td style="text-align: right;">${formatCurrency(d.precioUnitario)}</td>
                                    <td style="text-align: right;">${formatCurrency(d.subtotal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="total-section">
                        Monto Total Contratado: ${formatCurrency(ord.montoTotal)}
                    </div>

                    <div class="terms">
                        <strong>Condiciones Comerciales y de Servicio:</strong>
                        <p style="margin: 4px 0 0 0;">1. El cliente se compromete a facilitar el acceso de las cuadrillas técnicas en las fechas planificadas.<br>
                        2. Los insumos y químicos utilizados cumplen con los estándares autorizados por DIGESA.<br>
                        3. Cualquier reprogramación de visitas debe realizarse con un mínimo de 24 horas de anticipación.</p>
                    </div>

                    <div class="signature-container">
                        <div class="signature-box">
                            <br><br><br>
                            <strong>Econexus S.A.C.</strong><br>
                            Emisor Autorizado
                        </div>
                        <div class="signature-box">
                            <br><br><br>
                            <strong>Aceptación del Cliente</strong><br>
                            Firma del Representante
                        </div>
                    </div>

                    <div class="footer">
                        <p>© 2026 Econexus Soluciones Ambientales. Todos los derechos reservados. Este documento representa un contrato comercial digital de servicios.</p>
                    </div>
                </body>
                </html>
            `;

            // Save original styles to prevent overflow clipping
            const originalBodyOverflow = document.body.style.overflow;
            const originalHtmlOverflow = document.documentElement.style.overflow;
            document.body.style.overflow = 'visible';
            document.documentElement.style.overflow = 'visible';
            
            const opt = {
                margin:       [10, 10, 10, 10],
                filename:     `Contrato_Econexus_${formatOS(ord.idOrdenServicio)}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            try {
                await html2pdf().set(opt).from(htmlContent).save();
            } finally {
                document.body.style.overflow = originalBodyOverflow;
                document.documentElement.style.overflow = originalHtmlOverflow;
            }
        } catch (error) {
            console.error("Error al generar PDF de la Orden", error);
            alert("No se pudo generar el contrato en PDF.");
        }
    };

    const handleAddServicio = () => {
        const tipo = tiposServicio.find(t => t.idTipoServicio.toString() === selectedTipo.toString());
        if (tipo && cantidadSelected > 0) {
            setServicios([...servicios, {
                idTipoServicio: tipo.idTipoServicio,
                nombre: tipo.nombreServicio,
                cantidad: cantidadSelected,
                precio: tipo.precioBase,
                subtotal: cantidadSelected * tipo.precioBase
            }]);
            setCantidadSelected(1);
            setFormErrors(prev => ({ ...prev, servicios: null }));
        }
    };

    const handleRemoveServicio = (index) => {
        const newSrv = [...servicios];
        newSrv.splice(index, 1);
        setServicios(newSrv);
    };

    const subtotal = servicios.reduce((acc, curr) => acc + curr.subtotal, 0);
    const iva = subtotal * 0.18;
    const total = subtotal + iva;

    const handleNew = () => {
        setSelectedOrden(null);
        setEditingId(null);
        setServicios([]);
        
        setSolicitud({
            idCliente: '',
            fecha: new Date().toISOString().split('T')[0],
            idEmpleado: empleados.length > 0 ? empleados[0].idEmpleado : '',
            estado: 'PENDIENTE',
            descripcion: ''
        });
        
        setClientSearch('');
        setSelectedTipo('');
        setServiceSearch('');
        setFormErrors({});
        
        setView('form');
    };

    const handleEdit = (ord) => {
        setSelectedOrden(ord);
        setEditingId(ord.idOrdenServicio);
        const sol = ord.solicitudServicio || {};
        
        // Populate services from order details
        const mappedServicios = (ord.detalles || []).map(d => ({
            idTipoServicio: d.tipoService?.idTipoServicio || d.tipoServicio?.idTipoServicio,
            nombre: d.tipoService?.nombreServicio || d.tipoServicio?.nombreServicio || 'Servicio',
            cantidad: d.cantidad,
            precio: d.precioUnitario,
            subtotal: d.subtotal
        }));
        setServicios(mappedServicios);

        setSolicitud({
            idCliente: sol.cliente ? sol.cliente.idCliente.toString() : '',
            fecha: sol.fechaSolicitud ? sol.fechaSolicitud.split('T')[0] : new Date().toISOString().split('T')[0],
            idEmpleado: sol.empleado ? sol.empleado.idEmpleado.toString() : '',
            estado: ord.estadoOrden || 'PENDIENTE',
            descripcion: sol.descripcionSol || ''
        });
        
        if (sol.cliente) {
            setClientSearch(`${sol.cliente.razonSocial} - ${sol.cliente.ruc}`);
        } else {
            setClientSearch('');
        }
        
        setSelectedTipo('');
        setServiceSearch('');

        setView('form');
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta orden y su solicitud asociada?")) {
            try {
                await deleteOrdenServicio(id);
                alert("Orden eliminada exitosamente");
                fetchOrdenes();
            } catch (error) {
                console.error("Error al eliminar orden", error);
                alert("No se pudo eliminar el registro. Puede estar planificado.");
            }
        }
    };

    const handleCancel = async (ord) => {
        if (window.confirm(`¿Está seguro de que desea CANCELAR la orden de servicio #${ord.idOrdenServicio}?`)) {
            try {
                const updatedOrder = {
                    ...ord,
                    estadoOrden: 'CANCELADA'
                };
                await updateOrdenServicio(ord.idOrdenServicio, updatedOrder);
                alert("Orden cancelada exitosamente");
                fetchOrdenes();
            } catch (error) {
                console.error("Error al cancelar orden", error);
                alert("No se pudo cancelar el registro.");
            }
        }
    };

    const handleGenerarOrden = async () => {
        const errors = {};
        if (!solicitud.idCliente) {
            errors.idCliente = "Debe seleccionar un cliente para generar la orden.";
        }
        if (!solicitud.fecha) {
            errors.fecha = "La fecha de solicitud es obligatoria.";
        }
        if (!solicitud.idEmpleado) {
            errors.idEmpleado = "Debe seleccionar un empleado que atienda la solicitud.";
        }
        if (/[<>]/.test(solicitud.descripcion || '')) {
            errors.descripcion = "La descripción no puede contener caracteres HTML (< o >).";
        }
        if (servicios.length === 0) {
            errors.servicios = "Debe agregar al menos un servicio contratado a la lista antes de generar la orden.";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        try {
            // 1. Payload
            const payload = {
                idOrdenServicio: editingId,
                fechaOrden: new Date().toISOString(),
                estadoOrden: solicitud.estado,
                montoTotal: total,
                solicitudServicio: {
                    idSolicitudServicio: selectedOrden?.solicitudServicio?.idSolicitudServicio || null,
                    fechaSolicitud: `${solicitud.fecha}T00:00:00`,
                    descripcionSol: solicitud.descripcion,
                    estadoSol: 'APROBADA',
                    cliente: { idCliente: parseInt(solicitud.idCliente) },
                    empleado: { idEmpleado: parseInt(solicitud.idEmpleado) }
                },
                detalles: servicios.map(s => ({
                    cantidad: s.cantidad,
                    precioUnitario: s.precio,
                    subtotal: s.subtotal,
                    tipoServicio: { idTipoServicio: s.idTipoServicio }
                }))
            };

            if (editingId) {
                await updateOrdenServicio(editingId, payload);
                alert("Orden de servicio actualizada exitosamente!");
            } else {
                await createOrdenServicio(payload);
                alert("Orden generada exitosamente!");
            }
            
            // Reset and go back
            setServicios([]);
            setSolicitud({ ...solicitud, descripcion: '' });
            setView('list');
            
        } catch (error) {
            console.error("Error al guardar la orden", error);
            alert("Ocurrió un error al guardar la orden de servicio.");
        }
    };

    const handleOpenDetails = (ord) => {
        setSelectedOrden(ord);
        setShowDetailsModal(true);
    };

    if (view === 'list') {
        const filteredOrdenes = ordenes.filter(ord => {
            const clientName = (ord.solicitudServicio?.cliente?.razonSocial || '').toLowerCase();
            const matchesSearch = clientName.includes(searchQuery.toLowerCase()) || 
                                  String(ord.idOrdenServicio).includes(searchQuery);
            const matchesStatus = statusFilter === 'ALL' || ord.estadoOrden === statusFilter;
            
            const total = ord.montoTotal || 0;
            const matchesMin = minAmount === '' || total >= parseFloat(minAmount);
            const matchesMax = maxAmount === '' || total <= parseFloat(maxAmount);
            
            // Date Filter
            const ordDateStr = ord.fechaOrden ? ord.fechaOrden.split('T')[0] : '';
            const matchesStartDate = !startDate || ordDateStr >= startDate;
            const matchesEndDate = !endDate || ordDateStr <= endDate;

            // Client Dropdown Filter
            const matchesClient = clientFilter === 'ALL' || (ord.solicitudServicio?.cliente?.idCliente?.toString() === clientFilter);
            
            return matchesSearch && matchesStatus && matchesMin && matchesMax && matchesStartDate && matchesEndDate && matchesClient;
        });

        const itemsPerPage = 15;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentOrdenes = filteredOrdenes.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);

        const handleClearFilters = () => {
            setSearchQuery('');
            setStatusFilter('ALL');
            setMinAmount('');
            setMaxAmount('');
            setStartDate('');
            setEndDate('');
            setClientFilter('ALL');
        };

        return (
            <div className="servicios-page">
                <div className="breadcrumb">GESTIÓN / SERVICIOS</div>
                
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Historial de Órdenes</h1>
                        <p className="page-subtitle">Visualiza y administra las solicitudes y órdenes de servicio del sistema.</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn-nuevo" onClick={handleNew}>
                            <MdAddIcon size={18} /> Nueva Solicitud
                        </button>
                    </div>
                </div>

                <div className="filters-bar">
                    <div className="filter-group search">
                        <span className="filter-label">Buscar Orden</span>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Buscar por cliente o ID de orden..." 
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
                    <div className="filter-group">
                        <span className="filter-label">Desde</span>
                        <input 
                            type="date" 
                            className="filter-input" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Hasta</span>
                        <input 
                            type="date" 
                            className="filter-input" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group" style={{ flex: 1, minWidth: '120px' }}>
                        <span className="filter-label">Monto Mín</span>
                        <input 
                            type="number" 
                            className="filter-input" 
                            placeholder="S/. Min" 
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                        />
                    </div>
                    <div className="filter-group" style={{ flex: 1, minWidth: '120px' }}>
                        <span className="filter-label">Monto Máx</span>
                        <input 
                            type="number" 
                            className="filter-input" 
                            placeholder="S/. Max" 
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                        />
                    </div>
                    {(searchQuery || statusFilter !== 'ALL' || minAmount || maxAmount || startDate || endDate || clientFilter !== 'ALL') && (
                        <div className="filter-group action">
                            <button className="btn-filter-clear" onClick={handleClearFilters}>
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>

                <div className="table-container">
                    <table className="main-table">
                        <thead>
                            <tr>
                                <th>ID Orden</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Monto Total</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                            ) : filteredOrdenes.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron órdenes con los filtros aplicados.</td></tr>
                            ) : (
                                currentOrdenes.map(ord => {
                                    const canEditDelete = ord.estadoOrden === 'PENDIENTE' || ord.estadoOrden === 'EN_PROCESO';
                                    return (
                                        <tr key={ord.idOrdenServicio}>
                                            <td style={{ fontWeight: 'bold' }}># {ord.idOrdenServicio}</td>
                                            <td>{new Date(ord.fechaOrden).toLocaleDateString()}</td>
                                            <td>{ord.solicitudServicio?.cliente?.razonSocial || 'Desconocido'}</td>
                                            <td style={{ color: '#0b7a75', fontWeight: 'bold' }}>{formatCurrency(ord.montoTotal)}</td>
                                            <td>
                                                <span className={`status-badge status-${ord.estadoOrden?.toLowerCase()}`}>
                                                    {ord.estadoOrden?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-table-details" onClick={() => handleOpenDetails(ord)} title="Ver Detalles" style={{ marginRight: '6px' }}>
                                                    <MdEyeIcon size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Detalles
                                                </button>
                                                {ord.estadoOrden === 'PENDIENTE' && (
                                                    <>
                                                        <button className="btn-table-pdf" onClick={() => handleGenerarPDFOrden(ord)} style={{ padding: '6px 12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '6px' }} title="Descargar Contrato PDF">
                                                            <MdPrint size={14} /> PDF
                                                        </button>
                                                        <button className="btn-table-cancel" onClick={() => handleCancel(ord)} style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '6px' }} title="Cancelar Orden">
                                                            <MdClose size={14} /> Cancelar
                                                        </button>
                                                    </>
                                                )}
                                                {canEditDelete && (
                                                    <>
                                                        <button className="btn-table-edit" onClick={() => handleEdit(ord)} style={{ marginRight: '6px' }}>Editar</button>
                                                        <button className="btn-table-delete" onClick={() => handleDelete(ord.idOrdenServicio)}>Borrar</button>
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

                {/* Details Modal */}
                {showDetailsModal && selectedOrden && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ width: '600px' }}>
                            <div className="modal-header">
                                <h2>Detalles de Orden de Servicio # {selectedOrden.idOrdenServicio}</h2>
                                <button className="btn-close" onClick={() => setShowDetailsModal(false)}>
                                    <MdClose size={20} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ fontSize: '14px', color: '#334155' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div><strong>Cliente:</strong> {selectedOrden.solicitudServicio?.cliente?.razonSocial}</div>
                                    <div><strong>RUC:</strong> {selectedOrden.solicitudServicio?.cliente?.ruc}</div>
                                    <div><strong>Fecha Orden:</strong> {new Date(selectedOrden.fechaOrden).toLocaleString()}</div>
                                    <div><strong>Estado:</strong> {selectedOrden.estadoOrden}</div>
                                    <div><strong>Empleado Atiende:</strong> {selectedOrden.solicitudServicio?.empleado?.nombreEmp} {selectedOrden.solicitudServicio?.empleado?.apellidoEmp}</div>
                                    <div><strong>Total a Pagar:</strong> {formatCurrency(selectedOrden.montoTotal)}</div>
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <strong>Descripción de Solicitud:</strong>
                                    <p style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', fontStyle: 'italic', marginTop: '6px' }}>
                                        {selectedOrden.solicitudServicio?.descripcionSol || 'Sin descripción adicional.'}
                                    </p>
                                </div>
                                <div>
                                    <strong>Servicios Contratados:</strong>
                                    <table className="servicios-table" style={{ marginTop: '10px', width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th>Servicio</th>
                                                <th>Cantidad</th>
                                                <th>Precio</th>
                                                <th>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(selectedOrden.detalles || []).map((det, idx) => (
                                                <tr key={idx}>
                                                    <td>{det.tipoServicio?.nombreServicio || det.tipoService?.nombreServicio || 'Servicio'}</td>
                                                    <td>{det.cantidad}</td>
                                                    <td>{formatCurrency(det.precioUnitario)}</td>
                                                    <td>{formatCurrency(det.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '15px 0 0 0', marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                {selectedOrden.estadoOrden === 'PENDIENTE' && (
                                    <button className="btn-table-pdf" onClick={() => handleGenerarPDFOrden(selectedOrden)} style={{ padding: '8px 16px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                        <MdPrint size={18} /> Descargar Contrato PDF
                                    </button>
                                )}
                                <button className="btn-cancelar" onClick={() => setShowDetailsModal(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="servicios-page">
            <div className="breadcrumb">
                <span className="badge-dark">SOLICITUD_SERVICIO</span> / {editingId ? `EDITAR_REGISTRO #${editingId}` : 'NUEVO_REGISTRO'}
            </div>
            
            <div className="page-header">
                <div>
                    <h1 className="page-title">{editingId ? 'Editar Solicitud' : 'Solicitud de Servicio'}</h1>
                    <p className="page-subtitle">Configure los detalles específicos para la realización de los trabajos contratados.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-cancelar" onClick={() => setView('list')}>
                        <MdBackIcon size={16} /> Volver
                    </button>
                    <button className="btn-generar" onClick={handleGenerarOrden}>
                        <MdSaveIcon size={16} /> {editingId ? 'Guardar Cambios' : 'Generar orden de servicio'}
                    </button>
                </div>
            </div>

            <div className="content-layout">
                <div className="main-column">
                    <div className="form-card">
                        <div className="card-header">
                            <MdOrderIcon size={22} className="card-icon" />
                            <h2>Información de la Solicitud</h2>
                        </div>
                        
                        <div className="form-group mb-20">
                            <label>Cliente <span style={{color: 'red'}}>*</span></label>
                            <div className="searchable-dropdown-wrapper" style={{ position: 'relative' }}>
                                <input 
                                    type="text"
                                    className={formErrors.idCliente ? 'input-error' : ''}
                                    placeholder="Escribe para buscar cliente..."
                                    value={clientSearch}
                                    onFocus={() => setShowClientDropdown(true)}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value);
                                        const matched = clientes.find(c => `${c.razonSocial} - ${c.ruc}` === e.target.value);
                                        setSolicitud(s => ({ ...s, idCliente: matched ? matched.idCliente.toString() : '' }));
                                        setFormErrors(prev => ({ ...prev, idCliente: null }));
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowClientDropdown(false), 200);
                                    }}
                                />
                                {formErrors.idCliente && <span className="error-message">{formErrors.idCliente}</span>}
                                {showClientDropdown && (
                                    <div className="dropdown-options-list">
                                        {clientes.filter(c => 
                                            `${c.razonSocial} ${c.ruc}`.toLowerCase().includes(clientSearch.toLowerCase())
                                        ).map(c => (
                                            <div 
                                                key={c.idCliente}
                                                className="dropdown-option-item"
                                                onMouseDown={() => {
                                                    setClientSearch(`${c.razonSocial} - ${c.ruc}`);
                                                    setSolicitud(s => ({ ...s, idCliente: c.idCliente.toString() }));
                                                    setShowClientDropdown(false);
                                                }}
                                            >
                                                <div style={{ fontWeight: '500', color: '#1e293b' }}>{c.razonSocial}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>RUC: {c.ruc}</div>
                                            </div>
                                        ))}
                                        {clientes.filter(c => 
                                            `${c.razonSocial} ${c.ruc}`.toLowerCase().includes(clientSearch.toLowerCase())
                                        ).length === 0 && (
                                            <div style={{ padding: '10px 12px', color: '#64748b', fontStyle: 'italic' }}>
                                                No se encontraron clientes
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Fecha de solicitud <span style={{color: 'red'}}>*</span></label>
                                <div className="date-input-wrapper">
                                    <input 
                                        type="date" 
                                        className={formErrors.fecha ? 'input-error' : ''} 
                                        value={solicitud.fecha} 
                                        onChange={(e) => {
                                            setSolicitud({...solicitud, fecha: e.target.value});
                                            setFormErrors(prev => ({ ...prev, fecha: null }));
                                        }} 
                                    />
                                </div>
                                {formErrors.fecha && <span className="error-message">{formErrors.fecha}</span>}
                            </div>
                            <div className="form-group">
                                <label>Empleado que atiende <span style={{color: 'red'}}>*</span></label>
                                <select 
                                    className={formErrors.idEmpleado ? 'input-error' : ''} 
                                    value={solicitud.idEmpleado} 
                                    onChange={(e) => {
                                        setSolicitud({...solicitud, idEmpleado: e.target.value});
                                        setFormErrors(prev => ({ ...prev, idEmpleado: null }));
                                    }}
                                >
                                    <option value="">-- Seleccionar Empleado --</option>
                                    {empleados.map(emp => (
                                        <option key={emp.idEmpleado} value={emp.idEmpleado}>{emp.nombreEmp} {emp.apellidoEmp}</option>
                                    ))}
                                </select>
                                {formErrors.idEmpleado && <span className="error-message">{formErrors.idEmpleado}</span>}
                            </div>
                        </div>

                        <div className="form-group mb-20">
                            <label>Estado de la Orden</label>
                            <input 
                                type="text" 
                                readOnly 
                                value={solicitud.estado} 
                                style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }} 
                            />
                        </div>

                        <div className="form-group">
                            <label>Descripción del servicio solicitado</label>
                            <textarea 
                                className={formErrors.descripcion ? 'input-error' : ''}
                                placeholder="Detalle los requerimientos específicos del cliente..." 
                                rows="3"
                                value={solicitud.descripcion}
                                onChange={(e) => {
                                    setSolicitud({...solicitud, descripcion: e.target.value});
                                    setFormErrors(prev => ({ ...prev, descripcion: null }));
                                }}
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
                            ></textarea>
                            {formErrors.descripcion && <span className="error-message">{formErrors.descripcion}</span>}
                        </div>
                    </div>

                    <div className="form-card">
                        <div className="card-header">
                            <MdLocalOffer size={22} className="card-icon" />
                            <h2>Agregar Servicios</h2>
                        </div>
                        <div className="form-grid" style={{alignItems: 'end'}}>
                            <div className="form-group">
                                <label>Tipo de Servicio</label>
                                <div className="searchable-dropdown-wrapper" style={{ position: 'relative' }}>
                                    <input 
                                        type="text"
                                        placeholder="Escribe para buscar servicio..."
                                        value={serviceSearch}
                                        onFocus={() => setShowServiceDropdown(true)}
                                        onChange={(e) => {
                                            setServiceSearch(e.target.value);
                                            const matched = tiposServicio.find(ts => `${ts.nombreServicio} - ${formatCurrency(ts.precioBase)}` === e.target.value);
                                            setSelectedTipo(matched ? matched.idTipoServicio.toString() : '');
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => setShowServiceDropdown(false), 200);
                                        }}
                                    />
                                    {showServiceDropdown && (
                                        <div className="dropdown-options-list">
                                            {tiposServicio.filter(ts => 
                                                ts.nombreServicio.toLowerCase().includes(serviceSearch.toLowerCase())
                                            ).map(ts => (
                                                <div 
                                                    key={ts.idTipoServicio}
                                                    className="dropdown-option-item"
                                                    onMouseDown={() => {
                                                        setServiceSearch(`${ts.nombreServicio} - ${formatCurrency(ts.precioBase)}`);
                                                        setSelectedTipo(ts.idTipoServicio.toString());
                                                        setShowServiceDropdown(false);
                                                    }}
                                                >
                                                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{ts.nombreServicio}</div>
                                                    <div style={{ fontSize: '12px', color: '#0b7a75', fontWeight: 'bold' }}>{formatCurrency(ts.precioBase)}</div>
                                                </div>
                                            ))}
                                            {tiposServicio.filter(ts => 
                                                ts.nombreServicio.toLowerCase().includes(serviceSearch.toLowerCase())
                                            ).length === 0 && (
                                                <div style={{ padding: '10px 12px', color: '#64748b', fontStyle: 'italic' }}>
                                                    No se encontraron servicios
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-group" style={{display: 'flex', gap: '10px'}}>
                                <div style={{flex: 1}}>
                                    <label>Cantidad</label>
                                    <input type="number" min="1" value={cantidadSelected} onChange={(e) => setCantidadSelected(parseInt(e.target.value) || 1)} />
                                </div>
                                <button className="btn-generar" onClick={handleAddServicio} style={{height: '42px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </div>

                    {formErrors.servicios && <span className="error-message" style={{ display: 'block', marginBottom: '15px' }}>{formErrors.servicios}</span>}
                    <div className="table-card">
                        <div className="table-header-bg"></div>
                        <table className="servicios-table">
                            <thead>
                                <tr>
                                    <th>Servicio</th>
                                    <th>Cantidad</th>
                                    <th>Precio unitario</th>
                                    <th>Subtotal</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {servicios.map((srv, idx) => (
                                    <tr key={idx}>
                                        <td>{srv.nombre}</td>
                                        <td className="text-center">{srv.cantidad}</td>
                                        <td>{formatCurrency(srv.precio)}</td>
                                        <td className="subtotal-cell">{formatCurrency(srv.subtotal)}</td>
                                        <td className="action-cell">
                                            <MdDeleteIcon size={22} className="delete-icon" onClick={() => handleRemoveServicio(idx)} style={{ cursor: 'pointer', color: '#ef4444' }} />
                                        </td>
                                    </tr>
                                ))}
                                {servicios.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>
                                            Aún no has agregado servicios a la orden.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="side-column">
                    <div className="totals-card">
                        <div className="totals-header">
                            Resumen de Totales
                        </div>
                        <div className="divider"></div>
                        <div className="totals-row">
                            <span>Subtotal de Servicios</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="totals-row">
                            <span>IGV (18%)</span>
                            <span>{formatCurrency(iva)}</span>
                        </div>
                        <div className="totals-final">
                            <span className="final-label">MONTO TOTAL A PAGAR</span>
                            <span className="final-amount">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    <div className="stats-card">
                        <div className="stats-header">ESTADÍSTICAS DEL CLIENTE</div>
                        
                        <div className="stat-item">
                            <div className="stat-icon-wrapper green-bg">
                                <MdHistory size={20} />
                            </div>
                            <div>
                                <div className="stat-label">Último Servicio</div>
                                <div className="stat-value">{clientStats.lastService}</div>
                            </div>
                        </div>

                        <div className="stat-item">
                            <div className="stat-icon-wrapper blue-bg">
                                <MdLocalOffer size={20} />
                            </div>
                            <div>
                                <div className="stat-label">Frecuencia</div>
                                <div className="stat-value">{clientStats.frequency}</div>
                            </div>
                        </div>

                        <div className="stat-quote">
                            "{clientStats.comment}"
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Servicios;
