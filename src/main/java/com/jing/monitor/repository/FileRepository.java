package com.jing.monitor.repository;

import com.jing.monitor.model.SectionInfo;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.StringJoiner;

/**
 * File-backed append-only repository for section status history snapshots.
 */
@Repository
@Slf4j
public class FileRepository {

    private static final Path FILE_PATH = Paths.get("logs", "history.csv");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String HEADER = "Timestamp,Subject,CatalogNumber,Section,Status,CourseId";

    /**
     * Initializes history file and header line on startup.
     */
    @PostConstruct
    private void initFile() {
        try {
            if (FILE_PATH.getParent() != null) {
                Files.createDirectories(FILE_PATH.getParent());
            }

            if (Files.notExists(FILE_PATH)) {
                Files.writeString(
                        FILE_PATH,
                        HEADER + System.lineSeparator(),
                        StandardOpenOption.CREATE_NEW
                );
                log.info("[Repo] Created history file: {}", FILE_PATH);
            }
        } catch (IOException e) {
            log.error("[Repo] Failed to initialize history file: {}", FILE_PATH, e);
        }
    }

    /**
     * Appends one section status record to {@code logs/history.csv}.
     *
     * @param info section snapshot to persist
     */
    public synchronized void save(SectionInfo info) {
        if (info == null) {
            log.warn("[Repo] Skip save because SectionInfo is null");
            return;
        }

        String timestamp = LocalDateTime.now().format(TIME_FORMATTER);
        String line = new StringJoiner(",")
                .add(escapeCsv(timestamp))
                .add(escapeCsv(info.getSubject()))
                .add(escapeCsv(info.getCatalogNumber()))
                .add(escapeCsv(info.getSection()))
                .add(escapeCsv(info.getStatus() == null ? null : info.getStatus().name()))
                .add(escapeCsv(info.getCourseId()))
                .toString();

        try {
            Files.writeString(
                    FILE_PATH,
                    line + System.lineSeparator(),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND
            );
        } catch (IOException e) {
            log.error("[Repo] Error writing to history file: {}", FILE_PATH, e);
        }
    }

    /**
     * Escapes values according to minimal CSV quoting rules.
     *
     * @param value raw field value
     * @return escaped CSV-safe value
     */
    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
