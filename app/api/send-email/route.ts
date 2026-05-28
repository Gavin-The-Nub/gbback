import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, studentName, status, schoolName, programType, type, voucherCode, amount } = body

    // Handle school signup notification email
    if (type === "school_signup") {
      const {
        email,
        schoolName,
        contactName,
        contactPhone,
        schoolAddress,
        schoolDistrict,
        schoolType,
        website,
        additionalInfo,
        registrationType,
      } = body

      if (!email || !schoolName || !contactName) {
        return NextResponse.json({ error: "Missing required fields for school signup email" }, { status: 400 })
      }

      const subject = `🏫 New Registration Pending Approval - ${schoolName}`
      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <span style="font-size: 48px;">🏫</span>
            <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px; font-weight: 700;">New School Registration</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Pending Admin Review & Approval</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 16px; margin-bottom: 20px; color: #374151;">
              A new partner registration has been submitted and is currently pending review in the admin dashboard.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
              <h3 style="margin-top: 0; margin-bottom: 15px; color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-size: 16px;">Registration Details</h3>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; width: 40%; font-weight: 600;">Type:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${registrationType || 'School'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Email:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;"><a href="mailto:${email}" style="color: #4f46e5; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">School / Org Name:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${schoolName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Contact Name:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${contactName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Contact Phone:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${contactPhone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Address:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${schoolAddress || 'N/A'}</td>
                </tr>
                ${schoolDistrict ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">School District:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${schoolDistrict}</td>
                </tr>` : ''}
                ${schoolType ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">School Type:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${schoolType}</td>
                </tr>` : ''}
                ${website ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Website:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;"><a href="${website}" target="_blank" style="color: #4f46e5; text-decoration: none;">${website}</a></td>
                </tr>` : ''}
              </table>
            </div>

            ${additionalInfo ? `
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
              <h4 style="margin: 0 0 5px 0; color: #b45309; font-size: 14px;">Additional Information:</h4>
              <p style="margin: 0; font-size: 13px; color: #78350f;">${additionalInfo}</p>
            </div>` : ''}
            
            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="https://app.globalbrightfutures.org/admin/school-signups" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
                Review in Dashboard
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated notification from the Global Bright Futures Portal.
              </p>
            </div>
          </div>
        </body>
      </html>
      `

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Global Bright Futures <onboarding@resend.dev>",
        to: ["partnership@globalbrightfutures.org"],
        subject,
        html: htmlContent,
      })

      if (error) {
        console.error("Resend error sending school signup notification:", error)
        return NextResponse.json({ error: "Failed to send school signup notification" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    // Handle vendor signup notification email
    if (type === "vendor_signup") {
      const {
        email,
        vendorName,
        vendorType,
        country,
        contactName,
        contactPhone,
      } = body

      if (!email || !vendorName || !contactName) {
        return NextResponse.json({ error: "Missing required fields for vendor signup email" }, { status: 400 })
      }

      const subject = `🏢 New Vendor Registration Pending Approval - ${vendorName}`
      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <span style="font-size: 48px;">🏢</span>
            <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px; font-weight: 700;">New Vendor Registration</h1>
            <p style="color: #e0f2fe; margin: 5px 0 0 0; font-size: 14px;">Pending Admin Review & Approval</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 16px; margin-bottom: 20px; color: #374151;">
              A new vendor partner registration has been submitted and is currently pending review in the admin dashboard.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 25px;">
              <h3 style="margin-top: 0; margin-bottom: 15px; color: #0284c7; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-size: 16px;">Vendor Details</h3>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; width: 40%; font-weight: 600;">Vendor Name:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${vendorName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Email:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Vendor Type:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${vendorType}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Country:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${country}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Contact Name:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${contactName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Contact Phone:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 500;">${contactPhone || 'N/A'}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="https://app.globalbrightfutures.org/admin/vendor-signups" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
                Review in Dashboard
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated notification from the Global Bright Futures Portal.
              </p>
            </div>
          </div>
        </body>
      </html>
      `

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Global Bright Futures <onboarding@resend.dev>",
        to: ["vendor@globalbrightfutures.org"],
        subject,
        html: htmlContent,
      })

      if (error) {
        console.error("Resend error sending vendor signup notification:", error)
        return NextResponse.json({ error: "Failed to send vendor signup notification" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    // Handle voucher approval email
    if (type === "voucher_approved") {
      if (!to || !voucherCode || !amount) {
        return NextResponse.json({ error: "Missing required fields for voucher email" }, { status: 400 })
      }

      const subject = "🎉 Your Voucher Request Has Been Approved!"
      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Voucher Approved!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="font-size: 18px; margin-bottom: 20px;">
              Congratulations! Your voucher request has been <strong style="color: #10b981;">approved</strong>!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>School:</strong> ${schoolName || "Your School"}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Amount:</strong> $${amount}</p>
              <p style="margin: 10px 0; font-size: 16px;"><strong>Voucher Code:</strong></p>
              <p style="margin: 5px 0; font-size: 24px; font-weight: bold; font-family: monospace; color: #667eea; letter-spacing: 2px;">
                ${voucherCode}
              </p>
            </div>
            
            <p style="margin-top: 20px;">
              You can now use this voucher code with any of our approved vendors. Log in to your dashboard to view available vendors and manage your vouchers.
            </p>
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #0369a1;">
                <strong>Important:</strong> Keep this voucher code safe and secure. You will need it when redeeming with vendors.
              </p>
            </div>
            
            <p style="margin-top: 20px;">
              If you have any questions, please don't hesitate to reach out to us.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                <strong>Global Bright Futures Foundation Inc.</strong>
              </p>
            </div>
          </div>
        </body>
      </html>
    `

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Global Bright Futures <onboarding@resend.dev>",
        to: [to],
        subject,
        html: htmlContent,
      })

      if (error) {
        console.error("Resend error:", error)
        return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    // Handle support application emails (existing code)
    if (!to || !studentName || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const subject =
      status === "approved"
        ? "🎉 Your Support Application Has Been Approved!"
        : "Support Application Update"

    const htmlContent =
      status === "approved"
        ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Congratulations, ${studentName}!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="font-size: 18px; margin-bottom: 20px;">
              We are thrilled to inform you that your support application has been <strong style="color: #10b981;">approved</strong>!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0;"><strong>School:</strong> ${schoolName}</p>
              <p style="margin: 5px 0;"><strong>Program:</strong> ${programType}</p>
            </div>
            
            <p style="margin-top: 20px;">
              Our team will be in touch with you shortly to discuss the next steps and provide you with more details about your support.
            </p>
            
            <p style="margin-top: 20px;">
              If you have any questions, please don't hesitate to reach out to us.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                <strong>Global Bright Futures Foundation Inc.</strong>
              </p>
            </div>
          </div>
        </body>
      </html>
    `
        : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-top: 0;">Support Application Update</h2>
            
            <p style="font-size: 16px;">
              Dear ${studentName},
            </p>
            
            <p>
              Thank you for your interest in our support program. After careful review, we regret to inform you that we are unable to approve your application at this time.
            </p>
            
            <p>
              We encourage you to apply again in the future, as our programs and availability may change.
            </p>
            
            <p style="margin-top: 20px;">
              If you have any questions about this decision, please feel free to contact us.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                <strong>Global Bright Futures Foundation Inc.</strong>
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Global Bright Futures <onboarding@resend.dev>",
      to: [to],
      subject,
      html: htmlContent,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Email API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}


