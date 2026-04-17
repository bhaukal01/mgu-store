import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${apiBaseUrl}/api/admin/login`, {
        email: cleanEmail,
        password,
      });
      localStorage.setItem("adminToken", response.data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        py: { xs: 4, md: 8 },
        backgroundColor: "background.default",
      }}
    >
      <Container maxWidth="md">
        <Card>
          <Grid container>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  p: { xs: 3, md: 4 },
                  height: "100%",
                  backgroundColor: "#F9FAFB",
                  borderRight: { md: "1px solid" },
                  borderColor: "divider",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ShieldCheck size={20} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Admin Access
                    </Typography>
                  </Stack>
                  <Typography variant="h5">MGU Store Admin Panel</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use this console to monitor purchases, subscriptions, rank
                    assignments, and proxy command delivery.
                  </Typography>
                  <Divider />
                  <Stack spacing={0.75}>
                    <Typography variant="body2" color="text.secondary">
                      Order and revenue tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rank grant and revoke tools
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Proxy health and action management
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h5">Sign in</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Enter your administrator credentials to continue.
                    </Typography>
                  </Box>

                  <Divider />

                  <Box component="form" onSubmit={handleLogin}>
                    <Stack spacing={2}>
                      <TextField
                        id="admin-email"
                        type="email"
                        label="Email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        disabled={loading}
                        size="small"
                        fullWidth
                      />

                      <TextField
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        label="Password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={loading}
                        size="small"
                        fullWidth
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword((v) => !v)}
                                  edge="end"
                                  size="small"
                                  disabled={loading}
                                  aria-label={
                                    showPassword
                                      ? "Hide password"
                                      : "Show password"
                                  }
                                >
                                  {showPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />

                      {error ? <Alert severity="error">{error}</Alert> : null}

                      <Button
                        variant="contained"
                        type="submit"
                        disabled={loading}
                        size="large"
                      >
                        {loading ? "Signing In..." : "Sign In"}
                      </Button>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: "center" }}
                      >
                        Contact the server owner if you need admin access.
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Grid>
          </Grid>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminLogin;
