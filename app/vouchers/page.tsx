"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Ticket, DollarSign, Loader2, CheckCircle, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

type Application = {
  id: string
  student_name: string
  email: string
  phone: string | null
  school_name: string
  district: string | null
  grade_level: string | null
  program_type: string
  student_count: number
  voucher_amount: number | null
  voucher_code: string | null
  country: string
  status: "pending" | "approved" | "rejected"
  applied_date: string
  reviewed_at: string | null
}

export default function VouchersPage() {
  const router = useRouter()
  const [vouchers, setVouchers] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalVouchers: 0,
    totalAmount: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    checkAuth()
  }, [router])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      router.push("/auth/login")
      return
    }

    // Load vouchers once authenticated
    loadVouchers()
  }

  const loadVouchers = async () => {
    try {
      setIsLoading(true)

      // Load approved applications with vouchers
      const { data: appsData, error: appsError } = await supabase
        .from("scholarship_applications")
        .select("*")
        .eq("status", "approved")
        .not("voucher_amount", "is", null)
        .not("voucher_code", "is", null)
        .order("reviewed_at", { ascending: false })

      if (appsError) throw appsError

      const formattedApps = (appsData || []).map((app) => ({
        ...app,
        applied_date: new Date(app.applied_date).toISOString().split("T")[0],
      }))

      setVouchers(formattedApps as Application[])
      
      // Calculate stats
      const totalAmount = formattedApps.reduce(
        (sum, app) => sum + (app.voucher_amount || 0),
        0
      )
      
      setStats({
        totalVouchers: formattedApps.length,
        totalAmount,
      })
    } catch (error: any) {
      console.error("Error loading vouchers:", error)
      toast.error("Failed to load vouchers. Please refresh the page.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName="Admin User" role="admin" />
          <main className="p-6">
            <div className="mb-8">
              <div className="h-9 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>

            {/* Stats Overview Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vouchers List Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg border-2 border-amber-400 shadow-md overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-400 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-20 bg-gray-200 rounded"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-48"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                            <div className="h-6 bg-gray-200 rounded w-32"></div>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                            <div className="h-5 bg-gray-200 rounded w-32"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                            <div className="h-6 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[1, 2, 3, 4].map((j) => (
                            <div key={j} className="space-y-1">
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                              <div className="h-4 bg-gray-200 rounded w-28"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName="Admin User" role="admin" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Vouchers Tracking
            </h1>
            <p className="text-gray-600">
              Track all vouchers issued to approved applications
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Vouchers Issued</h3>
                <Ticket className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalVouchers}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Voucher Amount</h3>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">${stats.totalAmount.toLocaleString()}</div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by student, school, or voucher code..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Vouchers List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">All Vouchers</h2>
            
            {vouchers.filter(v => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                v.student_name?.toLowerCase().includes(q) ||
                v.school_name?.toLowerCase().includes(q) ||
                v.voucher_code?.toLowerCase().includes(q) ||
                v.program_type?.toLowerCase().includes(q)
              );
            }).length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No vouchers found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your search terms
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {vouchers.filter(v => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    v.student_name?.toLowerCase().includes(q) ||
                    v.school_name?.toLowerCase().includes(q) ||
                    v.voucher_code?.toLowerCase().includes(q) ||
                    v.program_type?.toLowerCase().includes(q)
                  );
                }).map((voucher) => (
                  <VoucherCard key={voucher.id} voucher={voucher} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function VoucherCard({ voucher }: { voucher: Application }) {
  return (
    <div className="bg-white rounded-lg border-2 border-amber-400 shadow-md overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-400 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/gbf.png" 
              alt="GBF" 
              className="h-10 w-auto object-contain"
            />
            <div>
              <h3 className="text-sm font-bold text-gray-900">EDUCATION VOUCHER</h3>
              <p className="text-xs text-gray-600">Global Bright Futures Foundation</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 mb-1">Voucher Code</p>
            <p className="font-mono font-bold text-sm text-amber-700 bg-white px-2 py-1 rounded border border-amber-300">
              {voucher.voucher_code}
            </p>
          </div>
        </div>
      </div>

      {/* Compact Body */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Student Name</p>
            <p className="font-semibold text-base text-gray-900">{voucher.student_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="font-bold text-xl text-green-600">${voucher.voucher_amount?.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">School</p>
            <p className="font-medium text-gray-900">{voucher.school_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Program</p>
            <p className="font-medium text-gray-900">{voucher.program_type}</p>
          </div>
          {voucher.reviewed_at && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Issue Date</p>
              <p className="font-medium text-gray-900">
                {new Date(voucher.reviewed_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="font-medium text-green-600">Verified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

