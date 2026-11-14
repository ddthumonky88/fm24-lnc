package com.fm24.lnc.module.hierarchy;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hierarchy")
public class HierarchyController {
  private static final List<String> CONFEDS=List.of("AFC","CAF","CONCACAF","CONMEBOL","OFC","UEFA");
  private static final String COMPETITION_ORDER="CASE WHEN type LIKE 'Domestic League%' THEN 1 WHEN type='Domestic Cup' THEN 2 WHEN type LIKE 'Youth Competitions%' THEN 3 WHEN type='Other Competitions' THEN 4 WHEN type LIKE 'Extinct%' THEN 5 ELSE 6 END, CASE WHEN id ~ '^[0-9]+$' THEN id::numeric END, id";
  private final JdbcTemplate jdbc;
  public HierarchyController(JdbcTemplate jdbc){this.jdbc=jdbc;}

  @GetMapping("/list-confederations")
  public List<Map<String,Object>> confederations(){
    List<Map<String,Object>> result=new ArrayList<>();
    for(String code:List.of("CAF","AFC","UEFA","CONCACAF","OFC","CONMEBOL","WORLD","EXTINCT")){
      Integer nations=jdbc.queryForObject("SELECT COUNT(*) FROM nations WHERE confed=?",Integer.class,code);
      Integer comps=jdbc.queryForObject("SELECT COUNT(*) FROM competitions WHERE confed=? AND nation_id IS NULL",Integer.class,code);
      result.add(Map.of("id",code,"name",code,"code",code,"stats",Map.of("nations",nations,"intComps",comps)));
    } return result;
  }

