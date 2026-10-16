using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using Matrika.Api.Common;

namespace Matrika.Api.Repositories;

public interface IEntityRepository
{
    Task<IEnumerable<dynamic>> GetAllEntitiesAsync(long? entityId = null);
    Task<dynamic?> GetEntityByIdAsync(long entityId);
    Task<long> AddEntityAsync(IDictionary<string, object?> data, long crBy);
    Task<bool> UpdateEntityAsync(IDictionary<string, object?> data, long moBy);
}

public class EntityRepository : IEntityRepository
{
    private static readonly string[] PiiFields = { "address", "email", "phone_num" };
    private const string SelectFields = "SELECT entity_id,name,short_desc,email,address,phone_num,DATE_FORMAT(expiry_date,'%Y-%m-%d') AS expiry_date FROM entity";
    private readonly IDbService _db;
    private readonly IEncryptionService _encryption;
    public EntityRepository(IDbService db, IEncryptionService encryption) { _db = db; _encryption = encryption; }

    public async Task<IEnumerable<dynamic>> GetAllEntitiesAsync(long? entityId = null)
    {
        var rows = await _db.QueryAsync<dynamic>(SelectFields + (entityId.HasValue ? " WHERE entity_id=@entityId" : "") + " ORDER BY name", new { entityId });
        return rows.Select(row => (dynamic)_encryption.DecryptFields(new Dictionary<string, object?>((IDictionary<string, object?>)row), PiiFields)).ToList();
    }
    public async Task<dynamic?> GetEntityByIdAsync(long entityId) => (await GetAllEntitiesAsync(entityId)).FirstOrDefault();

    private Dictionary<string, object?> Validate(IDictionary<string, object?> data)
    {
        var result = new Dictionary<string, object?>();
        foreach (var field in new[] { ("name",150), ("short_desc",255), ("email",254), ("phone_num",30), ("address",1000), ("expiry_date",10) })
        {
            var value = data.TryGetValue(field.Item1, out var raw) && raw != null ? raw.ToString()?.Trim() : null;
            if (value?.Length > field.Item2) throw new ArgumentException($"{field.Item1} is too long.");
            result[field.Item1] = string.IsNullOrEmpty(value) ? null : value;
        }
        if (result["name"] == null || result["address"] == null) throw new ArgumentException("Business name and address are required.");
        if (result["email"] == null || !new EmailAddressAttribute().IsValid(result["email"])) throw new ArgumentException("A valid contact email is required.");
        if (!DateOnly.TryParseExact(result["expiry_date"]?.ToString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _)) throw new ArgumentException("A valid access expiry date is required.");
        result["email"] = result["email"]!.ToString()!.ToLowerInvariant();
        _encryption.EncryptFields(result, PiiFields);
        return result;
    }
    public async Task<long> AddEntityAsync(IDictionary<string, object?> data, long crBy)
    {
        var insert = Validate(data);
        var id = await _db.GetIdAsync("entity", "entity_id", new Dictionary<string, object?>());
        insert["entity_id"] = id; insert["cr_by"] = crBy;
        await _db.InsertTableAsync("entity", insert);
        return id;
    }
    public async Task<bool> UpdateEntityAsync(IDictionary<string, object?> data, long moBy)
    {
        if (!data.TryGetValue("entity_id", out var raw) || !long.TryParse(raw?.ToString(), out var id) || id <= 0) throw new ArgumentException("A valid entity ID is required.");
        var update = Validate(data); update["mo_by"] = moBy;
        return await _db.UpdateTableAsync("entity", update, new Dictionary<string, object?> { ["entity_id"] = id }) > 0;
    }
}
