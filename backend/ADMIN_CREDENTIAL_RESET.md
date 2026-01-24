# Admin Credential Reset Feature

## Overview
Added a comprehensive admin credential reset system to the HR Center, allowing administrators to reset **Admin ID**, **Email**, and **Password** for other administrators with granular control over which credentials to update.

## Features

### 🔐 **Comprehensive Credential Reset**
- **Admin ID Reset:** Change administrator login ID with uniqueness validation
- **Email Reset:** Update email address with format and uniqueness validation  
- **Password Reset:** Secure password change with confirmation matching
- **Selective Reset:** Choose which credentials to reset (ID, Email, Password, or any combination)
- **Batch Reset:** Reset multiple credentials in a single operation

### 🛡️ **Security Measures**
- Admin-only access (requires admin authentication)
- Comprehensive validation for all credential types
- Confirmation dialogs for destructive actions
- Session invalidation notice
- Status-based restrictions (only active admins)
- Real-time validation feedback

### 🎨 **User Experience**
- Intuitive checkbox-based credential selection
- Visual admin selection with status badges
- Password visibility toggles
- Real-time validation indicators
- Loading states and error handling
- Clear success feedback with changed fields summary

## Backend Implementation

### New API Endpoint
```
PUT /admins/:id/reset-credentials
```

**Request Body:**
```json
{
  "newAdminId": "string (optional)",
  "newEmail": "string (optional)", 
  "newPassword": "string (optional)",
  "confirmPassword": "string (required if newPassword provided)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin ID, Email, Password updated successfully for Admin Name",
  "data": {
    "adminId": "NEW_ADMIN_001",
    "adminName": "Admin Name",
    "email": "newemail@example.com",
    "updatedAt": "2024-01-24T10:30:00.000Z",
    "changedFields": ["Admin ID", "Email", "Password"]
  }
}
```

### Controller Function: `resetAdminCredentials`

**Location:** `backend/src/controllers/admin.controller.ts`

**Validation Rules:**
- ✅ **Admin ID:** Minimum 3 characters, uniqueness check
- ✅ **Email:** Valid email format, uniqueness check  
- ✅ **Password:** Minimum 6 characters, confirmation matching
- ✅ **Admin Existence:** Target admin must exist
- ✅ **Change Detection:** At least one credential must be changed
- ✅ **Secure Hashing:** bcrypt with 12 salt rounds for passwords

**Security Features:**
- Comprehensive input validation
- Duplicate prevention for ID and email
- Secure password hashing
- Audit trail with timestamps
- Sanitized responses (no sensitive data)

### Route Configuration

**Location:** `backend/src/routes/admin.route.ts`

**Endpoint:** `PUT /admins/:id/reset-credentials`

**Middleware Stack:**
1. `authenticateToken` - Verify JWT token
2. `adminOnly` - Ensure admin privileges
3. `resetAdminCredentials` - Execute credential reset

## Frontend Implementation

### Component: `AdminCredentialReset`

**Location:** `frontend/components/AdminCredentialReset.tsx`

**Key Features:**
- 📋 **Admin Selection:** List with status badges and current credentials
- ☑️ **Credential Selection:** Checkbox-based selection for ID/Email/Password
- 🔒 **Secure Inputs:** Password fields with visibility toggles
- ✅ **Real-time Validation:** Live validation indicators for all fields
- ⚠️ **Security Warnings:** Clear notices about session invalidation
- 🎯 **Status Restrictions:** Only active admins can have credentials reset
- 📊 **Progress Feedback:** Loading states and success summaries

**Props:**
```typescript
interface AdminCredentialResetProps {
  adminId: string
  adminName: string
}
```

### Credential Selection Interface

**Admin ID Reset:**
- Checkbox to enable/disable
- Text input for new Admin ID
- Real-time length validation (min 3 chars)
- Uniqueness validation on submit

**Email Reset:**
- Checkbox to enable/disable  
- Email input with format validation
- Real-time format checking
- Uniqueness validation on submit

**Password Reset:**
- Checkbox to enable/disable
- Password input with visibility toggle
- Confirmation password field
- Real-time strength and matching validation

### Integration with HR Center

**Location:** `frontend/app/leave-management/page.tsx`

Added as a dedicated section in the HR Center with:
- Consistent styling with other HR components
- Proper spacing and responsive layout
- Admin authentication checks
- Seamless integration with existing workflow

## User Interface

