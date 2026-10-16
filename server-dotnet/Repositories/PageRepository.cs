using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IPageRepository
{
    Task<IEnumerable<dynamic>> GetAllPagesAsync(int isSuperadmin, long entityId);
    Task<bool> SetDefaultHomePageAsync(long entityId, string pageName);
    Task<IEnumerable<dynamic>> GetPagesToGiveAccessAsync(long entityId, long roleId, int isSuperadmin);
    Task<bool> AddPageAsync(IDictionary<string, object?> data, long crBy);
    Task<bool> UpdatePageAsync(IDictionary<string, object?> data, long moBy);
    Task<bool> DeletePageAsync(long pageId);
}

public class PageRepository : IPageRepository
{
    private readonly IDbService _db;

    public PageRepository(IDbService db)
    {
        _db = db;
    }

    public async Task<IEnumerable<dynamic>> GetAllPagesAsync(int isSuperadmin, long entityId)
    {
        var pagesQuery = @"
            SELECT page_id, page_name, name, description, superadmin_only, access_for_all, offline_enabled 
            FROM pages";

        if (isSuperadmin == 0)
        {
            pagesQuery += " WHERE superadmin_only = 0";
        }

        var pages = (await _db.QueryAsync<dynamic>(pagesQuery)).ToList();

        var defaultHomePage = "/entity";
        if (entityId > 0)
        {
            var defHome = await _db.QuerySingleOrDefaultAsync<string>(
                "SELECT default_home_page FROM entity WHERE entity_id = @entityId",
                new { entityId }
            );
            if (!string.IsNullOrEmpty(defHome))
            {
                defaultHomePage = defHome;
            }
        }

        var actions = (await _db.QueryAsync<dynamic>("SELECT page_id, action_name, action_desc FROM page_actions")).ToList();

        var actionsByPageId = actions
            .GroupBy(a => Convert.ToInt64(((IDictionary<string, object?>)a)["page_id"]))
            .ToDictionary(g => g.Key, g => g.Select(a =>
            {
                var d = (IDictionary<string, object?>)a;
                return (object)new { action_name = d["action_name"], action_desc = d["action_desc"] };
            }).ToList());

        var result = new List<dynamic>();
        foreach (var page in pages)
        {
            var pageDict = new Dictionary<string, object?>((IDictionary<string, object?>)page!);
            var pageId = Convert.ToInt64(pageDict["page_id"]);
            var pageName = pageDict["page_name"]?.ToString();

            var matchingActions = actionsByPageId.TryGetValue(pageId, out var acts) ? acts : new List<object>();

            result.Add(new
            {
                page_id = pageId,
                page_name = pageName,
                name = pageDict["name"],
                description = pageDict["description"],
                superadmin_only = pageDict["superadmin_only"],
                access_for_all = pageDict["access_for_all"],
                offline_enabled = pageDict["offline_enabled"],
                is_default_home = pageName == defaultHomePage ? 1 : 0,
                extra_actions = matchingActions
            });
        }

        return result;
    }

    public async Task<bool> SetDefaultHomePageAsync(long entityId, string pageName)
    {
        var rows = await _db.ExecuteAsync(
            "UPDATE entity SET default_home_page = @pageName WHERE entity_id = @entityId",
            new { pageName, entityId }
        );
        return rows > 0;
    }

    public async Task<IEnumerable<dynamic>> GetPagesToGiveAccessAsync(long entityId, long roleId, int isSuperadmin)
    {
        string query;
        if (isSuperadmin == 1)
        {
            query = @"
                SELECT p.*, 1 as access_to_add, 1 as access_to_update, 1 as access_to_delete, 1 as access_to_export
                FROM pages p
                WHERE superadmin_only = 0";
        }
        else
        {
            query = @"
                SELECT p.page_id, p.page_name, p.name, p.description, p.superadmin_only, p.access_for_all, p.offline_enabled,
                       pa.access_to_add, pa.access_to_update, pa.access_to_delete, pa.access_to_export
                FROM pages p
                JOIN page_access pa ON pa.entity_id = @entityId AND pa.role_id = @roleId AND p.page_id = pa.page_id 
                WHERE p.superadmin_only = 0 AND p.access_for_all = 0";
        }

        var pages = (await _db.QueryAsync<dynamic>(query, new { entityId, roleId })).ToList();

        string actionsQuery;
        if (isSuperadmin == 1)
        {
            actionsQuery = "SELECT pa.page_id, pa.action_id, pa.action_name, pa.action_desc FROM page_actions pa";
        }
        else
        {
            actionsQuery = @"
                SELECT pa.page_id, pa.action_id, pa.action_name, pa.action_desc 
                FROM page_actions pa
                JOIN page_actions_access paa ON pa.page_id = paa.page_id AND pa.action_id = paa.action_id
                WHERE paa.entity_id = @entityId AND paa.role_id = @roleId";
        }

        var actions = (await _db.QueryAsync<dynamic>(actionsQuery, new { entityId, roleId })).ToList();
        var actionsByPageId = actions
            .GroupBy(a => Convert.ToInt64(((IDictionary<string, object?>)a)["page_id"]))
            .ToDictionary(g => g.Key, g => g.Select(a =>
            {
                var d = (IDictionary<string, object?>)a;
                return (object)new { action_id = d["action_id"], action_name = d["action_name"], action_desc = d["action_desc"] };
            }).ToList());

        var result = new List<dynamic>();
        foreach (var page in pages)
        {
            var pageDict = new Dictionary<string, object?>((IDictionary<string, object?>)page!);
            var pageId = Convert.ToInt64(pageDict["page_id"]);
            var extraActions = actionsByPageId.TryGetValue(pageId, out var acts) ? acts : new List<object>();

            pageDict["extra_actions"] = extraActions;
            result.Add(pageDict);
        }

        return result;
    }

