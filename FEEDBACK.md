# Feedback on building with Vercel

Written by Soumya Dey after building the AI Agent Security Posture Review Workflow on Vercel, as a first-time builder on the platform.

## Four things I liked
1. AI Gateway shows tokens and cost for every request in its logs. I could price a review from real data (about $0.008).
2. A review paused for 12 hours, I shipped new code in between, and the approval still resumed the same run and finished it.
3. A Git push turns into a live deploy within minutes.
4. The Workflows trace shows each step of a run with its duration.

## Three frustrations
1. The workflow tooling (runs, hooks, the `npx workflow web` view) was very hard to follow for someone who is not a native developer. It was Greek to me, because I am not familiar with Next.js, TypeScript or the Linux command line as a developer would be. It should be very easy and intuitive for a new Vercel user.
2. Zero data retention is not available on Hobby. Someone playing with the Hobby tier should have it.
3. The credits were not clear, and finding out what I had was onerous. There was ambiguity about which credits and which team, even as a first-timer on the platform. Intuitive ease of use matters for any product.

## Three suggestions
1. A plain-language, guided view of a workflow run that explains what is happening in each step, aimed at someone new to Vercel.
2. Make zero data retention available on Hobby.
3. One clear credits page that shows the credit type, the balance and the team, and is easy to find.
