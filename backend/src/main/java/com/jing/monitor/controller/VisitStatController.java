package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.service.VisitStatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for authenticated user feedback submission.
 */
@RestController
@RequestMapping("/api/visit")
@RequiredArgsConstructor

public class VisitStatController {

    public final VisitStatService visitStatService;

    /**
     * Accept requests from Yinwen's homepage on pages.cs.wisc.edu
     *
     * @return empty success result
     */
    @PostMapping("/mysite")
    public Result<Void> visitFromPersonalWebsite(){
        visitStatService.visitFromPersonalWebsite();
        return Result.success();
    }
}
