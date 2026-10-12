package com.jing.monitor.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.dao.DataAccessException;
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
@Slf4j
public class GlobalExceptionHandler {

    private static final String INTERNAL_ERROR_MESSAGE = "Internal server error. Please try again later.";

    /**
     * Maps infrastructure failures (database, Redis, RabbitMQ) to a generic 500 response.
     * <p>
     * Their messages can contain SQL statements, constraint names or host details, so they
     * are logged here and never returned to the client.
     *
     * @param ex infrastructure exception thrown while handling the request
     * @return generic error response entity
     */
    @ExceptionHandler({DataAccessException.class, AmqpException.class})
    public ResponseEntity<Result<Void>> handleInfrastructureException(RuntimeException ex) {
        log.error("[API] Infrastructure failure while handling request", ex);
        Result<Void> result = Result.error(INTERNAL_ERROR_MESSAGE);
        result.setCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
    }

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
