import { createTheme } from "@mui/material/styles";

export const userTokens = {
    canvas: "#cfccb9",
    panel: "#ece8d8",
    panelRaised: "#f5f2e7",
    panelDark: "#1e2430",
    line: "#323744",
    seam: "#9098a8",
    text: "#141822",
    textMuted: "#4a5160",
    nether: "#a73b30",
    overworld: "#2f6f4a",
    endAccent: "#6c59a6",
    iron: "#7b8191",
};

const hardShadow = "4px 4px 0 #1f2431";
const softInset = "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #aeb4bf";

const userTheme = createTheme({
    spacing: 8,
    shape: {
        borderRadius: 0,
    },
    palette: {
        mode: "light",
        primary: {
            main: userTokens.panelDark,
            contrastText: "#f7f7f7",
        },
        secondary: {
            main: userTokens.nether,
            contrastText: "#ffffff",
        },
        background: {
            default: userTokens.canvas,
            paper: userTokens.panel,
        },
        success: {
            main: userTokens.overworld,
        },
        warning: {
            main: "#a26229",
        },
        error: {
            main: userTokens.nether,
        },
        text: {
            primary: userTokens.text,
            secondary: userTokens.textMuted,
        },
        divider: userTokens.line,
    },
    typography: {
        fontFamily: '"Hanken Grotesk", "Segoe UI", Helvetica, Arial, sans-serif',
        h1: {
            fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
            fontWeight: 800,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
        },
        h2: {
            fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
            fontWeight: 800,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
        },
        h3: {
            fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
        },
        h4: {
            fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
        },
        h5: {
            fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
        },
        h6: {
            fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
        },
        body1: {
            lineHeight: 1.5,
            letterSpacing: "0.01em",
        },
        body2: {
            lineHeight: 1.45,
            letterSpacing: "0.01em",
        },
        button: {
            fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            fontSize: "0.8rem",
        },
    },
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    borderWidth: 2,
                    borderStyle: "solid",
                    minHeight: 42,
                    boxShadow: hardShadow,
                    transition:
                        "transform 110ms steps(2, end), box-shadow 110ms steps(2, end)",
                    "&:hover": {
                        transform: "translate(-1px, -1px)",
                        boxShadow: "5px 5px 0 #1f2431",
                    },
                    "&:active": {
                        transform: "translate(1px, 1px)",
                        boxShadow: "2px 2px 0 #1f2431",
                    },
                },
                contained: {
                    borderColor: "#151922",
                    backgroundColor: userTokens.panelDark,
                    color: "#f8f8f8",
                },
                outlined: {
                    borderColor: userTokens.line,
                    color: userTokens.text,
                    backgroundColor: userTokens.panelRaised,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    border: `2px solid ${userTokens.line}`,
                    boxShadow: `0 0 0 1px ${userTokens.seam}, ${hardShadow}`,
                    backgroundColor: userTokens.panel,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 0,
                    border: `2px solid ${userTokens.line}`,
                    boxShadow: `0 0 0 1px ${userTokens.seam}, ${hardShadow}`,
                    backgroundImage: "none",
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderColor: userTokens.line,
                    backgroundColor: userTokens.panelRaised,
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    backgroundColor: userTokens.panelRaised,
                    boxShadow: softInset,
                },
                notchedOutline: {
                    borderWidth: 2,
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontFamily: '"Orbitron", "Hanken Grotesk", sans-serif',
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    borderBottomWidth: 2,
                },
            },
        },
    },
});

export default userTheme;
