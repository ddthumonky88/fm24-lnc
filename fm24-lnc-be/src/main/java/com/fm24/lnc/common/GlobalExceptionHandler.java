package com.fm24.lnc.common;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiEnvelope<Object>> handle(Exception ex, HttpServletRequest request) {
    String id = UUID.randomUUID().toString();
    var error = Map.of("code", "INTERNAL_ERROR", "message", ex.getMessage() == null ? "Unexpected error" : ex.getMessage());
    var body = new ApiEnvelope<>(500, false, error.get("message"), null, error,
        Instant.now().toEpochMilli(), request.getRequestURI(), id);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).header("X-Correlation-Id", id).body(body);
  }
}
