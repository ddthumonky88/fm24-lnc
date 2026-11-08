package com.fm24.lnc.common;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@ControllerAdvice
public class ResponseEnvelopeAdvice implements ResponseBodyAdvice<Object> {
  private final HttpServletRequest request;

  public ResponseEnvelopeAdvice(HttpServletRequest request) {
    this.request = request;
  }

  @Override
  public boolean supports(MethodParameter returnType, Class converterType) {
    return !ByteArrayHttpMessageConverter.class.isAssignableFrom(converterType)
        && !returnType.hasMethodAnnotation(RawResponse.class)
        && !returnType.getContainingClass().isAnnotationPresent(RawResponse.class);
  }

  @Override
  public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
      Class converterType, ServerHttpRequest serverRequest, ServerHttpResponse serverResponse) {
    if (body instanceof ApiEnvelope<?>) return body;
    String correlationId = request.getHeader("x-correlation-id");
    if (correlationId == null || correlationId.isBlank()) correlationId = request.getHeader("x-request-id");
    if (correlationId == null || correlationId.isBlank()) correlationId = UUID.randomUUID().toString();
    serverResponse.getHeaders().set("X-Correlation-Id", correlationId);
    return ApiEnvelope.success(body, request.getRequestURI(), correlationId);
  }
}