    private static (string Url,string Name,string Description,int Super,int All,int Offline) Validate(IDictionary<string,object?> data)
    {
        string Value(string key)=>data.TryGetValue(key,out var raw)?raw?.ToString()?.Trim()??"":"";
        int Flag(string key)=>Value(key) is "1" or "True" or "true"?1:0;
        var url=Value("page_name");var name=Value("name");var description=Value("description");
        if(url.Length<1||url.Length>255||!System.Text.RegularExpressions.Regex.IsMatch(url,@"^/[A-Za-z0-9/_-]*$"))throw new ArgumentException("Use a valid local page path beginning with /.");
        if(name.Length<1||name.Length>150||description.Length>1000)throw new ArgumentException("Provide a valid page name and description.");
        var super=Flag("superadmin_only");var all=Flag("access_for_all");
        if(super==1&&all==1)throw new ArgumentException("A superadmin page cannot be open to all staff.");
        return(url,name,description,super,all,Flag("offline_enabled"));
    }
    public async Task<bool> AddPageAsync(IDictionary<string, object?> data, long crBy)
    {
        var page=Validate(data);
        await using var c=_db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
        if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM pages WHERE page_name=@Url",page,tx)>0)return false;
        var next=await c.ExecuteScalarAsync<long>("SELECT COALESCE(MAX(page_id),0)+1 FROM pages FOR UPDATE",transaction:tx);
        await c.ExecuteAsync(@"INSERT INTO pages(page_id,page_name,name,description,superadmin_only,access_for_all,offline_enabled,cr_by,cr_on)
          VALUES(@next,@Url,@Name,@Description,@Super,@All,@Offline,@crBy,NOW())",new{next,page.Url,page.Name,page.Description,page.Super,page.All,page.Offline,crBy},tx);
        await SaveActions(c,tx,next,data,crBy);
        await tx.CommitAsync();return true;
    }
    public async Task<bool> UpdatePageAsync(IDictionary<string, object?> data, long moBy)
    {
        if(!long.TryParse(data.TryGetValue("page_id",out var raw)?raw?.ToString():null,out var pageId)||pageId<=0)throw new ArgumentException("Invalid page ID.");
        var page=Validate(data);
        await using var c=_db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
        var rows=await c.ExecuteAsync(@"UPDATE pages SET page_name=@Url,name=@Name,description=@Description,
          superadmin_only=@Super,access_for_all=@All,offline_enabled=@Offline,mo_by=@moBy,mo_on=NOW() WHERE page_id=@pageId",
          new{pageId,page.Url,page.Name,page.Description,page.Super,page.All,page.Offline,moBy},tx);
        if(rows==0)return false;
        await SaveActions(c,tx,pageId,data,moBy);
        await tx.CommitAsync();return true;
    }
    private static async Task SaveActions(MySqlConnector.MySqlConnection c,MySqlConnector.MySqlTransaction tx,long pageId,IDictionary<string,object?> data,long actor)
    {
        if(!data.TryGetValue("extra_actions",out var raw)||raw is not System.Text.Json.JsonElement j||j.ValueKind!=System.Text.Json.JsonValueKind.Array)return;
        var actions=j.EnumerateArray().Select(a=>(Name:a.TryGetProperty("action_name",out var n)?n.ToString().Trim():"",Desc:a.TryGetProperty("action_desc",out var d)?d.ToString().Trim():"" )).ToList();
        if(actions.Any(a=>string.IsNullOrWhiteSpace(a.Name)||a.Name.Length>100||a.Desc.Length>255)||actions.Select(a=>a.Name).Distinct(StringComparer.OrdinalIgnoreCase).Count()!=actions.Count)throw new ArgumentException("Invalid or duplicate page action.");
        var existing=(await c.QueryAsync<(long action_id,string action_name)>("SELECT action_id,action_name FROM page_actions WHERE page_id=@pageId",new{pageId},tx)).ToList();
        foreach(var old in existing.Where(old=>!actions.Any(a=>a.Name.Equals(old.action_name,StringComparison.OrdinalIgnoreCase)))){
          await c.ExecuteAsync("DELETE FROM page_actions_access WHERE page_id=@pageId AND action_id=@action_id",new{pageId,old.action_id},tx);
          await c.ExecuteAsync("DELETE FROM page_actions WHERE page_id=@pageId AND action_id=@action_id",new{pageId,old.action_id},tx);
        }
        var id=existing.Select(a=>a.action_id).DefaultIfEmpty(0).Max();
        foreach(var action in actions){
          var prior=existing.FirstOrDefault(a=>string.Equals(a.action_name,action.Name,StringComparison.OrdinalIgnoreCase));
          if(prior.action_id>0)await c.ExecuteAsync("UPDATE page_actions SET action_desc=@Desc WHERE page_id=@pageId AND action_id=@id",new{pageId,id=prior.action_id,action.Desc},tx);
          else await c.ExecuteAsync("INSERT INTO page_actions(page_id,action_id,action_name,action_desc,cr_by,cr_on) VALUES(@pageId,@id,@Name,@Desc,@actor,NOW())",new{pageId,id=++id,action.Name,action.Desc,actor},tx);
        }
    }
    public async Task<bool> DeletePageAsync(long pageId)
    {
        await _db.ExecuteAsync("DELETE FROM page_access WHERE page_id = @pageId", new { pageId });
        await _db.ExecuteAsync("DELETE FROM page_actions_access WHERE page_id = @pageId", new { pageId });
        await _db.ExecuteAsync("DELETE FROM page_actions WHERE page_id = @pageId", new { pageId });
        var rows = await _db.ExecuteAsync("DELETE FROM pages WHERE page_id = @pageId", new { pageId });
        return rows > 0;
    }
}
