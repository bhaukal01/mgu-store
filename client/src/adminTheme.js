import { createTheme } from "@mui/material/styles";

const adminTheme = createTheme({
    spacing: 8,
    shape: {
        borderRadius: 8,
    },
    palette: {
        mode: "light",
        primary: {
            main: "#175CD3",
            dark: "#1849A9",
            contrastText: "#FFFFFF",
        },
        secondary: {
            main: "#344054",
            contrastText: "#FFFFFF",
        },
        info: {
            main: "#1570EF",
            contrastText: "#FFFFFF",
        },
        success: {
            main: "#067647",
            contrastText: "#FFFFFF",
        },
        warning: {
            main: "#B54708",
            contrastText: "#FFFFFF",
        },
        error: {
            main: "#B42318",
            contrastText: "#FFFFFF",
        },
        background: {
            default: "#F2F4F7",
            paper: "#FFFFFF",
        },
        text: {
            primary: "#101828",
            secondary: "#475467",
        },
        divider: "#D0D5DD",
    },
    typography: {
        fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif',
        h1: { fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif', fontWeight: 700 },
        h2: { fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif', fontWeight: 700 },
        h3: { fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif', fontWeight: 700 },
        h4: { fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif', fontWeight: 700 },
        h5: { fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif', fontWeight: 700 },
        h6: { fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif', fontWeight: 700 },
        button: {
            textTransform: "none",
            fontWeight: 600,
            letterSpacing: "0.01em",
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    margin: 0,
                    backgroundColor: "#F2F4F7",
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    border: "1px solid #D0D5DD",
                    boxShadow: "none",
                    backgroundImage: "none",
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    border: "1px solid #D0D5DD",
                    boxShadow: "none",
                    backgroundImage: "none",
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    minHeight: 40,
                    borderRadius: 8,
                    boxShadow: "none",
                    backgroundImage: "none",
                },
                outlined: {
                    borderWidth: 1,
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    backgroundColor: "#F9FAFB",
                    color: "#344054",
                    fontWeight: 700,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 6,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                    fontWeight: 600,
                    minHeight: 46,
                },
            },
        },
    },
});

export default adminTheme;