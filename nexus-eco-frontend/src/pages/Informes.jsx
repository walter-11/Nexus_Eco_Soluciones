import React, { useState, useEffect } from 'react';
import { MdAssessment, MdSave, MdAdd, MdArrowBack, MdOutlinePictureAsPdf } from 'react-icons/md';
import { getInformes, createInforme, updateInforme, deleteInforme, getEjecuciones, getAuditorias } from '../api/api';
import './Informes.css';

const formatOS = (id) => `OS-2026-${String(id).padStart(4, '0')}`;
const formatInforme = (id) => `INF-2026-${String(id).padStart(4, '0')}`;

const Informes = () => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [informes, setInformes] = useState([]);
    const [ejecuciones, setEjecuciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, typeFilter, statusFilter]);

    const [form, setForm] = useState({
        idEjecucionServicio: '',
        tipoInforme: 'Mensual',
        estadoEnvio: 'PENDIENTE'
    });

    useEffect(() => {
        if (view === 'list') {
            fetchInformes();
        } else {
            fetchEjecuciones();
        }
    }, [view]);

    const fetchInformes = async () => {
        try {
            setLoading(true);
            const response = await getInformes();
            const sortedData = [...response.data].sort((a, b) => b.idInformeServicio - a.idInformeServicio);
            setInformes(sortedData);
        } catch (error) {
            console.error("Error al obtener informes", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEjecuciones = async () => {
        try {
            const [resExecs, resAuds] = await Promise.all([
                getEjecuciones(),
                getAuditorias()
            ]);
            
            // Only allow generating reports for executions that have been audited
            const auditedExecIds = resAuds.data
                .map(a => a.ejecucionServicio?.idEjecucionServicio)
                .filter(Boolean);
                
            const filtered = resExecs.data.filter(ej => auditedExecIds.includes(ej.idEjecucionServicio));
            
            setEjecuciones(filtered);
            if (filtered.length > 0) {
                setForm(f => ({ ...f, idEjecucionServicio: filtered[0].idEjecucionServicio.toString() }));
            } else {
                setForm(f => ({ ...f, idEjecucionServicio: '' }));
            }
        } catch (error) {
            console.error("Error al obtener ejecuciones", error);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleNew = () => {
        if (ejecuciones.length === 0) {
            alert("No hay ejecuciones de servicio auditadas disponibles para generar informes. Asegúrese de realizar una auditoría de calidad primero.");
            return;
        }
        setEditingId(null);
        setForm({
            idEjecucionServicio: ejecuciones.length > 0 ? ejecuciones[0].idEjecucionServicio.toString() : '',
            tipoInforme: 'Mensual',
            estadoEnvio: 'PENDIENTE'
        });
        setView('form');
    };

    const handleEdit = (inf) => {
        setEditingId(inf.idInformeServicio);
        setForm({
            idEjecucionServicio: inf.ejecucionServicio ? inf.ejecucionServicio.idEjecucionServicio.toString() : '',
            tipoInforme: inf.tipoInforme || 'Mensual',
            estadoEnvio: inf.estadoEnvio || 'PENDIENTE'
        });
        setView('form');
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar este informe?")) {
            try {
                await deleteInforme(id);
                alert("Informe eliminado exitosamente");
                fetchInformes();
            } catch (error) {
                console.error("Error al eliminar informe", error);
                alert("No se pudo eliminar el informe.");
            }
        }
    };

    const handleSave = async () => {
        if (!form.idEjecucionServicio || !form.tipoInforme) {
            alert("Ejecución y Tipo de Informe son requeridos.");
            return;
        }

        const payload = {
            idInformeServicio: editingId,
            tipoInforme: form.tipoInforme,
            estadoEnvio: form.estadoEnvio,
            ejecucionServicio: {
                idEjecucionServicio: parseInt(form.idEjecucionServicio)
            }
        };

        try {
            if (editingId) {
                await updateInforme(editingId, payload);
                alert("Informe actualizado exitosamente");
            } else {
                await createInforme(payload);
                alert("Informe guardado exitosamente");
            }
            setView('list');
        } catch (error) {
            console.error("Error al guardar informe", error);
            alert("Ocurrió un error al guardar el informe. Asegúrese de que la ejecución seleccionada esté auditada.");
        }
    };

    const handleGenerarPDF = async (inf) => {
        try {
            // Obtener auditorías para extraer la calificación y observaciones del supervisor
            const resAuds = await getAuditorias();
            const associatedAudit = resAuds.data.find(
                a => a.ejecucionServicio?.idEjecucionServicio === inf.ejecucionServicio?.idEjecucionServicio
            );

            const exec = inf.ejecucionServicio;
            const os = exec?.planificacionServicio?.ordenServicio;
            const sol = os?.solicitudServicio;
            const cliente = sol?.cliente;
            const detalles = os?.detalles || [];

            const htmlContent = `
                <html>
                <head>
                    <title>Reporte de Servicio Econexus - ${formatInforme(inf.idInformeServicio)}</title>
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
                            border-bottom: 3px solid #003b5c;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .company-name {
                            font-size: 32px;
                            font-weight: 800;
                            color: #003b5c;
                            letter-spacing: -0.5px;
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
                            color: #059669;
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
                            font-size: 14px;
                            font-weight: 800;
                            color: #003b5c;
                            background: #f8fafc;
                            padding: 8px 12px;
                            margin-top: 30px;
                            margin-bottom: 15px;
                            border-left: 4px solid #003b5c;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 12px;
                            margin-bottom: 20px;
                        }
                        .field {
                            font-size: 13px;
                        }
                        .label {
                            font-weight: 700;
                            color: #475569;
                        }
                        table.details-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 15px;
                            font-size: 13px;
                        }
                        table.details-table th {
                            background: #003b5c;
                            color: white;
                            padding: 10px 12px;
                            text-align: left;
                            font-weight: 700;
                        }
                        table.details-table td {
                            padding: 10px 12px;
                            border-bottom: 1px solid #e2e8f0;
                        }
                        .badge {
                            display: inline-block;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 11px;
                            font-weight: 700;
                            color: white;
                            text-transform: uppercase;
                        }
                        .badge-success { background: #059669; }
                        .stars {
                            color: #eab308;
                            font-size: 18px;
                            letter-spacing: 2px;
                        }
                        .footer {
                            margin-top: 100px;
                            text-align: center;
                            font-size: 11px;
                            color: #94a3b8;
                            border-top: 1px solid #f1f5f9;
                            padding-top: 20px;
                        }
                        .signature-container {
                            margin-top: 80px;
                            display: flex;
                            justify-content: space-around;
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        .signature-box {
                            width: 220px;
                            border-top: 1px solid #cbd5e1;
                            text-align: center;
                            padding-top: 10px;
                            font-size: 12px;
                            color: #475569;
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
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
                                <div class="report-title">INFORME TÉCNICO DE SERVICIO</div>
                                <div class="report-code">Código: ${formatInforme(inf.idInformeServicio)}</div>
                            </td>
                        </tr>
                    </table>

                    <div class="section-title">1. Información General del Cliente</div>
                    <div class="grid">
                        <div class="field"><span class="label">Razón Social:</span> ${cliente?.razonSocial || 'No registrado'}</div>
                        <div class="field"><span class="label">RUC:</span> ${cliente?.ruc || 'No registrado'}</div>
                        <div class="field"><span class="label">Dirección Fiscal:</span> ${cliente?.direccion || 'No registrado'}</div>
                        <div class="field"><span class="label">Correo Electrónico:</span> ${cliente?.emailCliente || 'No registrado'}</div>
                    </div>

                    <div class="section-title">2. Detalles de la Orden y Reporte</div>
                    <div class="grid">
                        <div class="field"><span class="label">Número de Orden:</span> ${os ? formatOS(os.idOrdenServicio) : 'No registrado'}</div>
                        <div class="field"><span class="label">Fecha de Orden:</span> ${os?.fechaOrden ? os.fechaOrden.split('T')[0] : '-'}</div>
                        <div class="field"><span class="label">Fecha Generación Informe:</span> ${inf.fechaGeneracion ? inf.fechaGeneracion.split('T')[0] : '-'}</div>
                        <div class="field"><span class="label">Tipo de Informe:</span> ${inf.tipoInforme}</div>
                    </div>

                    <div class="section-title">3. Catálogo de Servicios Aplicados</div>
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th>Descripción Operativa</th>
                                <th>Cantidad</th>
                                <th>Monto Unitario</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalles.length === 0 ? '<tr><td colspan="5">No hay servicios detallados.</td></tr>' : 
                                detalles.map(d => `
                                    <tr>
                                        <td><strong>${d.tipoServicio?.nombreServicio || 'Servicio'}</strong></td>
                                        <td>${d.tipoServicio?.descripcionTs || 'Servicio operativo estándar'}</td>
                                        <td>${d.cantidad}</td>
                                        <td>S/. ${d.precioUnitario?.toFixed(2)}</td>
                                        <td>S/. ${d.subtotal?.toFixed(2)}</td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>

                    <div class="section-title">4. Registro de Ejecución y Hallazgos en Campo</div>
                    <div class="grid">
                        <div class="field"><span class="label">Fecha de Ejecución:</span> ${exec?.fechaEjecucion ? exec.fechaEjecucion.split('T')[0] : '-'}</div>
                        <div class="field"><span class="label">Resultado del Servicio:</span> <span class="badge badge-success">${exec?.resultado || 'EXITOSO'}</span></div>
                        <div class="field" style="grid-column: span 2;"><span class="label">Observaciones del Técnico:</span> ${exec?.observacionesEj || 'Sin observaciones reportadas.'}</div>
                    </div>

                    <div class="section-title">5. Auditoría de Calidad y Control del Servicio</div>
                    ${associatedAudit ? `
                        <div class="grid">
                            <div class="field"><span class="label">Fecha de Auditoría:</span> ${associatedAudit.fechaAuditoria ? associatedAudit.fechaAuditoria.split('T')[0] : '-'}</div>
                            <div class="field"><span class="label">Calificación de Calidad:</span> 
                                <span class="stars">${'★'.repeat(associatedAudit.calificacion)}${'☆'.repeat(5 - associatedAudit.calificacion)}</span>
                                (${associatedAudit.calificacion}/5)
                            </div>
                            <div class="field" style="grid-column: span 2;"><span class="label">Observaciones del Supervisor de Calidad:</span> ${associatedAudit.observacionesAud || 'Servicio verificado y conforme.'}</div>
                        </div>
                    ` : `
                        <div style="font-size: 13px; color: #64748b; font-style: italic;">
                            El servicio ha sido completado y cumple con los estándares de control de calidad internos.
                        </div>
                    `}

                    <div class="signature-container">
                        <div class="signature-box">
                            <br><br><br>
                            <strong>Supervisor de Calidad</strong><br>
                            Econexus S.A.C.
                        </div>
                        <div class="signature-box">
                            <br><br><br>
                            <strong>Representante del Cliente</strong><br>
                            Aceptación y Conformidad
                        </div>
                    </div>

                    <div class="footer">
                        <p>© 2026 Econexus Soluciones Ambientales. Todos los derechos reservados. Impreso de forma automática por el sistema.</p>
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
                filename:     `Reporte_Econexus_${formatInforme(inf.idInformeServicio)}.pdf`,
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
            console.error("Error al generar PDF", error);
            alert("No se pudo generar el reporte PDF.");
        }
    };

    // Filtrado de informes
    const filteredInformes = informes.filter(inf => {
        const matchesSearch = searchQuery === '' || 
            (inf.ejecucionServicio?.planificacionServicio?.ordenServicio?.solicitudServicio?.cliente?.razonSocial || '')
                .toLowerCase().includes(searchQuery.toLowerCase()) ||
            formatInforme(inf.idInformeServicio).toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesType = typeFilter === 'ALL' || inf.tipoInforme === typeFilter;
        const matchesStatus = statusFilter === 'ALL' || inf.estadoEnvio === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });

    const itemsPerPage = 15;
    const totalPages = Math.ceil(filteredInformes.length / itemsPerPage);
    const currentInformes = filteredInformes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="informes-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
            <div className="breadcrumb">OPERATIVO / INFORMES DE SERVICIO</div>

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '28px', fontWeight: '700', color: '#003b5c', margin: '0 0 8px 0' }}>Informes de Servicio</h1>
                    <p className="page-subtitle" style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Genera y realiza el seguimiento de los informes finales para los clientes.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-nuevo" onClick={handleNew} style={{ padding: '8px 16px', background: '#003b5c', border: 'none', borderRadius: '4px', color: 'white', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <MdAdd size={18} /> Nuevo Informe
                    </button>
                </div>
            </div>

            {view === 'list' ? (
                <>
                    <div className="filters-bar">
                        <div className="filter-group search">
                            <span className="filter-label">Buscar Informe</span>
                            <input 
                                type="text" 
                                className="filter-input" 
                                placeholder="Buscar por cliente o código de informe..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Tipo de Informe</span>
                            <select 
                                className="filter-select" 
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="ALL">Todos los tipos</option>
                                <option value="Mensual">Mensual</option>
                                <option value="Semanal">Semanal</option>
                                <option value="Cierre">Cierre</option>
                                <option value="Especial">Especial</option>
                                <option value="FINAL_AUDITADO">Final Auditado</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <span className="filter-label">Estado Envío</span>
                            <select 
                                className="filter-select" 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Todos los estados</option>
                                <option value="PENDIENTE">PENDIENTE</option>
                                <option value="ENVIADO">ENVIADO</option>
                                <option value="RECIBIDO">RECIBIDO</option>
                            </select>
                        </div>
                        {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                            <div className="filter-group action">
                                <button className="btn-filter-clear" onClick={handleClearFilters}>
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="table-container" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflowX: 'auto' }}>
                        <table className="informes-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Código Informe</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Cliente / Empresa</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Nro. Orden</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Servicios Aplicados</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Fecha Generación</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Estado Envío</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                                ) : currentInformes.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron informes con los filtros aplicados.</td></tr>
                                ) : (
                                    currentInformes.map(inf => {
                                        const clientName = inf.ejecucionServicio?.planificacionServicio?.ordenServicio?.solicitudServicio?.cliente?.razonSocial || 'Cliente';
                                        const orderId = inf.ejecucionServicio?.planificacionServicio?.ordenServicio?.idOrdenServicio;
                                        const servicesList = inf.ejecucionServicio?.planificacionServicio?.ordenServicio?.detalles?.map(d => d.tipoServicio?.nombreServicio).filter(Boolean).join(', ') || 'Servicio';
                                        
                                        return (
                                            <tr key={inf.idInformeServicio} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: '600' }}>{formatInforme(inf.idInformeServicio)}</td>
                                                <td style={{ padding: '12px 16px' }}>{clientName}</td>
                                                <td style={{ padding: '12px 16px' }}>{orderId ? formatOS(orderId) : '-'}</td>
                                                <td style={{ padding: '12px 16px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={servicesList}>{servicesList}</td>
                                                <td style={{ padding: '12px 16px' }}>{inf.fechaGeneracion ? inf.fechaGeneracion.split('T')[0] : '-'}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span className={`status-badge status-${inf.estadoEnvio?.toLowerCase()}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'inline-block', textAlign: 'center', width: '90px' }}>
                                                        {inf.estadoEnvio}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                                                    <button className="btn-table-edit" onClick={() => handleEdit(inf)} style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Editar</button>
                                                    <button className="btn-table-pdf" onClick={() => handleGenerarPDF(inf)} style={{ padding: '6px 12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}><MdOutlinePictureAsPdf size={14} /> PDF</button>
                                                    <button className="btn-table-delete" onClick={() => handleDelete(inf.idInformeServicio)} style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Eliminar</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-bar" style={{ marginTop: '24px', marginBottom: '24px' }}>
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
                    <div className="header-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button className="btn-cancelar" onClick={() => setView('list')} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdArrowBack size={18} /> Volver
                        </button>
                        <button className="btn-guardar" onClick={handleSave} style={{ padding: '8px 16px', background: '#003b5c', border: 'none', borderRadius: '4px', color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdSave size={18} /> Guardar Informe
                        </button>
                    </div>

                    <div className="form-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '24px' }}>
                        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                            <MdAssessment size={22} className="card-icon" style={{ color: '#003b5c' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Detalles del Informe</h2>
                        </div>
                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Ejecución de Servicio Vinculada (Solo Auditadas)</label>
                                <select name="idEjecucionServicio" value={form.idEjecucionServicio} onChange={handleChange} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', color: '#334155', outline: 'none' }}>
                                    <option value="">-- Seleccionar Ejecución --</option>
                                    {ejecuciones.map(ej => (
                                        <option key={ej.idEjecucionServicio} value={ej.idEjecucionServicio}>
                                            EJEC-2026-{String(ej.idEjecucionServicio).padStart(4, '0')} - {ej.planificacionServicio?.ordenServicio?.solicitudServicio?.cliente?.razonSocial || 'Cliente'} (Fecha: {ej.fechaEjecucion?.split('T')[0]})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Tipo de Informe</label>
                                <select name="tipoInforme" value={form.tipoInforme} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', color: '#334155', outline: 'none' }}>
                                    <option value="Mensual">Mensual</option>
                                    <option value="Semanal">Semanal</option>
                                    <option value="Cierre">Cierre</option>
                                    <option value="Especial">Especial</option>
                                    <option value="FINAL_AUDITADO">Final Auditado</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Estado Envío</label>
                                <select name="estadoEnvio" value={form.estadoEnvio} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', color: '#334155', outline: 'none' }}>
                                    <option value="PENDIENTE">PENDIENTE</option>
                                    <option value="ENVIADO">ENVIADO</option>
                                    <option value="RECIBIDO">RECIBIDO</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Informes;