### Admin Selection
- **Card Layout:** Clean, organized admin list
- **Status Badges:** Visual status indicators (Active/Inactive/Suspended)  
- **Current Info:** Display current Admin ID and Email
- **Action Buttons:** Context-aware reset buttons
- **Restrictions:** Only active admins can have credentials reset

### Credential Reset Dialog
- **Selection Checkboxes:** Choose which credentials to reset
- **Dynamic Inputs:** Fields appear/hide based on selection
- **Secure Password Fields:** Visibility toggles for password inputs
- **Real-time Validation:** Live feedback for all input types
- **Requirements Display:** Visual validation checklist
- **Summary Panel:** Shows selected credentials before submission

### Security Warnings
- **Session Notice:** Warns about session invalidation
- **Confirmation Dialog:** Double-confirmation for destructive action
- **Validation Feedback:** Clear error messages for validation failures
- **Success Summary:** Details of what was changed

## Security Considerations

### Access Control
- ✅ **Admin Authentication Required:** Only authenticated admins can access
- ✅ **Admin Authorization Required:** Only admins can reset credentials
- ✅ **Status Validation:** Only active admins can have credentials reset
- ✅ **Self-Service Restriction:** Could be extended to prevent self-reset

### Credential Security
- ✅ **Strong Password Hashing:** bcrypt with 12 salt rounds
- ✅ **Input Validation:** Comprehensive validation for all credential types
- ✅ **Uniqueness Enforcement:** Prevents duplicate Admin IDs and emails
- ✅ **Format Validation:** Email format and Admin ID length requirements
- ✅ **No Plain Text Storage:** Passwords never stored in plain text

### Audit Trail
- ✅ **Timestamp Updates:** All changes tracked with timestamps
- ✅ **Change Logging:** Response includes list of changed fields
- ✅ **Session Invalidation Notice:** Users warned about session termination
- 📝 **Future Enhancement:** Could implement detailed audit logging

## Validation Rules

### Admin ID Validation
- **Minimum Length:** 3 characters
- **Uniqueness:** Must not exist for another admin
- **Format:** Alphanumeric characters recommended
- **Case Sensitivity:** Treated as case-sensitive

### Email Validation  
- **Format:** Valid email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **Uniqueness:** Must not exist for another admin
- **Length:** Standard email length limits
- **Case Handling:** Stored as provided (case-sensitive)

### Password Validation
- **Minimum Length:** 6 characters
- **Confirmation Required:** Must match confirmation field
- **Strength:** Basic length requirement (could be enhanced)
- **Hashing:** bcrypt with 12 salt rounds

## Testing

### Backend Test
```bash
cd backend
node test-admin-password-reset.js
```

**Test Coverage:**
- ✅ Individual Admin ID reset
- ✅ Individual Email reset  
- ✅ Individual Password reset
- ✅ Combined credential reset (all three)
- ✅ Validation testing
- ✅ Data restoration and cleanup

### Manual Testing Checklist
- [ ] Admin authentication required
- [ ] Admin list loads correctly
- [ ] Status badges display properly
- [ ] Inactive admins cannot be reset
- [ ] Credential selection checkboxes work
- [ ] Input fields show/hide correctly
- [ ] Real-time validation works
- [ ] Duplicate ID/email prevention
- [ ] Password confirmation matching
- [ ] Confirmation dialogs appear
- [ ] Success/error messages display
- [ ] Form resets after success
- [ ] Admin list refreshes with new data

## Usage Instructions

### For Administrators

1. **Access HR Center**
   - Navigate to HR Center from sidebar
   - Scroll to "Admin Credential Reset" section

2. **Select Administrator**
   - Review list of administrators
   - Note status badges (only Active admins can be reset)
   - Click "Reset Credentials" for target admin

3. **Confirm Action**
   - Read security warning carefully
   - Confirm understanding of session invalidation
   - Click "Proceed to Reset"

4. **Select Credentials to Reset**
   - Check boxes for credentials to change:
     - ☑️ Admin ID (login identifier)
     - ☑️ Email Address (contact email)
     - ☑️ Password (login password)
   - Enter new values in revealed fields

5. **Validate and Submit**
   - Watch real-time validation indicators
   - Ensure all requirements are met
   - Review summary of selected changes
   - Click "Reset Credentials"

6. **Verify Success**
   - Check success message with change summary
   - Note updated admin details
   - Inform affected admin of credential changes

### Credential Change Scenarios

