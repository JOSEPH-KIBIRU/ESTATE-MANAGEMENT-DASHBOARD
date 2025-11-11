import { Link, useLocation } from 'react-router-dom';
import { 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton,
  Box,
  Typography
} from '@mui/material';
import {
  Dashboard,
  Home,
  Apartment,
  People,
  Receipt,
  Payment,
  Assessment,
  Description,
  ElectricBolt,
  Analytics,
  AutoAwesome,
  Handyman,
  Folder,
  AttachMoney
} from '@mui/icons-material';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <Dashboard />, text: 'Dashboard' },
    { path: '/properties', icon: <Home />, text: 'Properties' },
    { path: '/units', icon: <Apartment />, text: 'Units' },
    { path: '/tenants', icon: <People />, text: 'Tenants' },
    { path: '/utility-billing', icon: <ElectricBolt />, text: 'Utility Billing' },
    { path: '/rent-automation', icon: <AutoAwesome />, text: 'Rent Automation' },
    { path: '/maintenance', icon: <Handyman />, text: 'Maintenance' },
    { path: '/documents', icon: <Folder />, text: 'Documents' },
    { path: '/invoices', icon: <Receipt />, text: 'Invoices' },
    { path: '/payments', icon: <Payment />, text: 'Payments' },
    { path: '/tenant-statement', icon: <Description />, text: 'Statements' },
    { path: '/advanced-analytics', icon: <Analytics />, text: 'Advanced Analytics' },
    { path: '/reports', icon: <Assessment />, text: 'Reports' },
    { path: '/rent-collection', icon: <AttachMoney />, text: 'Rent Collection' }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box 
      sx={{ 
        width: 280, 
        background: 'linear-gradient(180deg, #1e3a5c 0%, #2c5282 100%)',
        height: '200vh',
        color: 'white',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
      }}
    >
      {/* Sidebar Header */}
      <Box 
        sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)'
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 'bold',
            color: 'white'
          }}
        >
          Estate Manager
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            mt: 1,
            display: 'block'
          }}
        >
          Management Dashboard
        </Typography>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ p: 2 }}>
        {menuItems.map((item) => (
          <ListItem 
            key={item.path} 
            disablePadding 
            sx={{ 
              mb: 1,
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <ListItemButton
              component={Link}
              to={item.path}
              sx={{
                borderRadius: 2,
                py: 1.5,
                backgroundColor: isActive(item.path) 
                  ? 'rgba(255,255,255,0.2)' 
                  : 'transparent',
                border: isActive(item.path) 
                  ? '1px solid rgba(255,255,255,0.4)' 
                  : '1px solid transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  transform: 'translateY(-1px)',
                  transition: 'all 0.2s ease'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 45,
                  color: isActive(item.path) ? '#fff' : 'rgba(255,255,255,0.9)'
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  '& .MuiTypography-root': {
                    color: isActive(item.path) ? '#fff' : 'rgba(255,255,255,0.9)',
                    fontWeight: isActive(item.path) ? '600' : '400',
                    fontSize: '0.95rem'
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Sidebar Footer */}
      <Box 
        sx={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}
      >
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.75rem'
          }}
        >
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
}

export default Sidebar;