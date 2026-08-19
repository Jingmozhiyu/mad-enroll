package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.AdminSectionSubRespDto;
import com.jing.monitor.model.dto.AdminTestEmailReqDto;
import com.jing.monitor.model.dto.AdminUserSubsRespDto;
import com.jing.monitor.model.dto.AdminSummaryRespDto;
import com.jing.monitor.model.dto.AlertDeadLetterRespDto;
import com.jing.monitor.model.dto.AlertDeliveryLogRespDto;
import com.jing.monitor.model.dto.MailDailyStatRespDto;
import com.jing.monitor.model.dto.PageRespDto;
import com.jing.monitor.model.dto.SchedulerStatusRespDto;
import com.jing.monitor.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for admin-only user and subscription management.
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    /**
     * Lists one page of users together with their subscribed course and section info.
     *
     * @return grouped admin-facing user subscription data
     */
    @GetMapping("/subscriptions")
    public Result<PageRespDto<AdminUserSubsRespDto>> listSubscriptions(
            @RequestParam(defaultValue = "1") int page
    ) {
        return Result.success(adminService.getUserSubscriptionsPage(page));
    }

    /**
     * Enables or disables one subscription from the admin dashboard.
     *
     * @param subscriptionId subscription UUID
     * @param enabled target enabled state
     * @return updated subscription row
     */
    @PatchMapping("/subscriptions/{subscriptionId}")
    public Result<AdminSectionSubRespDto> updateSubscription(
            @PathVariable UUID subscriptionId,
            @RequestParam boolean enabled
    ) {
        return Result.success(adminService.updateSubscriptionEnabled(subscriptionId, enabled));
    }

    /**
     * Lists persisted dead-letter events for manual inspection.
     *
     * @return dead-letter records
     */
    @GetMapping("/dead-letters")
    public Result<List<AlertDeadLetterRespDto>> listDeadLetters() {
        return Result.success(adminService.getDeadLetters());
    }

    /**
     * Lists one page of successful email deliveries for review.
     *
     * @return successful delivery records
     */
    @GetMapping("/mail-deliveries")
    public Result<PageRespDto<AlertDeliveryLogRespDto>> listMailDeliveries(
            @RequestParam(defaultValue = "1") int page
    ) {
        return Result.success(adminService.getMailDeliveriesPage(page));
    }

    /**
     * Returns aggregate counts without loading admin table rows.
     *
     * @return admin dashboard summary counts
     */
    @GetMapping("/summary")
    public Result<AdminSummaryRespDto> getSummary() {
        return Result.success(adminService.getSummary());
    }

    /**
     * Lists persisted daily mail counter snapshots.
     *
     * @return daily mail statistics
     */
    @GetMapping("/mail-stats")
    public Result<List<MailDailyStatRespDto>> listMailStats() {
        return Result.success(adminService.getMailDailyStats());
    }

    /**
     * Enqueues one admin-triggered test email through RabbitMQ.
     *
     * @param req test email request body
     * @return empty success response
     */
    @PostMapping("/test-email")
    public Result<Void> sendTestEmail(@RequestBody AdminTestEmailReqDto req) {
        adminService.sendTestEmail(req);
        return Result.success();
    }

    /**
     * Returns an internal scheduler snapshot for operational debugging.
     *
     * @return scheduler status snapshot
     */
    @GetMapping("/scheduler-status")
    public Result<SchedulerStatusRespDto> getSchedulerStatus() {
        return Result.success(adminService.getSchedulerStatus());
    }
}
