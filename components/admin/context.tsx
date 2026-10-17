"use client";

import * as React from "react";

/** Hitungan yang ditampilkan di menu (mis. laporan abuse terbuka). `null` = belum diketahui. */
export interface AdminCounts {
  abuseOpen: number | null;
  setAbuseOpen: (n: number) => void;
}

export const AdminCountsContext = React.createContext<AdminCounts>({ abuseOpen: null, setAbuseOpen: () => {} });
export const useAdminCounts = () => React.useContext(AdminCountsContext);
