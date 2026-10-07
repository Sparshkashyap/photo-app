# Photo-App Password Reset Email Setup

The password reset flow sends OTP emails through Amazon SES.

## 1. Verify the sender email in SES

AWS Console → SES → ap-south-1 → Identities → Create identity → Email address.

Verify the email address you want Photo-App to send from.

## 2. Store the verified sender in SSM

Run this in PowerShell, replacing the email with your verified SES sender:

```powershell
aws ssm put-parameter --name "/photo-app/PASSWORD_RESET_FROM_EMAIL" --type "String" --value "YOUR_VERIFIED_EMAIL@example.com" --overwrite --region ap-south-1
```

## 3. SES sandbox

If the SES account is still in sandbox mode, the recipient email must also be verified in SES. After SES production access is enabled, normal recipient addresses can receive reset emails.