  @GetMapping({"/tree","/unit-tree"})
  public List<Map<String,Object>> tree(@RequestParam(defaultValue="default") String type){
    List<Map<String,Object>> roots=new ArrayList<>(); roots.add(node("all","ALL","ALL","",1,true,List.of()));
    if(type.equalsIgnoreCase("comp")||type.equalsIgnoreCase("competition")) roots.add(node("world","[WORLD] World","WORLD","World",1,true,List.of()));
    if(type.equalsIgnoreCase("nation")){
      for(String c:CONFEDS) roots.add(node(c.toLowerCase(),"["+c+"] "+confedName(c),c,confedName(c),1,true,List.of()));
      roots.add(node("extinct","[EXT] Extinct","EXT","Extinct",1,true,List.of())); return roots;
    }
    for(String confed:CONFEDS){
      List<Map<String,Object>> nations=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,confed FROM nations WHERE confed=? ORDER BY COALESCE(name_sh,name_lg)",confed);
      List<Map<String,Object>> children=new ArrayList<>();
      if(type.equalsIgnoreCase("comp")||type.equalsIgnoreCase("competition")) children.add(special("intl_"+confed.toLowerCase(),"INT","International",confed));
      for(Map<String,Object> nation:nations){
        String id=String.valueOf(nation.get("id")); String key=type.equalsIgnoreCase("club")?"nation_"+id:id;
        List<Map<String,Object>> sub=new ArrayList<>();
        if(type.equalsIgnoreCase("club")){
          for(Map<String,Object> comp:jdbc.queryForList("SELECT c.id,c.name_lg,c.name_sh,c.name_3l,c.nation_id FROM competitions c WHERE c.nation_id=? AND c.parent_id IS NULL AND EXISTS (SELECT 1 FROM clubs cl WHERE cl.comp_id=c.id) ORDER BY COALESCE(c.name_sh,c.name_lg)",id))
            sub.add(node("comp_"+comp.get("id"),text(comp.get("name_sh"),comp.get("name_lg")),text(comp.get("name_3l"),"CMP"),text(comp.get("name_sh"),comp.get("name_lg")),3,true,List.of()));
          sub.add(special("oth_"+id,"OTH","Other",confed)); sub.add(special("ext_"+id,"EXT","Extinct",confed));
        }
        if(type.equalsIgnoreCase("city")){
          for(Map<String,Object> region:jdbc.queryForList(
              "SELECT r.id,r.name,r.code,COUNT(c.id)::int city_count FROM regions r " +
              "JOIN cities c ON c.region_id=r.id " +
              "WHERE r.nation_id=? AND TRIM(c.name)<>'-' AND UPPER(COALESCE(c.region,'')) NOT LIKE '[REMOVE]%' " +
              "GROUP BY r.id,r.name,r.code ORDER BY r.name",id)){
            Map<String,Object> regionNode=node(
                "region_"+id+"_"+region.get("id"),
                text(region.get("name"),"Other"),text(region.get("code"),"REG"),text(region.get("name"),"Other"),3,true,List.of());
            regionNode.put("nationId",id);
            regionNode.put("regionId",region.get("id"));
            regionNode.put("isRegion",true);
            regionNode.put("count",region.get("city_count"));
            sub.add(regionNode);
          }
          Integer removeCount=jdbc.queryForObject("SELECT COUNT(*) FROM cities WHERE nation_id=? AND (TRIM(name)='-' OR UPPER(COALESCE(region,'')) LIKE '[REMOVE]%')",Integer.class,id);
          if(removeCount!=null&&removeCount>0){
            String nationCode=text(nation.get("name_3l"),id).toUpperCase();
            Map<String,Object> removeNode=node("remove_"+id,"["+nationCode+"-REMOVE]","REMOVE","Remove",3,true,List.of());
            removeNode.put("nationId",id); removeNode.put("isRemove",true); removeNode.put("count",removeCount); sub.add(removeNode);
          }
        }
        Map<String,Object> n=node(key,text(nation.get("name_sh"),nation.get("name_lg")),text(nation.get("name_3l"),"---"),text(nation.get("name_sh"),nation.get("name_lg")),2,true,sub);
        n.put("confed",confed); n.put("nationData",nation); children.add(n);
      }
      roots.add(node(confed.toLowerCase(),"["+confed+"] "+confedName(confed),confed,confedName(confed),1,true,children));
    }
    if(type.equalsIgnoreCase("city")){
      List<Map<String,Object>> cityTree=new ArrayList<>();
      cityTree.add(roots.get(0));
      for(int rootIndex=1;rootIndex<roots.size();rootIndex++){
        Object rawNations=roots.get(rootIndex).get("children");
        if(!(rawNations instanceof List<?> nations)) continue;
        for(Object rawNation:nations){
          if(!(rawNation instanceof Map<?,?> rawNationMap)) continue;
          @SuppressWarnings("unchecked") Map<String,Object> nationNode=(Map<String,Object>)rawNationMap;
          nationNode.put("level",1);
          Object rawRegions=nationNode.get("children");
          if(rawRegions instanceof List<?> regions){
            for(Object rawRegion:regions){
              if(rawRegion instanceof Map<?,?> rawRegionMap){
                @SuppressWarnings("unchecked") Map<String,Object> regionNode=(Map<String,Object>)rawRegionMap;
                regionNode.put("level",2);
              }
            }
          }
          cityTree.add(nationNode);
        }
      }
      return cityTree;
    }
    return roots;
  }

