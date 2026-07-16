package com.nexus.eco.nexus_eco_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.nexus.eco.nexus_eco_api.model.document.Evidencia;
import com.nexus.eco.nexus_eco_api.repository.EvidenciaRepository;

import java.io.IOException;
import java.util.Optional;

@Service
public class EvidenciaService {

    @Autowired
    private EvidenciaRepository evidenciaRepository;

    public Evidencia uploadEvidencia(MultipartFile file) throws IOException {
        Evidencia evidencia = new Evidencia();
        evidencia.setNombreArchivo(file.getOriginalFilename());
        evidencia.setTipoArchivo(file.getContentType());
        evidencia.setTamanio(file.getSize());
        evidencia.setDatos(file.getBytes());
        return evidenciaRepository.save(evidencia);
    }

    public Optional<Evidencia> getEvidencia(String id) {
        return evidenciaRepository.findById(id);
    }

    public Evidencia save(Evidencia evidencia) {
        return evidenciaRepository.save(evidencia);
    }
}
