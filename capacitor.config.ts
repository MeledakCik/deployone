// Cangkang native untuk app mobile. UI & server = web produksi (halaman /m),
// jadi tiap kali web di-deploy, app ikut terbarui tanpa submit ulang ke store.
// Ganti URL di bawah dengan domain Depup-mu (NEXT_PUBLIC_APP_URL).
const config = {
  appId: "id.depup.app",
  appName: "Depup",
  webDir: "public", // wajib ada, tapi tidak dipakai karena server.url di bawah
  server: {
    url: "https://depup.cloud/m",
    cleartext: false,
  },
};

export default config;