**Admin ID Only:**
- Select Admin ID checkbox
- Enter new unique Admin ID (min 3 chars)
- Submit to change login identifier

**Email Only:**
- Select Email checkbox  
- Enter new unique email address
- Submit to change contact email

**Password Only:**
- Select Password checkbox
- Enter new password (min 6 chars)
- Confirm password matching
- Submit to change login password

**Multiple Credentials:**
- Select multiple checkboxes
- Fill in all selected credential fields
- Submit to change all selected credentials at once

### Security Best Practices

1. **Credential Requirements**
   - Use unique, descriptive Admin IDs
   - Use valid, accessible email addresses
   - Use strong passwords (consider longer than 6 chars)
   - Avoid predictable patterns

2. **Communication**
   - Inform affected admin immediately
   - Provide new credentials securely
   - Recommend immediate login test
   - Document changes for audit trail

3. **Access Management**
   - Review admin access regularly
   - Monitor for unauthorized changes
   - Use principle of least privilege
   - Consider session timeout policies

## Future Enhancements

### Security Improvements
- 🔄 **Automatic Session Invalidation:** Force logout on credential reset
- 📧 **Email Notifications:** Notify admin of credential changes
- 🔐 **Password Strength Meter:** Visual password strength indicator
- ⏰ **Password Expiry:** Automatic password expiration
- 🔑 **Two-Factor Authentication:** Additional security layer
- 🚫 **Self-Reset Prevention:** Prevent admins from resetting own credentials

### Functionality Enhancements
- 📊 **Detailed Audit Logging:** Comprehensive change tracking
- 📈 **Bulk Operations:** Reset multiple admin credentials
- 🔄 **Password History:** Prevent password reuse
- 📋 **Credential Templates:** Predefined credential formats
- 🎯 **Role-Based Restrictions:** Limit reset capabilities by admin role

### User Experience Improvements
- 💾 **Draft Saving:** Save partial changes
- 🔍 **Admin Search:** Search and filter admin list
- 📱 **Mobile Optimization:** Better mobile experience
- 🎨 **Credential Preview:** Preview changes before submission
- 📊 **Change History:** View previous credential changes

### Integration Opportunities
- **Employee Management:** Extend to employee credential resets
- **Single Sign-On:** Integration with SSO providers
- **Directory Services:** LDAP/Active Directory integration
- **Compliance Tools:** Integration with compliance systems

## Troubleshooting

### Common Issues

**"Failed to fetch administrators"**
- Check admin authentication status
- Verify API endpoint accessibility
- Review network connectivity
- Check server logs for errors

**"Admin ID already exists"**
- Choose a different Admin ID
- Check existing admin list
- Verify uniqueness requirements
- Consider ID naming conventions

**"Email already exists"**
- Use a different email address
- Check existing admin emails
- Verify email format
- Consider email aliases if needed

**"Passwords do not match"**
- Re-enter both password fields
- Check for typing errors
- Ensure no extra spaces
- Verify caps lock status

**"Invalid email format"**
- Use proper email format (user@domain.com)
- Check for special characters
- Verify domain extension
- Avoid spaces or invalid characters

### API Errors

**400 Bad Request**
- Check request body format
- Verify all required fields
- Review validation requirements
- Check field value formats

**401 Unauthorized**
- Re-authenticate as admin
- Check session validity
- Verify admin privileges
- Review authentication token

**404 Not Found**
- Check admin ID parameter
- Verify admin exists in database
- Review API endpoint URL
- Check admin status

**409 Conflict**
- Admin ID or email already exists
- Choose different values
- Check uniqueness constraints
- Review existing records

**500 Internal Server Error**
- Check server logs for details
- Verify database connectivity
- Review error stack trace
- Contact system administrator

## Summary

The enhanced Admin Credential Reset feature provides comprehensive, secure management of administrator login credentials within the HR Center. With granular control over Admin ID, Email, and Password resets, along with robust validation and security measures, it offers a complete solution for administrative credential management.

**Key Benefits:**
- 🔐 **Comprehensive Security:** Full validation and secure handling
- 🎛️ **Granular Control:** Select exactly which credentials to reset
- 🎨 **Intuitive Interface:** Easy-to-use checkbox-based selection
- 🛡️ **Robust Validation:** Real-time feedback and error prevention
- 📊 **Clear Feedback:** Detailed success and error messages
- ⚡ **Efficient Workflow:** Reset multiple credentials in one operation
- 🔍 **Audit Trail:** Track what was changed and when