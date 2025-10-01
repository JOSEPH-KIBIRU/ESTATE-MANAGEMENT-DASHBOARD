import { Link, useLocation } from 'react-router-dom';
import { 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton 
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
  ElectricBolt
} from '@mui/icons-material';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <Dashboard />, text: 'Dashboard' },
    { path: '/properties', icon: <Home />, text: 'Properties' },
    { path: '/units', icon: <Apartment />, text: 'Units' },
    { path: '/tenants', icon: <People />, text: 'Tenants' },
    { path: '/utility-billing', icon: <ElectricBolt />, text: 'Utility Billing' },
    { path: '/invoices', icon: <Receipt />, text: 'Invoices' },
    { path: '/payments', icon: <Payment />, text: 'Payments' },
    { path: '/tenant-statement', icon: <Description />, text: 'Statements' },
    { path: '/reports', icon: <Assessment />, text: 'Reports' }
  ];

  return (
    <div style={{ width: '250px', background: '#f5f5f5', height: '100vh' }}>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: '#e3f2fd',
                  borderRight: '3px solid #2196f3',
                  '& .MuiListItemIcon-root': {
                    color: '#2196f3'
                  },
                  '& .MuiListItemText-primary': {
                    color: '#2196f3',
                    fontWeight: 'bold'
                  }
                }
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );
}

export default Sidebar;