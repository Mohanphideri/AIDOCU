# DocumentAI authentication UI/performance fixes

Updated the authentication flow in the latest frontend/backend package:

- Removed unnecessary `Content-Type: application/json` headers from body-less requests to reduce avoidable CORS preflights.
- Deduplicated simultaneous CAPTCHA requests, including React development StrictMode double-mounts.
- Enlarged CAPTCHA rendering from 200x70 to 240x82 so the final character is not clipped.
- Fixed auth input icon/text overlap with explicit left/right padding.
- Prevented normal page text from showing a blinking text caret; inputs/textareas retain normal caret behavior.
- Reduced auth-page entrance animation duration for a faster perceived login/signup/reset experience.
- Kept Brevo, Google Sign-In, OTP verification, and existing authentication APIs unchanged.
