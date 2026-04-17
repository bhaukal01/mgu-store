import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "When you place an order, we collect details needed to fulfill it, such as Minecraft username, selected product, payment status, and order time.",
      "If you contact support, we may process the information you share so we can resolve your issue.",
      "We do not ask for more personal information than needed to run store checkout and support.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use order information to process payments, deliver in-game purchases, and provide support when a delivery problem occurs.",
      "Basic analytics and operational logs may be used to improve store reliability, reduce failed payments, and prevent abuse.",
      "We do not use player purchase information for unrelated marketing campaigns without clear consent.",
    ],
  },
  {
    title: "Payment and Third-Party Services",
    body: [
      "Payments are handled through approved payment providers, which process your transaction details under their own privacy terms.",
      "The store receives confirmation and limited transaction metadata required to confirm and track your purchase.",
      "Please review your payment provider's policy for full details on their data processing practices.",
    ],
  },
  {
    title: "Data Retention and Security",
    body: [
      "Order records are retained for accounting, fraud prevention, and support history for as long as reasonably necessary.",
      "We apply technical and access controls to protect purchase records and reduce unauthorized access risks.",
      "No online service is risk-free, but security safeguards are continuously reviewed and improved.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You may request help with data correction for incorrect order-linked details, such as username mistakes.",
      "You can contact support to ask privacy-related questions about your store activity and records.",
      "For privacy support, use the official channel at discord.mgu.one.",
    ],
  },
];

const PrivacyPolicy = () => {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: "0.08em", fontWeight: 800 }}
        >
          USER PRIVACY
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          Privacy Policy
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5 }}>
          This policy describes what store information is collected from players
          and how it is used to complete purchases and support requests.
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

export default PrivacyPolicy;
