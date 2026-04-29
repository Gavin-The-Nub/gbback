import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client with service role key (bypasses RLS)
// Try different possible environment variable names
const serviceRoleKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!serviceRoleKey) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Voucher verification may fail due to RLS.")
  console.warn("Available env vars:", {
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasPublicServiceRole: !!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Fallback to anon key if service role not available
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { voucherCode } = await request.json()

    if (!voucherCode) {
      return NextResponse.json(
        { error: "Voucher code is required" },
        { status: 400 }
      )
    }

    // Normalize voucher code
    const normalizedCode = voucherCode.trim().toUpperCase()
    console.log("API: Verifying voucher code:", normalizedCode)
    console.log("API: Using service role key:", !!serviceRoleKey, "Key length:", serviceRoleKey?.length || 0)

    // Check scholarship_applications first (where voucher codes are stored when approved)
    const { data: scholarshipApps, error: scholarshipError } = await supabaseAdmin
      .from("scholarship_applications")
      .select("id, voucher_code, student_name, school_name, voucher_amount, status")
      .eq("voucher_code", normalizedCode)

    console.log("API: Scholarship apps query result:", {
      count: scholarshipApps?.length,
      apps: scholarshipApps,
      error: scholarshipError
    })

    if (scholarshipError) {
      console.error("Error querying scholarship_applications:", scholarshipError)
      return NextResponse.json(
        { error: "Database error", details: scholarshipError.message },
        { status: 500 }
      )
    }

    // NEW: Check if this voucher has already been submitted by a vendor
    const { data: existingSubmissions, error: submissionError } = await supabaseAdmin
      .from("vendor_voucher_submissions")
      .select("id, status, vendor_id")
      .eq("voucher_code", normalizedCode)
      .neq("status", "rejected") // Allow re-submitting if previously rejected

    if (submissionError) {
      console.error("Error checking existing submissions:", submissionError)
    } else if (existingSubmissions && existingSubmissions.length > 0) {
      const submission = existingSubmissions[0]
      const statusText = submission.status === "approved" ? "already redeemed" : "currently pending approval"
      console.log("API: Voucher already submitted:", submission)
      return NextResponse.json({
        valid: false,
        reason: `This voucher code is ${statusText}`,
        status: "already_submitted",
        submission: submission
      })
    }

    // Find approved application
    const approvedApp = scholarshipApps?.find(app => app.status === "approved") || null
    
    if (approvedApp) {
      console.log("API: Found approved application:", approvedApp)
      return NextResponse.json({
        valid: true,
        applicationId: approvedApp.id,
        studentName: approvedApp.student_name,
        schoolName: approvedApp.school_name,
        voucherAmount: approvedApp.voucher_amount,
        status: "approved"
      })
    }

    // If found but not approved
    if (scholarshipApps && scholarshipApps.length > 0) {
      const app = scholarshipApps[0]
      console.log("API: Found application but not approved:", app.status)
      return NextResponse.json({
        valid: false,
        reason: "Voucher code is not approved yet",
        status: app.status
      })
    }

    // If not found in scholarship_applications, check vouchers table
    console.log("API: Not found in scholarship_applications, checking vouchers table...")
    const { data: voucherRecords, error: voucherError } = await supabaseAdmin
      .from("vouchers")
      .select("id, voucher_code, school_id, amount, purpose, status")
      .eq("voucher_code", normalizedCode)

    console.log("API: Vouchers query result:", {
      count: voucherRecords?.length,
      vouchers: voucherRecords,
      error: voucherError
    })

    if (voucherError) {
      console.error("API: Error querying vouchers:", voucherError)
      return NextResponse.json(
        { error: "Database error", details: voucherError.message },
        { status: 500 }
      )
    }

    if (voucherRecords && voucherRecords.length > 0) {
      const voucherRecord = voucherRecords[0]
      console.log("API: Found voucher record:", voucherRecord)
      if (voucherRecord.status === "active") {
        // Try to find the corresponding scholarship application
        const { data: relatedApp } = await supabaseAdmin
          .from("scholarship_applications")
          .select("id")
          .eq("voucher_code", normalizedCode)
          .eq("status", "approved")
          .maybeSingle()

        console.log("API: Related application:", relatedApp)
        return NextResponse.json({
          valid: true,
          applicationId: relatedApp?.id || voucherRecord.id,
          status: "active",
          voucherAmount: voucherRecord.amount
        })
      } else {
        return NextResponse.json({
          valid: false,
          reason: "Voucher code is not active",
          status: voucherRecord.status
        })
      }
    }

    // Not found in either table - try a broader search to debug
    console.log("API: Not found in either table, trying broader search...")
    
    // Try to see what voucher codes exist (for debugging)
    const { data: allVouchers, error: allVouchersError } = await supabaseAdmin
      .from("vouchers")
      .select("voucher_code")
      .limit(10)
    
    const { data: allApps, error: allAppsError } = await supabaseAdmin
      .from("scholarship_applications")
      .select("voucher_code, status")
      .not("voucher_code", "is", null)
      .limit(10)
    
    console.log("API: Sample voucher codes in vouchers table:", {
      data: allVouchers?.map(v => v.voucher_code),
      error: allVouchersError,
      count: allVouchers?.length
    })
    console.log("API: Sample voucher codes in scholarship_applications:", {
      data: allApps?.map(a => ({ code: a.voucher_code, status: a.status })),
      error: allAppsError,
      count: allApps?.length
    })
    
    // Try to find the exact code with a different query
    const { data: exactVoucherMatch } = await supabaseAdmin
      .from("vouchers")
      .select("voucher_code, status, id")
      .ilike("voucher_code", `%${normalizedCode}%`)
    
    const { data: exactAppMatch } = await supabaseAdmin
      .from("scholarship_applications")
      .select("voucher_code, status, id")
      .ilike("voucher_code", `%${normalizedCode}%`)
    
    console.log("API: Partial match search (contains):", {
      vouchers: exactVoucherMatch,
      apps: exactAppMatch
    })
    
    // Try case-insensitive search as last resort
    const { data: caseInsensitiveVouchers } = await supabaseAdmin
      .from("vouchers")
      .select("id, voucher_code, status")
      .ilike("voucher_code", normalizedCode)
      .limit(1)
    
    const { data: caseInsensitiveApps } = await supabaseAdmin
      .from("scholarship_applications")
      .select("id, voucher_code, status")
      .ilike("voucher_code", normalizedCode)
      .limit(1)
    
    console.log("API: Case-insensitive search results:", {
      vouchers: caseInsensitiveVouchers,
      apps: caseInsensitiveApps
    })
    
    if (caseInsensitiveVouchers && caseInsensitiveVouchers.length > 0) {
      const voucher = caseInsensitiveVouchers[0]
      if (voucher.status === "active") {
        return NextResponse.json({
          valid: true,
          applicationId: voucher.id,
          status: "active",
          note: "Found with case-insensitive search"
        })
      }
    }
    
    if (caseInsensitiveApps && caseInsensitiveApps.length > 0) {
      const app = caseInsensitiveApps[0]
      if (app.status === "approved") {
        return NextResponse.json({
          valid: true,
          applicationId: app.id,
          status: "approved",
          note: "Found with case-insensitive search"
        })
      }
    }

    // Not found - return diagnostic info
    console.log("API: Voucher code not found:", normalizedCode)
    return NextResponse.json({
      valid: false,
      reason: "Voucher code not found in database",
      searchedCode: normalizedCode,
      diagnostics: {
        usingServiceRole: !!serviceRoleKey,
        scholarshipAppsFound: scholarshipApps?.length || 0,
        vouchersFound: voucherRecords?.length || 0,
        sampleVoucherCodes: allVouchers?.slice(0, 5).map(v => v.voucher_code) || [],
        sampleAppCodes: allApps?.slice(0, 5).map(a => a.voucher_code) || [],
        partialMatchVouchers: exactVoucherMatch?.length || 0,
        partialMatchApps: exactAppMatch?.length || 0
      }
    })

  } catch (error: any) {
    console.error("Error in verify-voucher API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}