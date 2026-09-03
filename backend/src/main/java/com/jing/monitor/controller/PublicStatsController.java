package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.MailAlertTotalRespDto;
import com.jing.monitor.service.MailCounterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public aggregate statistics used by anonymous pages.
 */
@RestController
@RequestMapping("/api/public/stats")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PublicStatsController {

    private final MailCounterService mailCounterService;

    /**
     * Returns the cumulative number of successfully sent email alerts.
     *
     * @return aggregate sent count
     */
    @GetMapping("/mail-alerts/total")
    public Result<MailAlertTotalRespDto> getMailAlertTotal() {
        return Result.success(new MailAlertTotalRespDto(mailCounterService.getTotalSentCount()));
    }
}
