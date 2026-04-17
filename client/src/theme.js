import { createTheme } from "@mui/material/styles";

export const brandTokens = {
    canvas: "#f3f1ec",
    surface: "#ffffff",
    border: "#d4d0c6",
    textPrimary: "#1d2530",
    textSecondary: "#5b6573",
    primary: "#1f3a5b",
    primaryHover: "#172b44",
    accent: "#8a6a3d",
    accentSoft: "#f2ece1",
    success: "#1f6a4d",
    warning: "#9a5d23",
    danger: "#a6372a",
};

const theme = createTheme({
    spacing: 8,
    shape: {
        borderRadius: 8,
    },
    palette: {
        mode: "light",
        primary: {
            main: brandTokens.primary,
            dark: brandTokens.primaryHover,
            contrastText: "#ffffff",
        },
        secondary: {
            main: brandTokens.accent,
            contrastText: "#ffffff",
        },
        background: {
            default: brandTokens.canvas,
            paper: brandTokens.surface,
        },
        text: {
            primary: brandTokens.textPrimary,
            secondary: brandTokens.textSecondary,
        },
        success: {
            main: brandTokens.success,
        },
        warning: {
            main: brandTokens.warning,
        },
        error: {
            main: brandTokens.danger,
        },
        divider: brandTokens.border,
    },
    typography: {
        fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif',
        h1: {
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        h2: {
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        h3: {
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        h4: {
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        h5: {
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        h6: {
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        button: {
            fontWeight: 600,
            letterSpacing: "0.02em",
            textTransform: "none",
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    margin: 0,
                    backgroundColor: brandTokens.canvas,
                },
                "*": {
                    boxSizing: "border-box",
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    minHeight: 40,
                    paddingInline: 16,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    border: `1px solid ${brandTokens.border}`,
                    boxShadow: "0 8px 24px rgba(23, 32, 46, 0.08)",
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderColor: brandTokens.border,
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: {
                    height: 3,
                },
            },
        },
    },
});

export default theme;
