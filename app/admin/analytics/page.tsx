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
  status: string
  created_at: string
}

type VendorSignup = {
  id: string
  email: string
  vendor_name: string
  status: string
  created_at: string
}

type ScholarshipApplication = {
  id: string
  student_name: string
  email: string
  school_name: string
  program_type: string
  voucher_amount: number | null
  status: string
  applied_date: string
}

type VendorVoucherSubmission = {
  id: string
  voucher_code: string
  status: string
  submitted_at: string
  email?: string
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
        .select("id, email, school_name, status, created_at")
        .order("created_at", { ascending: false })
      if (schoolError) console.error("School fetch error:", schoolError)
      setSchools(schoolData || [])

      // Fetch vendors
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendor_signups")
        .select("id, email, vendor_name, status, created_at")
        .order("created_at", { ascending: false })
      if (vendorError) console.error("Vendor fetch error:", vendorError)
      setVendors(vendorData || [])

      // Fetch scholarships
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from("scholarship_applications")
        .select("id, student_name, email, school_name, program_type, voucher_amount, status, applied_date")
        .order("applied_date", { ascending: false })
      if (scholarshipError) console.error("Scholarship fetch error:", scholarshipError)
      setScholarships(scholarshipData || [])

      // Fetch vouchers (vendor voucher submissions)
      const { data: voucherData, error: voucherError } = await supabase
        .from("vendor_voucher_submissions")
        .select("id, voucher_code, status, submitted_at, vendor_id")
        .order("submitted_at", { ascending: false })
      if (voucherError) console.error("Voucher fetch error:", voucherError)
      
      // Fetch vendor emails for vouchers
      const vouchersWithEmails = voucherData ? await Promise.all(
        voucherData.map(async (v: any) => {
          let email = "N/A"
          if (v.vendor_id) {
            const { data: userData } = await supabase
              .from("user_profiles")
              .select("email")
              .eq("id", v.vendor_id)
              .maybeSingle()
            if (userData?.email) {
              email = userData.email
            }
          }
          return {
            id: v.id,
            voucher_code: v.voucher_code,
            status: v.status,
            submitted_at: v.submitted_at,
            email: email
          }
        })
      ) : []
      
      setVouchers(vouchersWithEmails)

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

  const exportToExcel = () => {
    let headers: string[] = []
    let rows: string[][] = []

    switch (activeTab) {
      case "schools":
        headers = ["School Name", "Email", "Status", "Date"]
        rows = schools.map(item => [item.school_name, item.email, item.status, new Date(item.created_at).toLocaleDateString()])
        break
      case "vendors":
        headers = ["Vendor Name", "Email", "Status", "Date"]
        rows = vendors.map(item => [item.vendor_name, item.email, item.status, new Date(item.created_at).toLocaleDateString()])
        break
      case "scholarships":
        headers = ["Student Name", "School Name", "Email", "Program Type", "Amount", "Status", "Date"]
        rows = scholarships.map(item => [item.student_name, item.school_name, item.email, item.program_type, (item.voucher_amount || 0).toString(), item.status, new Date(item.applied_date).toLocaleDateString()])
        break
      case "vouchers":
        headers = ["Voucher Code", "Vendor Email", "Status", "Date"]
        rows = vouchers.map(item => [item.voucher_code, item.email || "N/A", item.status, new Date(item.submitted_at).toLocaleDateString()])
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
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
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
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 1.5, useCORS: false, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
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
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === "vouchers" ? "Voucher Code" : "Name"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === "scholarships" ? "Program Type" : "Email/Info"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item[nameField] || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activeTab === "scholarships" ? item.program_type : (item.email || "N/A")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                          {item.status ? item.status.toUpperCase() : "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item[dateField] ? new Date(item[dateField]).toLocaleDateString() : "N/A"}
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
            <div id="pdf-content" style={{ width: '800px', padding: '20px', backgroundColor: '#F9FAFB' }}>
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
                  <BarChart width={350} height={200} data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4F46E5" />
                  </BarChart>
                </div>
                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Status Distribution</h3>
                  <PieChart width={350} height={200}>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th style={{ border: '1px solid #E5E7EB', padding: '8px', textAlign: 'left' }}>
                        {activeTab === "vouchers" ? "Voucher Code" : "Name"}
                      </th>
                      <th style={{ border: '1px solid #E5E7EB', padding: '8px', textAlign: 'left' }}>
                        {activeTab === "scholarships" ? "Program Type" : "Email/Info"}
                      </th>
                      <th style={{ border: '1px solid #E5E7EB', padding: '8px', textAlign: 'left' }}>Status</th>
                      <th style={{ border: '1px solid #E5E7EB', padding: '8px', textAlign: 'left' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #E5E7EB', padding: '8px' }}>{item[nameField] || "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '8px' }}>
                          {activeTab === "scholarships" ? item.program_type : (item.email || "N/A")}
                        </td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '8px' }}>{item.status ? item.status.toUpperCase() : "N/A"}</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '8px' }}>
                          {item[dateField] ? new Date(item[dateField]).toLocaleDateString() : "N/A"}
                        </td>
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
