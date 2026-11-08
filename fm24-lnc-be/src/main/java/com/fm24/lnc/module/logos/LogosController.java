package com.fm24.lnc.module.logos;

import com.fm24.lnc.common.RawResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RawResponse
@RestController
@RequestMapping("/api/logos")
public class LogosController {
  private static final Map<String,String> ENV = Map.of(
      "confederation", "CONFED_LOGO_DIR", "nation", "NATION_LOGO_DIR",
      "competition", "COMP_LOGO_DIR", "club", "CLUB_LOGO_DIR");

  @GetMapping("/{type}/{id}")
  public ResponseEntity<FileSystemResource> get(@PathVariable String type, @PathVariable String id,
      @RequestParam(required=false) String code) throws IOException {
    String rootValue = System.getenv().getOrDefault(ENV.getOrDefault(type, ""), "");
    if (rootValue.isBlank()) return ResponseEntity.notFound().build();
    Path root = Path.of(rootValue);
    Path file = find(root, id, code);
    if (file == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok().cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(7)).cachePublic().immutable())
        .contentType(MediaType.IMAGE_PNG).body(new FileSystemResource(file));
  }

  private Path find(Path root, String id, String code) throws IOException {
    if (!Files.isDirectory(root)) return null;
    try (Stream<Path> stream = Files.walk(root, 4)) {
      return stream.filter(Files::isRegularFile).filter(p -> {
        String name = p.getFileName().toString();
        return name.equalsIgnoreCase(id + ".png") || (code != null && name.equalsIgnoreCase(code + ".png"));
      }).findFirst().orElse(null);
    }
  }
}
