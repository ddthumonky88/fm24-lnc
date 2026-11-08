package com.fm24.lnc.module.lnc;

import com.fm24.lnc.common.RawResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/lnc", "/api/fm"})
public class LncController {
  private final LncFileStore files;
  private final LncParserService parser;
  private final JdbcTemplate jdbc;

  public LncController(LncFileStore files, LncParserService parser, JdbcTemplate jdbc) {
    this.files = files;
    this.parser = parser;
    this.jdbc = jdbc;
  }

  @PostMapping("/import")
  public Map<String, Object> importFiles() throws IOException {
    return parser.parseAndSeed();
  }

  @PostMapping("/upload")
  public Map<String, Object> upload(@RequestBody UploadRequest request) throws IOException {
    if (request.files() == null || request.files().isEmpty()) {
      throw new IllegalArgumentException("files is required");
    }
    files.saveAll(request.files());
    Map<String, Object> result = new LinkedHashMap<>(parser.parseAndSeed());
    result.put("uploadedFiles", request.files().stream().map(item -> item.get("name")).toList());
    result.put("stats", databaseStats());
    return result;
  }

  @GetMapping("/status")
  public Map<String, Object> status() {
    Map<String, Object> result = new LinkedHashMap<>(databaseStats());
    result.put("lnc", files.status());
    return result;
  }

  @RawResponse
  @GetMapping("/files/{name:.+}")
  public ResponseEntity<FileSystemResource> publicFile(@PathVariable String name) {
    var file = files.require(name);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noCache())
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + name + "\"")
        .contentType(MediaType.parseMediaType("text/plain;charset=UTF-8"))
        .contentLength(file.toFile().length())
        .body(new FileSystemResource(file));
  }

  private Map<String, Object> databaseStats() {
    Map<String, Object> stats = new LinkedHashMap<>();
    stats.put("confederations", 8);
    for (String table : List.of("nations", "regions", "cities", "competitions", "clubs", "stadiums", "awards", "people")) {
      Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
      stats.put(table, count == null ? 0 : count);
    }
    return stats;
  }

  public record UploadRequest(List<Map<String, String>> files) {}
}
