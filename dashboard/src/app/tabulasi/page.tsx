"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  MapPin,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Moon,
  Sun,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  X,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  BookOpen
} from "lucide-react";

// Interfaces for data types
interface ScraperRecord {
  searchedEmail: string;
  idCode: string;
  name: string;
  address: string;
  scale: string;
  status: string;
  officer: string;
  nama_kec: string;
  koseka: string;
}

interface PMLPPLRecord {
  nama_petugas: string;
  kec: string;
  jabatan_petugas: string; // 'PML' or 'PPL'
  email: string;
}

interface CellStats {
  target: number;
  realisasi: number;
  open: number;
  draft: number;
  submit: number;
  approve: number;
  reject: number;
}

interface RowStats {
  nama: string;
  email: string;
  kec: string;
  jabatan: string;
  categories: { [category: string]: CellStats };
  total: CellStats;
}

interface KecStats {
  kecName: string;
  koseka: string;
  categories: { [category: string]: CellStats };
  total: CellStats;
}

export default function TabulasiPage() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Data states
  const [rawData, setRawData] = useState<ScraperRecord[]>([]);
  const [pmlPplData, setPmlPplData] = useState<PMLPPLRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Filter & Search states
  const [selectedKec, setSelectedKec] = useState<string>("all");
  const [selectedPml, setSelectedPml] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pcl" | "pml" | "kec">("pcl");

  // Helper to normalize subdistrict/kecamatan names for comparison
  const normalizeKec = (name: string): string => {
    if (!name) return "";
    return name.replace(/\(\d+\)/g, "").trim().toUpperCase();
  };

  // Helper to format subdistrict/kecamatan names to Title Case and strip BPS codes
  const formatKecName = (name: string): string => {
    if (!name) return "";
    let cleaned = name.replace(/\(\d+\)/g, "").trim();
    return cleaned
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Fetch and parse data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch update_data.csv
      const dataResponse = await fetch("/update_data.csv");
      if (!dataResponse.ok) {
        throw new Error("Gagal mengambil file update_data.csv. Pastikan pipeline data sudah dijalankan.");
      }
      const dataText = await dataResponse.text();

      // Fetch pml_ppl.csv
      const pmlPplResponse = await fetch("/pml_ppl.csv");
      if (!pmlPplResponse.ok) {
        throw new Error("Gagal mengambil file pml_ppl.csv.");
      }
      const pmlPplText = await pmlPplResponse.text();

      // Parse update_data.csv
      const parseDataCSV = (csvText: string): ScraperRecord[] => {
        const lines = csvText.split("\n");
        const parsed: ScraperRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const row: string[] = [];
          let insideQuote = false;
          let entry = "";

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === "," && !insideQuote) {
              row.push(entry);
              entry = "";
            } else {
              entry += char;
            }
          }
          row.push(entry);

          if (row.length >= 16 && row[1] && row[1].trim() !== "" && row[1] !== "Kode Identitas") {
            parsed.push({
              searchedEmail: row[0].replace(/"/g, "").trim().toLowerCase(),
              idCode: row[1].replace(/"/g, "").trim(),
              name: row[2].replace(/"/g, "").trim(),
              address: row[3].replace(/"/g, "").trim(),
              scale: row[7].replace(/"/g, "").trim(),
              status: row[12].replace(/"/g, "").trim(),
              officer: row[14].replace(/"/g, "").trim(),
              nama_kec: row[16] ? row[16].replace(/"/g, "").trim() : "",
              koseka: row[17] ? row[17].replace(/"/g, "").trim() : "",
            });
          }
        }
        return parsed;
      };

      // Parse pml_ppl.csv (semicolon delimited)
      const parsePMLPPL = (csvText: string): PMLPPLRecord[] => {
        const lines = csvText.split("\n");
        const parsed: PMLPPLRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(";");
          if (parts.length >= 4) {
            parsed.push({
              nama_petugas: parts[0].replace(/"/g, "").trim(),
              kec: parts[1].replace(/"/g, "").trim(),
              jabatan_petugas: parts[2].replace(/"/g, "").trim().toUpperCase(),
              email: parts[3].replace(/"/g, "").trim().toLowerCase(),
            });
          }
        }
        return parsed;
      };

      const parsedRecords = parseDataCSV(dataText);
      const parsedPmlPpl = parsePMLPPL(pmlPplText);

      setRawData(parsedRecords);
      setPmlPplData(parsedPmlPpl);

      // Load timestamp
      let loadedTimestamp = "";
      try {
        const timeResponse = await fetch("/last_updated.txt");
        if (timeResponse.ok) {
          loadedTimestamp = (await timeResponse.text()).trim();
        }
      } catch (e) {
        console.warn("Gagal mengambil file last_updated.txt.");
      }

      if (loadedTimestamp) {
        setLastUpdated(loadedTimestamp);
      } else {
        const now = new Date();
        setLastUpdated(now.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }) + " WITA");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Scale Category Mapping
  const categories = useMemo(() => [
    "Keluarga",
    "UMK",
    "UMKM/BANGUNAN LAIN",
    "UM",
    "UMKM/KELUARGA",
    "UB",
    "UMKM/DUMMY"
  ], []);

  const getScaleCategory = (scale: string): string => {
    const s = scale.toUpperCase().trim();
    if (s === "KELUARGA" || s === "- / KELUARGA") return "Keluarga";
    if (s === "UMK") return "UMK";
    if (s.includes("UMKM / BANGUNAN_LAIN") || s.includes("UMKM/BANGUNAN LAIN") || s.includes("BANGUNAN_LAIN") || s.includes("BANGUNAN LAIN")) return "UMKM/BANGUNAN LAIN";
    if (s === "UM") return "UM";
    if (s.includes("UMKM / KELUARGA") || s.includes("UMKM/KELUARGA")) return "UMKM/KELUARGA";
    if (s === "UB") return "UB";
    if (s.includes("UMKM / DUMMY") || s.includes("UMKM/DUMMY")) return "UMKM/DUMMY";
    return "";
  };

  // Helper to initialize empty CellStats
  const createEmptyCellStats = (): CellStats => ({
    target: 0,
    realisasi: 0,
    open: 0,
    draft: 0,
    submit: 0,
    approve: 0,
    reject: 0
  });

  // Unique lists from both data sources
  const uniqueKecList = useMemo(() => {
    const formattedSubdistricts = rawData.map(r => formatKecName(r.nama_kec)).filter(Boolean);
    const formattedAllKecs = pmlPplData.map(item => formatKecName(item.kec)).filter(Boolean);
    return Array.from(new Set([...formattedSubdistricts, ...formattedAllKecs])).sort();
  }, [rawData, pmlPplData]);

  // List of PMLs filtered by selected Kecamatan
  const pmlList = useMemo(() => {
    return pmlPplData.filter(item => {
      const matchRole = item.jabatan_petugas === "PML";
      const matchKec = selectedKec === "all" ? true : normalizeKec(item.kec) === normalizeKec(selectedKec);
      return matchRole && matchKec;
    }).sort((a, b) => a.nama_petugas.localeCompare(b.nama_petugas));
  }, [pmlPplData, selectedKec]);

  // Reset PML filter if selected Kecamatan changes and currently selected PML is not in new list
  useEffect(() => {
    if (selectedPml !== "all") {
      const pmlExists = pmlList.some(p => p.nama_petugas === selectedPml);
      if (!pmlExists) {
        setSelectedPml("all");
      }
    }
  }, [selectedKec, pmlList, selectedPml]);

  // If PML is selected, automatically update selectedKec to PML's Kecamatan
  const handlePmlChange = (pmlName: string) => {
    setSelectedPml(pmlName);
    if (pmlName !== "all") {
      const selectedPmlRecord = pmlPplData.find(item => item.nama_petugas === pmlName);
      if (selectedPmlRecord) {
        setSelectedKec(selectedPmlRecord.kec);
      }
    }
  };

  // Calculate Table 1: PCL (PPL) detail stats
  const pclStats = useMemo<RowStats[]>(() => {
    // 1. Get PPLs
    const ppls = pmlPplData.filter(item => item.jabatan_petugas === "PPL");

    // 2. Pre-filter PPLs by selected Kecamatan / PML
    const filteredPpls = ppls.filter(ppl => {
      const matchKec = selectedKec === "all" ? true : normalizeKec(ppl.kec) === normalizeKec(selectedKec);
      return matchKec;
    });

    // 3. Map PPLs to their stats
    const stats: RowStats[] = filteredPpls.map(ppl => {
      const pplEmail = ppl.email.toLowerCase();
      // Filter records for this PPL
      const records = rawData.filter(r => r.searchedEmail === pplEmail);

      const rowStats: RowStats = {
        nama: ppl.nama_petugas,
        email: ppl.email,
        kec: ppl.kec,
        jabatan: ppl.jabatan_petugas,
        categories: {},
        total: createEmptyCellStats()
      };

      // Initialize categories
      categories.forEach(cat => {
        rowStats.categories[cat] = createEmptyCellStats();
      });

      // Aggregate records
      records.forEach(r => {
        const cat = getScaleCategory(r.scale);
        const status = r.status.toLowerCase().trim();

        // Process status checks
        const isOpen = status === "open" || status === "";
        const isDraft = status === "draft";
        const isSubmit = status === "submit" || status === "submitted";
        const isApprove = status === "approve" || status === "approved";
        const isReject = status === "reject" || status === "rejected";
        const isRealisasi = isSubmit || isApprove || isReject;

        // Helper to add stats
        const addStats = (cell: CellStats) => {
          cell.target++;
          if (isRealisasi) cell.realisasi++;
          if (isOpen) cell.open++;
          if (isDraft) cell.draft++;
          if (isSubmit) cell.submit++;
          if (isApprove) cell.approve++;
          if (isReject) cell.reject++;
        };

        // Add to category
        if (cat && rowStats.categories[cat]) {
          addStats(rowStats.categories[cat]);
        }
        // Add to total
        addStats(rowStats.total);
      });

      return rowStats;
    });

    // Sort by name
    return stats.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [rawData, pmlPplData, selectedKec, categories]);

  // Filtered Table 1 based on search query
  const filteredPclStats = useMemo(() => {
    return pclStats.filter(pcl => {
      if (!searchQuery) return true;
      return pcl.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
             pcl.kec.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [pclStats, searchQuery]);

  // Calculate Table 3: PML (Pengawas) detail stats
  const pmlStats = useMemo<RowStats[]>(() => {
    // 1. Get PMLs
    const pmls = pmlPplData.filter(item => item.jabatan_petugas === "PML");

    // 2. Pre-filter PMLs by selected Kecamatan / PML filter
    const filteredPmls = pmls.filter(pml => {
      const matchKec = selectedKec === "all" ? true : normalizeKec(pml.kec) === normalizeKec(selectedKec);
      const matchPml = selectedPml === "all" ? true : pml.nama_petugas === selectedPml;
      return matchKec && matchPml;
    });

    // 3. Map PMLs to their stats (aggregated from PPLs in the same Kecamatan)
    const stats: RowStats[] = filteredPmls.map(pml => {
      const normalizedKecName = normalizeKec(pml.kec);
      
      // Get all PPLs in the same subdistrict
      const pplsInKec = pmlPplData.filter(item => item.jabatan_petugas === "PPL" && normalizeKec(item.kec) === normalizedKecName);
      const emailsInKec = new Set(pplsInKec.map(ppl => ppl.email.toLowerCase()));

      // Get records for these PPLs
      const records = rawData.filter(r => emailsInKec.has(r.searchedEmail) || normalizeKec(r.nama_kec) === normalizedKecName);

      const rowStats: RowStats = {
        nama: pml.nama_petugas,
        email: pml.email,
        kec: pml.kec,
        jabatan: pml.jabatan_petugas,
        categories: {},
        total: createEmptyCellStats()
      };

      // Initialize categories
      categories.forEach(cat => {
        rowStats.categories[cat] = createEmptyCellStats();
      });

      // Aggregate records
      records.forEach(r => {
        const cat = getScaleCategory(r.scale);
        const status = r.status.toLowerCase().trim();

        const isOpen = status === "open" || status === "";
        const isDraft = status === "draft";
        const isSubmit = status === "submit" || status === "submitted";
        const isApprove = status === "approve" || status === "approved";
        const isReject = status === "reject" || status === "rejected";
        const isRealisasi = isSubmit || isApprove || isReject;

        const addStats = (cell: CellStats) => {
          cell.target++;
          if (isRealisasi) cell.realisasi++;
          if (isOpen) cell.open++;
          if (isDraft) cell.draft++;
          if (isSubmit) cell.submit++;
          if (isApprove) cell.approve++;
          if (isReject) cell.reject++;
        };

        if (cat && rowStats.categories[cat]) {
          addStats(rowStats.categories[cat]);
        }
        addStats(rowStats.total);
      });

      return rowStats;
    });

    return stats.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [rawData, pmlPplData, selectedKec, selectedPml, categories]);

  // Filtered Table 3 based on search query
  const filteredPmlStats = useMemo(() => {
    return pmlStats.filter(pml => {
      if (!searchQuery) return true;
      return pml.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
             pml.kec.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [pmlStats, searchQuery]);

  // Overview stats for PML tab (prevents double counting)
  const selectedPmlOverviewStats = useMemo(() => {
    const totalStats = createEmptyCellStats();
    
    // Find the unique kecamatan names of all currently visible PMLs
    const visibleKecs = new Set(filteredPmlStats.map(pml => normalizeKec(pml.kec)));
    
    // Find unique PPLs in these kecamatans
    const ppls = pmlPplData.filter(item => item.jabatan_petugas === "PPL" && visibleKecs.has(normalizeKec(item.kec)));
    const pplEmails = new Set(ppls.map(p => p.email.toLowerCase()));
    
    // Sum stats of records for these PPLs
    const records = rawData.filter(r => pplEmails.has(r.searchedEmail) || visibleKecs.has(normalizeKec(r.nama_kec)));
    
    records.forEach(r => {
      const status = r.status.toLowerCase().trim();
      const isOpen = status === "open" || status === "";
      const isDraft = status === "draft";
      const isSubmit = status === "submit" || status === "submitted";
      const isApprove = status === "approve" || status === "approved";
      const isReject = status === "reject" || status === "rejected";
      const isRealisasi = isSubmit || isApprove || isReject;

      totalStats.target++;
      if (isRealisasi) totalStats.realisasi++;
      if (isOpen) totalStats.open++;
      if (isDraft) totalStats.draft++;
      if (isSubmit) totalStats.submit++;
      if (isApprove) totalStats.approve++;
      if (isReject) totalStats.reject++;
    });
    
    const completionRate = totalStats.target > 0 ? (totalStats.realisasi / totalStats.target) * 100 : 0;
    
    return {
      ...totalStats,
      completionRate
    };
  }, [rawData, pmlPplData, filteredPmlStats]);

  // Calculate Table 2: Kecamatan Overview stats
  const kecamatanStats = useMemo<KecStats[]>(() => {
    const statsMap: { [kecName: string]: KecStats } = {};

    // Load subdistrict names from koseka mapping or scraped data
    const subdistricts = rawData.map(r => formatKecName(r.nama_kec)).filter(Boolean);
    
    // Fallback: load all Kec from pml_ppl.csv
    const allKecs = pmlPplData.map(item => formatKecName(item.kec)).filter(Boolean);
    const uniqueKecNames = Array.from(new Set([...subdistricts, ...allKecs])).sort();

    // Helper to get koseka name for a kecamatan
    const getKosekaForKec = (kecName: string): string => {
      const normalized = normalizeKec(kecName);
      const record = rawData.find(r => normalizeKec(r.nama_kec) === normalized);
      return record ? record.koseka : "-";
    };

    uniqueKecNames.forEach(kec => {
      const normalizedKecName = normalizeKec(kec);
      
      const kecStats: KecStats = {
        kecName: kec, // formatted Title Case name
        koseka: getKosekaForKec(kec),
        categories: {},
        total: createEmptyCellStats()
      };

      categories.forEach(cat => {
        kecStats.categories[cat] = createEmptyCellStats();
      });

      // Find PPL emails in this Kecamatan
      const pplsInKec = pmlPplData.filter(item => item.jabatan_petugas === "PPL" && normalizeKec(item.kec) === normalizedKecName);
      const emailsInKec = new Set(pplsInKec.map(ppl => ppl.email.toLowerCase()));

      // Aggregate records where searchedEmail is in this subdistrict
      const records = rawData.filter(r => emailsInKec.has(r.searchedEmail) || normalizeKec(r.nama_kec) === normalizedKecName);

      records.forEach(r => {
        const cat = getScaleCategory(r.scale);
        const status = r.status.toLowerCase().trim();

        const isOpen = status === "open" || status === "";
        const isDraft = status === "draft";
        const isSubmit = status === "submit" || status === "submitted";
        const isApprove = status === "approve" || status === "approved";
        const isReject = status === "reject" || status === "rejected";
        const isRealisasi = isSubmit || isApprove || isReject;

        const addStats = (cell: CellStats) => {
          cell.target++;
          if (isRealisasi) cell.realisasi++;
          if (isOpen) cell.open++;
          if (isDraft) cell.draft++;
          if (isSubmit) cell.submit++;
          if (isApprove) cell.approve++;
          if (isReject) cell.reject++;
        };

        if (cat && kecStats.categories[cat]) {
          addStats(kecStats.categories[cat]);
        }
        addStats(kecStats.total);
      });

      statsMap[kec] = kecStats;
    });

    return Object.values(statsMap).sort((a, b) => a.kecName.localeCompare(b.kecName));
  }, [rawData, pmlPplData, categories]);

  // Overall Statistics for Selected View
  const selectedOverviewStats = useMemo(() => {
    const totalStats = createEmptyCellStats();

    filteredPclStats.forEach(pcl => {
      const t = pcl.total;
      totalStats.target += t.target;
      totalStats.realisasi += t.realisasi;
      totalStats.open += t.open;
      totalStats.draft += t.draft;
      totalStats.submit += t.submit;
      totalStats.approve += t.approve;
      totalStats.reject += t.reject;
    });

    const completionRate = totalStats.target > 0 ? (totalStats.realisasi / totalStats.target) * 100 : 0;

    return {
      ...totalStats,
      completionRate
    };
  }, [filteredPclStats]);

  // Export functions to CSV
  const handleExportCSV = () => {
    let headers = ["Nama", "Kecamatan", "Jabatan / Koseka"];
    
    // Add categories sub-headers
    categories.forEach(cat => {
      headers.push(
        `[${cat}] Target`,
        `[${cat}] Realisasi`,
        `[${cat}] Open`,
        `[${cat}] Draft`,
        `[${cat}] Submit`,
        `[${cat}] Approve`,
        `[${cat}] Reject`
      );
    });

    headers.push("Total Target", "Total Realisasi", "Total Open", "Total Draft", "Total Submit", "Total Approve", "Total Reject");

    const csvRows = [headers.join(",")];

    if (activeTab === "pcl") {
      filteredPclStats.forEach(pcl => {
        const row: (string | number)[] = [
          `"${pcl.nama}"`,
          `"${pcl.kec}"`,
          `"${pcl.jabatan}"`
        ];

        categories.forEach(cat => {
          const stats = pcl.categories[cat];
          row.push(
            stats.target,
            stats.realisasi,
            stats.open,
            stats.draft,
            stats.submit,
            stats.approve,
            stats.reject
          );
        });

        row.push(
          pcl.total.target,
          pcl.total.realisasi,
          pcl.total.open,
          pcl.total.draft,
          pcl.total.submit,
          pcl.total.approve,
          pcl.total.reject
        );

        csvRows.push(row.join(","));
      });
    } else if (activeTab === "pml") {
      filteredPmlStats.forEach(pml => {
        const row: (string | number)[] = [
          `"${pml.nama}"`,
          `"${pml.kec}"`,
          `"${pml.jabatan}"`
        ];

        categories.forEach(cat => {
          const stats = pml.categories[cat];
          row.push(
            stats.target,
            stats.realisasi,
            stats.open,
            stats.draft,
            stats.submit,
            stats.approve,
            stats.reject
          );
        });

        row.push(
          pml.total.target,
          pml.total.realisasi,
          pml.total.open,
          pml.total.draft,
          pml.total.submit,
          pml.total.approve,
          pml.total.reject
        );

        csvRows.push(row.join(","));
      });
    } else {
      kecamatanStats.forEach(kec => {
        const row: (string | number)[] = [
          `"${kec.kecName}"`,
          `"-"`,
          `"${kec.koseka}"`
        ];

        categories.forEach(cat => {
          const stats = kec.categories[cat];
          row.push(
            stats.target,
            stats.realisasi,
            stats.open,
            stats.draft,
            stats.submit,
            stats.approve,
            stats.reject
          );
        });

        row.push(
          kec.total.target,
          kec.total.realisasi,
          kec.total.open,
          kec.total.draft,
          kec.total.submit,
          kec.total.approve,
          kec.total.reject
        );

        csvRows.push(row.join(","));
      });
    }

    const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    const filename = activeTab === "pcl" 
      ? `tabulasi_pcl_monitoring_se2026_${Date.now()}.csv`
      : activeTab === "pml"
        ? `tabulasi_pml_monitoring_se2026_${Date.now()}.csv`
        : `tabulasi_kecamatan_monitoring_se2026_${Date.now()}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render sub-cell content
  const CellContent = ({ stats, highlight }: { stats: CellStats; highlight?: boolean }) => {
    if (stats.target === 0) {
      return (
        <div className="text-center text-xs text-slate-400 dark:text-slate-600 font-mono py-4">
          -
        </div>
      );
    }

    return (
      <div className={`p-1.5 text-xs text-left font-mono rounded-lg transition-colors ${
        highlight 
          ? "bg-orange-500/10 dark:bg-orange-500/5 text-orange-950 dark:text-orange-200" 
          : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
      }`}>
        <div className="font-extrabold text-slate-900 dark:text-white flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-0.5 mb-1">
          <span>Target:</span>
          <span>{stats.target}</span>
        </div>
        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 flex justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-0.5 mb-1">
          <span>Realisasi:</span>
          <span>{stats.realisasi}</span>
        </div>
        <div className="space-y-0.5 opacity-90 text-[10px] pl-1 font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex justify-between">
            <span>1. Open</span>
            <span className="font-bold text-amber-500">{stats.open}</span>
          </div>
          <div className="flex justify-between">
            <span>2. Draft</span>
            <span className="font-bold text-blue-500">{stats.draft}</span>
          </div>
          <div className="flex justify-between">
            <span>3. Submit</span>
            <span className="font-bold text-teal-500">{stats.submit}</span>
          </div>
          <div className="flex justify-between">
            <span>4. Approve</span>
            <span className="font-bold text-emerald-500">{stats.approve}</span>
          </div>
          <div className="flex justify-between">
            <span>5. Reject</span>
            <span className="font-bold text-red-500">{stats.reject}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Header Bar */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl p-1 shadow-md border border-slate-200 dark:border-slate-700">
              <img src="/icon.png" alt="Logo BPS" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                BPS Kabupaten Kepulauan Sangihe
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dashboard Monitoring Sensus Ekonomi 2026
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50/50 dark:bg-slate-950/50">
              <a 
                href="/" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Dashboard
              </a>
              <a 
                href="/tabulasi" 
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-orange-500 text-white shadow-sm"
              >
                Tabulasi
              </a>
            </nav>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Ganti Tema"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner Title */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 to-amber-500 p-8 sm:p-10 text-white shadow-xl shadow-orange-600/10 mb-8">
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-white/10 blur-3xl translate-x-20 -translate-y-20"></div>
          <div className="absolute right-1/4 bottom-0 w-60 h-60 rounded-full bg-orange-400/20 blur-2xl translate-y-20"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/20 text-white mb-3 inline-block">
                Tabulasi & Kalkulasi Progres
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                Tabel Kalkulasi Progres Pendataan
              </h2>
              <p className="text-sm sm:text-lg text-orange-50 max-w-2xl font-light">
                Perhitungan real-time target dan realisasi status sampel per Petugas (PCL) dan Kecamatan di wilayah Kabupaten Kepulauan Sangihe.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 self-start md:self-auto flex flex-col items-end border border-white/10 text-right">
              <span className="text-xs text-orange-200">Terakhir Diperbarui</span>
              <span className="text-base font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                {loading ? "Menyinkronkan..." : lastUpdated || "Belum ada data"}
              </span>
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && rawData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse text-sm">
              Mengekstrak dan Memproses Data Tabulasi BPS FASIH...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center mb-8">
            <AlertCircle className="w-10 h-10 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Terjadi Kesalahan</h3>
            <p className="text-sm opacity-90 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-semibold"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            {/* View Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
              <button
                onClick={() => { setActiveTab("pcl"); setSelectedKec("all"); }}
                className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "pcl"
                    ? "border-orange-500 text-orange-500 dark:text-orange-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <User className="w-4 h-4" />
                Detail Petugas (PCL / PPL)
              </button>
              <button
                onClick={() => { setActiveTab("pml"); setSelectedKec("all"); }}
                className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "pml"
                    ? "border-orange-500 text-orange-500 dark:text-orange-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Detail Pengawas (PML)
              </button>
              <button
                onClick={() => { setActiveTab("kec"); setSelectedKec("all"); }}
                className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "kec"
                    ? "border-orange-500 text-orange-500 dark:text-orange-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Building className="w-4 h-4" />
                Ringkasan Wilayah (Kecamatan Overview)
              </button>
            </div>

            {/* Filter Section Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Left: Interactive Dropdown selectors */}
                <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
                  {(activeTab === "pcl" || activeTab === "pml") && (
                    <>
                      {/* Kecamatan Dropdown */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold w-full sm:w-auto">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <select
                          value={selectedKec}
                          onChange={(e) => setSelectedKec(e.target.value)}
                          className="w-full sm:w-auto py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold"
                        >
                          <option value="all">Semua Kecamatan</option>
                          {uniqueKecList.map((kec, idx) => (
                            <option key={idx} value={kec}>{kec}</option>
                          ))}
                        </select>
                      </div>

                      {/* PML Dropdown */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold w-full sm:w-auto">
                        <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                        <select
                          value={selectedPml}
                          onChange={(e) => handlePmlChange(e.target.value)}
                          className="w-full sm:w-auto py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold"
                        >
                          <option value="all">Semua PML (Pengawas)</option>
                          {pmlList.map((pml, idx) => (
                            <option key={idx} value={pml.nama_petugas}>{pml.nama_petugas}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Search Input */}
                  {(activeTab === "pcl" || activeTab === "pml") && (
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder={activeTab === "pcl" ? "Cari nama PCL..." : "Cari nama PML..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-semibold"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Export button */}
                <div className="w-full md:w-auto flex justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-950 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4 text-orange-500" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>

              </div>

              {/* Progress Summary Cards */}
              {activeTab === "pcl" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total PCL Tampil</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{filteredPclStats.length} petugas</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Beban Target</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{selectedOverviewStats.target.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Realisasi</span>
                    <span className="text-xl font-extrabold text-emerald-500 mt-1 block">{selectedOverviewStats.realisasi.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Persentase Selesai</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-extrabold text-orange-500">{selectedOverviewStats.completionRate.toFixed(1)}%</span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: `${selectedOverviewStats.completionRate}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "pml" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total PML Tampil</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{filteredPmlStats.length} pengawas</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Beban Target</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{selectedPmlOverviewStats.target.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Realisasi</span>
                    <span className="text-xl font-extrabold text-emerald-500 mt-1 block">{selectedPmlOverviewStats.realisasi.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Persentase Selesai</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-extrabold text-orange-500">{selectedPmlOverviewStats.completionRate.toFixed(1)}%</span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: `${selectedPmlOverviewStats.completionRate}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content Table Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                
                {activeTab === "pcl" ? (
                  // =================== TABLE 1: DETAIL PCL ===================
                  <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 min-w-[1200px]">
                    <thead>
                      {/* Top Header Row */}
                      <tr className="bg-orange-100/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 text-center">
                        <th rowSpan={2} className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-sm font-extrabold text-left w-56 sticky left-0 bg-orange-100 dark:bg-slate-800 z-10">
                          Nama PCL
                        </th>
                        <th colSpan={7} className="py-2 border-r border-slate-200 dark:border-slate-700 text-sm font-extrabold tracking-wide uppercase">
                          Skala Prelist
                        </th>
                        <th rowSpan={2} className="px-4 py-4 text-sm font-extrabold uppercase">
                          Total
                        </th>
                      </tr>
                      {/* Sub Header Row */}
                      <tr className="bg-slate-100/90 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold">
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">Keluarga</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMK</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/BANGUNAN LAIN</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UM</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/KELUARGA</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UB</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/DUMMY</th>
                      </tr>
                    </thead>
                    
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredPclStats.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-16 text-center text-slate-400 font-medium text-sm">
                            Tidak ada data PCL ditemukan untuk filter ini.
                          </td>
                        </tr>
                      ) : (
                        filteredPclStats.map((pcl, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800"
                          >
                            {/* PCL Name cell */}
                            <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-950 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                              <div>{pcl.nama}</div>
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">{pcl.kec}</div>
                            </td>

                            {/* Category cells */}
                            {categories.map((cat, cIdx) => (
                              <td key={cIdx} className="p-2 border-r border-slate-200 dark:border-slate-800 align-top">
                                <CellContent stats={pcl.categories[cat]} />
                              </td>
                            ))}

                            {/* Total cell */}
                            <td className="p-2 align-top bg-orange-500/5 dark:bg-orange-500/0">
                              <CellContent stats={pcl.total} highlight={true} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : activeTab === "pml" ? (
                  // =================== TABLE 3: DETAIL PML ===================
                  <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 min-w-[1200px]">
                    <thead>
                      {/* Top Header Row */}
                      <tr className="bg-orange-100/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 text-center">
                        <th rowSpan={2} className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-sm font-extrabold text-left w-56 sticky left-0 bg-orange-100 dark:bg-slate-800 z-10">
                          Nama PML (Pengawas)
                        </th>
                        <th colSpan={7} className="py-2 border-r border-slate-200 dark:border-slate-700 text-sm font-extrabold tracking-wide uppercase">
                          Skala Prelist
                        </th>
                        <th rowSpan={2} className="px-4 py-4 text-sm font-extrabold uppercase">
                          Total
                        </th>
                      </tr>
                      {/* Sub Header Row */}
                      <tr className="bg-slate-100/90 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold">
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">Keluarga</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMK</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/BANGUNAN LAIN</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UM</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/KELUARGA</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UB</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/DUMMY</th>
                      </tr>
                    </thead>
                    
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredPmlStats.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-16 text-center text-slate-400 font-medium text-sm">
                            Tidak ada data PML ditemukan untuk filter ini.
                          </td>
                        </tr>
                      ) : (
                        filteredPmlStats.map((pml, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800"
                          >
                            {/* PML Name cell */}
                            <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-950 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                              <div>{pml.nama}</div>
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">{pml.kec}</div>
                            </td>

                            {/* Category cells */}
                            {categories.map((cat, cIdx) => (
                              <td key={cIdx} className="p-2 border-r border-slate-200 dark:border-slate-800 align-top">
                                <CellContent stats={pml.categories[cat]} />
                              </td>
                            ))}

                            {/* Total cell */}
                            <td className="p-2 align-top bg-orange-500/5 dark:bg-orange-500/0">
                              <CellContent stats={pml.total} highlight={true} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  // =================== TABLE 2: KECAMATAN OVERVIEW ===================
                  <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 min-w-[1200px]">
                    <thead>
                      {/* Top Header Row */}
                      <tr className="bg-orange-100/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 text-center">
                        <th rowSpan={2} className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-sm font-extrabold text-left w-56 sticky left-0 bg-orange-100 dark:bg-slate-800 z-10">
                          Nama Kecamatan
                        </th>
                        <th colSpan={7} className="py-2 border-r border-slate-200 dark:border-slate-700 text-sm font-extrabold tracking-wide uppercase">
                          Skala Prelist
                        </th>
                        <th rowSpan={2} className="px-4 py-4 text-sm font-extrabold uppercase">
                          Total
                        </th>
                      </tr>
                      {/* Sub Header Row */}
                      <tr className="bg-slate-100/90 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center text-xs font-bold">
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">Keluarga</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMK</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/BANGUNAN LAIN</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UM</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/KELUARGA</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UB</th>
                        <th className="px-2 py-2.5 border-r border-slate-200 dark:border-slate-700 w-36">UMKM/DUMMY</th>
                      </tr>
                    </thead>
                    
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {kecamatanStats.map((kec, idx) => (
                        <tr 
                          key={idx} 
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800"
                        >
                          {/* Kecamatan Name cell */}
                          <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-950 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <div>{kec.kecName}</div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">Koseka: {kec.koseka}</div>
                          </td>

                          {/* Category cells */}
                          {categories.map((cat, cIdx) => (
                            <td key={cIdx} className="p-2 border-r border-slate-200 dark:border-slate-800 align-top">
                              <CellContent stats={kec.categories[cat]} />
                            </td>
                          ))}

                          {/* Total cell */}
                          <td className="p-2 align-top bg-orange-500/5 dark:bg-orange-500/0">
                            <CellContent stats={kec.total} highlight={true} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

              </div>
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Badan Pusat Statistik (BPS) Kabupaten Kepulauan Sangihe. Hak Cipta Dilindungi.</p>
          <p>
            Pengembang:{" "}
            <a
              href="http://hamdani-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              Hamdani
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}
