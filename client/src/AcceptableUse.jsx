import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

const sections = [
  {
    title: "Fair and Intended Use",
    body: [
      "Use the store only for legitimate purchases tied to your own gameplay account or authorized gift purchases.",
      "Respect community rules and use purchased ranks in line with the network's player conduct expectations.",
    ],
  },
  {
    title: "Prohibited Activity",
    body: [
      "Do not attempt payment fraud, account impersonation, or unauthorized payment use.",
      "Do not abuse refund or chargeback systems after receiving in-game benefits.",
      "Do not exploit bugs, automate abusive purchase traffic, or interfere with store availability.",
    ],
  },
  {
    title: "Enforcement",
    body: [
      "Violations may lead to order cancellation, restriction from future purchases, or temporary service limitations while a case is reviewed.",
      "Enforcement decisions are made to protect players and maintain a safe purchase environment.",
      "If you think an action was applied incorrectly, contact support with relevant order details.",
    ],
  },
];

const AcceptableUse = () => {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: "0.08em", fontWeight: 800 }}
        >
          COMMUNITY SAFETY
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          Acceptable Use Policy
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5 }}>
          These rules help keep the store fair, safe, and reliable for all
          players using MGU.ONE purchases.
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

export default AcceptableUse;
