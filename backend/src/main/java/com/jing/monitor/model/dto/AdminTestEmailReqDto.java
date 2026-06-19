package com.jing.monitor.model.dto;

import com.jing.monitor.model.AlertType;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin request payload for enqueuing a manual test email.
 */
@Data
@NoArgsConstructor
public class AdminTestEmailReqDto {

    private String recipientEmail;
    private AlertType alertType;
    private String sectionId;
    private String courseDisplayName;
    private String termId;
}
