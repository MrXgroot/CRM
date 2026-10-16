using Matrika.Api.Common;
using Dapper;

namespace Matrika.Api.Repositories;

public interface IRoleRepository
{
    Task<IEnumerable<dynamic>> GetRolesAsync(long entityId, string? roleName, int? limit, int? page, bool isAdmin, bool isStaff);
    Task<long> AddRoleAsync(IDictionary<string, object?> data, long entityId, long crBy);
    Task<bool> UpdateRoleAsync(IDictionary<string, object?> data, long entityId, long moBy);
}

public class RoleRepository : IRoleRepository
{
    private readonly IDbService _db;

    public RoleRepository(IDbService db)
    {
        _db = db;
    }

    public async Task<IEnumerable<dynamic>> GetRolesAsync(long entityId, string? roleName, int? limit, int? page, bool isAdmin, bool isStaff)
    {
        var sql = @"
            SELECT r.entity_id, r.role_id, r.role_name, r.is_staff, r.is_admin, r.is_superadmin, r.is_active, r.cr_on, r.cr_by, e.name as entity_name
            FROM roles r
            JOIN entity e USING (entity_id)
            WHERE r.entity_id = @entityId";

        var dynamicParams = new DynamicParameters();
        dynamicParams.Add("entityId", entityId);

        if (isAdmin)
        {
            sql += " AND (r.is_admin = 1 OR r.is_staff = 1)";
        }
        else if (isStaff)
        {
            sql += " AND r.is_staff = 1";
        }

        if (!string.IsNullOrWhiteSpace(roleName))
        {
            sql += " AND LOWER(r.role_name) LIKE @roleName";
            dynamicParams.Add("roleName", $"%{roleName.ToLower()}%");
        }

        if (limit.HasValue && limit.Value > 0)
        {
            var offset = (page ?? 0) * limit.Value;
            sql += $" LIMIT {limit.Value} OFFSET {offset}";
        }

        var allRoles = (await _db.QueryAsync<dynamic>(sql, dynamicParams)).ToList();

        var allPageAccess = (await _db.QueryAsync<dynamic>(
            "SELECT page_id, role_id, access_to_add, access_to_update, access_to_delete, access_to_export, cr_on, cr_by FROM page_access WHERE entity_id = @entityId",
            new { entityId }
        )).ToList();

        var accessActions = (await _db.QueryAsync<dynamic>(
            "SELECT page_id, role_id, action_id, action_name, cr_on, cr_by FROM page_actions_access WHERE entity_id = @entityId",
            new { entityId }
        )).ToList();

        var roleBranches = (await _db.QueryAsync<dynamic>(
            "SELECT entity_id, role_id, branch_id FROM role_branch_access WHERE entity_id = @entityId",
            new { entityId }
        )).ToList();

        var result = new List<dynamic>();

        foreach (var role in allRoles)
        {
            var roleDict = new Dictionary<string, object?>((IDictionary<string, object?>)role!);
            var roleId = Convert.ToInt64(roleDict["role_id"]);

            var branchAccess = roleBranches
                .Where(b => Convert.ToInt64(((IDictionary<string, object?>)b)["role_id"]) == roleId)
                .Select(b => Convert.ToInt64(((IDictionary<string, object?>)b)["branch_id"]))
                .ToList();

            var pageAccess = allPageAccess
                .Where(p => Convert.ToInt64(((IDictionary<string, object?>)p)["role_id"]) == roleId)
                .Select(p =>
                {
                    var pd = (IDictionary<string, object?>)p;
                    return (object)new
                    {
                        role_id = pd["role_id"],
                        page_id = pd["page_id"],
                        access_to_add = pd["access_to_add"],
                        access_to_update = pd["access_to_update"],
                        access_to_delete = pd["access_to_delete"],
                        access_to_export = pd["access_to_export"],
                        cr_by = pd["cr_by"],
                        cr_on = pd["cr_on"]
                    };
                })
                .ToList();

            var extraActions = accessActions
                .Where(a => Convert.ToInt64(((IDictionary<string, object?>)a)["role_id"]) == roleId)
                .Select(a =>
                {
                    var ad = (IDictionary<string, object?>)a;
                    return (object)new
                    {
                        page_id = ad["page_id"],
                        action_id = ad["action_id"],
                        action_name = ad["action_name"],
                        cr_by = ad["cr_by"],
                        cr_on = ad["cr_on"],
                        role_id = ad["role_id"],
                        access_to_action = 1
                    };
                })
                .ToList();

            roleDict["branch_access"] = branchAccess;
            roleDict["page_access"] = pageAccess;
            roleDict["extra_actions"] = extraActions;

            result.Add(roleDict);
        }

        return result;
    }