  @PostMapping("/nations/search") public Map<String,Object> nations(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("nations",merge(q,f),"COALESCE(name_sh,name_lg)");}
  @PostMapping("/competitions/search")
  public Map<String,Object> competitions(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){
    Map<String,Object> filter=merge(q,f);
    Object confed=filter.containsKey("confed")?filter.get("confed"):filter.get("confedId");
    Object nationId=filter.get("nationId");
    boolean international=nationId!=null&&String.valueOf(nationId).equalsIgnoreCase("INTERNATIONAL");
    boolean allNations=nationId!=null&&String.valueOf(nationId).equalsIgnoreCase("all");

    filter.remove("confed");
    if(confed==null||String.valueOf(confed).isBlank()||String.valueOf(confed).equalsIgnoreCase("all")) filter.remove("confedId");
    else filter.put("confedId",String.valueOf(confed));
    if(international||allNations) filter.remove("nationId");

    String base=international
      ? "nation_id IS NULL AND parent_id IS NULL"
      : nationId!=null
        ? "nation_id IS NOT NULL AND parent_id IS NULL"
        : "parent_id IS NULL";
    return pageSql("competitions",filter,base,COMPETITION_ORDER);
  }
  @PostMapping("/club/search")
  public Map<String,Object> clubs(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){
    Map<String,Object> result=page("clubs",merge(q,f),"LENGTH(id), id");
    Object rows=result.get("content");
    if(rows instanceof List<?> content){
      for(Object row:content){
        if(row instanceof Map<?,?> raw){
          @SuppressWarnings("unchecked") Map<String,Object> club=(Map<String,Object>)raw;
          enrichClub(club);
        }
      }
    }
    return result;
  }
  @PostMapping("/stadiums/search") public Map<String,Object> stadiums(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("stadiums",merge(q,f),"name");}
  @PostMapping("/cities/search") public Map<String,Object> cities(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){
    Map<String,Object> result=page("cities",merge(q,f),"CASE WHEN TRIM(name)='-' OR UPPER(COALESCE(region,'')) LIKE '[REMOVE]%' THEN 1 ELSE 0 END, name");
    Object rows=result.get("content");
    if(rows instanceof List<?> content) for(Object row:content) if(row instanceof Map<?,?> raw){
      @SuppressWarnings("unchecked") Map<String,Object> city=(Map<String,Object>)raw; enrichCity(city);
    }
    return result;
  }
  @PostMapping({"/awards/search","/awards"}) public Map<String,Object> awards(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("awards",merge(q,f),"COALESCE(name_sh,name_lg)");}
  @PostMapping("/players") public Map<String,Object> players(@RequestParam Map<String,String> q,@RequestBody(required=false) Map<String,Object> f){return page("people",merge(q,f),"CONCAT_WS(' ',first_name,common_name,second_name)");}

  @GetMapping("/regions") public List<Map<String,Object>> regions(){return jdbc.queryForList("SELECT r.*,COUNT(c.id)::int cities_count FROM regions r LEFT JOIN cities c ON c.region_id=r.id GROUP BY r.id ORDER BY r.name");}
  @PostMapping("/regions/search") public Map<String,Object> regionSearch(@RequestBody(required=false) Map<String,Object> f){return page("regions",f,"name");}
  @GetMapping("/nations/{nationId}/regions") public List<Map<String,Object>> nationRegions(@PathVariable String nationId){return jdbc.queryForList("SELECT r.*,COUNT(c.id)::int cities_count FROM regions r LEFT JOIN cities c ON c.region_id=r.id WHERE r.nation_id=? GROUP BY r.id ORDER BY r.name",nationId);}
  @GetMapping("/competitions/{compId}/awards") public List<Map<String,Object>> compAwards(@PathVariable String compId){return jdbc.queryForList("SELECT * FROM awards WHERE comp_id=? ORDER BY COALESCE(name_sh,name_lg)",compId);}
  @PostMapping("/competitions/{id}/sub-competitions") public Map<String,Object> subComps(@PathVariable String id,@RequestBody(required=false) Map<String,Object> f){Map<String,Object> filter=f==null?new LinkedHashMap<>():new LinkedHashMap<>(f);filter.put("parentId",id);return page("competitions",filter,COMPETITION_ORDER);}

  @GetMapping({"/nations/{id}/info","/nations/{id}/hub"}) public Map<String,Object> nationInfo(@PathVariable String id){return info("nations",id);}
  @GetMapping("/clubs/{id}/info")
  public Map<String,Object> clubInfo(@PathVariable String id){
    Map<String,Object> club=new LinkedHashMap<>(info("clubs",id));
    enrichClub(club);
    return club;
  }

