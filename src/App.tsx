import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  ChevronLeft, 
  Share2, 
  Receipt, 
  BarChart3, 
  Settings as SettingsIcon, 
  Trash2, 
  Download,
  X,
  Plus,
  Bell,
  CheckCircle,
  Trophy,
  Moon,
  Sun,
  User,
  Shield,
  Smartphone,
  ChevronRight,
  Medal,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CleaningLog {
  id?: number;
  date: string;
  rooms_cleaned: string;
  daily_total: number;
}

interface RoomChecklist {
  id: number;
  name: string;
  photos: { [key: string]: string | null };
  completed: boolean;
}

interface Room {
  id: number;
  name: string;
  size: 'small' | 'medium' | 'large';
}

const ROOMS: Room[] = Array.from({ length: 15 }, (_, i) => {
  const id = i + 1;
  let size: 'small' | 'medium' | 'large';
  
  if ([6, 9].includes(id)) {
    size = 'small';
  } else if ([2, 3, 8, 10, 12, 13, 14, 15].includes(id)) {
    size = 'medium';
  } else {
    size = 'large'; // 1, 4, 5, 7, 11
  }
  
  return {
    id,
    name: `Room ${id}`,
    size
  };
});

const PRICES = {
  small: 12.50,
  medium: 15.00,
  large: 22.50
};

const SIZE_COLORS = {
  small: "border-slate-200 bg-slate-50 text-slate-500",
  medium: "border-blue-200 bg-blue-50 text-blue-600",
  large: "border-purple-200 bg-purple-50 text-purple-600"
};

const CHECKLIST_ITEMS = [
  { id: 'bed', label: 'Bed', requirement: 'Tight linens' },
  { id: 'kitchen', label: 'Kitchen', requirement: 'Sink & Counter' },
  { id: 'tv', label: 'TV Remotes', requirement: 'Parallel placement' },
  { id: 'appliances', label: 'Appliances', requirement: 'Oven & Fridge check' },
  { id: 'bathroom', label: 'Bathroom', requirement: 'Towels & Sanitized seal' },
];

