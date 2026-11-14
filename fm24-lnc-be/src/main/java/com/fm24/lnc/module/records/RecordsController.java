package com.fm24.lnc.module.records;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/records")
public class RecordsController {
  private static final Map<String,String> TABLES = Map.ofEntries(
      Map.entry("nation","nations"), Map.entry("competition","competitions"), Map.entry("comp","competitions"),
      Map.entry("club","clubs"), Map.entry("stadium","stadiums"), Map.entry("city","cities"),
      Map.entry("award","awards"), Map.entry("person","people"), Map.entry("player","people"), Map.entry("region","regions"));
  private static final Set<String> COLUMNS = Set.of("id","name","name_lg","name_sh","name_3l","name_6l","confed",
      "nation_id","comp_id","parent_id","region","region_id","is_disabled","is_extinct","type","note",
      "inactive_fields","fg_color","bg_color","affiliate_club_id","affiliate_club_type","first_name","common_name","second_name","code",
      "city_id","base_nation_id");
  private final JdbcTemplate jdbc;
  public RecordsController(JdbcTemplate jdbc) { this.jdbc=jdbc; }

  @GetMapping({"/{type}/{id}", "/{type}/{id}/info"})
  public Map<String,Object> get(@PathVariable String type,@PathVariable String id) {
    try { return jdbc.queryForMap("SELECT * FROM "+table(type)+" WHERE id::text=?",id); }
    catch (EmptyResultDataAccessException ex) { throw new IllegalArgumentException(type+" "+id+" not found"); }
  }

  @PostMapping("/{type}")
  public Map<String,Object> create(@PathVariable String type,@RequestBody Map<String,Object> body) {
    Map<String,Object> clean=clean(body); if (!clean.containsKey("id") && !type.equals("region")) throw new IllegalArgumentException("id is required");
    String cols=String.join(",",clean.keySet()); String marks=String.join(",",clean.keySet().stream().map(k->"?").toList());
    jdbc.update("INSERT INTO "+table(type)+"("+cols+") VALUES("+marks+")",clean.values().toArray());
    return get(type,String.valueOf(clean.get("id")));
  }

  @PutMapping("/{type}/{id}")
  public Map<String,Object> update(@PathVariable String type,@PathVariable String id,@RequestBody Map<String,Object> body) {
    Map<String,Object> clean=clean(body); clean.remove("id");
    List<Object> args=new ArrayList<>(); String sets=String.join(",",clean.entrySet().stream().map(e->{args.add(e.getValue());return e.getKey()+"=?";}).toList());
    args.add(id); jdbc.update("UPDATE "+table(type)+" SET "+sets+" WHERE id::text=?",args.toArray()); return get(type,id);
  }

  @DeleteMapping("/{type}/{id}")
  public Map<String,Object> delete(@PathVariable String type,@PathVariable String id) {
    int count=jdbc.update("DELETE FROM "+table(type)+" WHERE id::text=?",id);
    return Map.of("success",count>0,"message",count>0?"Deleted successfully":"Record not found");
  }
  private String table(String type){String value=TABLES.get(type.toLowerCase());if(value==null)throw new IllegalArgumentException("Unsupported type: "+type);return value;}
  private Map<String,Object> clean(Map<String,Object> body){Map<String,Object> out=new LinkedHashMap<>();body.forEach((k,v)->{if(COLUMNS.contains(k))out.put(k,v);});if(out.isEmpty())throw new IllegalArgumentException("No supported fields");return out;}
}
