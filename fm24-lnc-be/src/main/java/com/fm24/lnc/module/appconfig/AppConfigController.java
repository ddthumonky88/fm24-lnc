package com.fm24.lnc.module.appconfig;

import com.fm24.lnc.module.lnc.LncFileStore;
import com.fm24.lnc.module.lnc.LncParserService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
public class AppConfigController {
  private final LncFileStore files;
  private final LncParserService parser;
  private final Map<String, String> config = new LinkedHashMap<>();

  public AppConfigController(LncFileStore files, LncParserService parser) {
    this.files = files; this.parser = parser;
    config.put("lncDir", files.directory().toString());
    config.put("confedLogoDir", System.getenv().getOrDefault("CONFED_LOGO_DIR", ""));
    config.put("nationLogoDir", System.getenv().getOrDefault("NATION_LOGO_DIR", ""));
    config.put("compLogoDir", System.getenv().getOrDefault("COMP_LOGO_DIR", ""));
    config.put("clubLogoDir", System.getenv().getOrDefault("CLUB_LOGO_DIR", ""));
  }

  @GetMapping
  public Map<String,Object> get() { return Map.of("config", config, "status", files.status()); }

  @PutMapping
  public Map<String,Object> update(@RequestBody Map<String,String> values) throws IOException {
    config.putAll(values);
    if (values.containsKey("lncDir")) files.setDirectory(values.get("lncDir"));
    return get();
  }

  @PostMapping("/test")
  public Map<String,Object> test(@RequestBody Map<String,String> body) throws IOException {
    Path path = Path.of(body.getOrDefault("path", "")).toAbsolutePath().normalize();
    boolean directory = Files.isDirectory(path);
    long count = directory ? Files.list(path).limit(10000).count() : 0;
    return Map.of("path", path.toString(), "exists", Files.exists(path), "isDirectory", directory, "fileCount", count);
  }

  @PostMapping("/sync")
  public Map<String,Object> sync() throws IOException { return parser.parseAndSeed(); }

  @PostMapping("/reload-logos")
  public Map<String,Object> reloadLogos() { return Map.of("success", true, "message", "Logo paths reloaded from configuration"); }
}
