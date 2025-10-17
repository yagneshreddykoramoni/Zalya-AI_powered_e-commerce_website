
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Products from "./pages/Products";
import OrderHistory from "./pages/OrderHistory";
import Community from "./pages/Community";
import Admin from "./pages/Admin";
import Wishlist from "./pages/Wishlist";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import AIAssistant from "./components/chatbot/AIAssistant";
import OrderDetails from "./pages/OrderDetails";
import FAQ from "./pages/FAQ";
import ShippingReturns from "./pages/ShippingReturns";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/community" element={<Community />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/orders/:orderId" element={<OrderDetails />} />
              <Route path="/order-confirmation/:orderId?" element={<OrderConfirmation />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/shipping" element={<ShippingReturns />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              
                            
              {/* Admin routes */}
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/products" element={<Admin />} />
              <Route path="/admin/community" element={<Admin />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIAssistant />
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
