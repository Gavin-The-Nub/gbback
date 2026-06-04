"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, X, Ticket, School, FileText, Building2, CreditCard, User, BarChart2, Image as ImageIcon, Coins } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        const role = profile?.role || null;
        setUserRole(role);

        if (role === "school") {
          const { data: signup } = await supabase
            .from("school_signups")
            .select("status")
            .eq("user_id", user.id)
            .maybeSingle();
          setAccountStatus(signup?.status || null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const adminNavigationItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      path: "/admin/school-signups",
      label: "School Signups",
      icon: School,
    },
    {
      path: "/admin/vendor-signups",
      label: "Vendor Signups",
      icon: Building2,
    },
    {
      path: "/admin/voucher-requests",
      label: "Support Requests",
      icon: Ticket,
    },
    {
      path: "/admin/vendor-vouchers",
      label: "Vendor Vouchers",
      icon: Ticket,
    },
    {
      path: "/vouchers",
      label: "Vouchers",
      icon: Ticket,
    },
    {
      path: "/admin/analytics",
      label: "Analytics",
      icon: BarChart2,
    },
    {
      path: "/admin/impact-cms",
      label: "Impact CMS",
      icon: ImageIcon,
    },
    {
      path: "/admin/denomination-cms",
      label: "Denomination CMS",
      icon: Coins,
    },
    {
      path: "/admin/funding-cms",
      label: "Funding CMS",
      icon: CreditCard,
    },
  ];

  const schoolNavigationItems = [
    {
      path: "/school-dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      path: "/apply",
      label: "Apply for Support",
      icon: FileText,
    },
    {
      path: "/my-applications",
      label: "My Applications",
      icon: Ticket,
    },
  ];

  const vendorNavigationItems = [
    {
      path: "/vendor",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
  ];

  // Guess navigation items from pathname while role is loading to prevent flash
  const getNavigationItems = () => {
    let items = adminNavigationItems;

    if (userRole === "admin") items = adminNavigationItems;
    else if (userRole === "vendor") items = vendorNavigationItems;
    else if (userRole === "school") items = schoolNavigationItems;
    // Fallback to pathname if userRole is null
    else if (pathname?.startsWith("/school-dashboard") || pathname?.startsWith("/apply") || pathname?.startsWith("/my-applications")) {
      items = schoolNavigationItems;
    }
    else if (pathname?.startsWith("/vendor")) {
      items = vendorNavigationItems;
    }

    // Filter items for school users under evaluation (pending, waitlisted, or rejected)
    if ((userRole === "school" || (!userRole && items === schoolNavigationItems)) && accountStatus && accountStatus !== "approved") {
      return items.filter(item => item.path !== "/my-applications");
    }
    
    return items;
  };

  const navigationItems = getNavigationItems();

  const getDashboardTitle = () => {
    if (userRole === "admin") return "Admin Dashboard";
    if (userRole === "vendor") return "Vendor Portal";
    if (userRole === "school") return "GBFF Portal";

    if (pathname?.startsWith("/school-dashboard") || pathname?.startsWith("/apply") || pathname?.startsWith("/my-applications")) {
      return "GBFF Portal";
    }
    if (pathname?.startsWith("/vendor")) {
      return "Vendor Portal";
    }
    return "Admin Dashboard";
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false); // Close mobile menu after navigation
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white text-gray-900 border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-40 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                getDashboardTitle()
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-1">Global Bright Futures</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3 px-4 py-3">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </>
            ) : (
              navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${active
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })
            )}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-950/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

