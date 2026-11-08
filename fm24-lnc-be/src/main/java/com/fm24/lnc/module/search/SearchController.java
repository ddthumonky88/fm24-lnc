package com.fm24.lnc.module.search;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {
  private final JdbcTemplate jdbc;
  public SearchController(JdbcTemplate jdbc){this.jdbc=jdbc;}

  @GetMapping
  public Map<String,Object> get(@RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="20") int limit){return search(keyword,limit);}
  @PostMapping
  public Map<String,Object> post(@RequestBody(required=false) Map<String,Object> body,
      @RequestParam(required=false) String keyword,@RequestParam(required=false) Integer limit){
    String q=keyword!=null?keyword:String.valueOf(body==null?"":body.getOrDefault("keyword",""));
    int max=limit!=null?limit:body!=null&&body.get("limit") instanceof Number n?n.intValue():20;return search(q,max);
  }
  private Map<String,Object> search(String keyword,int limit){
    String q="%"+keyword.trim()+"%"; List<Map<String,Object>> all=new ArrayList<>();
    all.addAll(rows("club","clubs","COALESCE(name_sh,name_lg)",q,limit));
    all.addAll(rows("competition","competitions","COALESCE(name_sh,name_lg)",q,limit));
    all.addAll(rows("nation","nations","COALESCE(name_sh,name_lg)",q,limit));
    all.addAll(rows("stadium","stadiums","name",q,limit)); all.addAll(rows("city","cities","name",q,limit));
    all.addAll(rows("award","awards","COALESCE(name_sh,name_lg)",q,limit));
    all.addAll(jdbc.queryForList("SELECT id, CONCAT_WS(' ',first_name,NULLIF(common_name,''),second_name) name, 'player' type FROM people WHERE CONCAT_WS(' ',first_name,common_name,second_name) ILIKE ? OR id=? LIMIT ?",q,keyword,limit));
    return Map.of("keyword",keyword,"results",all.stream().limit(limit).toList(),"total",all.size());
  }
  private List<Map<String,Object>> rows(String type,String table,String name,String q,int limit){
    return jdbc.queryForList("SELECT id,"+name+" name,'"+type+"' type FROM "+table+" WHERE "+name+" ILIKE ? OR id::text=? LIMIT ?",q,q.substring(1,q.length()-1),limit);
  }
}
