// src/components/Navbar.js
import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SidebarContext } from '../context/SidebarContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Alert,
  IconButton
} from '@mui/material';
import { Menu as MenuIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';

function Navbar() {
  const { user, login, logout } = useContext(AuthContext);
  const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);
      setOpen(false);
      setEmail('');
      setPassword('');
      setError('');
    } catch (err) {
      setError(`Login failed: ${err.message}`);
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Hamburger toggle (only when logged in) */}
        {user && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ mr: 2 }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        )}

        <Typography variant="h6" style={{ flexGrow: 1 }}>
          Estate Management Dashboard
        </Typography>

        {user ? (
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        ) : (
          <>
            <Button color="inherit" onClick={() => setOpen(true)}>
              Login
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)}>
              <DialogTitle>Login</DialogTitle>
              <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  margin="normal"
                />
                <Button variant="contained" onClick={handleLogin} sx={{ mt: 2 }}>
                  Login
                </Button>
              </DialogContent>
            </Dialog>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
