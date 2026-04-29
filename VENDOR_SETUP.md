# Vendor System Setup

## Overview
Vendors are partner organizations that need admin approval to use the platform. They follow a similar approval workflow as schools.

## Database Schema

### vendor_signups (Pending Registrations)
- Stores vendor registration requests awaiting approval
- Status values: `submitted`, `under_review`, `approved`, `active`, `suspended`
- Contains all vendor information submitted during signup

### vendor_profiles (Approved Vendors)
- Created when admin approves a vendor signup
- Contains active vendor information
- Status values: `active`, `suspended`
- Links to auth.users via id (UUID)

## Vendor Properties

All fields are stored in both `vendor_signups` and `vendor_profiles`:

- **ID** - UUID (primary key, references auth.users)
- **Vendor Name** - Company/organization name
- **Vendor Type** - Type of vendor (e.g., "Educational Services", "Technology Provider")
- **Country** - Vendor's country
- **Contact Name** - Primary contact person
- **Email** - Contact email (also in auth.users)
- **Phone** - Contact phone number
- **Status** - Current status (submitted/under_review/approved/active/suspended)
- **Notes** - Internal notes for admins

## Signup Flow

1. **Vendor Signs Up**: Goes to `/auth/vendor-signup` and fills registration form
2. **Pending Approval**: Account created in auth.users, vendor_signup record created
3. **Admin Review**: Admin reviews in `/admin/vendor-signups`
4. **Approval/Rejection**: Admin can:
   - Mark as "Under Review"
   - Approve (creates vendor_profiles, sets status to "active")
   - Suspend (requires reason)
5. **Active Vendor**: Once approved, vendor can log in and access vendor dashboard

## Admin Actions

### Status Management
- **Submitted** → **Under Review**: Move to review phase
- **Under Review** → **Approved/Active**: Approve vendor
- **Approved/Active** → **Suspended**: Suspend vendor (requires reason)
- **Suspended** → **Active**: Reactivate vendor



## Access Control

### RLS Policies
- Vendors can view their own profile
- Admins can view all vendor profiles and signups
- Vendors cannot insert/update signups (only admins can)

### Role-Based Access
- **Vendor Role**: `vendor` in user_profiles
- Vendors must have approved `vendor_profiles` to log in
- Suspended vendors cannot log in

## Pages

- `/auth/vendor-signup` - Vendor registration page
- `/admin/vendor-signups` - Admin approval page
- `/vendor` - Vendor dashboard (to be created)

## Integration

The vendor system is integrated with:
- User authentication (Supabase Auth)
- Role-based access control
- Admin dashboard navigation
- Login flow with vendor checks

## Notes

- Vendor signups require admin approval (same as schools)

- Status workflow: submitted → under_review → approved/active
- Suspended vendors are blocked from logging in
