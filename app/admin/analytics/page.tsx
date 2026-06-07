"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { FileDown, Download, Loader2, BarChart2, PieChart as PieChartIcon, Table as TableIcon, School, Building2, FileText, Ticket } from "lucide-react"
import { toast } from "sonner"

type SchoolSignup = {
  id: string
  email: string
  school_name: string
  contact_name: string | null
  contact_phone: string | null
  school_address: string | null
  school_district: string | null
  school_type: string | null
  student_count: number | null
  website: string | null
  additional_info: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  country: string | null
}

type VendorSignup = {
  id: string
  email: string
  vendor_name: string
  vendor_type: string | null
  country: string | null
  contact_name: string | null
  contact_phone: string | null
  status: string
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  bank_code: string | null
  payment_notes: string | null
}

type ScholarshipApplication = {
  id: string
  student_name: string
  email: string
  phone: string | null
  school_name: string
  district: string | null
  grade_level: string | null
  program_type: string
  financial_need_description: string | null
  academic_goals: string | null
  student_count: number | null
  voucher_amount: number | null
  country: string | null
  status: string
  applied_date: string
  reviewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  voucher_code: string | null
  submitted_by: string | null
  school_user_id: string | null
  beneficiary_type: string | null
  agreement_accepted: boolean | null
}

