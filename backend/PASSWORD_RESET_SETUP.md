# Photo-App Password Reset Email Setup

The password reset flow sends OTP emails through Amazon SES in **ap-south-1**.

## 1. Verify the sender email

AWS Console → SES → **ap-south-1** → Identities → Create identity → Email address.

Verify the email address Photo-App will send from.

## 2. Store the verified sender in SSM

Run this in PowerShell, replacing the value with the **same verified sender** from step 1:

```powershell
aws ssm put-parameter --name "/photo-app/PASSWORD_RESET_FROM_EMAIL" --type "String" --value "YOUR_VERIFIED_EMAIL@gmail.com" --overwrite --region ap-south-1
```

Check the configured value:

```powershell
aws ssm get-parameter --name "/photo-app/PASSWORD_RESET_FROM_EMAIL" --with-decryption --region ap-south-1 --query "Parameter.Value" --output text
```

## 3. If SES is still in sandbox

The **recipient must also be verified** in SES. For the current Photo-App test accounts, verify the email addresses you actually use for password reset, for example:

```powershell
aws sesv2 create-email-identity --email-identity sparshkashyap655@gmail.com --region ap-south-1
aws sesv2 create-email-identity --email-identity sparshkashyap1234@gmail.com --region ap-south-1
```

AWS will send a verification email. Open it and complete verification.

After verification, check status with:

```powershell
aws sesv2 get-email-identity --email-identity sparshkashyap655@gmail.com --region ap-south-1
```

Repeat for the other address if needed.

## 4. Current error meaning

If Photo-App shows an error like:

`Email address is not verified. The following identities failed the check in region AP-SOUTH-1`

this is an **Amazon SES identity/sandbox configuration issue**, not a frontend forgot-password route issue. The API route and OTP flow are already wired; SES must allow the sender and, while in sandbox, the recipient.

## 5. Production SES access

Once SES production access is enabled, normal recipient email addresses do not need to be individually verified. Keep the sender identity verified.
