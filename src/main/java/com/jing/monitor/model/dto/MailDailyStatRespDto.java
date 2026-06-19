package com.jing.monitor.model.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Admin-facing response DTO for one persisted daily mail counter snapshot.
 */
@Data
@NoArgsConstructor
public class MailDailyStatRespDto {

    private UUID id;
    private LocalDate statsDate;
    private long sentTotal;
    private long sentOpen;
    private long sentWaitlist;
    private long sentWelcome;
    private long sentManualTest;
    private long deadTotal;
    private long deadOpen;
    private long deadWaitlist;
    private long deadWelcome;
    private long deadManualTest;
}
