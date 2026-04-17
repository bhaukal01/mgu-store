import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

const sections = [
  {
    title: "What Cookies Are Used For",
    body: [
      "Cookies are small browser files that help store preferences and improve checkout reliability.",
      "They can remember session-level settings and support secure interactions between your browser and the store.",
    ],
  },
  {
    title: "Cookie Categories",
    body: [
      "Essential cookies: required for core store behavior such as checkout flow and secure navigation.",
      "Preference cookies: remember non-sensitive choices to make return visits easier.",
      "Performance cookies: help understand page performance and stability so store experience can be improved.",
    ],
  },
  {
    title: "Managing Cookies",
    body: [
      "You can control or clear cookies through browser settings at any time.",
      "Disabling essential cookies may cause checkout or some store features to stop working properly.",
      "For questions about cookie behavior in this store, contact support at discord.mgu.one.",
    ],
  },
];

const CookiesPolicy = () => {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: "0.08em", fontWeight: 800 }}
        >
          USER DATA SETTINGS
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          Cookies Policy
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5 }}>
          This page explains how browser cookies are used to keep store
          interactions stable, secure, and easier to use.
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

export default CookiesPolicy;
