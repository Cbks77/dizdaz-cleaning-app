import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
  Upload,
  Key
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

interface PhotoData {
  file: File;
  url: string;
}

interface RoomChecklist {
  id: number;
  name: string;
  photos: { [key: string]: PhotoData | null };
  completed: boolean;
}

interface Room {
  id: number;
  name: string;
  size: 'small' | 'medium' | 'large';
  price: number;
}

const PRICES = {
  small: 12.50,
  medium: 15.00,
  large: 22.50
};

const PROPERTY_CONFIG = {
  BERKLEY: {
    id: 'BERKLEY' as const,
    name: "4 BERKLEY SQUARE",
    rooms: Array.from({ length: 15 }, (_, i) => {
      const id = i + 1;
      let size: 'small' | 'medium' | 'large';
      if ([6, 9].includes(id)) size = 'small';
      else if ([2, 3, 8, 10, 12, 13, 14, 15].includes(id)) size = 'medium';
      else size = 'large';
      return { id, name: `Room ${id}`, size, price: PRICES[size] };
    })
  },
  BRUNEL: {
    id: 'BRUNEL' as const,
    name: "BRUNEL LOFTS",
    rooms: [
      { id: 1, name: "Loft 1", size: 'large', price: 25 },
      { id: 2, name: "Loft 2", size: 'large', price: 25 },
      { id: 3, name: "Loft 3", size: 'large', price: 25 },
    ]
  }
};

