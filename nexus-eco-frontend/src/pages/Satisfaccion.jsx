import React, { useState, useEffect } from 'react';
import { 
    MdStar, MdStarBorder, MdOpenInNew, MdOutlineAssignment, 
    MdDeleteOutline, MdRefresh, MdContentCopy, MdQrCode, MdClose 
} from 'react-icons/md';
import { getEncuestasSatisfaccion, deleteEncuestaSatisfaccion } from '../api/api';
import './Satisfaccion.css';

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScmxpUKav-c05jhL8LISTIiYdHESDE4MVI0MRv6vIVHR_W72Q/viewform?usp=sharing&ouid=102275724767380997873";

const Satisfaccion = () => {
    const [encuestas, setEncuestas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [copied, setCopied] = useState(false);

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [qualityFilter, setQualityFilter] = useState('ALL');
    const [professionalismFilter, setProfessionalismFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, qualityFilter, professionalismFilter]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(GOOGLE_FORM_URL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        fetchEncuestas();
    }, []);

    const fetchEncuestas = async () => {
        setLoading(true);
        try {
            const res = await getEncuestasSatisfaccion();
            const sortedData = [...res.data].sort((a, b) => new Date(b.fechaRespuesta) - new Date(a.fechaRespuesta));
            setEncuestas(sortedData);
        } catch (error) {
            console.error("Error fetching encuestas", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta respuesta de encuesta de MongoDB?")) {
            try {
                await deleteEncuestaSatisfaccion(id);
                alert("Respuesta eliminada exitosamente");
                fetchEncuestas();
            } catch (error) {
                console.error("Error al eliminar encuesta", error);
            }
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars.push(<MdStar key={i} className="star-filled" style={{ color: '#ffb400' }} />);
            } else {
                stars.push(<MdStarBorder key={i} className="star-empty" style={{ color: '#cbd5e1' }} />);
            }
        }
        return stars;
    };

    const filteredEncuestas = encuestas.filter(enc => {
        const clientName = (enc.nombreCliente || `Cliente ID: ${enc.idCliente || 'N/A'}`).toLowerCase();
        const service = (enc.tipoServicioRecibido || '').toLowerCase();
        const comments = (enc.sugerenciasComentarios || enc.comentarios || '').toLowerCase();
        
        const matchesSearch = clientName.includes(searchQuery.toLowerCase()) || 
                              service.includes(searchQuery.toLowerCase()) || 
                              comments.includes(searchQuery.toLowerCase());
                              
        const quality = enc.calidadGeneral || enc.calidadServicio;
        const matchesQuality = qualityFilter === 'ALL' || (quality && quality.toString() === qualityFilter);
        
        const professionalism = enc.amabilidadProfesionalismo || enc.profesionalismo;
        const matchesProf = professionalismFilter === 'ALL' || (professionalism && professionalism.toString() === professionalismFilter);
        
        return matchesSearch && matchesQuality && matchesProf;
    });

    const itemsPerPage = 15;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEncuestas = filteredEncuestas.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredEncuestas.length / itemsPerPage);

    const handleClearFilters = () => {
        setSearchQuery('');
        setQualityFilter('ALL');
        setProfessionalismFilter('ALL');
    };

    return (
        <div className="satisfaccion-page">
            <div className="breadcrumb">OPERATIVO / SATISFACCIÓN (MONGODB)</div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Encuestas de Satisfacción</h1>
                    <p className="page-subtitle">Sincronización externa con Google Forms. Los datos se almacenan en MongoDB.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-refresh" onClick={fetchEncuestas} title="Refrescar">
                        <MdRefresh size={20} />
                    </button>
                    <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className="btn-form-link">
                        <MdOpenInNew size={18} style={{ marginRight: '6px' }} /> Abrir Google Forms
                    </a>
                </div>
            </div>

            <div className="google-forms-info-card survey-sharing-card">
                <div className="info-icon-wrapper" style={{ color: '#0b7a75' }}>
                    <MdOutlineAssignment size={28} />
                </div>
                <div className="survey-sharing-container">
                    <div className="info-text">
                        <h3>Acceso y Difusión de la Encuesta de Satisfacción</h3>
                        <p>Copie el enlace para compartir con los clientes o muestre el código QR en pantalla para que los estudiantes o usuarios puedan acceder y responder directamente desde sus dispositivos móviles.</p>
                    </div>
                    <div className="survey-url-row">
                        <input 
                            type="text" 
                            className="survey-url-input" 
                            readOnly 
                            value={GOOGLE_FORM_URL} 
                        />
                        <button className="btn-copy" onClick={handleCopyLink}>
                            <MdContentCopy size={16} />
                            {copied ? '¡Copiado!' : 'Copiar Enlace'}
                        </button>
                        <button className="btn-qr" onClick={() => setShowQR(true)}>
                            <MdQrCode size={18} />
                            Mostrar QR
                        </button>
                    </div>
                </div>
            </div>

            {showQR && (
                <div className="qr-modal-overlay" onClick={() => setShowQR(false)}>
                    <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-modal-close" onClick={() => setShowQR(false)}>
                            <MdClose size={20} />
                        </button>
                        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Escanear Encuesta</h3>
                        <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>Escanee este código QR para ingresar a la encuesta de satisfacción.</p>
                        <div className="qr-image-wrapper">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(GOOGLE_FORM_URL)}`} 
                                alt="Encuesta QR" 
                                className="qr-image"
                            />
                        </div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#0b7a75', fontWeight: 'bold' }}>Econex Soluciones Ambientales</p>
                    </div>
                </div>
            )}

            <div className="filters-bar">
                <div className="filter-group search">
                    <span className="filter-label">Buscar Encuesta</span>
                    <input 
                        type="text" 
                        className="filter-input" 
                        placeholder="Buscar por cliente, servicio o comentarios..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <span className="filter-label">Calidad</span>
                    <select 
                        className="filter-select" 
                        value={qualityFilter}
                        onChange={(e) => setQualityFilter(e.target.value)}
                    >
                        <option value="ALL">Cualquier Calificación</option>
                        <option value="5">5 ⭐⭐⭐⭐⭐</option>
                        <option value="4">4 ⭐⭐⭐⭐</option>
                        <option value="3">3 ⭐⭐⭐</option>
                        <option value="2">2 ⭐⭐</option>
                        <option value="1">1 ⭐</option>
                    </select>
                </div>
                <div className="filter-group">
                    <span className="filter-label">Amabilidad/Profesionalismo</span>
                    <select 
                        className="filter-select" 
                        value={professionalismFilter}
                        onChange={(e) => setProfessionalismFilter(e.target.value)}
                    >
                        <option value="ALL">Cualquier Calificación</option>
                        <option value="5">5 ⭐⭐⭐⭐⭐</option>
                        <option value="4">4 ⭐⭐⭐⭐</option>
                        <option value="3">3 ⭐⭐⭐</option>
                        <option value="2">2 ⭐⭐</option>
                        <option value="1">1 ⭐</option>
                    </select>
                </div>
                {(searchQuery || qualityFilter !== 'ALL' || professionalismFilter !== 'ALL') && (
                    <div className="filter-group action">
                        <button className="btn-filter-clear" onClick={handleClearFilters}>
                            Limpiar
                        </button>
                    </div>
                )}
            </div>

            <div className="table-container">
                <table className="satisfaccion-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Servicio Recibido</th>
                            <th>Calidad</th>
                            <th>Profesionalismo</th>
                            <th>Sugerencias / Comentarios</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Cargando datos de MongoDB...</td></tr>
                        ) : filteredEncuestas.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron encuestas con los filtros aplicados.</td></tr>
                        ) : (
                            currentEncuestas.map(enc => (
                                <tr key={enc.id}>
                                    <td style={{ fontSize: '13px' }}>
                                        {enc.fechaRespuesta ? new Date(enc.fechaRespuesta).toLocaleString() : '-'}
                                    </td>
                                    <td style={{ fontWeight: '600' }}>
                                        {enc.nombreCliente || `Cliente ID: ${enc.idCliente || 'N/A'}`}
                                    </td>
                                    <td>{enc.tipoServicioRecibido || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {renderStars(enc.calidadGeneral || enc.calidadServicio)}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {renderStars(enc.amabilidadProfesionalismo || enc.profesionalismo)}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '13px', fontStyle: 'italic', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={enc.sugerenciasComentarios || enc.comentarios}>
                                        {enc.sugerenciasComentarios || enc.comentarios || '-'}
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-delete-survey" 
                                            onClick={() => handleDelete(enc.id)}
                                            title="Eliminar de MongoDB"
                                        >
                                            <MdDeleteOutline size={18} />
                                        </button>
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
};

export default Satisfaccion;
