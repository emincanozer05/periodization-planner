# rules-test — güvenlik kuralı testleri

`firestore.rules` ve `storage.rules`'ı Firebase Emulator'de gerçek istemci SDK'sıyla sınar.
CI: `.github/workflows/rules.yml` (kural ya da test değişen her PR'da).

```bash
cd rules-test && npm ci && npm test
```

Java 11+ gerekir (emulator). Kural değiştiren her PR yeni davranışın testini de eklemeli:
izin verilen yol için `assertSucceeds`, kapalı kalması gereken her yol için `assertFails`.
