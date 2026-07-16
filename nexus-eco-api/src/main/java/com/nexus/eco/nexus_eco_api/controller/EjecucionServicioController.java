package com.nexus.eco.nexus_eco_api.controller;

import com.nexus.eco.nexus_eco_api.model.entity.EjecucionServicio;
import com.nexus.eco.nexus_eco_api.service.EjecucionServicioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ejecucion-servicios")
@CrossOrigin(origins = "*")
public class EjecucionServicioController {

    @Autowired
    private EjecucionServicioService service;

    @Autowired
    private com.nexus.eco.nexus_eco_api.service.EvidenciaService evidenciaService;
    
    @Autowired
    private com.nexus.eco.nexus_eco_api.service.InspeccionService inspeccionService;
    
    @Autowired
    private com.nexus.eco.nexus_eco_api.service.AuditoriaService auditoriaService;

    @GetMapping
    public List<EjecucionServicio> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<EjecucionServicio> getById(@PathVariable Integer id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public EjecucionServicio create(@RequestBody EjecucionServicio entity) {
        return service.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EjecucionServicio> update(@PathVariable Integer id, @RequestBody EjecucionServicio entity) {
        return service.findById(id).map(existing -> {
            entity.setIdEjecucionServicio(id);
            return ResponseEntity.ok(service.save(entity));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        if (service.findById(id).isPresent()) {
            service.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}/evidencias/download")
    public void downloadEvidenciasZip(@PathVariable Integer id, jakarta.servlet.http.HttpServletResponse response) {
        try {
            response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_OK);
            response.setContentType("application/zip");
            response.setHeader("Content-Disposition", "attachment; filename=\"evidencias-ejecucion-" + id + ".zip\"");

            java.util.zip.ZipOutputStream zipOut = new java.util.zip.ZipOutputStream(response.getOutputStream());
            
            service.findById(id).ifPresent(es -> {
                try {
                    // Evidencia principal de ejecución
                    if (es.getMongoDocId() != null) {
                        evidenciaService.getEvidencia(es.getMongoDocId()).ifPresent(ev -> {
                            try {
                                if ("application/zip".equals(ev.getTipoArchivo())) {
                                    java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(ev.getDatos());
                                    java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(bais);
                                    java.util.zip.ZipEntry entry;
                                    while ((entry = zis.getNextEntry()) != null) {
                                        java.util.zip.ZipEntry newEntry = new java.util.zip.ZipEntry(entry.getName());
                                        zipOut.putNextEntry(newEntry);
                                        byte[] buffer = new byte[1024];
                                        int len;
                                        while ((len = zis.read(buffer)) > 0) {
                                            zipOut.write(buffer, 0, len);
                                        }
                                        zipOut.closeEntry();
                                        zis.closeEntry();
                                    }
                                    zis.close();
                                } else {
                                    java.util.zip.ZipEntry zipEntry = new java.util.zip.ZipEntry("evidencia-ejecucion-" + ev.getNombreArchivo());
                                    zipOut.putNextEntry(zipEntry);
                                    zipOut.write(ev.getDatos());
                                    zipOut.closeEntry();
                                }
                            } catch (Exception e) {}
                        });
                    }
                    
                    // Evidencias de inspecciones vinculadas a las auditorías de esta ejecución
                    auditoriaService.findAll().stream()
                        .filter(aud -> aud.getEjecucionServicio() != null && aud.getEjecucionServicio().getIdEjecucionServicio().equals(id))
                        .forEach(aud -> {
                            inspeccionService.findAll().stream()
                                .filter(insp -> insp.getAuditoria() != null && insp.getAuditoria().getIdAuditoria().equals(aud.getIdAuditoria()))
                                .forEach(insp -> {
                                    if (insp.getMongoDocIdInsp() != null) {
                                        evidenciaService.getEvidencia(insp.getMongoDocIdInsp()).ifPresent(ev -> {
                                            try {
                                                java.util.zip.ZipEntry zipEntry = new java.util.zip.ZipEntry("inspeccion-auditoria-" + aud.getIdAuditoria() + "-" + ev.getNombreArchivo());
                                                zipOut.putNextEntry(zipEntry);
                                                zipOut.write(ev.getDatos());
                                                zipOut.closeEntry();
                                            } catch (Exception e) {}
                                        });
                                    }
                                });
                        });
                } catch (Exception e) {}
            });
            
            zipOut.finish();
            zipOut.close();
        } catch (Exception e) {
            response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}
