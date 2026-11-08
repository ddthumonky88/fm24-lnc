package com.fm24.lnc.module.health;

import com.fm24.lnc.common.RawResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RawResponse
@RestController
public class HealthController {
  @GetMapping({"/health", "/api/health"})
  public Map<String, Object> health() {
    return Map.of("status", "ok", "timestamp", Instant.now().toString(), "runtime", "java");
  }
}
