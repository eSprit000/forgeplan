# Kimlik Doğrulama ve Roller

## Giriş Yöntemleri
- Apple ile giriş
- Google ile giriş
- Telefon numarası ile giriş

TC, adres vb. hassas veri toplanmaz.

## Rol Belirleme
Kullanıcı ilk girişte rol seçer:
- Koç
- Sporcu

Rol Firestore'da saklanır.

## Koç – Sporcu Bağlantısı
- Koç bir davet kodu üretir.
- Sporcu giriş yaptıktan sonra kodu girer.
- Kod doğrulanırsa sporcu ilgili koça bağlanır.