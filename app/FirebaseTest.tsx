import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../src/firebase/firebase"; // senin dosya yolu buysa doğru

export default function FirebaseTest() {
  const [loading, setLoading] = useState(false);

  const testKayitOlustur = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // her basışta farklı kullanıcı oluşturmak için random mail
      const email = `test_${Date.now()}@forgeplan.com`;
      const password = "123456";

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        createdAt: serverTimestamp(),
      });

      Alert.alert("OK", `Kayıt oldu ✅\n${email}`);
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <TouchableOpacity
        onPress={testKayitOlustur}
        style={{ padding: 14, borderWidth: 1, borderRadius: 10 }}
      >
        <Text>{loading ? "Bekle..." : "Test kayıt oluştur"}</Text>
      </TouchableOpacity>
    </View>
  );
}