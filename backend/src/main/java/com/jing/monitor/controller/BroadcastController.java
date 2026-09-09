package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.BroadcastDtos.*;
import com.jing.monitor.model.dto.PageRespDto;
import com.jing.monitor.service.BroadcastService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/broadcasts")
@RequiredArgsConstructor
public class BroadcastController {
    private final BroadcastService broadcasts;

    @GetMapping
    public Result<PageRespDto<View>> list(@RequestParam(defaultValue = "1") int page) {
        return Result.success(broadcasts.list(page));
    }

    @PostMapping
    public Result<View> create(@RequestBody Create request) {
        return Result.success(broadcasts.create(request));
    }

    @GetMapping("/{id}")
    public Result<View> get(@PathVariable UUID id) {
        return Result.success(broadcasts.get(id));
    }

    @GetMapping("/{id}/recipients")
    public Result<PageRespDto<Delivery>> recipients(@PathVariable UUID id, @RequestParam(defaultValue = "1") int page) {
        return Result.success(broadcasts.recipients(id, page));
    }

    @PostMapping("/{id}/send")
    public Result<View> send(@PathVariable UUID id) {
        return Result.success(broadcasts.send(id));
    }

    @PostMapping("/{id}/test-email")
    public Result<UUID> testEmail(@PathVariable UUID id, @RequestBody TestEmail request) {
        return Result.success(broadcasts.testEmail(id, request));
    }
}
