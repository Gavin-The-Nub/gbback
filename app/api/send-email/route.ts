import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, studentName, status, schoolName, programType, type, voucherCode, amount } = body

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


