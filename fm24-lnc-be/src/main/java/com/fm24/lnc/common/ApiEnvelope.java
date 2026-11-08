package com.fm24.lnc.common;

import java.time.Instant;

public record ApiEnvelope<T>(
    int status,
    boolean success,
    String message,
    T data,
    Object error,
    long timestamp,
    String path,
    String correlationId
) {
  public static <T> ApiEnvelope<T> success(T data, String path, String correlationId) {
    return new ApiEnvelope<>(200, true, "OK", data, null, Instant.now().toEpochMilli(), path, correlationId);
  }
}
