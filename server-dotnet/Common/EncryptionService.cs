using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Matrika.Api.Common;

public interface IEncryptionService
{
    string? Encrypt(string? text);
    string? Decrypt(string? text);
    T DecryptFields<T>(T data, IEnumerable<string> fields);
    T EncryptFields<T>(T data, IEnumerable<string> fields);
}

public class EncryptionService : IEncryptionService
{
    private const string Prefix = "ENC:";
    private static readonly Regex LegacyHexRegex = new(@"^[0-9a-fA-F]{32}:[0-9a-fA-F]+$", RegexOptions.Compiled);
    private readonly byte[] _key;

    public EncryptionService(IConfiguration configuration)
    {
        var keyHex = configuration["Security:EncryptionKeyHex"]
            ?? "cd7231927bf2c9c977acd8922d1c4231a21dac5b0d1a124062cd3d831b114d40"; // default derived from scrypt('default_key', 'salt', 32)
        _key = Convert.FromHexString(keyHex);
    }

    public string? Encrypt(string? text)
    {
        if (string.IsNullOrWhiteSpace(text) || text.StartsWith(Prefix))
        {
            return text;
        }

        try
        {
            using var aes = Aes.Create();
            aes.Key = _key;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            aes.GenerateIV();

            var iv = aes.IV;
            using var encryptor = aes.CreateEncryptor(aes.Key, iv);
            var plainBytes = Encoding.UTF8.GetBytes(text);
            var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

            return $"{Prefix}{Convert.ToHexString(iv).ToLowerInvariant()}:{Convert.ToHexString(cipherBytes).ToLowerInvariant()}";
        }
        catch
        {
            return text;
        }
    }

    public string? Decrypt(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return text;
        }

        if (text.StartsWith(Prefix))
        {
            try
            {
                var payload = text[Prefix.Length..];
                var parts = payload.Split(':');
                if (parts.Length != 2) return text;

                var iv = Convert.FromHexString(parts[0]);
                var cipherBytes = Convert.FromHexString(parts[1]);

                using var aes = Aes.Create();
                aes.Key = _key;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
                var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
                return Encoding.UTF8.GetString(plainBytes);
            }
            catch
            {
                return text;
            }
        }

        if (LegacyHexRegex.IsMatch(text))
        {
            try
            {
                var parts = text.Split(':');
                var iv = Convert.FromHexString(parts[0]);
                var cipherBytes = Convert.FromHexString(parts[1]);

                using var aes = Aes.Create();
                aes.Key = _key;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
                var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
                return Encoding.UTF8.GetString(plainBytes);
            }
            catch
            {
                return text;
            }
        }

        return text;
    }

    public T DecryptFields<T>(T data, IEnumerable<string> fields)
    {
        if (data == null) return data;

        if (data is IEnumerable<IDictionary<string, object?>> list)
        {
            foreach (var item in list)
            {
                DecryptDictionary(item, fields);
            }
            return data;
        }

        if (data is IDictionary<string, object?> dict)
        {
            DecryptDictionary(dict, fields);
            return data;
        }

        return data;
    }

    public T EncryptFields<T>(T data, IEnumerable<string> fields)
    {
        if (data == null) return data;

        if (data is IEnumerable<IDictionary<string, object?>> list)
        {
            foreach (var item in list)
            {
                EncryptDictionary(item, fields);
            }
            return data;
        }

        if (data is IDictionary<string, object?> dict)
        {
            EncryptDictionary(dict, fields);
            return data;
        }

        return data;
    }

    private void DecryptDictionary(IDictionary<string, object?> dict, IEnumerable<string> fields)
    {
        foreach (var field in fields)
        {
            if (dict.TryGetValue(field, out var val) && val is string strVal)
            {
                dict[field] = Decrypt(strVal);
            }
        }
    }

    private void EncryptDictionary(IDictionary<string, object?> dict, IEnumerable<string> fields)
    {
        foreach (var field in fields)
        {
            if (dict.TryGetValue(field, out var val) && val is string strVal)
            {
                dict[field] = Encrypt(strVal);
            }
        }
    }
}

