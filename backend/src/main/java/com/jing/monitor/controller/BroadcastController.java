package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.BroadcastDtos.Create;
import com.jing.monitor.model.dto.BroadcastDtos.Delivery;
import com.jing.monitor.model.dto.BroadcastDtos.TestEmail;
import com.jing.monitor.model.dto.BroadcastDtos.View;
import com.jing.monitor.model.dto.PageRespDto;
import com.jing.monitor.service.BroadcastService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST controller for admin broadcast emails. Admin role is enforced in {@link BroadcastService}.
 */
@RestController
@RequestMapping("/api/admin/broadcasts")
@RequiredArgsConstructor
public class BroadcastController {
    private final BroadcastService broadcasts;

    /**
     * Lists broadcasts, newest first.
     *
     * @param page 1-based page number
     * @return one page of broadcasts
     */
    @GetMapping
    public Result<PageRespDto<View>> list(@RequestParam(defaultValue = "1") int page) {
        return Result.success(broadcasts.list(page));
    }

    /**
     * Creates a draft with an immutable recipient snapshot; does not send.
     *
     * @param request draft content and audience
     * @return the created draft
     */
    @PostMapping
    public Result<View> create(@RequestBody Create request) {
        return Result.success(broadcasts.create(request));
    }

    /**
     * Returns one broadcast with current delivery counts.
     *
     * @param id broadcast id
     * @return the broadcast view
     */
    @GetMapping("/{id}")
    public Result<View> get(@PathVariable UUID id) {
        return Result.success(broadcasts.get(id));
    }

    /**
     * Lists the recipients of one broadcast.
     *
     * @param id broadcast id
     * @param page 1-based page number
     * @return one page of delivery rows
     */
    @GetMapping("/{id}/recipients")
    public Result<PageRespDto<Delivery>> recipients(@PathVariable UUID id, @RequestParam(defaultValue = "1") int page) {
        return Result.success(broadcasts.recipients(id, page));
    }

    /**
     * Queues a draft once.
     *
     * @param id broadcast id
     * @return the broadcast view after queueing
     */
    @PostMapping("/{id}/send")
    public Result<View> send(@PathVariable UUID id) {
        return Result.success(broadcasts.send(id));
    }

    /**
     * Sends the draft to one explicit test address.
     *
     * @param id broadcast id
     * @param request test recipient
     * @return the test event id
     */
    @PostMapping("/{id}/test-email")
    public Result<UUID> testEmail(@PathVariable UUID id, @RequestBody TestEmail request) {
        return Result.success(broadcasts.testEmail(id, request));
    }
}
