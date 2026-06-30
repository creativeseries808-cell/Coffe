import { create } from 'zustand';

type CartItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
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
  payment_status: string;
  order_status: OrderStatus;
  items: CartItem[];
  created_at: string;
};

interface AppState {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  currentOrder: Order | null;
  setCurrentOrder: (order: Order | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  orders: [],
  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
  updateOrderStatus: (orderId, status) => 
    set((state) => ({
      orders: state.orders.map(order => 
        order.id === orderId ? { ...order, order_status: status } : order
      ),
      currentOrder: state.currentOrder?.id === orderId 
        ? { ...state.currentOrder, order_status: status } 
        : state.currentOrder
    })),
  currentOrder: null,
  setCurrentOrder: (order) => set({ currentOrder: order })
}));
