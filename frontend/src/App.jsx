import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, MapPin, User, Camera, Shield, Wrench, RefreshCw, AlertTriangle } from 'lucide-react';
import { getProvider, getContract } from './blockchain';
import { ethers } from 'ethers';

const STATUS_MAP = {
  0: { label: 'Reported', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  1: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Wrench },
  2: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 }
};

function App() {
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [location, setLocation] = useState('');
  const [issueType, setIssueType] = useState('');
  const [photoURI, setPhotoURI] = useState('');

  // Admin form state
  const [technicians, setTechnicians] = useState({});

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
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
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
      setError("Failed to fetch reports from blockchain");
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!location || !issueType || !photoURI) {
      setError("Please fill all fields");
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
      await fetchReports();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const assignTechnician = async (id) => {
    const techName = technicians[id];
    if (!techName) {
      setError("Please enter a technician name");
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
      // Ethers errors often have nested error messages
      if (err.message.includes("user rejected")) {
        setError("Transaction was rejected by the user.");
      } else {
        setError(err.message.slice(0, 100) + "...");
      }
    } else {
      setError("An unknown error occurred");
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center mb-8 rounded-b-2xl mx-4 mt-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-8 w-8 text-campus-primary" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-campus-primary to-campus-secondary">
            CampusFix
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium border border-purple-200">
              <Shield className="h-4 w-4" />
              <span>Admin</span>
            </div>
          )}
          
          {account ? (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-700">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              disabled={loading}
              className="bg-campus-primary hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Submission Form */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 sticky top-28">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-campus-primary" />
              Report an Issue
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={submitReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Science Building, Room 302"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-campus-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                <div className="relative">
                  <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    placeholder="e.g. Broken AC, Leaking Pipe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-campus-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input 
                    type="url" 
                    value={photoURI}
                    onChange={(e) => setPhotoURI(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-campus-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading || !account}
                className="w-full bg-gradient-to-r from-campus-primary to-campus-secondary hover:from-indigo-600 hover:to-blue-600 text-white font-medium py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex justify-center items-center gap-2 mt-6"
              >
                {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Submit Report'}
              </button>
              
              {!account && (
                <p className="text-center text-sm text-gray-500 mt-2">
                  Please connect wallet to submit
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Dashboard */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Recent Reports</h2>
            <button 
              onClick={fetchReports}
              disabled={loading || !account}
              className="p-2 text-gray-500 hover:text-campus-primary hover:bg-white rounded-full transition-all disabled:opacity-50"
              title="Refresh Reports"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!account ? (
            <div className="glass rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <Shield className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-500 max-w-md">
                You need to connect your MetaMask wallet to view and submit facility reports on the blockchain.
              </p>
            </div>
          ) : reports.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">All Good!</h3>
              <p className="text-gray-500">No facility issues have been reported yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reports.map((report) => {
                const StatusIcon = STATUS_MAP[report.status].icon;
                return (
                  <div key={report.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col">
                    <div className="h-48 overflow-hidden relative bg-gray-100">
                      <img 
                        src={report.photoURI} 
                        alt={report.issueType}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop';
                        }}
                      />
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm border ${STATUS_MAP[report.status].color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_MAP[report.status].label}
                      </div>
                    </div>
                    
                    <div className="p-5 flex-grow flex flex-col">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{report.issueType}</h3>
                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {report.location}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4 flex-grow">
                        <div className="flex items-center text-gray-600 mb-2">
                          <User className="h-3.5 w-3.5 mr-1.5" />
                          <span className="truncate">Reporter: {report.reporter.slice(0,6)}...{report.reporter.slice(-4)}</span>
                        </div>
                        <div className="flex items-center text-gray-600 mb-2">
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          <span>{new Date(report.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Wrench className="h-3.5 w-3.5 mr-1.5" />
                          <span>Tech: {report.technicianName || 'Unassigned'}</span>
                        </div>
                      </div>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="border-t border-gray-100 pt-4 mt-auto space-y-3">
                          {!report.technicianName && (
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Technician Name"
                                className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-1 focus:ring-campus-primary outline-none"
                                value={technicians[report.id] || ''}
                                onChange={(e) => setTechnicians({...technicians, [report.id]: e.target.value})}
                              />
                              <button 
                                onClick={() => assignTechnician(report.id)}
                                disabled={loading}
                                className="bg-campus-secondary hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                              >
                                Assign
                              </button>
                            </div>
                          )}
                          
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status:</span>
                            <select 
                              value={report.status}
                              onChange={(e) => updateStatus(report.id, Number(e.target.value))}
                              disabled={loading}
                              className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:ring-1 focus:ring-campus-primary cursor-pointer"
                            >
                              <option value={0}>Reported</option>
                              <option value={1}>In Progress</option>
                              <option value={2}>Resolved</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