  private void enrichClub(Map<String,Object> club){
    Object compId=club.get("comp_id");
    if(compId!=null){
      List<Map<String,Object>> comps=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,nation_id FROM competitions WHERE id::text=?",String.valueOf(compId));
      if(!comps.isEmpty()){
        Map<String,Object> comp=comps.get(0);
        club.put("comp",comp);
        if(club.get("nation_id")==null && comp.get("nation_id")!=null) club.put("nation_id",comp.get("nation_id"));
      }
    }
    Object nationId=club.get("nation_id");
    if(nationId!=null){
      List<Map<String,Object>> nations=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,confed FROM nations WHERE id::text=?",String.valueOf(nationId));
      if(!nations.isEmpty()){
        Map<String,Object> nation=nations.get(0);
        club.put("nation",nation);
      }
    }
    Object affiliateId=club.get("affiliate_club_id");
    club.put("affiliate",null);
    if(affiliateId!=null){
      List<Map<String,Object>> affiliates=jdbc.queryForList("SELECT id,name_lg,name_sh,name_6l,name_3l FROM clubs WHERE id::text=?",String.valueOf(affiliateId));
      if(!affiliates.isEmpty()){
        Map<String,Object> affiliate=new LinkedHashMap<>(affiliates.get(0));
        affiliate.put("type",club.get("affiliate_club_type"));
        club.put("affiliate",affiliate);
      }
    }
    Object cityId=club.get("city_id");
    club.put("city",null);
    if(cityId!=null){
      List<Map<String,Object>> cities=jdbc.queryForList("SELECT id,name,nation_id,region,region_id,is_disabled FROM cities WHERE id::text=?",String.valueOf(cityId));
      if(!cities.isEmpty()){
        Map<String,Object> city=new LinkedHashMap<>(cities.get(0));
        enrichCity(city);
        club.put("city",city);
      }
    }
    Object baseNationId=club.get("base_nation_id");
    club.put("base_nation",null);
    club.put("baseNation",null);
    club.put("base-nation",null);
    if(baseNationId!=null){
      List<Map<String,Object>> baseNations=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,confed FROM nations WHERE id::text=?",String.valueOf(baseNationId));
      if(!baseNations.isEmpty()){
        Map<String,Object> bn=baseNations.get(0);
        club.put("base_nation",bn);
        club.put("baseNation",bn);
        club.put("base-nation",bn);
      }
    }
  }
  private void enrichCity(Map<String,Object> city){
    Object nationId=city.get("nation_id");
    if(nationId!=null){
      List<Map<String,Object>> nations=jdbc.queryForList("SELECT id,name_lg,name_sh,name_3l,confed FROM nations WHERE id::text=?",String.valueOf(nationId));
      city.put("nation",nations.isEmpty()?null:nations.get(0));
    } else city.put("nation",null);

    Object rawRegion=city.get("region");
    Object regionId=city.get("region_id");
    Map<String,Object> resolvedRegion=null;
    if(regionId!=null){
      List<Map<String,Object>> regions=jdbc.queryForList("SELECT id,name FROM regions WHERE id::text=?",String.valueOf(regionId));
      if(!regions.isEmpty()) resolvedRegion=regions.get(0);
    }
    if(resolvedRegion==null&&rawRegion!=null&&!String.valueOf(rawRegion).isBlank()){
      resolvedRegion=new LinkedHashMap<>(); resolvedRegion.put("id",regionId); resolvedRegion.put("name",rawRegion);
    }
    city.put("region",resolvedRegion);
    city.remove("nation_id"); city.remove("region_id"); city.remove("region_name");
  }
  @GetMapping("/clubs/{id}/affiliates") public List<Map<String,Object>> affiliates(@PathVariable String id){return jdbc.queryForList("SELECT * FROM clubs WHERE affiliate_club_id=?",id);}
  @GetMapping("/cities/{id}/info") public Map<String,Object> cityInfo(@PathVariable String id){Map<String,Object> city=new LinkedHashMap<>(info("cities",id));enrichCity(city);return city;}
  @GetMapping("/awards/{id}/info") public Map<String,Object> awardInfo(@PathVariable String id){return info("awards",id);}
  @GetMapping("/stadiums/{id}/info") public Map<String,Object> stadiumInfo(@PathVariable String id){return info("stadiums",id);}
  @GetMapping("/regions/{id}/info") public Map<String,Object> regionInfo(@PathVariable String id){return info("regions",id);}
  @GetMapping("/competitions/{id}/info") public Map<String,Object> compInfo(@PathVariable String id){return info("competitions",id);}
  @GetMapping("/continents/{id}/info") public Map<String,Object> continentInfo(@PathVariable String id){return Map.of("id",id,"name",confedName(id.toUpperCase()),"nationsCount",jdbc.queryForObject("SELECT COUNT(*) FROM nations WHERE confed=?",Integer.class,id.toUpperCase()));}

