package com.jing.monitor.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Centralized exception mapper for REST controllers.
 * <p>
 * Converts runtime exceptions into a consistent {@link Result} payload so
 * frontend clients can handle errors uniformly.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Maps runtime exceptions to HTTP responses.
     * <p>
     * If the message is "Unauthorized", this returns 401; otherwise 400.
     *
     * @param ex runtime exception thrown by application code
     * @return standardized error response entity
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Result<Void>> handleRuntimeException(RuntimeException ex) {
        HttpStatus status = "Unauthorized".equalsIgnoreCase(ex.getMessage())
                ? HttpStatus.UNAUTHORIZED
                : HttpStatus.BAD_REQUEST;
        Result<Void> result = Result.error(ex.getMessage());
        result.setCode(status.value());
        return ResponseEntity.status(status).body(result);
    }
}