type PropertyType = keyof typeof PROPERTY_CONFIG;

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
  const [view, setView] = useState<'daily' | 'invoices' | 'codes' | 'settings' | 'review'>('daily');
  const [property, setProperty] = useState<PropertyType>('BERKLEY');
  const activeRooms = PROPERTY_CONFIG[property].rooms;

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
    return PROPERTY_CONFIG.BERKLEY.rooms.reduce((acc, room) => ({
      ...acc,
      [room.id]: {
        id: room.id,
        name: room.name,
        photos: CHECKLIST_ITEMS.reduce((p, item) => ({ ...p, [item.id]: null }), {}),
        completed: false
      }
    }), {});
  });

  // Reset room states when property changes
  useEffect(() => {
    setRoomStates(activeRooms.reduce((acc, room) => ({
      ...acc,
      [room.id]: {
        id: room.id,
        name: room.name,
        photos: CHECKLIST_ITEMS.reduce((p, item) => ({ ...p, [item.id]: null }), {}),
        completed: false
      }
    }), {}));
    setSelectedRoom(null);
    fetchRoomCodes();
  }, [property]);

  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [roomCodes, setRoomCodes] = useState<{ [key: number]: string }>({});
  const [editingCode, setEditingCode] = useState<{ roomId: number, code: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const urlsRef = useRef<Set<string>>(new Set());

  // Cleanup Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      urlsRef.current.forEach(url => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    };
  }, []);

  // We no longer persist roomStates to localStorage because it contains File objects
  // which cannot be stringified.

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

  const generateRoomCode = (roomId: number) => {
    return roomCodes[roomId] || '----';
  };

  const fetchRoomCodes = async () => {
    try {
      const res = await fetch(`/api/room-codes?property_id=${property}`);
      const data = await res.json();
      const codesMap = data.reduce((acc: any, curr: any) => ({
        ...acc,
        [curr.room_id]: curr.code
      }), {});
      setRoomCodes(codesMap);
    } catch (err) {
      console.error("Failed to fetch room codes", err);
    }
  };

  const updateRoomCode = async (roomId: number, code: string) => {
    try {
      await fetch('/api/room-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: property, room_id: roomId, code })
      });
      setRoomCodes(prev => ({ ...prev, [roomId]: code }));
      setEditingCode(null);
    } catch (err) {
      console.error("Failed to update room code", err);
    }
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
    fetchLogs();
    fetchRoomCodes();
  }, []);

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

  const compressImage = (file: File): Promise<{ file: File, url: string }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
            const compressedUrl = URL.createObjectURL(compressedFile);
            urlsRef.current.add(compressedUrl);
            resolve({ file: compressedFile, url: compressedUrl });
          } else {
            reject(new Error('Blob creation failed'));
          }
          URL.revokeObjectURL(url); // Clean up the original file URL
        }, 'image/jpeg', 0.6);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && capturing) {
      try {
        setLoading(true);
        const { file: compressedFile, url: compressedUrl } = await compressImage(file);
        setRoomStates(prev => {
          const room = prev[capturing.roomId];
          // Revoke old URL if it exists
          if (room.photos[capturing.itemId]?.url) {
            const oldUrl = room.photos[capturing.itemId]!.url;
            URL.revokeObjectURL(oldUrl);
            urlsRef.current.delete(oldUrl);
          }
          const newPhotos = { ...room.photos, [capturing.itemId]: { file: compressedFile, url: compressedUrl } };
          const allCaptured = Object.values(newPhotos).every(p => p !== null);
          return {
            ...prev,
            [capturing.roomId]: { ...room, photos: newPhotos, completed: allCaptured }
          };
        });
        setCapturing(null);
        // Reset the input values so the same file can be picked again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (uploadInputRef.current) uploadInputRef.current.value = '';
      } catch (err) {
        console.error("Compression failed", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetRoom = (roomId: number) => {
    if (!roomId) return;
    setRoomStates(prev => {
      const room = prev[roomId];
      // Revoke all URLs in this room to prevent memory leaks
      (Object.values(room.photos) as (PhotoData | null)[]).forEach(photo => {
        if (photo?.url) {
          URL.revokeObjectURL(photo.url);
          urlsRef.current.delete(photo.url);
        }
      });
      const updatedRoom = {
        ...room,
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
    const completedRooms = activeRooms.filter(r => roomStates[r.id]?.completed);
    if (completedRooms.length === 0) return;

    const roomsDescription = completedRooms.map(r => r.name).join(', ');
    const total = completedRooms.reduce((sum, r) => sum + r.price, 0);
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const propertyName = PROPERTY_CONFIG[property].name;

    try {
      setLoading(true);
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          rooms_cleaned: `${propertyName}: ${completedRooms.length} Rooms (${roomsDescription})`,
          daily_total: total
        })
      });
      await fetchLogs();
      // Reset daily state and cleanup URLs
      (Object.values(roomStates) as RoomChecklist[]).forEach(room => {
        (Object.values(room.photos) as (PhotoData | null)[]).forEach(photo => {
          if (photo?.url) {
            URL.revokeObjectURL(photo.url);
            urlsRef.current.delete(photo.url);
          }
        });
      });
      localStorage.removeItem('dizdaz_daily_progress');
      setRoomStates(activeRooms.reduce((acc, room) => ({
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

  const shareToWhatsApp = async () => {
    const completedRoomConfigs = activeRooms.filter(r => roomStates[r.id]?.completed);
    const total = completedRoomConfigs.reduce((sum, r) => sum + r.price, 0);

    const roomsDescription = completedRoomConfigs.map(r => r.name).join(', ');
    const propertyName = PROPERTY_CONFIG[property].name;
    const text = `DIZDAZ CLEANING REPORT\nProperty: ${propertyName}\nDate: ${new Date().toLocaleDateString()}\nRooms Cleaned: ${completedRoomConfigs.length} (${roomsDescription})\nTotal: £${total.toFixed(2)}`;
    
    const imageFiles: File[] = [];
    setLoading(true);
    try {
      for (const config of completedRoomConfigs) {
        const roomState = roomStates[config.id];
        if (!roomState) continue;
        
        for (const [itemId, photoData] of Object.entries(roomState.photos)) {
          const p = photoData as PhotoData | null;
          if (p?.file) {
            // Use the stored File object directly, renaming it for the report
            const renamedFile = new File([p.file], `Room-${config.id}-${itemId}.jpg`, { type: 'image/jpeg' });
            imageFiles.push(renamedFile);
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

  const saveToLocalDrive = async () => {
    const completedRoomConfigs = activeRooms.filter(r => roomStates[r.id]?.completed);
    if (completedRoomConfigs.length === 0) {
      alert("No completed rooms to export.");
      return;
    }

    setLoading(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder("DIZDAZ CLEANS");
      if (!rootFolder) throw new Error("Failed to create root folder");

      const imagesFolder = rootFolder.folder("images");
      const invoiceFolder = rootFolder.folder("invoice");
      if (!imagesFolder || !invoiceFolder) throw new Error("Failed to create subfolders");

      const propertyName = PROPERTY_CONFIG[property].name;
      let invoiceContent = `DIZDAZ CLEANING INVOICE\n`;
      invoiceContent += `========================\n`;
      invoiceContent += `PROPERTY: ${propertyName}\n`;
      invoiceContent += `========================\n`;
      invoiceContent += `FROM:\n`;
      invoiceContent += `DizDaz cleaning\n`;
      invoiceContent += `Abbotsford Road\n`;
      invoiceContent += `Bristol\n`;
      invoiceContent += `BS6 6EF\n\n`;
      invoiceContent += `BILL TO:\n`;
      invoiceContent += `${propertyName}\n`;
      invoiceContent += `26-28 Regent Street\n`;
      invoiceContent += `Clifton\n`;
      invoiceContent += `Bristol\n`;
      invoiceContent += `BS8 4HG\n\n`;
      invoiceContent += `========================\n`;
      invoiceContent += `Date: ${new Date().toLocaleDateString()}\n`;
      invoiceContent += `Time: ${new Date().toLocaleTimeString()}\n\n`;
      invoiceContent += `CLEANING SUMMARY:\n`;

      let total = 0;

      for (const config of completedRoomConfigs) {
        const roomState = roomStates[config.id];
        if (!roomState) continue;

        const price = config.price;
        total += price;

        invoiceContent += `- ${config.name} (${config.size}): £${price.toFixed(2)}\n`;

        // Add images for this room
        for (const [itemId, photoData] of Object.entries(roomState.photos)) {
          const p = photoData as PhotoData | null;
          if (p?.file) {
            const fileName = `Room-${config.id}-${itemId}.jpg`;
            imagesFolder.file(fileName, p.file);
          }
        }
      }

      invoiceContent += `\n------------------------\n`;
      invoiceContent += `TOTAL ROOMS: ${completedRoomConfigs.length}\n`;
      invoiceContent += `TOTAL AMOUNT: £${total.toFixed(2)}\n`;
      invoiceContent += `========================\n`;

      invoiceFolder.file(`Invoice_${new Date().toISOString().split('T')[0]}.txt`, invoiceContent);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `DIZDAZ_CLEANS_${new Date().toISOString().split('T')[0]}.zip`);
      
      alert("Work exported successfully to local drive (as ZIP archive).");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export work. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = () => {
    const propertyName = encodeURIComponent(PROPERTY_CONFIG[property].name);
    window.location.href = `/api/invoice/download?property_name=${propertyName}`;
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
      <main className="flex-1 px-4 py-6 pb-80">
        {view === 'daily' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <button 
                  onClick={() => setProperty(property === 'BERKLEY' ? 'BRUNEL' : 'BERKLEY')}
                  className="group flex flex-col items-start"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-[#007BFF] transition-colors">
                    {PROPERTY_CONFIG[property].name}
                    <Smartphone className="size-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                  </h2>
                  <p className={cn("text-xs uppercase font-black tracking-widest opacity-40", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Tap to switch property
                  </p>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {activeRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95 border-2",
                    roomStates[room.id]?.completed 
                      ? "bg-green-500 text-white border-green-500 shadow-lg" 
                      : darkMode ? "bg-slate-900 border-slate-800 text-slate-500" : SIZE_COLORS[room.size]
                  )}
                >
                  <span className="text-2xl font-black">{room.id}</span>
                  <span className="text-[10px] font-bold uppercase opacity-60">{room.size}</span>
                  {roomStates[room.id]?.completed && <CheckCircle2 className="size-4 mt-1" />}
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
                <p className="text-slate-500 text-sm font-medium">Billed To: YOUR APARTMENT</p>
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
                      <td className="px-4 py-3">
                        <div className="font-bold">{log.rooms_cleaned.split('(')[0]}</div>
                        <div className="text-[10px] text-slate-400">{log.rooms_cleaned.match(/\(([^)]+)\)/)?.[1] || ''}</div>
                      </td>
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
                        <td className="px-4 py-3">
                          <div className="font-bold text-xs">{log.rooms_cleaned.split('(')[0]}</div>
                          <div className="text-[10px] text-slate-400">{log.rooms_cleaned.match(/\(([^)]+)\)/)?.[1] || ''}</div>
                        </td>
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

        {view === 'codes' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <button 
                  onClick={() => setProperty(property === 'BERKLEY' ? 'BRUNEL' : 'BERKLEY')}
                  className="group flex flex-col items-start"
                >
                  <h2 className="text-2xl font-black tracking-tight uppercase flex items-center gap-2 group-hover:text-[#007BFF] transition-colors">
                    {PROPERTY_CONFIG[property].name}
                    <Smartphone className="size-5 opacity-30 group-hover:opacity-100 transition-opacity" />
                  </h2>
                  <p className={cn("text-sm uppercase font-black tracking-widest opacity-40", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Tap to switch property
                  </p>
                </button>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-2xl">
                <Key className="size-8 text-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeRooms.map(room => (
                <div 
                  key={room.id} 
                  className={cn(
                    "p-5 rounded-[2rem] shadow-lg flex items-center justify-between transition-all",
                    darkMode ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-100"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "size-12 rounded-2xl flex items-center justify-center font-black text-xl",
                      darkMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-900"
                    )}>
                      {room.id}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{room.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{room.size}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Lock Combo</p>
                    {editingCode?.roomId === room.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={editingCode.code}
                          onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                          className={cn(
                            "w-24 text-center font-mono font-black text-xl p-1 rounded-lg border-2 border-[#007BFF]",
                            darkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900"
                          )}
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => updateRoomCode(room.id, editingCode.code)}
                            className="bg-green-500 text-white p-1 rounded-md"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                          <button 
                            onClick={() => setEditingCode(null)}
                            className="bg-slate-400 text-white p-1 rounded-md"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-black font-mono tracking-[0.2em] text-[#007BFF]">
                          {generateRoomCode(room.id)}
                        </p>
                        <button 
                          onClick={() => setEditingCode({ roomId: room.id, code: roomCodes[room.id] || '' })}
                          className={cn(
                            "p-2 rounded-xl transition-colors",
                            darkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"
                          )}
                        >
                          <SettingsIcon className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={cn("p-6 rounded-[2rem] border-2 border-dashed", darkMode ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400")}>
              <p className="text-center text-xs font-medium">
                Security Note: Codes are automatically rotated on the 1st of every month. 
                Please ensure all lockboxes are scrambled after use.
              </p>
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
                            photo?.url ? "bg-green-500 text-white shadow-green-100" : "bg-[#007BFF] text-white shadow-blue-100"
                          )}
                        >
                          <Camera className="size-6" />
                        </button>
                        <button 
                          onClick={() => handleCapture(selectedRoom, item.id, 'gallery')}
                          className={cn(
                            "size-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all active:scale-95",
                            photo?.url ? "bg-green-500 text-white shadow-green-100" : "bg-slate-600 text-white shadow-slate-100"
                          )}
                        >
                          <Upload className="size-6" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Requirement: {item.requirement}</p>
                      </div>
                      {photo?.url && (
                        <div className="size-16 rounded-lg bg-slate-200 overflow-hidden border-2 border-white shrink-0 shadow-sm">
                          <img src={photo.url} alt="Captured" className="w-full h-full object-cover" />
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
                  £{(activeRooms.reduce((sum, r) => {
                    if (!roomStates[r.id]?.completed) return sum;
                    return sum + r.price;
                  }, 0)).toFixed(2)} 
                  <span className="text-slate-400 text-xs font-medium"> total</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Daily Progress</p>
                <p className={cn("text-lg font-black", darkMode ? "text-white" : "text-slate-900")}>
                  {activeRooms.filter(r => roomStates[r.id]?.completed).length} 
                  <span className="text-xs font-medium text-slate-400"> / {activeRooms.length} rooms</span>
                </p>
              </div>
            </div>
            <div className="px-4 py-4 space-y-2">
              <button 
                onClick={saveToLocalDrive}
                disabled={loading || (Object.values(roomStates) as RoomChecklist[]).filter(r => r.completed).length === 0}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98]"
              >
                <Download className="size-5" />
                <span>Export to Local Drive</span>
              </button>
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
            onClick={() => setView('codes')}
            className={cn("flex flex-1 flex-col items-center justify-center gap-1", view === 'codes' ? "text-[#007BFF]" : "text-slate-300")}
          >
            <Key className={cn("size-6", view === 'codes' && "fill-current")} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Codes</p>
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