  private Map<String,Object> page(String table,Map<String,Object> f,String order){return pageSql(table,f,"TRUE",order);}
  private Map<String,Object> pageSql(String table,Map<String,Object> input,String base,String order){
    Map<String,Object> f=input==null?Map.of():input; int page=num(f.get("page"),0),size=Math.min(num(f.get("size"),20),300); List<Object> args=new ArrayList<>();
    StringBuilder where=new StringBuilder(base); add(where,args,f,"nationId","nation_id"); add(where,args,f,"compId","comp_id"); add(where,args,f,"parentId","parent_id"); add(where,args,f,"regionId","region_id"); add(where,args,f,"type","type"); add(where,args,f,"cityId","city_id"); add(where,args,f,"baseNationId","base_nation_id");
    if(table.equals("cities")&&Boolean.parseBoolean(String.valueOf(f.getOrDefault("removeOnly",false)))) where.append(" AND (TRIM(name)='-' OR UPPER(COALESCE(region,'')) LIKE '[REMOVE]%')");
    Object confed=f.get("confedId");
    if(confed!=null&&!String.valueOf(confed).equalsIgnoreCase("all")){
      String confedCode=String.valueOf(confed).toUpperCase();
      switch(table){
        case "nations","competitions" -> {
          where.append(" AND confed=?");
          args.add(confedCode);
        }
        case "clubs" -> {
          where.append(" AND (nation_id IN (SELECT id FROM nations WHERE confed=?) OR base_nation_id IN (SELECT id FROM nations WHERE confed=?) OR comp_id IN (SELECT c.id FROM competitions c JOIN nations n ON n.id=c.nation_id WHERE n.confed=?))");
          args.add(confedCode);
          args.add(confedCode);
          args.add(confedCode);
        }
        case "cities","stadiums","awards" -> {
          where.append(" AND nation_id IN (SELECT id FROM nations WHERE confed=?)");
          args.add(confedCode);
        }
        default -> { }
      }
    }
    String search=searchExpression(table);
    Object keyword=f.get("keyword");if(keyword!=null&&!String.valueOf(keyword).isBlank()){where.append(" AND (id::text ILIKE ? OR ").append(search).append(" ILIKE ?)");args.add("%"+keyword+"%");args.add("%"+keyword+"%");}
    Integer total=jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE "+where,Integer.class,args.toArray()); List<Object> queryArgs=new ArrayList<>(args);queryArgs.add(size);queryArgs.add(page*size);
    List<Map<String,Object>> content=jdbc.queryForList("SELECT * FROM "+table+" WHERE "+where+" ORDER BY "+order+" LIMIT ? OFFSET ?",queryArgs.toArray());
    if(table.equals("clubs")) enrichClubAffiliates(content);
    if(table.equals("competitions")) enrichCompetitionChildren(content);
    int pages=(int)Math.ceil((total==null?0:total)/(double)size);
    return Map.of("content",content,"page",page,"size",size,"totalElements",total==null?0:total,"totalPages",pages,"first",page==0,"last",page+1>=pages,"hasPrevious",page>0,"hasNext",page+1<pages);
  }
  private void enrichClubAffiliates(List<Map<String,Object>> clubs){
    List<String> ids=clubs.stream().map(c->c.get("affiliate_club_id")).filter(java.util.Objects::nonNull).map(String::valueOf).distinct().toList();
    if(ids.isEmpty()) return;
    String marks=String.join(",",ids.stream().map(id->"?").toList());
    Map<String,Map<String,Object>> byId=new LinkedHashMap<>();
    jdbc.queryForList("SELECT id,name_lg,name_sh,name_6l,name_3l FROM clubs WHERE id::text IN ("+marks+")",ids.toArray())
        .forEach(parent->byId.put(String.valueOf(parent.get("id")),parent));
    clubs.forEach(club->{
      Object rawId=club.get("affiliate_club_id");
      if(rawId==null) return;
      Map<String,Object> parent=byId.get(String.valueOf(rawId));
      if(parent==null) return;
      Map<String,Object> affiliate=new LinkedHashMap<>(parent);
      affiliate.put("type",club.get("affiliate_club_type"));
      club.put("affiliate",affiliate);
    });
  }
  private void enrichCompetitionChildren(List<Map<String,Object>> competitions){
    List<String> ids=competitions.stream().map(c->c.get("id")).filter(java.util.Objects::nonNull).map(String::valueOf).distinct().toList();
    if(ids.isEmpty()) return;
    String marks=String.join(",",ids.stream().map(id->"?").toList());
    Map<String,Integer> counts=new LinkedHashMap<>();
    jdbc.queryForList("SELECT parent_id,COUNT(*)::int child_count FROM competitions WHERE parent_id IN ("+marks+") GROUP BY parent_id",ids.toArray())
        .forEach(row->counts.put(String.valueOf(row.get("parent_id")),((Number)row.get("child_count")).intValue()));
    competitions.forEach(comp->comp.put("children_count",counts.getOrDefault(String.valueOf(comp.get("id")),0)));
  }
  private Map<String,Object> info(String table,String id){return jdbc.queryForMap("SELECT * FROM "+table+" WHERE id::text=?",id);}
  private String searchExpression(String table){return switch(table){case "nations","competitions","clubs","awards"->"COALESCE(name_sh,name_lg)";case "people"->"CONCAT_WS(' ',first_name,common_name,second_name)";default->"name";};}
  private void add(StringBuilder w,List<Object>a,Map<String,Object>f,String key,String col){Object v=f.get(key);if(v!=null&&!String.valueOf(v).isBlank()){w.append(" AND ").append(col).append("::text=?");a.add(v);}}
  private Map<String,Object> merge(Map<String,String> query,Map<String,Object> body){Map<String,Object> out=new LinkedHashMap<>();if(body!=null)out.putAll(body);if(query!=null)out.putAll(query);return out;}
  private int num(Object value,int fallback){if(value instanceof Number n)return n.intValue();if(value!=null)try{return Integer.parseInt(String.valueOf(value));}catch(NumberFormatException ignored){}return fallback;}
  private String text(Object a,Object b){String x=a==null?"":String.valueOf(a);return x.isBlank()?String.valueOf(b):x;}
  private String confedName(String c){return Map.of("AFC","Asia","CAF","Africa","CONCACAF","North America","CONMEBOL","South America","OFC","Oceania","UEFA","Europe","WORLD","World","EXTINCT","Extinct").getOrDefault(c,c);}
  private Map<String,Object> special(String key,String code,String name,String confed){Map<String,Object> n=node(key,"["+code+"] "+name,code,name,2,true,List.of());n.put("confed",confed);return n;}
  private Map<String,Object> node(String key,String title,String code,String shortName,int level,boolean selectable,List<Map<String,Object>> children){Map<String,Object> n=new LinkedHashMap<>();n.put("key",key);n.put("title",title);n.put("code3",code);n.put("shortName",shortName);n.put("level",level);n.put("selectable",selectable);n.put("isLeaf",children.isEmpty());if(!children.isEmpty())n.put("children",children);return n;}
}
