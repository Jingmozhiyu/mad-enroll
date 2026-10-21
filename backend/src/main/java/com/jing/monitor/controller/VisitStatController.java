package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.service.VisitStatService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for personal website visit statistics.
 */
@RestController
@RequestMapping("/api/visit")
@RequiredArgsConstructor

public class VisitStatController {

    public final VisitStatService visitStatService;

    /**
     * Accept requests from Yinwen's homepage on pages.cs.wisc.edu
     *
     * @param request incoming visit request
     * @return empty success result
     */
    @PostMapping("/mysite")
    public Result<Void> visitFromPersonalWebsite(HttpServletRequest request){
        String ip = request.getRemoteAddr();
        // Caddy is the public ingress and replaces untrusted X-Forwarded-For values.
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null) {
            String forwardedIp = forwardedFor.split(",", 2)[0].trim();
            if (!forwardedIp.isBlank()) {
                ip = forwardedIp;
            }
        }
        visitStatService.visitFromPersonalWebsite(ip);
        return Result.success();
    }
}
