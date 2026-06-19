package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.AuthLoginReqDto;
import com.jing.monitor.model.dto.AuthLoginRespDto;
import com.jing.monitor.model.dto.AuthRegisterReqDto;
import com.jing.monitor.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller that exposes authentication endpoints.
 */
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Registers a new user account.
     *
     * @param req registration payload
     * @return empty success result
     */
    @PostMapping("/register")
    public Result<Void> register(@RequestBody AuthRegisterReqDto req) {
        authService.register(req);
        return Result.success();
    }

    /**
     * Authenticates a user and returns a JWT token.
     *
     * @param req login payload
     * @return login response with token
     */
    @PostMapping("/login")
    public Result<AuthLoginRespDto> login(@RequestBody AuthLoginReqDto req) {
        return Result.success(authService.login(req));
    }
}
