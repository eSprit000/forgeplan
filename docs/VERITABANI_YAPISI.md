# Firestore Veritabanı Yapısı

## Koleksiyon: kullanicilar
- id
- isim
- email
- rol (koc/sporcu)
- kocId (sporcu ise)
- premiumMu (boolean)
- premiumBitisTarihi
- olusturmaTarihi

## Koleksiyon: davetKodlari
- kod
- kocId
- aktifMi
- olusturmaTarihi

## Koleksiyon: antrenmanlar
- id
- kocId
- sporcuId
- haftaNumarasi
- gun (Pazartesi vb.)
- egzersizler [
    {
      isim,
      set,
      tekrar,
      kilo,
      hedefRPE
    }
  ]
- tamamlandiMi
- sporcuNotu
- olusturmaTarihi

## Koleksiyon: rpeKayitlari
- antrenmanId
- sporcuId
- egzersizIsmi
- gerceklesenRPE
- tarih

## Koleksiyon: ilerlemeKayitlari
- sporcuId
- kilo
- yagOrani
- tarih