type VendorVoucherSubmission = {
  id: string
  voucher_code: string
  status: string
  verification_status: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  invoice_url: string | null
  vendor_id?: string | null
  vendor_name?: string
  email?: string
  student_name?: string | null
  school_name?: string | null
  voucher_amount?: number | null
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolSignup[]>([])
  const [vendors, setVendors] = useState<VendorSignup[]>([])
  const [scholarships, setScholarships] = useState<ScholarshipApplication[]>([])
  const [vouchers, setVouchers] = useState<VendorVoucherSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"schools" | "vendors" | "scholarships" | "vouchers">("schools")

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

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
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch schools
      const { data: schoolData, error: schoolError } = await supabase
        .from("school_signups")
        .select("*")
        .order("created_at", { ascending: false })
      if (schoolError) console.error("School fetch error:", schoolError)
      setSchools((schoolData as SchoolSignup[]) || [])

      // Fetch vendors
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendor_signups")
        .select("*")
        .order("created_at", { ascending: false })
      if (vendorError) console.error("Vendor fetch error:", vendorError)

      // Join bank info from vendor_profiles if available (vendors can update this from their dashboard)
      const vendorsWithProfiles = vendorData ? await Promise.all(
        vendorData.map(async (v: any) => {
          if (v.user_id) {
            const { data: profile } = await supabase
              .from("vendor_profiles")
              .select("bank_name, account_name, account_number, bank_code, payment_notes")
              .eq("id", v.user_id)
              .maybeSingle()

            if (profile) {
              return {
                ...v,
                bank_name: profile.bank_name || v.bank_name,
                account_name: profile.account_name || v.account_name,
                account_number: profile.account_number || v.account_number,
                bank_code: profile.bank_code || v.bank_code,
                payment_notes: profile.payment_notes || v.payment_notes,
              }
            }
          }
          return v
        })
      ) : []

      setVendors((vendorsWithProfiles as VendorSignup[]) || [])

      // Fetch scholarships
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from("scholarship_applications")
        .select("*")
        .order("applied_date", { ascending: false })
      if (scholarshipError) console.error("Scholarship fetch error:", scholarshipError)
      setScholarships((scholarshipData as ScholarshipApplication[]) || [])

      // Fetch vouchers (vendor voucher submissions)
      const { data: voucherData, error: voucherError } = await supabase
        .from("vendor_voucher_submissions")
        .select("*")
        .order("submitted_at", { ascending: false })
      if (voucherError) console.error("Voucher fetch error:", voucherError)
      
      // Fetch vendor profiles and application details for vouchers
      const vouchersWithDetails = voucherData ? await Promise.all(
        voucherData.map(async (v: any) => {
          let vendorName = "Unknown Vendor"
          let vendorEmail = "Unknown Email"
          let studentName = "N/A"
          let schoolName = "N/A"
          let voucherAmount = 0

          if (v.vendor_id) {
            // Fetch vendor profile
            const { data: vendorProfile } = await supabase
              .from("vendor_profiles")
              .select("vendor_name")
              .eq("id", v.vendor_id)
              .maybeSingle()

            if (vendorProfile) {
              vendorName = vendorProfile.vendor_name
            } else {
              const { data: signupData } = await supabase
                .from("vendor_signups")
                .select("vendor_name")
                .eq("user_id", v.vendor_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
              
              if (signupData) {
                vendorName = signupData.vendor_name
              }
            }

            // Fetch vendor email
            const { data: userData } = await supabase
              .from("user_profiles")
              .select("email")
              .eq("id", v.vendor_id)
              .maybeSingle()
              
            if (userData?.email) {
              vendorEmail = userData.email
            }
          }

          // Get application details if voucher_application_id exists
          if (v.voucher_application_id) {
            const { data: appData } = await supabase
              .from("scholarship_applications")
              .select("student_name, school_name, voucher_amount")
              .eq("id", v.voucher_application_id)
              .maybeSingle()
            if (appData) {
              studentName = appData.student_name || "N/A"
              schoolName = appData.school_name || "N/A"
              voucherAmount = appData.voucher_amount || 0
            }
          }

          return {
            ...v,
            vendor_name: vendorName,
            email: vendorEmail,
            student_name: studentName,
            school_name: schoolName,
            voucher_amount: voucherAmount
          }
        })
      ) : []
      
      setVouchers(vouchersWithDetails)

    } catch (error: any) {
      console.error("Error in loadData:", error)
      toast.error("Failed to load analytics data")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to group by month
  const getMonthName = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('default', { month: 'short' })
  }

  const getMonthlyData = (data: any[], dateField: string) => {
    const monthly: { [key: string]: { month: string, count: number } } = {}
    data.forEach(s => {
      const dateVal = s[dateField]
      if (dateVal) {
        const month = getMonthName(dateVal)
        if (!monthly[month]) {
          monthly[month] = { month, count: 0 }
        }
        monthly[month].count++
      }
    })
    return Object.values(monthly).reverse()
  }

  // Helper to get status counts
  const getStatusCounts = (data: any[]) => {
    const counts: { [key: string]: number } = {}
    data.forEach(s => {
      const status = s.status || "unknown"
      counts[status] = (counts[status] || 0) + 1
    })
    return counts
  }

  // Active Tab Data Processing
  const getActiveTabData = () => {
    switch (activeTab) {
      case "schools":
        return {
          data: schools,
          dateField: "created_at",
          nameField: "school_name",
          pieColors: { pending: "#F59E0B", approved: "#10B981", waitlisted: "#3B82F6", rejected: "#EF4444" }
        }
      case "vendors":
        return {
          data: vendors,
          dateField: "created_at",
          nameField: "vendor_name",
          pieColors: { submitted: "#F59E0B", under_review: "#F59E0B", approved: "#10B981", active: "#10B981", suspended: "#6B7280", rejected: "#EF4444", cancelled: "#EF4444" }
        }
      case "scholarships":
        return {
          data: scholarships,
          dateField: "applied_date",
          nameField: "student_name",
          pieColors: { pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444" }
        }
      case "vouchers":
        return {
          data: vouchers,
          dateField: "submitted_at",
          nameField: "voucher_code",
          pieColors: { pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444" }
        }
    }
  }

  const { data: currentData, dateField, nameField, pieColors } = getActiveTabData()
  const barData = getMonthlyData(currentData, dateField)
  const statusCounts = getStatusCounts(currentData)
  
  const pieData = Object.keys(statusCounts).map(status => ({
    name: status.toUpperCase(),
    value: statusCounts[status],
    // @ts-ignore
    color: pieColors[status] || "#9CA3AF"
  })).filter(item => item.value > 0)

  const escapeHtml = (text: string) => {
    if (typeof text !== "string") return text
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  const exportToExcel = () => {
    let headers: string[] = []
    let rows: string[][] = []

    switch (activeTab) {
      case "schools":
        headers = [
          "School Name", "Contact Name", "Contact Phone", "Email", "Country", 
          "School Address", "School District", "School Type", 
          "Website", "Additional Info", "Status", "Signup Date", 
          "Review Notes", "Reviewed Date"
        ]
        rows = schools.map(item => [
          item.school_name || "N/A",
          item.contact_name || "N/A",
          item.contact_phone || "N/A",
          item.email || "N/A",
          item.country || "N/A",
          item.school_address || "N/A",
          item.school_district || "N/A",
          item.school_type || "N/A",
          item.website || "N/A",
          item.additional_info || "N/A",
          item.status || "N/A",
          item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A",
          item.review_notes || "N/A",
          item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : "N/A"
        ])
        break
      case "vendors":
        headers = [
          "Vendor Name", "Vendor Type", "Contact Name", "Contact Phone", "Email", "Country", 
          "Status", "Notes", "Bank Name", "Account Name", "Account Number", 
          "Bank Code", "Signup Date", "Review Notes", "Reviewed Date"
        ]
        rows = vendors.map(item => [
          item.vendor_name || "N/A",
          item.vendor_type || "N/A",
          item.contact_name || "N/A",
          item.contact_phone || "N/A",
          item.email || "N/A",
          item.country || "N/A",
          item.status || "N/A",
          item.notes || "N/A",
          item.bank_name || "N/A",
          item.account_name || "N/A",
          item.account_number || "N/A",
          item.bank_code || "N/A",
          item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A",
          item.review_notes || "N/A",
          item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : "N/A"
        ])
        break
      case "scholarships":
        headers = [
          "Student Name", "Email", "Phone", "School Name", "District", "Grade Level", 
          "Beneficiary Type", "Student Count", "Program Type", "Voucher Amount", 
          "Voucher Code", "Status", "Country", "Financial Need", "Academic Goals", 
          "Agreements Accepted", "Date Applied", "Review Notes (Notes)", "Date Reviewed"
        ]
        rows = scholarships.map(item => [
          item.student_name || "N/A",
          item.email || "N/A",
          item.phone || "N/A",
          item.school_name || "N/A",
          item.district || "N/A",
          item.grade_level || "N/A",
          item.beneficiary_type || "N/A",
          item.student_count !== null && item.student_count !== undefined ? item.student_count.toString() : "1",
          item.program_type || "N/A",
          item.voucher_amount !== null && item.voucher_amount !== undefined ? item.voucher_amount.toString() : "0",
          item.voucher_code || "N/A",
          item.status || "N/A",
          item.country || "N/A",
          item.financial_need_description || "N/A",
          item.academic_goals || "N/A",
          item.agreement_accepted ? "Yes" : "No",
          item.applied_date ? new Date(item.applied_date).toLocaleDateString() : "N/A",
          item.notes || "N/A",
          item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : "N/A"
        ])
        break
      case "vouchers":
        headers = [
          "Voucher Code", "Vendor Name", "Vendor Email", "Student Name", "School Name", 
          "Voucher Amount", "Submission Status", "Verification Status", "Submitted Date", 
          "Invoice URL", "Review Notes", "Reviewed Date"
        ]
        rows = vouchers.map(item => [
          item.voucher_code || "N/A",
          item.vendor_name || "N/A",
          item.email || "N/A",
          item.student_name || "N/A",
          item.school_name || "N/A",
          item.voucher_amount !== null && item.voucher_amount !== undefined ? item.voucher_amount.toString() : "0",
          item.status || "N/A",
          item.verification_status || "N/A",
          item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "N/A",
          item.invoice_url ? `https://ommmrstanzxkgnlzqwwx.supabase.co/storage/v1/object/public/vendor-invoices/${item.invoice_url}` : "N/A",
          item.review_notes || "N/A",
          item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : "N/A"
        ])
        break
    }

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; }
          th { background-color: #F3F4F6; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${activeTab}_analytics.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Excel exported for ${activeTab}`)
  }

  const exportToPdf = async () => {
    toast.info("Preparing PDF download...")
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default
      const element = document.getElementById('pdf-content')
      
      if (!element) {
        toast.error("PDF content template not found")
        return
      }

      const tabNames = {
        schools: "School Signups",
        vendors: "Vendor Signups",
        scholarships: "Scholarship Requests",
        vouchers: "Vendor Vouchers"
      }

      const opt = {
        margin:       0.5,
        filename:     `${activeTab}_analytics_report.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: false, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' as const }
      }

      // We target the hidden div which has FIXED width charts (no ResponsiveContainer)
      // This guarantees html2canvas can read the dimensions!
      await html2pdf().set(opt).from(element).save()
      
      toast.success("PDF downloaded successfully")
    } catch (error) {
      console.error("PDF Export error:", error)
      toast.error("Failed to generate PDF. Please try again.")
    }
  }

  const getStatusBadgeColor = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes("approve") || s.includes("active")) return "bg-green-100 text-green-800"
    if (s.includes("pend") || s.includes("submit") || s.includes("review")) return "bg-yellow-100 text-yellow-800"
    if (s.includes("wait")) return "bg-orange-100 text-orange-800"
    if (s.includes("reject") || s.includes("cancel") || s.includes("suspend")) return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  const tabNames = {
    schools: "School Signups",
    vendors: "Vendor Signups",
    scholarships: "Scholarship Requests",
    vouchers: "Vendor Vouchers"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:pl-64">
        <Header userName="Admin User" role="admin" />
        
        <main id="analytics-content" className="p-6 bg-gray-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
              <p className="text-gray-600">Overview of system data and statuses</p>
            </div>
            
            <div className="flex gap-3 mt-4 md:mt-0 export-buttons">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </button>
              <button
                onClick={exportToPdf}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium"
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6 tabs-header overflow-x-auto">
            {Object.entries(tabNames).map(([key, name]) => (
              <button
                key={key}
                className={`py-2 px-4 font-medium text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  activeTab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab(key as any)}
              >
                {key === "schools" && <School className="h-4 w-4" />}
                {key === "vendors" && <Building2 className="h-4 w-4" />}
                {key === "scholarships" && <FileText className="h-4 w-4" />}
                {key === "vouchers" && <Ticket className="h-4 w-4" />}
                {name}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {/* Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Volume by Month</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#4F46E5" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Status Distribution</h2>
              </div>
              <div className="h-64 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Detailed Data</h2>
              </div>
              <div className="text-sm text-gray-500">Total: {currentData.length} records</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {activeTab === "schools" && (
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District/Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  )}
                  {activeTab === "vendors" && (
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  )}
                  {activeTab === "scholarships" && (
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  )}
                  {activeTab === "vouchers" && (
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === "schools" && (schools as SchoolSignup[]).map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.school_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{item.contact_name || "N/A"}</div>
                        <div className="text-xs text-gray-400">{item.contact_phone || ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{item.school_district || "N/A"}</div>
                        <div className="text-xs text-gray-400">{item.school_type || ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                          {(item.status || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {activeTab === "vendors" && (vendors as VendorSignup[]).map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.vendor_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{item.contact_name || "N/A"}</div>
                        <div className="text-xs text-gray-400">{item.contact_phone || ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.bank_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.account_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.account_number || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.bank_code || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                          {(item.status || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {activeTab === "scholarships" && (scholarships as ScholarshipApplication[]).map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.student_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.school_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.program_type || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {item.voucher_amount !== null && item.voucher_amount !== undefined ? `$${item.voucher_amount.toLocaleString()}` : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{item.voucher_code || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                          {(item.status || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.applied_date ? new Date(item.applied_date).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {activeTab === "vouchers" && (vouchers as VendorVoucherSubmission[]).map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{item.voucher_code || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{item.vendor_name || "N/A"}</div>
                        <div className="text-xs text-gray-400">{item.email || ""}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.student_name || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {item.voucher_amount !== null && item.voucher_amount !== undefined ? `$${item.voucher_amount.toLocaleString()}` : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                          {(item.status || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.verification_status === "valid" ? "bg-green-100 text-green-800" :
                          item.verification_status === "invalid" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {(item.verification_status || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* HIDDEN PDF CONTENT TEMPLATE */}
          {/* This div is rendered off-screen but has FIXED width charts (no ResponsiveContainer) */}
          {/* This guarantees that html2canvas can read the dimensions correctly! */}
          <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <div id="pdf-content" style={{ width: '960px', padding: '20px', backgroundColor: '#F9FAFB' }}>
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E1B4B' }}>
                  {tabNames[activeTab]} Analytics Report
                </h1>
                <p style={{ fontSize: '12px', color: '#4338CA' }}>Generated on {new Date().toLocaleString()}</p>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Records</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{currentData.length}</div>
                </div>
                {/* Add more stats if needed */}
              </div>

              {/* Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Volume by Month</h3>
                  <BarChart width={430} height={200} data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4F46E5" />
                  </BarChart>
                </div>
                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Status Distribution</h3>
                  <PieChart width={430} height={200}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </div>
              </div>

              {/* Table */}
              <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Detailed Records</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: activeTab === 'vendors' ? '7.5px' : '9px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      {activeTab === "schools" && (
                        <>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>School Name</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Contact</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Email</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>District/Type</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Status</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Date</th>
                        </>
                      )}
                      {activeTab === "vendors" && (
                        <>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Vendor Name</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Contact</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Email</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Bank Name</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Account Name</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Account Number</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Bank Code</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Status</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Date</th>
                        </>
                      )}
                      {activeTab === "scholarships" && (
                        <>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Student Name</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Email</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>School</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Program Type</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Voucher Amount</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Code</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Status</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Date</th>
                        </>
                      )}
                      {activeTab === "vouchers" && (
                        <>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Voucher Code</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Vendor Name</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Student Name</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Amount</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Status</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Verification</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px', textAlign: 'left' }}>Date</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === "schools" && (schools as SchoolSignup[]).map((item) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.school_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.contact_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.email || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.school_district || "N/A"} ({item.school_type || "N/A"})</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{(item.status || "N/A").toUpperCase()}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {activeTab === "vendors" && (vendors as VendorSignup[]).map((item) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.vendor_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.contact_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.email || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.bank_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.account_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.account_number || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.bank_code || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{(item.status || "N/A").toUpperCase()}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {activeTab === "scholarships" && (scholarships as ScholarshipApplication[]).map((item) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.student_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.email || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.school_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.program_type || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.voucher_amount !== null ? `$${item.voucher_amount.toLocaleString()}` : "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.voucher_code || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{(item.status || "N/A").toUpperCase()}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.applied_date ? new Date(item.applied_date).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {activeTab === "vouchers" && (vouchers as VendorVoucherSubmission[]).map((item) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.voucher_code || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.vendor_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.student_name || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.voucher_amount !== null && item.voucher_amount !== undefined ? `$${item.voucher_amount.toLocaleString()}` : "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{(item.status || "N/A").toUpperCase()}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{(item.verification_status || "N/A").toUpperCase()}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '6px' }}>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
