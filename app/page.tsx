'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useAppStore } from '../lib/store';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
};

type CartItem = MenuItem & {
  quantity: number;
};

type OrderType = 'drive-thru' | 'pick-up' | 'dine-in';

type OrderStatus = 'received' | 'brewing' | 'ready' | 'completed';

type Order = {
  id: string;
  customer_phone: string;
  order_type: OrderType;
  arrival_time?: string;
  total_price: number;
  payment_status: 'pending' | 'paid' | 'failed';
  order_status: OrderStatus;
  created_at: string;
  items?: CartItem[];
};

// Demo mode: Supabase integration disabled by default
// Add your Supabase credentials in .env.local to enable
let supabase: ReturnType<typeof createClient> | null = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (error) {
  console.log('Supabase not configured, using demo mode');
}

export default function CoffeeShop() {
  const [stage, setStage] = useState(1);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('drive-thru');
  const [arrivalTime, setArrivalTime] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  
  // Use global store
  const { currentOrder, setCurrentOrder, addOrder, updateOrderStatus } = useAppStore();

  const sampleMenuItems: MenuItem[] = [
    {
      id: '1',
      name: 'Espresso',
      description: 'Rich and bold single shot',
      price: 250,
      image_url: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400',
      category: 'Coffee',
      available: true
    },
    {
      id: '2',
      name: 'Cappuccino',
      description: 'Perfect balance of espresso, steamed milk and foam',
      price: 350,
      image_url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400',
      category: 'Coffee',
      available: true
    },
    {
      id: '3',
      name: 'Latte',
      description: 'Smooth espresso with velvety steamed milk',
      price: 380,
      image_url: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400',
      category: 'Coffee',
      available: true
    },
    {
      id: '4',
      name: 'Mocha',
      description: 'Decadent chocolate meets rich espresso',
      price: 420,
      image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
      category: 'Coffee',
      available: true
    },
    {
      id: '5',
      name: 'Croissant',
      description: 'Buttery, flaky French pastry',
      price: 200,
      image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
      category: 'Pastry',
      available: true
    },
    {
      id: '6',
      name: 'Blueberry Muffin',
      description: 'Fresh baked with juicy blueberries',
      price: 180,
      image_url: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400',
      category: 'Pastry',
      available: true
    }
  ];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (stage === 4 && currentOrder) {
      subscribeToOrderUpdates(currentOrder.id);
    }
  }, [stage, currentOrder]);

  const fetchMenuItems = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true);
      
      if (error) throw error;
      setMenuItems(data || sampleMenuItems);
    } catch (error) {
      console.log('Using sample menu data');
      setMenuItems(sampleMenuItems);
    }
  };

  const subscribeToOrderUpdates = (orderId: string) => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          setCurrentOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => 
      prev.map(i => i.id === itemId ? { ...i, quantity } : i)
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const placeOrder = async (paymentMethod: string) => {
    if (!customerPhone) {
      alert('Please enter your phone number');
      return;
    }

    setIsPaymentLoading(true);

    try {
      const totalPrice = calculateTotal();
      const orderData = {
        customer_phone: customerPhone,
        order_type: orderType,
        arrival_time: orderType !== 'dine-in' ? arrivalTime : null,
        total_price: totalPrice,
        payment_status: 'paid',
        order_status: 'received',
        items: cart
      };

      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .insert(orderData as any)
          .select()
          .single();

        if (error) {
          throw error;
        }

        const newOrder = { ...(data as any), items: cart };
        setCurrentOrder(newOrder);
        addOrder(newOrder);
      } else {
        const mockOrder: Order = {
          id: `ORDER-${Date.now()}`,
          customer_phone: customerPhone,
          order_type: orderType,
          arrival_time: orderType !== 'dine-in' ? arrivalTime : undefined,
          total_price: totalPrice,
          payment_status: 'paid',
          order_status: 'received',
          created_at: new Date().toISOString(),
          items: cart
        };
        setCurrentOrder(mockOrder);
        addOrder(mockOrder);
      }
      
      setStage(3);
    } catch (error) {
      const mockOrder: Order = {
        id: `ORDER-${Date.now()}`,
        customer_phone: customerPhone,
        order_type: orderType,
        arrival_time: orderType !== 'dine-in' ? arrivalTime : undefined,
        total_price: calculateTotal(),
        payment_status: 'paid',
        order_status: 'received',
        created_at: new Date().toISOString(),
        items: cart
      };
      setCurrentOrder(mockOrder);
      addOrder(mockOrder);
      setStage(3);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const testLocalUpdate = () => {
    if (!currentOrder) return;

    const statuses: OrderStatus[] = ['received', 'brewing', 'ready', 'completed'];
    const currentIndex = statuses.indexOf(currentOrder.order_status);
    const nextIndex = (currentIndex + 1) % statuses.length;

    updateOrderStatus(currentOrder.id, statuses[nextIndex]);
  };

  const renderStage1 = () => (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-accent mb-2">☕ Luxury Coffee</h1>
            <p className="text-gray-400">📍 Mingora Bypass Branch</p>
          </div>
          <Link 
            href="/admin"
            className="bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-600 transition-all"
          >
            ⚙️ Admin
          </Link>
        </div>

        <div className="bg-card rounded-2xl p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Order Type</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: 'drive-thru', label: '🚗 Drive-Thru' },
              { type: 'pick-up', label: '🛍️ Pick-Up' },
              { type: 'dine-in', label: '🪑 Dine-In' }
            ].map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setOrderType(type as OrderType)}
                className={`p-3 rounded-xl transition-all ${
                  orderType === type
                    ? 'bg-accent text-background font-semibold'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {(orderType === 'drive-thru' || orderType === 'pick-up') && (
            <div className="mt-4">
              <label className="block text-sm mb-2 text-gray-300">Arrival Time</label>
              <select
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-700 text-white border-none"
              >
                <option value="">Select time</option>
                <option value="10">In 10 minutes</option>
                <option value="20">In 20 minutes</option>
                <option value="30">In 30 minutes</option>
                <option value="45">In 45 minutes</option>
                <option value="60">In 1 hour</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-2xl overflow-hidden"
            >
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-32 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-xs text-gray-400 mb-2">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-accent font-bold">Rs. {item.price}</span>
                  {(() => {
                    const cartItem = cart.find(i => i.id === item.id);
                    if (cartItem) {
                      return (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 transition-colors"
                          >
                            -
                          </button>
                          <span className="text-white font-semibold w-8 text-center">{cartItem.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                          >
                            +
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-accent text-background px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                      >
                        + Add
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-sm text-gray-400">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </p>
                <p className="text-xl font-bold text-accent">Rs. {calculateTotal()}</p>
              </div>
              <button
                onClick={() => setStage(2)}
                className="bg-accent text-background px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Checkout
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg whitespace-nowrap">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-accent font-semibold">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStage2 = () => (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setStage(1)}
          className="text-accent mb-6 hover:underline"
        >
          ← Back to Menu
        </button>

        <div className="bg-card rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Checkout</h2>

          <div className="space-y-3 mb-6">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span>{item.name}</span>
                </div>
                <span className="text-accent">Rs. {item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-700 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">Total</span>
              <span className="text-2xl font-bold text-accent">Rs. {calculateTotal()}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm mb-2">Phone Number</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="w-full p-3 rounded-xl bg-gray-700 text-white border-none"
            />
          </div>

          <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
          <div className="space-y-3">
            {['Easypaisa', 'JazzCash', 'Credit Card'].map((method) => (
              <button
                key={method}
                onClick={() => placeOrder(method)}
                disabled={isPaymentLoading}
                className="w-full p-4 rounded-xl bg-accent text-background font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPaymentLoading ? 'Processing...' : `Pay with ${method}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStage3 = () => (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-accent mb-2">Order Placed!</h2>
          <p className="text-gray-400">Order ID: {currentOrder?.id}</p>
        </div>

        <div className="bg-card rounded-2xl p-6 mb-8">
          <p className="text-lg">
            Show your order ID at the drive-thru window or counter to instantly verify and claim your fresh coffee.
          </p>
        </div>

        <button
          onClick={() => setStage(4)}
          className="w-full bg-accent text-background px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
        >
          Track Live Status
        </button>
      </div>
    </div>
  );

  const renderStage4 = () => {
    const statuses = [
      { 
        key: 'received', 
        title: 'Order Placed', 
        subtitle: 'Your order has been received', 
        icon: '📝',
        description: 'We have received your order and are preparing it'
      },
      { 
        key: 'brewing', 
        title: 'Preparing', 
        subtitle: 'Your order is being prepared', 
        icon: '☕',
        description: 'Our barista is making your coffee fresh'
      },
      { 
        key: 'ready', 
        title: 'Ready', 
        subtitle: 'Your order is ready', 
        icon: '✅',
        description: 'Your coffee is ready for pickup!'
      },
      { 
        key: 'completed', 
        title: 'Completed', 
        subtitle: 'Order delivered', 
        icon: '🎉',
        description: 'Enjoy your coffee! See you soon!'
      }
    ];

    const currentIndex = statuses.findIndex(s => s.key === currentOrder?.order_status) || 0;
    const currentStatus = statuses[currentIndex];

    // Format time
    const formatOrderTime = () => {
      if (!currentOrder?.created_at) return '';
      const date = new Date(currentOrder.created_at);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <button
            onClick={() => setStage(1)}
            className="text-accent mb-6 hover:underline flex items-center gap-2"
          >
            <span>←</span> New Order
          </button>

          {/* Order Header Card */}
          <div className="bg-card rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Order #{currentOrder?.id?.slice(-6)}</h2>
                <p className="text-gray-400 text-sm">Placed at {formatOrderTime()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                currentOrder?.order_status === 'completed' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-accent text-background'
              }`}>
                {currentStatus.title}
              </span>
            </div>

            {/* Order Type Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">
                {currentOrder?.order_type === 'drive-thru' && '🚗'}
                {currentOrder?.order_type === 'pick-up' && '🛍️'}
                {currentOrder?.order_type === 'dine-in' && '🪑'}
              </span>
              <span className="text-gray-300 capitalize">{currentOrder?.order_type}</span>
            </div>

            {/* Order Summary */}
            {currentOrder?.items && currentOrder.items.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-sm mb-3">Order Summary</p>
                <div className="space-y-2">
                  {currentOrder.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-accent">Rs. {item.price * item.quantity}</span>
                    </div>
                  ))}
                  {currentOrder.items.length > 3 && (
                    <p className="text-gray-500 text-xs">+{currentOrder.items.length - 3} more items</p>
                  )}
                </div>
                <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-accent text-lg">Rs. {currentOrder.total_price}</span>
                </div>
              </div>
            )}
          </div>

          {/* Current Status Highlight */}
          <div className="bg-accent/10 border border-accent/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">{currentStatus.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-accent mb-1">{currentStatus.title}</h3>
                <p className="text-gray-300">{currentStatus.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Timeline Tracker */}
          <div className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6">Order Timeline</h3>
            
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-700" />
              
              {/* Timeline Items */}
              {statuses.map((status, index) => {
                const isCompleted = index <= currentIndex;
                const isCurrent = index === currentIndex;
                
                return (
                  <div key={status.key} className="relative flex gap-4 mb-6 last:mb-0">
                    {/* Status Dot */}
                    <div className="relative z-10 w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <div className={`w-full h-full rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-accent text-background' 
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {isCompleted ? '✓' : (index + 1)}
                      </div>
                    </div>
                    
                    {/* Status Content */}
                    <div className="flex-1 pt-0.5">
                      <div className={`flex items-center gap-2 mb-1 ${
                        isCompleted ? 'text-white' : 'text-gray-500'
                      }`}>
                        <span className="font-bold">{status.title}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full animate-pulse">
                            NOW
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${
                        isCompleted ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {status.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={testLocalUpdate}
            className="w-full mt-6 bg-gray-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-600 transition-colors"
          >
            🔄 Test Next Status
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {stage === 1 && renderStage1()}
      {stage === 2 && renderStage2()}
      {stage === 3 && renderStage3()}
      {stage === 4 && renderStage4()}
    </>
  );
}