    private static int Flag(IDictionary<string, object?> data, string key, int fallback=0) => data.TryGetValue(key,out var v) ? (v?.ToString() is "1" or "True" or "true" ? 1 : 0) : fallback;
    public async Task<long> AddRoleAsync(IDictionary<string, object?> data, long entityId, long crBy) => await Save(data,entityId,crBy,false);
    public async Task<bool> UpdateRoleAsync(IDictionary<string, object?> data, long entityId, long moBy) => await Save(data,entityId,moBy,true)>0;
    private async Task<long> Save(IDictionary<string,object?> data,long entityId,long actor,bool edit)
    {
        var name=data.ToDictionary(x=>x.Key,x=>x.Value).GetValueOrDefault("role_name")?.ToString()?.Trim();
        if(string.IsNullOrWhiteSpace(name)||name.Length>150)throw new ArgumentException("Provide a role name of at most 150 characters.");
        var roleId=edit && long.TryParse(data.ToDictionary(x=>x.Key,x=>x.Value).GetValueOrDefault("role_id")?.ToString(),out var supplied) ? supplied : 0;
        if(edit && roleId<=0)throw new ArgumentException("Invalid role ID.");
        await using var c=_db.CreateConnection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
        // Serialize per-entity role creation and permission replacement.
        if(await c.ExecuteScalarAsync<long?>("SELECT entity_id FROM entity WHERE entity_id=@entityId FOR UPDATE",new{entityId},tx)==null)throw new ArgumentException("Entity not found.");
        if(edit && await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM roles WHERE entity_id=@entityId AND role_id=@roleId",new{entityId,roleId},tx)==0)return 0;
        if(!edit)roleId=await c.ExecuteScalarAsync<long>("SELECT COALESCE(MAX(role_id),0)+1 FROM roles WHERE entity_id=@entityId",new{entityId},tx);
        var p=new{entityId,roleId,name,super=Flag(data,"is_superadmin"),admin=Flag(data,"is_admin"),staff=Flag(data,"is_staff"),active=Flag(data,"is_active",1),actor};
        if(edit)await c.ExecuteAsync("UPDATE roles SET role_name=@name,is_admin=@admin,is_staff=@staff,is_active=@active,mo_by=@actor,mo_on=NOW() WHERE entity_id=@entityId AND role_id=@roleId",p,tx);
        else await c.ExecuteAsync("INSERT INTO roles(entity_id,role_id,role_name,is_superadmin,is_admin,is_staff,is_active,cr_by,cr_on) VALUES(@entityId,@roleId,@name,@super,@admin,@staff,@active,@actor,NOW())",p,tx);
        if(data.ContainsKey("page_access")){
            await c.ExecuteAsync("DELETE FROM page_access WHERE entity_id=@entityId AND role_id=@roleId",p,tx);
            foreach(var item in Items(data,"page_access")){
                long pageId=Id(item,"page_id");
                var rows=await c.ExecuteAsync("INSERT INTO page_access(entity_id,role_id,page_id,access_to_add,access_to_update,access_to_delete,access_to_export,cr_by,cr_on) SELECT @entityId,@roleId,page_id,@add,@update,@delete,@export,@actor,NOW() FROM pages WHERE page_id=@pageId",new{entityId,roleId,pageId,add=Bit(item,"access_to_add"),update=Bit(item,"access_to_update"),delete=Bit(item,"access_to_delete"),export=Bit(item,"access_to_export"),actor},tx);
                if(rows!=1)throw new ArgumentException("Unknown page permission.");
            }
        }
        if(data.ContainsKey("extra_actions")){
            await c.ExecuteAsync("DELETE FROM page_actions_access WHERE entity_id=@entityId AND role_id=@roleId",p,tx);
            foreach(var item in Items(data,"extra_actions")){
                var pageId=Id(item,"page_id");var actionName=item.GetProperty("action_name").GetString();
                var rows=await c.ExecuteAsync("INSERT INTO page_actions_access(entity_id,role_id,page_id,action_id,action_name,cr_by,cr_on) SELECT @entityId,@roleId,page_id,action_id,action_name,@actor,NOW() FROM page_actions WHERE page_id=@pageId AND action_name=@actionName",new{entityId,roleId,pageId,actionName,actor},tx);
                if(rows!=1)throw new ArgumentException("Unknown action permission.");
            }
        }
        if(data.ContainsKey("branch_access")){
            await c.ExecuteAsync("DELETE FROM role_branch_access WHERE entity_id=@entityId AND role_id=@roleId",p,tx);
            foreach(var item in Items(data,"branch_access")){
                if(!long.TryParse(item.ToString(),out var branchId))throw new ArgumentException("Invalid branch.");
                var rows=await c.ExecuteAsync("INSERT INTO role_branch_access(entity_id,role_id,branch_id,cr_by,cr_on) SELECT entity_id,@roleId,branch_id,@actor,NOW() FROM branch WHERE entity_id=@entityId AND branch_id=@branchId",new{entityId,roleId,branchId,actor},tx);
                if(rows!=1)throw new ArgumentException("Branch does not belong to this entity.");
            }
        }
        if(edit)await c.ExecuteAsync("UPDATE session s JOIN users u ON u.entity_id=s.entity_id AND u.user_id=s.user_id SET s.logout_time=NOW(),s.log_type='LO' WHERE u.entity_id=@entityId AND u.role_id=@roleId AND s.logout_time IS NULL",p,tx);
        await tx.CommitAsync();return roleId;
    }
    private static IEnumerable<System.Text.Json.JsonElement> Items(IDictionary<string,object?> data,string key){
        if(data.ToDictionary(x=>x.Key,x=>x.Value).GetValueOrDefault(key) is not System.Text.Json.JsonElement j || j.ValueKind!=System.Text.Json.JsonValueKind.Array)throw new ArgumentException($"Invalid {key}.");
        return j.EnumerateArray().ToArray();
    }
    private static long Id(System.Text.Json.JsonElement j,string key)=>j.TryGetProperty(key,out var v)&&long.TryParse(v.ToString(),out var id)&&id>0?id:throw new ArgumentException("Invalid permission ID.");
    private static int Bit(System.Text.Json.JsonElement j,string key)=>j.TryGetProperty(key,out var v)&&v.ToString() is "1" or "True" or "true"?1:0;
}
