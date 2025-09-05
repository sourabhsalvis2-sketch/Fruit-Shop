'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Apple, Plus, Trash2, LogOut, Printer, MessageCircle, ArrowLeft } from 'lucide-react';
// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types
interface BillItem {
  id: string;
  fruit: string;
  unit: 'kg' | 'dozen' | 'piece';
  quantity: number;
  rate: number;
  amount: number;
}

interface Bill {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_mobile: string;
  items: BillItem[];
  total_amount: number;
  created_at: string;
}

const FRUITS = [
  'Apple', 'Banana', 'Orange', 'Mango', 'Grapes', 'Pomegranate',
  'Papaya', 'Pineapple', 'Watermelon', 'Kiwi', 'Strawberry', 'Guava'
];

// Login Component
function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('amit@test.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First try to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // If login fails, try to sign up (for first time users)
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        // Check if user needs email confirmation

      }

      // If we get here, login was successful
      onLogin();

    } catch (error: string | any) {
      console.error('Auth error:', error);
      if (error.message.includes('Invalid login credentials')) {
        alert('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        alert('Please check your email and click the confirmation link first.');
      } else {
        alert('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick login bypass for development (remove in production)
  const quickLogin = async () => {
    setLoading(true);
    try {
      // Disable RLS temporarily for testing
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      onLogin();
    } catch (error: any) {
      alert('Quick login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-orange-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-green-500 to-orange-500 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Apple className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sai Fruit Suppliers</h1>
        </div>

        <form className="bg-white p-8 rounded-2xl shadow-xl space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  );
}




// Bill Creator Component
function BillCreator({ onBillCreated }: { onBillCreated: (bill: Bill) => void }) {
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [items, setItems] = useState<BillItem[]>([
    { id: '1', fruit: '', unit: 'kg', quantity: 0, rate: 0, amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      fruit: '', unit: 'kg', quantity: 0, rate: 0, amount: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + item.amount, 0);

  const saveBill = async () => {
    if (!customerName || !customerMobile || items.some(item => !item.fruit)) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const billData = {
        customer_name: customerName,
        customer_mobile: customerMobile,
        items: items.filter(item => item.fruit),
        total_amount: calculateTotal(),
        bill_number: `BILL-${Date.now()}`,
        created_at: new Date().toISOString(),
        id: `bill-${Date.now()}` // Generate a simple ID
      };

      // Since we're using simple password auth, we'll just create the bill locally
      onBillCreated(billData);
      setCustomerName('');
      setCustomerMobile('');
      setItems([{ id: '1', fruit: '', unit: 'kg', quantity: 0, rate: 0, amount: 0 }]);

    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-6">Create Bill</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Customer Name *"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
        />
        <input
          type="tel"
          placeholder="Mobile Number *"
          value={customerMobile}
          onChange={(e) => setCustomerMobile(e.target.value)}
          className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="space-y-3 mb-6">

        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 border rounded-lg">
            <select
              value={item.fruit}
              onChange={(e) => updateItem(item.id, 'fruit', e.target.value)}
              className="px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 md:col-span-2"
            >
              <option value="">Select Fruit</option>
              {FRUITS.map(fruit => <option key={fruit} value={fruit}>{fruit}</option>)}
            </select>

            <select
              value={item.unit}
              onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
              className="px-3 py-2 border rounded focus:ring-2 focus:ring-green-500"
            >
              <option value="kg">Kg</option>
              <option value="dozen">Dozen</option>
              <option value="piece">Piece</option>
            </select>

            <input
              type="number"
              placeholder="Qty"
              value={item.quantity || ''}
              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border rounded focus:ring-2 focus:ring-green-500"
            />

            <input
              type="number"
              placeholder="Rate"
              value={item.rate || ''}
              onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border rounded focus:ring-2 focus:ring-green-500"
            />

            <div className="flex items-center justify-between">
              <span className="font-medium">₹{item.amount.toFixed(2)}</span>
              {items.length > 1 && (
                <button onClick={() => removeItem(item.id)} className="text-red-600 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-medium">Items</h3>
        <button onClick={addItem} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      <div className="border-t pt-4 mb-6">
        <div className="flex justify-between text-xl font-semibold">
          <span>Total:</span>
          <span className="text-green-600">₹{calculateTotal().toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={saveBill}
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save & Generate Bill'}
      </button>
    </div>
  );
}

// Bill Preview Component
function BillPreview({ bill, onBack }: { bill: Bill; onBack: () => void }) {
  const [whatsappNumber, setWhatsappNumber] = useState(bill.customer_mobile);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const handlePrint = () => window.print();

  const sendWhatsApp = async (whatsappNumber: string) => {
    if (typeof window === "undefined") return; // Ensure client side

    const html2pdf = (await import("html2pdf.js")).default;

    const element = document.getElementById("bill-pdf");
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: `Bill_${bill.bill_number}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    const pdfBlob = await html2pdf().set(opt).from(element).outputPdf("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const message = `🧾 Sai Fruit Suppliers - BILL\n\nDownload your invoice here: ${pdfUrl}`;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-4 flex flex-wrap gap-3 no-print">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-600">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
          <Printer className="h-4 w-4" />
          Print
        </button>
        <button
          onClick={() => setShowWhatsappModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
      </div>

      {/* Bill */}
      <div id="bill-pdf" className="bg-white rounded-lg shadow-lg border max-w-2xl mx-auto p-8">
        <div className="text-center mb-8 border-b pb-6">
          <div className="bg-gradient-to-r from-green-500 to-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Apple className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">Sai Fruit Suppliers</h1>
          <p className="text-gray-600">Dasara Chowk, Gadhinglaj</p>
          <p className="text-gray-600">Mobile: 9860121156 / 9226959588</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p><b>Name : </b> {bill.customer_name}</p>
            <p><b>Mobile : </b> {bill.customer_mobile}</p>
          </div>
          <div className="text-left">
            <p><b>Bill No : </b>{bill.bill_number}</p>
            <p><b>Date : </b>{new Date(bill.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">Item</th>
              <th className="border border-gray-300 px-4 py-2">Qty</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Rate</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-4 py-2">{item.fruit}</td>
                <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity} {item.unit}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">₹{item.rate}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">₹{item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 pt-4 mb-8">
          <div className="flex justify-between text-xl font-bold" >
            <span className=''>TOTAL:</span>
            <span>₹{bill.total_amount.toFixed(2)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6"></div>

        <div className="text-center text-sm ">
          <div className="flex justify-between">
            <div>
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-white mx-auto mb-4">
                <img src="/globe.svg" alt="Logo" className="object-contain w-10 h-10" />
              </div>

              <p className="mb-2">Authorized Stamp and Signature</p>
              <div className="border-b border-gray-400 w-50"></div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsappModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Send via WhatsApp</h3>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="WhatsApp Number"
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowWhatsappModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendWhatsApp}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main App Component
export default function FruitBillingApp() {
  const [user, setUser] = useState<any>(null);
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [view, setView] = useState<'create' | 'preview'>('create');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentBill(null);
    setView('create');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => { }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-lg">
              <Apple className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Sai Fruit Suppliers</h1>
          </div>
          <div className="flex items-center gap-4">
            {view === 'preview' && (
              <button
                onClick={() => {
                  setView('create');
                  setCurrentBill(null);
                }}
                className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg"
              >
                New Bill
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {view === 'create' && (
          <BillCreator
            onBillCreated={(bill) => {
              setCurrentBill(bill);
              setView('preview');
            }}
          />
        )}

        {view === 'preview' && currentBill && (
          <BillPreview
            bill={currentBill}
            onBack={() => setView('create')}
          />
        )}
      </main>
    </div>
  );
}
