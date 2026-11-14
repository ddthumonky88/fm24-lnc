package com.fm24.lnc.module.lnc;

import java.io.IOException;
import java.nio.file.Files;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LncParserService {
  private static final Pattern COMMAND = Pattern.compile("^\\\"([^\\\"]+)\\\"\\s+((?:n-)?\\d+)\\s+\\\"([^\\\"]*)\\\"");
  private static final Pattern PARENT_COMP = Pattern.compile("^\\\"PARENT_COMP_ID\\\"\\s+((?:n-)?\\d+)\\s+((?:n-)?\\d+)");
  private static final Pattern HEADER_CODE = Pattern.compile("\\[([A-Za-z0-9-]+)]");
  private static final Map<String, String> CONFEDS = Map.ofEntries(
      Map.entry("AFRICA", "CAF"), Map.entry("CAF", "CAF"),
      Map.entry("ASIA", "AFC"), Map.entry("AFC", "AFC"),
      Map.entry("EUROPE", "UEFA"), Map.entry("UEFA", "UEFA"),
      Map.entry("NORTH AMERICA", "CONCACAF"), Map.entry("CONCACAF", "CONCACAF"),
      Map.entry("SOUTH AMERICA", "CONMEBOL"), Map.entry("CONMEBOL", "CONMEBOL"),
      Map.entry("OCEANIA", "OFC"), Map.entry("OFC", "OFC"),
      Map.entry("WORLD", "WORLD"), Map.entry("INTERNATIONAL", "WORLD"),
      Map.entry("EXTINCT", "EXTINCT"), Map.entry("OTHER", "EXTINCT"));

  private final JdbcTemplate jdbc;
  private final LncFileStore files;

  public LncParserService(JdbcTemplate jdbc, LncFileStore files) {
    this.jdbc = jdbc;
    this.files = files;
  }

  @Transactional
  public Map<String, Object> parseAndSeed() throws IOException {
    var nations = new LinkedHashMap<String, Map<String, Object>>();
    var cities = new LinkedHashMap<String, Map<String, Object>>();
    var competitions = new LinkedHashMap<String, Map<String, Object>>();
    var awards = new LinkedHashMap<String, Map<String, Object>>();
    var people = new LinkedHashMap<String, Map<String, Object>>();
    var clubs = new LinkedHashMap<String, Map<String, Object>>();
    var stadiums = new LinkedHashMap<String, Map<String, Object>>();

    parseGeography(nations, cities, stadiums);
    var nationCodeToId = new LinkedHashMap<String, String>();
    nations.forEach((id, row) -> nationCodeToId.put(text(row.get("name_3l")).toUpperCase(Locale.ROOT), id));
    parseCompetition(competitions, awards, people);
    parseClubs(clubs, stadiums);

    clearImportedData();
    upsertNations(nations);
    upsertRegions(cities, nationCodeToId);
    upsertCities(cities, nationCodeToId);
    upsertCompetitions(competitions, nationCodeToId);
    upsertAwards(awards, nationCodeToId);
    upsertPeople(people);
    upsertClubs(clubs, nationCodeToId, cities);
    upsertStadiums(stadiums, nationCodeToId);

    return Map.of(
        "success", true,
        "files", LncFileStore.REQUIRED_FILES,
        "imported", Map.of(
            "nations", nations.size(), "cities", cities.size(), "competitions", competitions.size(),
            "awards", awards.size(), "people", people.size(), "clubs", clubs.size(), "stadiums", stadiums.size()));
  }

  private void clearImportedData() {
    jdbc.execute("TRUNCATE TABLE regions, cities, clubs, awards, competitions, stadiums, people, nations RESTART IDENTITY CASCADE");
  }

  private void parseGeography(Map<String, Map<String, Object>> nations,
      Map<String, Map<String, Object>> cities,
      Map<String, Map<String, Object>> stadiums) throws IOException {
    String confed = "WORLD", nationCode = null, region = null, stadiumNation = null, stadiumCategory = null;
    for (String raw : Files.readAllLines(files.require("fm24_geography.lnc"))) {
      String line = raw.trim();
      if (line.startsWith("#")) {
        String header = line.replaceFirst("^#+", "").trim();
        if (header.startsWith("NATION >")) {
          String[] parts = header.split(">");
          confed = CONFEDS.getOrDefault(parts.length > 1 ? parts[1].trim().toUpperCase(Locale.ROOT) : "WORLD", "WORLD");
          continue;
        }
        if (header.startsWith("CITY >")) {
          String[] parts = header.split(">");
          nationCode = parts.length > 1 ? headerCode(parts[1]) : null;
          region = parts.length > 2 ? parts[2].trim() : null;
          continue;
        }
        if (header.startsWith("STADIUM >")) {
          String[] parts = header.split(">");
          stadiumNation = parts.length > 1 ? headerCode(parts[1]) : null;
          stadiumCategory = parts.length > 2 ? parts[2].trim() : null;
          continue;
        }
      }
      boolean disabled = line.startsWith("#");
      Matcher m = command(stripCommentPrefix(line));
      if (!m.find()) continue;
      String cmd = m.group(1), id = m.group(2), value = m.group(3).trim();
      if (cmd.startsWith("NATION_")) {
        Map<String, Object> row = row(nations, id);
        row.put("confed", confed);
        if (cmd.equals("NATION_LONG_NAME_CHANGE")) row.put("name_lg", value);
        else if (cmd.equals("NATION_SHORT_NAME_CHANGE")) row.put("name_sh", value);
        else if (cmd.equals("NATION_3LETTER_NAME_CHANGE")) row.put("name_3l", value);
      } else if (cmd.equals("CITY_NAME_CHANGE")) {
        Map<String, Object> row = row(cities, id);
        row.put("name", value); row.put("nation_code", nationCode);
        row.put("region_code", headerCode(region));
        boolean removeCity = "-".equals(value) || (region != null && region.toUpperCase(Locale.ROOT).contains("-REMOVE]"));
        row.put("region", removeCity ? "[REMOVE]" : cleanRegion(region)); row.put("disabled", disabled);
      } else if (cmd.equals("STADIUM_NAME_CHANGE")) {
        Map<String, Object> row = row(stadiums, id);
        row.put("name", value); row.put("nation_code", stadiumNation); row.put("disabled", disabled);
        String hint = text(stadiumCategory).toLowerCase(Locale.ROOT) + " " + value.toLowerCase(Locale.ROOT);
        row.put("type", hint.contains("training") || hint.contains("pitch") ? "training pitch" : "stadium");
      }
    }
  }

  private void parseCompetition(Map<String, Map<String, Object>> competitions,
      Map<String, Map<String, Object>> awards, Map<String, Map<String, Object>> people) throws IOException {
    String confed = "WORLD", nationCode = null, category = null;
    for (String raw : Files.readAllLines(files.require("fm24_competition_other.lnc"))) {
      String line = raw.trim();
      if (line.startsWith("#")) {
        String header = line.replaceFirst("^#+", "").trim();
        if (header.startsWith("COMP >") || header.startsWith("AWARDS >")) {
          String[] parts = header.split(">");
          confed = CONFEDS.getOrDefault(parts.length > 1 ? parts[1].trim().toUpperCase(Locale.ROOT) : "WORLD", "WORLD");
          nationCode = parts.length > 2 ? headerCode(parts[2]) : null;
          category = parts.length > 3 ? parts[3].trim() : null;
          continue;
        }
      }
      String clean = stripCommentPrefix(line);
      Matcher parent = PARENT_COMP.matcher(clean);
      if (parent.find()) {
        Map<String,Object> child = row(competitions, parent.group(1));
        child.putIfAbsent("confed", confed); child.putIfAbsent("nation_code", nationCode); child.putIfAbsent("type", category);
        child.put("parent_id", parent.group(2));
        continue;
      }
      Matcher player = Pattern.compile("^\\\"CHANGE_PLAYER_NAME\\\"\\s+(\\d+)\\s+\\\"([^\\\"]*)\\\"\\s+\\\"([^\\\"]*)\\\"\\s+\\\"([^\\\"]*)\\\"").matcher(clean);
      if (player.find()) {
        Map<String, Object> row = row(people, player.group(1));
        row.put("first", player.group(2)); row.put("common", player.group(3)); row.put("second", player.group(4));
        continue;
      }
      Matcher m = command(clean);
      if (!m.find()) continue;
      String cmd = m.group(1), id = m.group(2), value = m.group(3).trim();
      Map<String, Object> target = cmd.startsWith("AWARD_") ? row(awards, id) : row(competitions, id);
      target.putIfAbsent("confed", confed); target.putIfAbsent("nation_code", nationCode); target.putIfAbsent("type", category);
      if (cmd.endsWith("LONG_NAME_CHANGE")) target.put("name_lg", value);
      else if (cmd.endsWith("SHORT_NAME_CHANGE")) target.put("name_sh", value);
      else if (cmd.equals("COMP_3LETTER_NAME_CHANGE")) target.put("name_3l", value);
    }
  }

  private void parseClubs(Map<String, Map<String, Object>> clubs,
      Map<String, Map<String, Object>> stadiums) throws IOException {
    String clubNation = null, clubComp = null, stadiumNation = null, stadiumType = null;
    for (String raw : Files.readAllLines(files.require("fm24_club.lnc"))) {
      String line = raw.trim();
      if (line.startsWith("#")) {
        String header = line.replaceFirst("^#+", "").trim();
        if (header.startsWith("CLUB >")) {
          String[] parts = header.split(">"); clubNation = parts.length > 2 ? headerCode(parts[2]) : null;
          clubComp = parts.length > 3 ? parts[3].trim() : null; continue;
        }
        if (header.startsWith("STADIUM >")) {
          String[] parts = header.split(">"); stadiumNation = parts.length > 1 ? headerCode(parts[1]) : null;
          stadiumType = parts.length > 2 ? parts[2].trim() : null; continue;
        }
      }
      boolean disabled = line.startsWith("#");
      Matcher m = command(stripCommentPrefix(line).split("#", 2)[0].trim());
      if (!m.find()) continue;
      String cmd = m.group(1), id = m.group(2), value = m.group(3).trim();
      if (cmd.equals("AFFILIATED_CLUB_ID")) {
        Map<String, Object> row = row(clubs, id);
        int separator = value.indexOf('-');
        if (separator > 0 && separator + 1 < value.length()) {
          row.put("affiliate_type", value.substring(0, separator));
          row.put("affiliate_id", value.substring(separator + 1));
        }
      } else if (cmd.startsWith("CLUB_")) {
        Map<String, Object> row = row(clubs, id);
        row.putIfAbsent("nation_code", clubNation); row.putIfAbsent("comp", clubComp);
        if (cmd.equals("CLUB_NAME_CHANGE") || cmd.equals("CLUB_LONG_NAME_CHANGE")) row.put("name_lg", value);
        else if (cmd.equals("CLUB_SHORT_NAME_CHANGE")) row.put("name_sh", value);
        else if (cmd.equals("CLUB_6LETTER_NAME_CHANGE")) row.put("name_6l", value);
        else if (cmd.equals("CLUB_3LETTER_NAME_CHANGE")) row.put("name_3l", value);
        else if (cmd.equals("CLUB_CITY_CHANGE") && !disabled) {
          if (!value.isBlank() && !"rd-uid".equalsIgnoreCase(value)) {
            row.put("city_id", value);
          }
        }
      } else if (cmd.equals("STADIUM_NAME_CHANGE")) {
        Map<String, Object> row = row(stadiums, id);
        row.put("name", value); row.put("nation_code", stadiumNation); row.put("disabled", disabled);
        String hint = text(stadiumType).toLowerCase(Locale.ROOT) + " " + value.toLowerCase(Locale.ROOT);
        row.put("type", hint.contains("training") || hint.contains("pitch") ? "training pitch" : "stadium");
      }
    }
  }

  private void upsertNations(Map<String, Map<String, Object>> rows) {
    batch("INSERT INTO nations(id,name_lg,name_sh,name_3l,confed) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name_lg=EXCLUDED.name_lg,name_sh=EXCLUDED.name_sh,name_3l=EXCLUDED.name_3l,confed=EXCLUDED.confed",
        rows, r -> new Object[]{r.get("id"), fallback(r,"name_lg","Nation "+r.get("id")), fallback(r,"name_sh",fallback(r,"name_lg","Nation "+r.get("id"))), fallback(r,"name_3l","UNK"), r.get("confed")});
  }
  private void upsertCities(Map<String, Map<String, Object>> rows, Map<String,String> nations) {
    batch("INSERT INTO cities(id,name,nation_id,region,is_disabled) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,nation_id=EXCLUDED.nation_id,region=EXCLUDED.region,is_disabled=EXCLUDED.is_disabled",
        rows, r -> new Object[]{r.get("id"),r.get("name"),nations.get(text(r.get("nation_code")).toUpperCase(Locale.ROOT)),r.get("region"),r.getOrDefault("disabled",false)});
    jdbc.update("UPDATE cities c SET region_id=r.id FROM regions r WHERE c.nation_id=r.nation_id AND c.region IS NOT NULL AND TRIM(c.region)<>'' AND r.name=c.region");
  }
  private void upsertRegions(Map<String, Map<String, Object>> cities, Map<String,String> nations) {
    Map<String, Map<String, Object>> regions = new LinkedHashMap<>();
    for (Map<String, Object> city : cities.values()) {
      String nationId = nations.get(text(city.get("nation_code")).toUpperCase(Locale.ROOT));
      if (nationId == null) continue;
      String rawRegion = text(city.get("region")).trim();
      if (rawRegion.isBlank() || rawRegion.toUpperCase(Locale.ROOT).startsWith("[REMOVE]")) continue;
      String regionName = rawRegion;
      String key = nationId + "\u0000" + regionName;
      regions.computeIfAbsent(key, ignored -> {
        Map<String,Object> value = new LinkedHashMap<>();
        value.put("name", regionName); value.put("nation_id", nationId); value.put("code", city.get("region_code"));
        return value;
      });
    }
    batch("INSERT INTO regions(name,nation_id,code) VALUES (?,?,?) ON CONFLICT(nation_id,name) DO UPDATE SET code=EXCLUDED.code",
        regions, r -> new Object[]{r.get("name"),r.get("nation_id"),r.get("code")});
  }
  private void upsertCompetitions(Map<String, Map<String, Object>> rows, Map<String,String> nations) {
    batch("INSERT INTO competitions(id,name_lg,name_sh,name_3l,confed,nation_id,type,parent_id) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name_lg=EXCLUDED.name_lg,name_sh=EXCLUDED.name_sh,name_3l=EXCLUDED.name_3l,confed=EXCLUDED.confed,nation_id=EXCLUDED.nation_id,type=EXCLUDED.type,parent_id=EXCLUDED.parent_id",
        rows, r -> new Object[]{r.get("id"),fallback(r,"name_lg","Competition "+r.get("id")),fallback(r,"name_sh",fallback(r,"name_lg","Competition "+r.get("id"))),r.get("name_3l"),r.get("confed"),nations.get(text(r.get("nation_code")).toUpperCase(Locale.ROOT)),r.get("type"),r.get("parent_id")});
  }
  private void upsertAwards(Map<String, Map<String, Object>> rows, Map<String,String> nations) {
    batch("INSERT INTO awards(id,name_lg,name_sh,nation_id) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name_lg=EXCLUDED.name_lg,name_sh=EXCLUDED.name_sh,nation_id=EXCLUDED.nation_id",
        rows, r -> new Object[]{r.get("id"),fallback(r,"name_lg","Award "+r.get("id")),fallback(r,"name_sh",fallback(r,"name_lg","Award "+r.get("id"))),nations.get(text(r.get("nation_code")).toUpperCase(Locale.ROOT))});
  }
  private void upsertPeople(Map<String, Map<String, Object>> rows) {
    batch("INSERT INTO people(id,first_name,common_name,second_name) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET first_name=EXCLUDED.first_name,common_name=EXCLUDED.common_name,second_name=EXCLUDED.second_name",
        rows, r -> new Object[]{r.get("id"),r.get("first"),r.getOrDefault("common",""),r.get("second")});
  }
  private void upsertClubs(Map<String, Map<String, Object>> rows, Map<String,String> nations, Map<String, Map<String, Object>> cities) {
    batch("INSERT INTO clubs(id,name_lg,name_sh,name_6l,name_3l,nation_id,affiliate_club_id,affiliate_club_type,is_extinct,city_id,base_nation_id) " +
          "VALUES (?,?,?,?,?,?,?,?,?,?,?) " +
          "ON CONFLICT(id) DO UPDATE SET " +
          "name_lg=EXCLUDED.name_lg,name_sh=EXCLUDED.name_sh,name_6l=EXCLUDED.name_6l,name_3l=EXCLUDED.name_3l," +
          "nation_id=EXCLUDED.nation_id,affiliate_club_id=EXCLUDED.affiliate_club_id,affiliate_club_type=EXCLUDED.affiliate_club_type," +
          "is_extinct=EXCLUDED.is_extinct,city_id=EXCLUDED.city_id,base_nation_id=EXCLUDED.base_nation_id",
        rows, r -> {
          String rawCityId = text(r.get("city_id")).trim();
          Map<String, Object> cityData = cities != null && !rawCityId.isBlank() ? cities.get(rawCityId) : null;
          String validCityId = cityData != null ? rawCityId : null;
          String baseNationId = cityData != null ? nations.get(text(cityData.get("nation_code")).toUpperCase(Locale.ROOT)) : null;
          return new Object[]{
              r.get("id"),
              fallback(r,"name_lg","Club "+r.get("id")),
              fallback(r,"name_sh",fallback(r,"name_lg","Club "+r.get("id"))),
              r.get("name_6l"),
              r.get("name_3l"),
              nations.get(text(r.get("nation_code")).toUpperCase(Locale.ROOT)),
              r.get("affiliate_id"),
              r.get("affiliate_type"),
              text(r.get("comp")).contains("EXTINCT"),
              validCityId,
              baseNationId
          };
        });
  }
  private void upsertStadiums(Map<String, Map<String, Object>> rows, Map<String,String> nations) {
    batch("INSERT INTO stadiums(id,name,nation_id,is_disabled,type) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,nation_id=EXCLUDED.nation_id,is_disabled=EXCLUDED.is_disabled,type=EXCLUDED.type",
        rows, r -> new Object[]{r.get("id"),r.get("name"),nations.get(text(r.get("nation_code")).toUpperCase(Locale.ROOT)),r.getOrDefault("disabled",false),r.get("type")});
  }

  private interface Args { Object[] from(Map<String,Object> row); }
  private void batch(String sql, Map<String, Map<String, Object>> rows, Args args) {
    List<Object[]> values = rows.values().stream().map(args::from).toList();
    jdbc.batchUpdate(sql, values, 1000, (ps, row) -> {
      for (int i = 0; i < row.length; i++) ps.setObject(i + 1, row[i]);
    });
  }
  private static Map<String,Object> row(Map<String,Map<String,Object>> rows, String id) {
    return rows.computeIfAbsent(id, ignored -> { var value = new LinkedHashMap<String,Object>(); value.put("id", id); return value; });
  }
  private static Matcher command(String line) { return COMMAND.matcher(line); }
  private static String stripCommentPrefix(String line) { return line.replaceFirst("^#+\\s*", "").trim(); }
  private static String headerCode(String value) { if(value==null)return null; Matcher m=HEADER_CODE.matcher(value); return m.find()?m.group(1):null; }
  private static String cleanRegion(String value) { return value == null ? null : value.replaceFirst("^\\[[^]]+]\\s*", "").trim(); }
  private static String text(Object value) { return value == null ? "" : String.valueOf(value); }
  private static Object fallback(Map<String,Object> row, String key, Object value) { Object current=row.get(key); return current==null||text(current).isBlank()?value:current; }
}
