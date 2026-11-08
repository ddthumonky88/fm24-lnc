package com.fm24.lnc.module.lnc;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LncFileStore {
  public static final List<String> REQUIRED_FILES = List.of(
      "fm24_geography.lnc", "fm24_club.lnc", "fm24_competition_other.lnc");

  private volatile Path directory;

  public LncFileStore(@Value("${app.lnc-dir:./data}") String directory) throws IOException {
    this.directory = Path.of(directory).toAbsolutePath().normalize();
    Files.createDirectories(this.directory);
  }

  public Path directory() {
    return directory;
  }

  public void setDirectory(String value) throws IOException {
    Path next = Path.of(value).toAbsolutePath().normalize();
    Files.createDirectories(next);
    this.directory = next;
  }

  public Path require(String name) {
    if (!REQUIRED_FILES.contains(name)) throw new IllegalArgumentException("Unsupported LNC file: " + name);
    Path file = directory.resolve(name).normalize();
    if (!file.startsWith(directory) || !Files.isRegularFile(file)) {
      throw new IllegalStateException("Missing LNC file: " + file);
    }
    return file;
  }

  public void saveAll(List<Map<String, String>> files) throws IOException {
    for (Map<String, String> item : files) {
      String name = item.get("name");
      String content = item.get("content");
      if (!REQUIRED_FILES.contains(name) || content == null) {
        throw new IllegalArgumentException("Only the three fm24_*.lnc files are accepted");
      }
      Files.writeString(directory.resolve(name), content, StandardCharsets.UTF_8);
    }
  }

  public Map<String, Object> status() {
    return Map.of(
        "dir", directory.toString(),
        "allFilesFound", REQUIRED_FILES.stream().allMatch(n -> Files.isRegularFile(directory.resolve(n))),
        "files", REQUIRED_FILES.stream().map(n -> Map.of(
            "name", n,
            "exists", Files.isRegularFile(directory.resolve(n)),
            "path", directory.resolve(n).toString())).toList());
  }
}
