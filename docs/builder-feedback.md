# Builder feedback log

A running log of what I liked or found frustrating about each Vercel product
as I use it during the build. Add a dated entry per product as I go.

## Vercel platform
After the first successful deploy, the confirmation screen showed no Visit button, so I had to find the live URL myself.

## AI Gateway and AI SDK
The AI SDK showed the same "Unauthenticated request… set AI_GATEWAY_API_KEY" message whether my key was missing or just mistyped, and dropped the error code, so a wrong key looked like a missing one. After I fixed the key, the real blocker (AI Gateway needs a credit card on file before it serves requests, even with free credits) only showed up once I printed the raw error myself. Both should be stated plainly in the default error, and the card requirement should be clear at key creation.

AI Gateway returned a 403 until a card was added to unlock the free credits. The error did not make that cause clear, and a generic 502 in my own route hid it until I logged the real message.
