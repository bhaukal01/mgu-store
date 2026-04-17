import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

const sections = [
  {
    title: "Eligibility and Account Responsibility",
    body: [
      "You are responsible for activity made through your Minecraft username and payment method when using this store.",
      "If you are under the legal age required in your region, use this store only with parent or guardian permission.",
      "Please ensure your username is entered correctly before placing an order so delivery can complete successfully.",
    ],
  },
  {
    title: "Orders, Pricing, and Payment",
    body: [
      "All prices shown on the store are final at checkout unless a visible discount is applied.",
      "Payments are processed through supported payment partners, and you must use an authorized payment source.",
      "We may cancel or hold suspicious transactions to protect players from fraud and unauthorized purchases.",
    ],
  },
  {
    title: "Digital Delivery and Timing",
    body: [
      "Store items are digital products delivered in-game after successful payment confirmation.",
      "Most deliveries are near-instant, but delays can happen during server maintenance, network issues, or payment verification.",
      "If your purchase has not arrived after a reasonable time, contact support with your order details.",
    ],
  },
  {
    title: "In-Game Conduct and Rank Enforcement",
    body: [
      "Purchased ranks remain subject to all in-game rules and community standards at all times.",
      "Payment for a rank does not grant immunity, special exemption, or permission to violate gameplay, chat, or conduct rules.",
      "If a player breaches network rules, rank benefits may be restricted, suspended, or revoked in line with enforcement policy.",
    ],
  },
  {
    title: "Refunds and Chargebacks",
    body: [
      "Because rank products are digital and can be consumed immediately, refunds are evaluated case-by-case.",
      "Unauthorized chargebacks may result in temporary purchase restrictions until the case is reviewed.",
      "If there is a billing error, contact support first so the team can resolve the issue quickly.",
    ],
  },
  {
    title: "Policy Updates and Contact",
    body: [
      "These terms may be updated when store features, payment flows, or legal requirements change.",
      "By continuing to use the store after updates, you accept the revised terms.",
      "For help, reach out through the official support channel at discord.mgu.one.",
    ],
  },
];

const Terms = () => {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: "0.08em", fontWeight: 800 }}
        >
          USER TERMS
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          Terms of Service
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5 }}>
          These terms explain how players can use the MGU.ONE store, how
          purchases are processed, and what to do if an order issue occurs.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Last updated: April 17, 2026
        </Typography>
      </Paper>

      {sections.map((section) => (
        <Paper
          key={section.title}
          variant="outlined"
          sx={{ p: { xs: 2.5, md: 3 } }}
        >
          <Typography variant="h6">{section.title}</Typography>
          <Stack spacing={1.25} sx={{ mt: 1.25 }}>
            {section.body.map((paragraph) => (
              <Typography key={paragraph} variant="body1">
                {paragraph}
              </Typography>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};

export default Terms;
