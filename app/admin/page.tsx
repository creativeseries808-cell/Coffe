'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAppStore } from '../../lib/store';

type Order = {
  id: string;
  customer_phone: string;
  order_type: 'drive-thru' | 'pick-up' | 'dine-in';
  arrival_time?: string;
  total_price: number;
  payment_status: string;
  order_status: 'received' | 'brewing' | 'ready' | 'completed';
  items: any[];
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const statuses = [
  { key: 'received', label: 'Order Placed' },
  { key: 'brewing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' }
];

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  // Use global store
  const { orders, updateOrderStatus, addOrder } = useAppStore();

  // Fetch orders
  const fetchOrders = async () => {
    if (!supabase) {
      // Demo mode - store orders are already managed globally
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      data.forEach(order => addOrder(order));
    }
    setLoading(false);
  };

  // Update order status (use store update, and also update supabase if needed)
  const updateStatus = async (orderId: string, newStatus: string) => {
    // Update local store first (instant update)
    updateOrderStatus(orderId, newStatus as any);
    
    // Also update in supabase if available
    if (supabase) {
      await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchOrders();

    if (!supabase) return;

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        () => fetchOrders()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">☕ Admin Panel</h1>
          <p className="text-gray-400">Manage your coffee shop orders</p>
          {!supabase && (
            <p className="mt-4 text-yellow-400 text-sm">
              ⚠️ Demo Mode - Add Supabase URL and Anon Key to use real database
            </p>
          )}
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading orders...</div>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center text-gray-400 py-20">
                <p className="text-4xl mb-4">📭</p>
                <p>No orders yet</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-card rounded-2xl p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold">Order #{order.id.slice(-6)}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          order.order_status === 'completed' 
                            ? 'bg-green-600 text-white' 
                            : order.order_status === 'ready'
                            ? 'bg-accent text-background'
                            : 'bg-gray-700 text-white'
                        }`}>
                          {statuses.find(s => s.key === order.order_status)?.label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Placed at {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm">Customer</p>
                      <p className="font-medium">{order.customer_phone}</p>
                      
                      <p className="text-gray-400 text-sm mt-4">Order Type</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {order.order_type === 'drive-thru' && '🚗'}
                          {order.order_type === 'pick-up' && '🛍️'}
                          {order.order_type === 'dine-in' && '🪑'}
                        </span>
                        <span className="capitalize">{order.order_type}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-3">Status Update</p>
                      <div className="flex flex-wrap gap-2">
                        {statuses.map((status) => (
                          <button
                            key={status.key}
                            onClick={() => updateStatus(order.id, status.key)}
                            disabled={order.order_status === status.key}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              order.order_status === status.key
                                ? 'bg-accent text-background'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="border-t border-gray-700 pt-4">
                      <p className="text-gray-400 text-sm mb-3">Order Items</p>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-300">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-accent">Rs. {item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between font-bold">
                        <span>Total</span>
                        <span className="text-accent text-lg">Rs. {order.total_price}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
