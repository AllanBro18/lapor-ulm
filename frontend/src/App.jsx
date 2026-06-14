import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Camera, 
  Shield, 
  Wrench, 
  RefreshCw, 
  AlertTriangle,
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Search,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Check,
  Building,
  HelpCircle
} from 'lucide-react';
import { getProvider, getContract, CONTRACT_ADDRESS } from './blockchain';
import { ethers } from 'ethers';

const STATUS_MAP = {
  0: { label: 'Dilaporkan', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25', icon: Clock },
  1: { label: 'Dalam Proses', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25', icon: Wrench },
  2: { label: 'Selesai', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', icon: CheckCircle2 }
};

const QUICK_PRESETS = [
  "AC Kelas Rusak",
  "Lampu Ruangan Mati",
  "Pipa Bocor / Air Mampet",
  "Koneksi WiFi Putus",
  "Proyektor Kelas Buram",
  "Meja / Kursi Rusak"
];

function App() {
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  // Form state
  const [location, setLocation] = useState('');
  const [issueType, setIssueType] = useState('');
  const [photoURI, setPhotoURI] = useState('');

  // Admin form state
  const [technicians, setTechnicians] = useState({});

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // UI state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      checkAdminStatus(accounts[0]);
      fetchReports();
    } else {
      setAccount('');
      setIsAdmin(false);
      setReports([]);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      await checkAdminStatus(accounts[0]);
      await fetchReports();
      setSuccessMsg('Koneksi wallet berhasil!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Gagal menghubungkan dompet MetaMask');
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    if (!window.ethereum) return;
    try {
      const provider = getProvider();
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await checkAdminStatus(accounts[0]);
        await fetchReports();
      }
    } catch (err) {
      console.error("Connection check failed", err);
    }
  };

  const checkAdminStatus = async (userAddress) => {
    try {
      const provider = getProvider();
      const contract = await getContract(provider);
      const owner = await contract.owner();
      setIsAdmin(owner.toLowerCase() === userAddress.toLowerCase());
    } catch (err) {
      console.error("Failed to check admin status", err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = getProvider();
      const contract = await getContract(provider);
      const count = await contract.reportCount();
      
      const fetchedReports = [];
      for (let i = 1; i <= Number(count); i++) {
        const report = await contract.reports(i);
        fetchedReports.push({
          id: report.id.toString(),
          reporter: report.reporter,
          location: report.location,
          issueType: report.issueType,
          photoURI: report.photoURI,
          technicianName: report.technicianName,
          status: Number(report.status),
          timestamp: Number(report.timestamp) * 1000
        });
      }
      setReports(fetchedReports.reverse());
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setError("Gagal memuat daftar laporan dari blockchain.");
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!location || !issueType || !photoURI) {
      setError("Silakan lengkapi semua bidang input formulir.");
      return;
    }

    try {
      setLoading(true);
      setError('');
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = await getContract(signer);
      
      const tx = await contract.submitReport(location, issueType, photoURI);
      await tx.wait();
      
      setLocation('');
      setIssueType('');
      setPhotoURI('');
      setSuccessMsg('Laporan fasilitas berhasil dikirim ke Blockchain!');
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchReports();
      setActiveTab('reports');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const assignTechnician = async (id) => {
    const techName = technicians[id];
    if (!techName) {
      setError("Harap masukkan nama teknisi terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      setError('');
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = await getContract(signer);
      
      const tx = await contract.assignTechnician(id, techName);
      await tx.wait();
      
      setSuccessMsg(`Teknisi "${techName}" berhasil ditugaskan!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchReports();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      setLoading(true);
      setError('');
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = await getContract(signer);
      
      const tx = await contract.updateStatus(id, newStatus);
      await tx.wait();
      
      setSuccessMsg(`Status laporan berhasil diubah!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchReports();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err) => {
    console.error(err);
    if (err.reason) {
      setError(err.reason);
    } else if (err.message) {
      if (err.message.includes("user rejected")) {
        setError("Transaksi dibatalkan oleh pengguna (MetaMask).");
      } else {
        setError(err.message.slice(0, 120) + "...");
      }
    } else {
      setError("Terjadi kesalahan yang tidak diketahui.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stats calculation
  const totalCount = reports.length;
  const reportedCount = reports.filter(r => r.status === 0).length;
  const inProgressCount = reports.filter(r => r.status === 1).length;
  const resolvedCount = reports.filter(r => r.status === 2).length;

  // Filtered reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
      report.issueType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      report.status.toString() === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen pb-16 relative">
      {/* Global Alerts */}
      <div className="fixed top-24 right-6 z-50 max-w-md w-full space-y-3 pointer-events-none">
        {error && (
          <div className="p-4 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#ef4444] rounded-xl flex items-start gap-3 text-black text-sm animate-in slide-in-from-top-4 pointer-events-auto">
            <AlertTriangle className="h-6 w-6 shrink-0 text-red-500" strokeWidth={2.5} />
            <div className="flex-1">
              <span className="font-black block mb-0.5 uppercase text-lg">Terjadi Masalah</span>
              <p className="font-bold">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-black hover:text-red-500 transition-colors text-xs font-black uppercase px-2 py-0.5 border-2 border-transparent hover:border-black rounded-md">Tutup</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#10b981] rounded-xl flex items-start gap-3 text-black text-sm animate-in slide-in-from-top-4 pointer-events-auto">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" strokeWidth={2.5} />
            <div className="flex-1">
              <span className="font-black block mb-0.5 uppercase text-lg">Sukses</span>
              <p className="font-bold">{successMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Header */}
      <nav className="bg-white border-b-4 border-black sticky top-0 z-40 px-6 py-4 flex justify-between items-center mb-8 shadow-[0px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-none bg-white border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-1 overflow-hidden">
            <img src="/logo-ulm.png" alt="ULM Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black uppercase tracking-tighter leading-none">
              CampusFix
            </h1>
            <span className="text-xs font-bold text-black uppercase tracking-widest block border-t-2 border-black mt-1 pt-0.5">DApp ULM</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`neo-btn px-6 py-2.5 text-sm uppercase tracking-wide ${activeTab === 'dashboard' ? 'bg-neo-yellow' : 'bg-white'}`}
          >
            <LayoutDashboard className="h-5 w-5 mr-2" strokeWidth={2.5} />
            Beranda
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`neo-btn px-6 py-2.5 text-sm uppercase tracking-wide ${activeTab === 'report' ? 'bg-neo-yellow' : 'bg-white'}`}
          >
            <PlusCircle className="h-5 w-5 mr-2" strokeWidth={2.5} />
            Lapor Masalah
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`neo-btn px-6 py-2.5 text-sm uppercase tracking-wide ${activeTab === 'reports' ? 'bg-neo-yellow' : 'bg-white'}`}
          >
            <ClipboardList className="h-5 w-5 mr-2" strokeWidth={2.5} />
            Daftar Laporan
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`neo-btn px-6 py-2.5 text-sm uppercase tracking-wide ${activeTab === 'admin' ? 'bg-black text-white' : 'bg-white'}`}
            >
              <Shield className="h-5 w-5 mr-2" strokeWidth={2.5} />
              Panel Admin
            </button>
          )}
        </div>
        
        {/* Wallet Address Status */}
        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="hidden lg:flex items-center gap-1 bg-black text-neo-yellow px-4 py-2 border-4 border-black text-sm font-black uppercase shadow-[4px_4px_0px_0px_#FFD700]">
              <Shield className="h-4 w-4" strokeWidth={3} />
              <span>Admin</span>
            </div>
          )}
          
          {account ? (
            <div className="flex items-center gap-2 bg-white px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold">
              <div className="w-3 h-3 bg-neo-green border-2 border-black rounded-full animate-pulse"></div>
              <span className="text-sm text-black font-mono uppercase">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              disabled={loading}
              className="neo-btn px-6 py-3 text-sm"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin mr-2" strokeWidth={2.5} /> : <User className="h-5 w-5 mr-2" strokeWidth={2.5} />}
              Hubungkan Dompet
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Navigation Tabs */}
      <div className="md:hidden flex flex-wrap justify-around mx-6 mb-8 gap-2">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`neo-btn flex-1 py-3 text-xs uppercase tracking-wide ${activeTab === 'dashboard' ? 'bg-neo-yellow' : 'bg-white'}`}
        >
          <LayoutDashboard className="h-5 w-5 mb-1" strokeWidth={2.5} />
          Beranda
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`neo-btn flex-1 py-3 text-xs uppercase tracking-wide ${activeTab === 'report' ? 'bg-neo-yellow' : 'bg-white'}`}
        >
          <PlusCircle className="h-5 w-5 mb-1" strokeWidth={2.5} />
          Lapor
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`neo-btn flex-1 py-3 text-xs uppercase tracking-wide ${activeTab === 'reports' ? 'bg-neo-yellow' : 'bg-white'}`}
        >
          <ClipboardList className="h-5 w-5 mb-1" strokeWidth={2.5} />
          Daftar
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`neo-btn flex-1 py-3 text-xs uppercase tracking-wide ${activeTab === 'admin' ? 'bg-black text-white' : 'bg-white'}`}
          >
            <Shield className="h-5 w-5 mb-1" strokeWidth={2.5} />
            Admin
          </button>
        )}
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* ==================== 1. BERANDA (DASHBOARD) TAB ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Welcome banner */}
            <div className="neo-card p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 bg-neo-yellow">
              <div className="space-y-6 flex-1 z-10">
                <div className="neo-tag bg-white text-black border-4 border-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_#000]">
                  🏛️ Sistem Terdesentralisasi
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-black leading-none uppercase">
                  Pelaporan <br/><span className="bg-white px-2 border-4 border-black shadow-[4px_4px_0px_0px_#000] rotate-2 inline-block my-2">Fasilitas</span> <br/>Kampus ULM
                </h2>
                <p className="text-black font-bold text-lg max-w-xl leading-snug border-l-4 border-black pl-4 bg-white/50 py-2">
                  CampusFix mencatat laporan secara permanen pada Blockchain. Transparan, adil, dan tidak dapat dimanipulasi oleh siapapun.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button 
                    onClick={() => setActiveTab('report')}
                    className="neo-btn bg-black text-white px-8 py-4 text-lg"
                  >
                    Mulai Lapor Baru
                  </button>
                  <button 
                    onClick={() => setActiveTab('reports')}
                    className="neo-btn bg-white text-black px-8 py-4 text-lg"
                  >
                    Lihat Laporan
                  </button>
                </div>
              </div>

              {/* Graphic widget */}
              <div className="neo-card bg-white p-8 text-center min-w-[280px] space-y-4 shadow-[12px_12px_0px_0px_#000] rotate-[-2deg]">
                <div className="w-16 h-16 rounded-none border-4 border-black bg-neo-green flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_#000]">
                  <CheckCircle2 className="h-8 w-8 text-black" strokeWidth={3} />
                </div>
                <div>
                  <div className="text-sm font-black uppercase border-b-4 border-black pb-2 mb-2">Tingkat Penyelesaian</div>
                  <div className="text-7xl font-black text-black tracking-tighter">
                    {totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="neo-card p-6 flex flex-col gap-4 bg-white hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all">
                <div className="w-14 h-14 border-4 border-black bg-neo-yellow flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#000]">
                  <ClipboardList className="h-8 w-8 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-sm font-black text-black block uppercase border-b-4 border-black pb-1 mb-1">Total Laporan</span>
                  <span className="text-5xl font-black text-black">{totalCount}</span>
                </div>
              </div>
              <div className="neo-card p-6 flex flex-col gap-4 bg-white hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all">
                <div className="w-14 h-14 border-4 border-black bg-rose-400 flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#000]">
                  <Clock className="h-8 w-8 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-sm font-black text-black block uppercase border-b-4 border-black pb-1 mb-1">Menunggu</span>
                  <span className="text-5xl font-black text-black">{reportedCount}</span>
                </div>
              </div>
              <div className="neo-card p-6 flex flex-col gap-4 bg-white hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all">
                <div className="w-14 h-14 border-4 border-black bg-neo-blue flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#000]">
                  <Wrench className="h-8 w-8 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-sm font-black text-black block uppercase border-b-4 border-black pb-1 mb-1">Diproses</span>
                  <span className="text-5xl font-black text-black">{inProgressCount}</span>
                </div>
              </div>
              <div className="neo-card p-6 flex flex-col gap-4 bg-white hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#000] transition-all">
                <div className="w-14 h-14 border-4 border-black bg-neo-green flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#000]">
                  <CheckCircle2 className="h-8 w-8 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-sm font-black text-black block uppercase border-b-4 border-black pb-1 mb-1">Tuntas</span>
                  <span className="text-5xl font-black text-black">{resolvedCount}</span>
                </div>
              </div>
            </div>

            {/* Bottom Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Blockchain info */}
              <div className="lg:col-span-2 neo-card p-8 bg-black text-white">
                <h3 className="text-2xl font-black flex items-center gap-3 uppercase border-b-4 border-white pb-4 mb-6">
                  <Shield className="h-8 w-8 text-neo-yellow" strokeWidth={2.5} />
                  Status Blockchain
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white text-black p-5 border-4 border-black shadow-[4px_4px_0px_0px_#FFD700]">
                    <span className="text-sm font-black uppercase block mb-1">Node Lokal</span>
                    <span className="text-lg font-bold font-mono">http://127.0.0.1:8545</span>
                  </div>
                  <div className="bg-white text-black p-5 border-4 border-black shadow-[4px_4px_0px_0px_#FFD700]">
                    <span className="text-sm font-black uppercase block mb-1">Chain ID</span>
                    <span className="text-lg font-bold font-mono">1337</span>
                  </div>
                  <div className="bg-neo-yellow text-black p-5 border-4 border-black shadow-[4px_4px_0px_0px_#fff] md:col-span-2">
                    <span className="text-sm font-black uppercase block mb-2">Alamat Kontrak FacilityReport</span>
                    <div className="flex items-center justify-between gap-4 bg-white border-4 border-black p-3">
                      <span className="text-lg font-bold font-mono truncate select-all">
                        {CONTRACT_ADDRESS}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(CONTRACT_ADDRESS)}
                        className="neo-btn bg-black text-white px-4 py-2"
                      >
                        {copied ? <Check className="h-5 w-5 text-neo-green" strokeWidth={3} /> : <Copy className="h-5 w-5" strokeWidth={2.5} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guide Card */}
              <div className="neo-card p-8 bg-white">
                <h3 className="text-2xl font-black text-black flex items-center gap-3 uppercase border-b-4 border-black pb-4 mb-6">
                  <HelpCircle className="h-8 w-8 text-black" strokeWidth={2.5} />
                  Panduan
                </h3>
                <ol className="text-black font-bold space-y-4 list-decimal list-inside text-lg leading-snug">
                  <li className="p-2 border-2 border-black bg-neo-yellow/20">Sambungkan MetaMask ke <strong>Localhost 8545</strong>.</li>
                  <li className="p-2 border-2 border-black bg-neo-yellow/20">Impor akun Hardhat untuk ETH gratis.</li>
                  <li className="p-2 border-2 border-black bg-neo-yellow/20">Akun #0 otomatis menjadi <strong>Admin</strong>.</li>
                  <li className="p-2 border-2 border-black bg-neo-yellow/20">Gunakan akun lain untuk lapor anonim.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. LAPOR MASALAH (FORM) TAB ==================== */}
        {activeTab === 'report' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            {!account ? (
              <div className="neo-card p-12 text-center max-w-2xl mx-auto flex flex-col items-center justify-center space-y-8 bg-neo-yellow">
                <div className="w-24 h-24 border-4 border-black bg-white flex items-center justify-center shadow-[8px_8px_0px_0px_#000] rotate-3">
                  <Shield className="h-12 w-12 text-black" strokeWidth={2.5} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-black text-black uppercase tracking-tighter">Dompet Tidak Terhubung</h3>
                  <p className="text-black font-bold text-lg max-w-sm mx-auto p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
                    Hubungkan dompet MetaMask Anda terlebih dahulu untuk mengajukan laporan ke blockchain.
                  </p>
                </div>
                <button 
                  onClick={connectWallet}
                  className="neo-btn bg-black text-white px-8 py-4 text-xl"
                >
                  Hubungkan MetaMask
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* Form column */}
                <div className="lg:col-span-7 neo-card p-8 md:p-10 space-y-8 bg-white">
                  <div className="border-b-4 border-black pb-6">
                    <h2 className="text-4xl font-black text-black flex items-center gap-3 uppercase tracking-tighter">
                      <PlusCircle className="h-10 w-10 text-neo-yellow fill-black" strokeWidth={1} />
                      Buat Laporan
                    </h2>
                    <p className="text-black font-bold text-sm mt-3 bg-neo-yellow p-3 border-2 border-black inline-block">
                      Data yang dikirim ke blockchain akan dicatat selamanya.
                    </p>
                  </div>

                  <form onSubmit={submitReport} className="space-y-6">
                    {/* Location */}
                    <div className="space-y-2">
                      <label className="text-xl font-black text-black uppercase block">Lokasi / Gedung</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-black" strokeWidth={2.5} />
                        <input 
                          type="text" 
                          required
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Contoh: Gedung Rektorat Lt. 3"
                          className="neo-input w-full pl-14 pr-4 py-4 text-lg"
                        />
                      </div>
                    </div>
                    
                    {/* Issue Type */}
                    <div className="space-y-4">
                      <label className="text-xl font-black text-black uppercase block">Jenis Kerusakan</label>
                      <div className="relative">
                        <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-black" strokeWidth={2.5} />
                        <input 
                          type="text" 
                          required
                          value={issueType}
                          onChange={(e) => setIssueType(e.target.value)}
                          placeholder="Masukkan rincian kerusakan..."
                          className="neo-input w-full pl-14 pr-4 py-4 text-lg"
                        />
                      </div>

                      {/* Presets chips */}
                      <div className="space-y-2 p-4 border-4 border-black bg-gray-100 shadow-[4px_4px_0px_0px_#000]">
                        <span className="text-sm font-black text-black uppercase tracking-wider block mb-2">Preset Cepat:</span>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setIssueType(preset)}
                              className="neo-btn bg-white px-3 py-1.5 text-xs border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Photo URI */}
                    <div className="space-y-2">
                      <label className="text-xl font-black text-black uppercase block">URL Foto Bukti</label>
                      <div className="relative">
                        <Camera className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-black" strokeWidth={2.5} />
                        <input 
                          type="url" 
                          required
                          value={photoURI}
                          onChange={(e) => setPhotoURI(e.target.value)}
                          placeholder="https://... (Imgur/Cloudinary)"
                          className="neo-input w-full pl-14 pr-4 py-4 text-lg"
                        />
                      </div>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="neo-btn w-full bg-neo-yellow py-5 text-xl mt-8 flex justify-center items-center gap-3"
                    >
                      {loading ? <RefreshCw className="h-6 w-6 animate-spin" strokeWidth={3} /> : 'KIRIM KE BLOCKCHAIN'}
                    </button>
                  </form>
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <div className="neo-card p-6 bg-white rotate-1 hover:rotate-0 transition-transform">
                    <span className="text-sm font-black text-black uppercase tracking-widest block mb-4 border-b-4 border-black pb-2">Live Preview</span>
                    <div className="border-4 border-black bg-white overflow-hidden flex flex-col shadow-[8px_8px_0px_0px_#000]">
                      <div className="h-56 relative bg-gray-200 flex items-center justify-center overflow-hidden border-b-4 border-black">
                        {photoURI ? (
                          <img 
                            src={photoURI} 
                            alt="Preview"
                            className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop';
                            }}
                          />
                        ) : (
                          <div className="text-center text-black space-y-2">
                            <ImageIcon className="h-12 w-12 mx-auto" strokeWidth={2} />
                            <p className="text-sm font-black uppercase">Pratinjau Foto</p>
                          </div>
                        )}
                        
                        <div className="absolute top-4 right-4 px-4 py-2 text-xs font-black bg-neo-yellow text-black border-4 border-black shadow-[4px_4px_0px_0px_#000] uppercase flex items-center gap-2">
                          <Clock className="h-4 w-4" strokeWidth={3} />
                          Dilaporkan
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-2xl font-black text-black uppercase truncate">{issueType || 'Rincian Kerusakan'}</h4>
                          <div className="flex items-center text-black font-bold text-sm mt-2 p-2 border-2 border-black bg-neo-yellow/30">
                            <MapPin className="h-4 w-4 mr-2" strokeWidth={2.5} />
                            {location || 'Detail Lokasi...'}
                          </div>
                        </div>

                        <div className="bg-gray-100 border-4 border-black p-4 text-xs space-y-2 font-mono font-bold text-black uppercase">
                          <div className="flex justify-between border-b-2 border-gray-300 pb-1">
                            <span>Reporter:</span>
                            <span>{account ? `${account.slice(0,6)}...${account.slice(-4)}` : '0x000...0000'}</span>
                          </div>
                          <div className="flex justify-between border-b-2 border-gray-300 pb-1">
                            <span>Waktu:</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between text-rose-600">
                            <span>Teknisi:</span>
                            <span>Kosong</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. DAFTAR LAPORAN (GALLERY) TAB ==================== */}
        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Toolbar and filter */}
            <div className="neo-card p-6 bg-white flex flex-col md:flex-row gap-6 justify-between items-center">
              {/* Search bar */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black" strokeWidth={3} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari lokasi atau masalah..."
                  className="neo-input w-full pl-12 pr-4 py-3 text-sm uppercase"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {[
                  { value: 'all', label: 'SEMUA' },
                  { value: '0', label: 'MENUNGGU' },
                  { value: '1', label: 'DIPROSES' },
                  { value: '2', label: 'TUNTAS' }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`neo-btn px-4 py-2 text-xs transition-all ${statusFilter === tab.value ? 'bg-black text-white' : 'bg-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Refresh button */}
              <button 
                onClick={fetchReports}
                disabled={loading}
                className="neo-btn bg-neo-yellow p-3 w-full md:w-auto"
                title="Muat Ulang"
              >
                <RefreshCw className={`h-5 w-5 text-black ${loading ? 'animate-spin' : ''}`} strokeWidth={3} />
              </button>
            </div>

            {/* Content grid */}
            {!account ? (
              <div className="neo-card p-12 text-center max-w-2xl mx-auto space-y-6 bg-neo-yellow">
                <Shield className="h-16 w-16 text-black mx-auto" strokeWidth={2} />
                <h3 className="text-3xl font-black text-black uppercase">Akses Terkunci</h3>
                <p className="text-black font-bold border-4 border-black bg-white p-4">
                  Hubungkan dompet Anda untuk memuat laporan dari blockchain.
                </p>
                <button onClick={connectWallet} className="neo-btn bg-black text-white px-8 py-3">Hubungkan</button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="neo-card p-12 text-center max-w-md mx-auto space-y-6 bg-white">
                <div className="w-20 h-20 border-4 border-black bg-gray-100 flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_#000] rotate-45">
                  <Search className="h-8 w-8 text-black -rotate-45" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-black uppercase">Kosong</h3>
                  <p className="text-black font-bold mt-2">Tidak ditemukan laporan.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredReports.map((report) => {
                  const statusInfo = STATUS_MAP[report.status];
                  const StatusIcon = statusInfo.icon;
                  
                  // Neo brutalist colors based on status
                  const statusColors = {
                    0: 'bg-rose-400',
                    1: 'bg-neo-blue',
                    2: 'bg-neo-green'
                  };
                  const sColor = statusColors[report.status];

                  return (
                    <div 
                      key={report.id} 
                      className="neo-card flex flex-col bg-white hover:-translate-y-2 transition-all hover:shadow-[12px_12px_0px_0px_#000]"
                    >
                      {/* Photo Header */}
                      <div className="h-52 overflow-hidden relative border-b-4 border-black">
                        <img 
                          src={report.photoURI} 
                          alt={report.issueType}
                          className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-300"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop';
                          }}
                        />
                        <div className={`absolute top-4 right-4 px-3 py-1.5 text-[11px] font-black border-4 border-black flex items-center gap-2 uppercase shadow-[4px_4px_0px_0px_#000] ${sColor}`}>
                          <StatusIcon className="h-4 w-4 text-black" strokeWidth={3} />
                          {statusInfo.label}
                        </div>
                      </div>
                      
                      {/* Card Body */}
                      <div className="p-6 flex-grow flex flex-col space-y-5">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black text-black uppercase leading-tight truncate-2-lines">{report.issueType}</h3>
                          <div className="flex items-start text-black font-bold text-sm bg-gray-100 p-2 border-2 border-black">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 shrink-0" strokeWidth={2.5} />
                            <span className="leading-snug">{report.location}</span>
                          </div>
                        </div>
                        
                        <div className="border-4 border-black rounded-none p-3 text-[11px] space-y-2 flex-grow font-mono font-bold uppercase text-black bg-white">
                          <div className="flex justify-between border-b-2 border-black border-dotted pb-1">
                            <span>Reporter:</span>
                            <span title={report.reporter}>
                              {report.reporter.slice(0,6)}...{report.reporter.slice(-4)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b-2 border-black border-dotted pb-1">
                            <span>Tanggal:</span>
                            <span>{new Date(report.timestamp).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span>Teknisi:</span>
                            <span className={`px-2 py-1 text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] ${report.technicianName ? 'bg-neo-yellow' : 'bg-gray-200'}`}>
                              {report.technicianName || 'Belum Ada'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. PANEL ADMIN TAB ==================== */}
        {activeTab === 'admin' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Header info */}
            <div className="neo-card p-8 bg-black text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-4xl font-black flex items-center gap-3 uppercase tracking-tighter">
                  <Shield className="h-10 w-10 text-neo-yellow" strokeWidth={2} />
                  Panel Admin
                </h2>
                <p className="text-white font-bold mt-2 text-sm border-l-4 border-neo-yellow pl-3">
                  Pusat komando: Tugaskan teknisi dan validasi penyelesaian kasus.
                </p>
              </div>
              <button 
                onClick={fetchReports}
                disabled={loading}
                className="neo-btn bg-white text-black px-6 py-3 w-full md:w-auto"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} strokeWidth={3} />
                SEGARKAN
              </button>
            </div>

            {/* Admin Checklist Table */}
            {reports.length === 0 ? (
              <div className="neo-card p-16 text-center max-w-md mx-auto bg-white border-dashed border-8 border-black">
                <CheckCircle2 className="h-20 w-20 text-black mx-auto mb-6" strokeWidth={1} />
                <h3 className="text-3xl font-black text-black uppercase">Bersih</h3>
                <p className="text-black font-bold mt-2">Tidak ada laporan yang perlu diurus.</p>
              </div>
            ) : (
              <div className="neo-card bg-white overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-4 border-black bg-neo-yellow">
                        <th className="p-5 text-sm font-black uppercase text-black border-r-4 border-black">Kasus</th>
                        <th className="p-5 text-sm font-black uppercase text-black border-r-4 border-black">Pengaju</th>
                        <th className="p-5 text-sm font-black uppercase text-black border-r-4 border-black">Status</th>
                        <th className="p-5 text-sm font-black uppercase text-black text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-4 divide-black">
                      {reports.map((report) => {
                         const statusColors = {
                          0: 'bg-rose-400 text-black',
                          1: 'bg-neo-blue text-black',
                          2: 'bg-neo-green text-black'
                        };
                        return (
                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-5 space-y-2 max-w-sm border-r-4 border-black">
                            <span className="font-black text-lg text-black block truncate uppercase">{report.issueType}</span>
                            <span className="text-sm font-bold text-black flex items-center bg-gray-200 p-1 border-2 border-black inline-flex">
                              <MapPin className="h-4 w-4 mr-1 text-black shrink-0" strokeWidth={2.5} />
                              {report.location}
                            </span>
                          </td>
                          <td className="p-5 font-mono font-bold text-sm text-black border-r-4 border-black uppercase">
                            {report.reporter.slice(0,6)}...{report.reporter.slice(-4)}
                          </td>
                          <td className="p-5 border-r-4 border-black">
                            <span className={`inline-flex items-center px-3 py-1.5 text-xs font-black border-4 border-black shadow-[4px_4px_0px_0px_#000] uppercase ${statusColors[report.status]}`}>
                              {STATUS_MAP[report.status].label}
                            </span>
                          </td>
                          <td className="p-5 text-right space-y-3 min-w-[280px]">
                            {/* Assign Technician Form */}
                            {!report.technicianName ? (
                              <div className="flex gap-2 justify-end mb-3 pb-3 border-b-2 border-black border-dashed">
                                <input 
                                  type="text"
                                  placeholder="Nama Teknisi"
                                  className="neo-input text-sm px-3 py-2 max-w-[140px]"
                                  value={technicians[report.id] || ''}
                                  onChange={(e) => setTechnicians({...technicians, [report.id]: e.target.value})}
                                />
                                <button 
                                  onClick={() => assignTechnician(report.id)}
                                  disabled={loading}
                                  className="neo-btn bg-black text-white px-4 py-2 text-xs"
                                >
                                  TUGASKAN
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-black font-black uppercase mb-3 pb-3 border-b-2 border-black border-dashed pr-2">
                                Teknisi: <span className="bg-neo-yellow px-2 py-1 border-2 border-black ml-1">{report.technicianName}</span>
                              </div>
                            )}
                            
                            {/* Update Status Dropdown */}
                            <div className="flex gap-3 items-center justify-end">
                              <span className="text-xs text-black font-black uppercase">Status:</span>
                              <select 
                                value={report.status}
                                onChange={(e) => updateStatus(report.id, Number(e.target.value))}
                                disabled={loading}
                                className="neo-input text-sm px-3 py-2 cursor-pointer font-black uppercase bg-gray-100"
                              >
                                <option value={0}>DILAPORKAN</option>
                                <option value={1}>DIPROSES</option>
                                <option value={2}>SELESAI</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