export default function App() {
  const [view, setView] = useState<'daily' | 'invoices' | 'stats' | 'settings' | 'review'>('daily');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });
  
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState<{ roomId: number, itemId: string } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('en-GB', { month: 'short' }));
  const [monthlyLogs, setMonthlyLogs] = useState<CleaningLog[]>([]);
  const [roomStates, setRoomStates] = useState<{ [key: number]: RoomChecklist }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dizdaz_daily_progress');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved progress", e);
        }
      }
    }
    return ROOMS.reduce((acc, room) => ({
      ...acc,
      [room.id]: {
        id: room.id,
        name: room.name,
        photos: CHECKLIST_ITEMS.reduce((p, item) => ({ ...p, [item.id]: null }), {}),
        completed: false
      }
    }), {});
  });
  
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('dizdaz_daily_progress', JSON.stringify(roomStates));
  }, [roomStates]);

  const calculateStreak = () => {
    if (logs.length === 0) return 0;
    
    // Get unique dates and sort them descending
    const dates = Array.from(new Set(logs.map(l => l.date))).sort((a, b) => {
      const dateA = new Date(`${a} ${new Date().getFullYear()}`);
      const dateB = new Date(`${b} ${new Date().getFullYear()}`);
      return dateB.getTime() - dateA.getTime();
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestLogDate = new Date(`${dates[0]} ${new Date().getFullYear()}`);
    latestLogDate.setHours(0, 0, 0, 0);

    // If the latest log is not today or yesterday, the streak is broken
    if (latestLogDate < yesterday) return 0;

    let streak = 0;
    let checkDate = new Date(latestLogDate);

    for (const dateStr of dates) {
      const logDate = new Date(`${dateStr} ${new Date().getFullYear()}`);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const fetchMonthlyCleans = async (month: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/get-monthly-cleans?month=${month}`);
      const data = await res.json();
      setMonthlyLogs(data);
    } catch (err) {
      console.error("Failed to fetch monthly cleans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'review') {
      fetchMonthlyCleans(selectedMonth);
    }
  }, [view, selectedMonth]);

  const handleCapture = (roomId: number, itemId: string, mode: 'camera' | 'gallery' = 'camera') => {
    setCapturing({ roomId, itemId });
    if (mode === 'camera' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (mode === 'gallery' && uploadInputRef.current) {
      uploadInputRef.current.click();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && capturing) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setRoomStates(prev => {
          const room = prev[capturing.roomId];
          const newPhotos = { ...room.photos, [capturing.itemId]: base64String };
          const allCaptured = Object.values(newPhotos).every(p => p !== null);
          return {
            ...prev,
            [capturing.roomId]: { ...room, photos: newPhotos, completed: allCaptured }
          };
        });
        setCapturing(null);
        // Reset the input value so the same file can be picked again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const resetRoom = (roomId: number) => {
    if (!roomId) return;
    setRoomStates(prev => {
      const updatedRoom = {
        ...prev[roomId],
        photos: CHECKLIST_ITEMS.reduce((p, item) => ({ ...p, [item.id]: null }), {}),
        completed: false
      };
      return {
        ...prev,
        [roomId]: updatedRoom
      };
    });
  };

  const saveDailyWork = async () => {
    const completedRooms = (Object.values(roomStates) as RoomChecklist[]).filter(r => r.completed);
    if (completedRooms.length === 0) return;

    const roomsDescription = completedRooms.map(r => `Room ${r.id}`).join(', ');
    
    const total = completedRooms.reduce((sum, r) => {
      const roomConfig = ROOMS.find(rc => rc.id === r.id);
      return sum + (roomConfig ? PRICES[roomConfig.size] : 0);
    }, 0);

    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    try {
      setLoading(true);
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          rooms_cleaned: `${completedRooms.length} Units (${roomsDescription})`,
          daily_total: total
        })
      });
      await fetchLogs();
      // Reset daily state
      localStorage.removeItem('dizdaz_daily_progress');
      setRoomStates(ROOMS.reduce((acc, room) => ({
        ...acc,
        [room.id]: {
          id: room.id,
          name: room.name,
          photos: CHECKLIST_ITEMS.reduce((p, item) => ({ ...p, [item.id]: null }), {}),
          completed: false
        }
      }), {}));
      alert('Work saved successfully!');
    } catch (err) {
      console.error("Failed to save work", err);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        // Also fetch monthly cleans to update that view if needed
        if (view === 'review') {
          fetchMonthlyCleans(selectedMonth);
        }
      }
    } catch (err) {
      console.error("Failed to clear data", err);
    } finally {
      setLoading(false);
    }
  };

  const base64ToFile = async (base64: string, filename: string): Promise<File> => {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/jpeg' });
  };

  const shareToWhatsApp = async () => {
    const completedRooms = (Object.values(roomStates) as RoomChecklist[]).filter(r => r.completed);
    const total = completedRooms.reduce((sum, r) => {
      const roomConfig = ROOMS.find(rc => rc.id === r.id);
      return sum + (roomConfig ? PRICES[roomConfig.size] : 0);
    }, 0);

    const text = `DIZDAZ CLEANING REPORT\nDate: ${new Date().toLocaleDateString()}\nUnits Cleaned: ${completedRooms.length}\nTotal: £${total.toFixed(2)}`;
    
    const imageFiles: File[] = [];
    setLoading(true);
    try {
      for (const room of completedRooms) {
        for (const [itemId, photoData] of Object.entries(room.photos)) {
          if (photoData) {
            const filename = `Room-${room.id}-${itemId}.jpg`;
            const file = await base64ToFile(photoData, filename);
            imageFiles.push(file);
          }
        }
      }

      if (navigator.share) {
        const shareData: ShareData = {
          title: 'Daily Cleaning Report',
          text: text,
        };

        if (imageFiles.length > 0 && navigator.canShare && navigator.canShare({ files: imageFiles })) {
          shareData.files = imageFiles;
        }

        await navigator.share(shareData);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback to text-only if file sharing fails
      if (navigator.share) {
        navigator.share({ title: 'Daily Cleaning Report', text }).catch(console.error);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = () => {
    window.location.href = '/api/invoice/download';
  };

  return (
    <div className={cn(
      "font-sans antialiased min-h-screen max-w-md mx-auto shadow-2xl flex flex-col relative overflow-x-hidden transition-colors duration-300",
      darkMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
    )}>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef}
        onChange={onFileChange}
      />
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={uploadInputRef}
        onChange={onFileChange}
      />
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-20 flex items-center p-4 justify-between shadow-md text-white transition-colors",
        darkMode ? "bg-slate-900" : "bg-[#007BFF]"
      )}>
        <div className="flex size-10 items-center justify-center rounded-full bg-white/20">
          <CheckCircle className="size-6" />
        </div>
        <div className="flex flex-col items-center flex-1">
          <h1 className="text-lg font-black tracking-tight uppercase leading-none">DIZDAZ CLEANING</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Daily Job Tracker</p>
        </div>
        <div className="size-10 flex items-center justify-center">
          <Bell className="size-5" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-48">
        {view === 'daily' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold">Units Overview</h2>
              <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Select a room to complete the photo checklist.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ROOMS.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95 border-2",
                    roomStates[room.id].completed 
                      ? "bg-green-500 text-white border-green-500 shadow-lg" 
                      : darkMode ? "bg-slate-900 border-slate-800 text-slate-500" : SIZE_COLORS[room.size]
                  )}
                >
                  <span className="text-2xl font-black">{room.id}</span>
                  <span className="text-[10px] font-bold uppercase opacity-60">{room.size}</span>
                  {roomStates[room.id].completed && <CheckCircle2 className="size-4 mt-1" />}
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'invoices' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-[#137fec] tracking-tight text-2xl font-black uppercase mb-1">INVOICE PREVIEW</h1>
                <p className="text-slate-500 text-sm font-medium">Billed To: YourApartments.com</p>
              </div>
              <button 
                onClick={() => setView('review')}
                className="bg-slate-100 p-2 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                title="Review Monthly Logs"
              >
                <Receipt className="size-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Rooms</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium">{log.date}</td>
                      <td className="px-4 py-3">{log.rooms_cleaned.split('(')[0]}</td>
                      <td className="px-4 py-3 text-right font-semibold">£{log.daily_total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">No data for this month yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-[#137fec] rounded-xl p-5 text-white shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-wider opacity-90">Total Due</span>
                <span className="text-2xl font-black">£{logs.reduce((s, l) => s + l.daily_total, 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={downloadInvoice}
                disabled={logs.length === 0}
                className="w-full bg-[#137fec] hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="size-5" />
                Download as PDF
              </button>
              <button 
                onClick={clearData}
                disabled={logs.length === 0}
                className="w-full border-2 border-[#137fec] text-[#137fec] hover:bg-blue-50 disabled:opacity-50 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="size-5" />
                Clear Data
              </button>
            </div>
          </div>
        )}

        {view === 'review' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => setView('invoices')}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="size-5" />
              </button>
              <h2 className="text-xl font-bold">Monthly Review</h2>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Select Month</label>
              <div className="grid grid-cols-4 gap-2">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold transition-all",
                      selectedMonth === m ? "bg-[#007BFF] text-white shadow-md" : "bg-white text-slate-500 border border-slate-100"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Rooms Cleaned</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                    </tr>
                  ) : monthlyLogs.length > 0 ? (
                    monthlyLogs.map((log, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium">{log.date}</td>
                        <td className="px-4 py-3 text-xs">{log.rooms_cleaned.split('(')[0]}</td>
                        <td className="px-4 py-3 text-right font-semibold">£{log.daily_total.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">No logs found for {selectedMonth}.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {monthlyLogs.length > 0 && (
              <div className="bg-[#137fec] rounded-xl p-5 text-white shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-wider opacity-90">Monthly Total</span>
                  <span className="text-2xl font-black">£{monthlyLogs.reduce((s, l) => s + l.daily_total, 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'stats' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">ACHIEVEMENTS</h2>
                <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Your cleaning streak & medals</p>
              </div>
              <div className="bg-yellow-400/20 p-3 rounded-2xl">
                <Trophy className="size-8 text-yellow-500" />
              </div>
            </div>

            <div className={cn("p-6 rounded-[2rem] shadow-xl", darkMode ? "bg-slate-900" : "bg-white border border-slate-100")}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold uppercase tracking-widest text-xs opacity-50">
                  {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-1">
                  <div className="size-2 rounded-full bg-yellow-400"></div>
                  <div className="size-2 rounded-full bg-yellow-400 opacity-30"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={`${d}-${i}`} className="text-[10px] font-black opacity-30 mb-2">{d}</span>
                ))}
                {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => {
                  const day = i + 1;
                  const monthStr = new Date().toLocaleDateString('en-GB', { month: 'short' });
                  const dateStr = `${day.toString().padStart(2, '0')} ${monthStr}`;
                  const isCompleted = logs.some(l => l.date === dateStr);
                  
                  return (
                    <div key={day} className="aspect-square flex flex-col items-center justify-center relative">
                      <span className={cn(
                        "text-xs font-bold",
                        isCompleted ? "opacity-20" : "opacity-100"
                      )}>{day}</span>
                      {isCompleted && (
                        <motion.div 
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Medal className="size-6 text-yellow-500 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]" />
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={cn("p-5 rounded-3xl", darkMode ? "bg-slate-900" : "bg-slate-50")}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Medals</p>
                <p className="text-3xl font-black">{logs.length}</p>
              </div>
              <div className={cn("p-5 rounded-3xl", darkMode ? "bg-slate-900" : "bg-slate-50")}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Current Streak</p>
                <p className="text-3xl font-black">{calculateStreak()} Days</p>
              </div>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight">SETTINGS</h2>
              <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Preferences & Account</p>
            </div>

            <div className="space-y-4">
              <div className={cn("p-4 rounded-3xl flex items-center justify-between", darkMode ? "bg-slate-900" : "bg-slate-50")}>
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                    {darkMode ? <Moon className="size-5" /> : <Sun className="size-5" />}
                  </div>
                  <div>
                    <p className="font-bold">Dark Mode</p>
                    <p className="text-[10px] opacity-50 uppercase font-black">Toggle appearance</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    darkMode ? "bg-blue-500" : "bg-slate-300"
                  )}
                >
                  <motion.div 
                    animate={{ x: darkMode ? 24 : 4 }}
                    className="absolute top-1 left-0 size-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              <div className={cn("p-4 rounded-3xl space-y-4", darkMode ? "bg-slate-900" : "bg-slate-50")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                      <User className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold">Profile Info</p>
                      <p className="text-[10px] opacity-50 uppercase font-black">DizDaz Cleaning Ltd</p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 opacity-30" />
                </div>
                
                <div className="h-px bg-slate-200/10" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-500">
                      <Shield className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold">Security</p>
                      <p className="text-[10px] opacity-50 uppercase font-black">Biometric Lock</p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 opacity-30" />
                </div>

                <div className="h-px bg-slate-200/10" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                      <Smartphone className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold">App Version</p>
                      <p className="text-[10px] opacity-50 uppercase font-black">v2.4.0 (Stable)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black opacity-30">LATEST</span>
                </div>
              </div>
            </div>

            <button className="w-full py-4 rounded-3xl border-2 border-red-500/20 text-red-500 font-bold text-sm uppercase tracking-widest active:scale-95 transition-all">
              Sign Out
            </button>
          </div>
        )}
      </main>

      {/* Room Checklist Modal */}
      <AnimatePresence>
        {selectedRoom !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl pointer-events-auto"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-none">Room {selectedRoom} Checklist</h3>
                  <p className="text-slate-500 text-sm mt-1">5 photos required to complete</p>
                </div>
                <button 
                  onClick={() => setSelectedRoom(null)}
                  className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 mb-8 max-h-[50vh] overflow-y-auto pr-1">
                {CHECKLIST_ITEMS.map(item => {
                  const photo = roomStates[selectedRoom].photos[item.id];
                  return (
                    <div key={item.id} className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-colors",
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleCapture(selectedRoom, item.id, 'camera')}
                          className={cn(
                            "size-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all active:scale-95",
                            photo ? "bg-green-500 text-white shadow-green-100" : "bg-[#007BFF] text-white shadow-blue-100"
                          )}
                        >
                          <Camera className="size-6" />
                        </button>
                        <button 
                          onClick={() => handleCapture(selectedRoom, item.id, 'gallery')}
                          className={cn(
                            "size-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all active:scale-95",
                            photo ? "bg-green-500 text-white shadow-green-100" : "bg-slate-600 text-white shadow-slate-100"
                          )}
                        >
                          <Upload className="size-6" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Requirement: {item.requirement}</p>
                      </div>
                      {photo && (
                        <div className="size-16 rounded-lg bg-slate-200 overflow-hidden border-2 border-white shrink-0 shadow-sm">
                          <img src={photo} alt="Captured" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => selectedRoom && resetRoom(selectedRoom)}
                  className="flex-1 py-4 border-2 border-red-100 text-red-500 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="size-5" />
                  Reset
                </button>
                <button 
                  onClick={() => setSelectedRoom(null)}
                  className="flex-[2] py-4 bg-[#007BFF] text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-[0.98] transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Action Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md border-t pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.08)] transition-colors",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
      )}>
        {view === 'daily' && (
          <>
            <div className={cn("px-6 py-3 flex items-center justify-between", darkMode ? "bg-slate-950/50" : "bg-slate-50/50")}>
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Estimated Invoice</p>
                <p className="text-[#007BFF] text-xl font-black">
                  £{((Object.values(roomStates) as RoomChecklist[]).reduce((sum, r) => {
                    if (!r.completed) return sum;
                    const roomConfig = ROOMS.find(rc => rc.id === r.id);
                    return sum + (roomConfig ? PRICES[roomConfig.size] : 0);
                  }, 0)).toFixed(2)} 
                  <span className="text-slate-400 text-xs font-medium"> total</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Daily Progress</p>
                <p className={cn("text-lg font-black", darkMode ? "text-white" : "text-slate-900")}>{(Object.values(roomStates) as RoomChecklist[]).filter(r => r.completed).length} <span className="text-xs font-medium text-slate-400">/ 15 units</span></p>
              </div>
            </div>
            <div className="px-4 py-4 space-y-2">
              <div className="flex gap-2">
                <button 
                  onClick={saveDailyWork}
                  disabled={loading || (Object.values(roomStates) as RoomChecklist[]).filter(r => r.completed).length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-100 active:scale-[0.98]"
                >
                  <Plus className="size-5" />
                  <span>Save Work</span>
                </button>
                <button 
                  onClick={shareToWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#007BFF] hover:opacity-90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
                >
                  <Share2 className="size-5" />
                  <span>Share Report</span>
                </button>
              </div>
            </div>
          </>
        )}
        <nav className={cn("flex border-t px-4 pt-2 pb-6", darkMode ? "border-slate-800" : "border-slate-50")}>
          <button 
            onClick={() => setView('daily')}
            className={cn("flex flex-1 flex-col items-center justify-center gap-1", view === 'daily' ? "text-[#007BFF]" : "text-slate-300")}
          >
            <Camera className={cn("size-6", view === 'daily' && "fill-current")} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Daily</p>
          </button>
          <button 
            onClick={() => setView('invoices')}
            className={cn("flex flex-1 flex-col items-center justify-center gap-1", view === 'invoices' ? "text-[#007BFF]" : "text-slate-300")}
          >
            <Receipt className={cn("size-6", view === 'invoices' && "fill-current")} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Invoices</p>
          </button>
          <button 
            onClick={() => setView('stats')}
            className={cn("flex flex-1 flex-col items-center justify-center gap-1", view === 'stats' ? "text-[#007BFF]" : "text-slate-300")}
          >
            <BarChart3 className={cn("size-6", view === 'stats' && "fill-current")} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Stats</p>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={cn("flex flex-1 flex-col items-center justify-center gap-1", view === 'settings' ? "text-[#007BFF]" : "text-slate-300")}
          >
            <SettingsIcon className={cn("size-6", view === 'settings' && "fill-current")} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Settings</p>
          </button>
        </nav>
      </div>
    </div>
  );
}
