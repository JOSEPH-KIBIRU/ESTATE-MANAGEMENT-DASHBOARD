// pages/Dashboard.js
import { Typography, Box, Card, CardContent } from '@mui/material';
import {
  Home,
  Apartment,
  People,
  Receipt,
  Payment,
  Assessment,
  ElectricBolt,
  TrendingUp} from '@mui/icons-material';
import './Dashboard.css';

function Dashboard() {
  // Mock data - replace with actual data from your API
  const stats = [
    { number: '12', label: 'Properties', icon: <Home /> },
    { number: '45', label: 'Units', icon: <Apartment /> },
    { number: '38', label: 'Tenants', icon: <People /> },
    { number: '156', label: 'Payments', icon: <Payment /> }
  ];

  const features = [
    {
      icon: <Home className="feature-icon" />,
      title: 'Property Management',
      description: 'Manage all your properties, add new ones, and track property details efficiently.'
    },
    {
      icon: <Apartment className="feature-icon" />,
      title: 'Unit Management',
      description: 'Organize units within properties, assign tenants, and manage unit-specific details.'
    },
    {
      icon: <People className="feature-icon" />,
      title: 'Tenant Management',
      description: 'Keep track of tenant information, contact details, and rental agreements.'
    },
    {
      icon: <ElectricBolt className="feature-icon" />,
      title: 'Utility Billing',
      description: 'Generate and manage utility bills, track consumption, and send invoices to tenants.'
    },
    {
      icon: <Receipt className="feature-icon" />,
      title: 'Invoice Management',
      description: 'Create, send, and track invoices for rent, utilities, and other charges.'
    },
    {
      icon: <Assessment className="feature-icon" />,
      title: 'Reports & Analytics',
      description: 'Generate comprehensive reports and gain insights into your estate performance.'
    }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        
        {/* Welcome Section */}
        <Box className="welcome-section floating">
          <Typography variant="h1" className="main-title">
            J.K Estate Management
          </Typography>
          <Typography variant="h5" className="subtitle">
            Streamline Your Property Management with Powerful Tools and Insights
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#5d6d7e', 
            fontSize: '1.1rem',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Welcome to your centralized dashboard for managing properties, tenants, 
            payments, and utilities. Everything you need in one place.
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Box className="stats-section">
          {stats.map((stat, index) => (
            <Card key={index} className="stat-card pulse">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h3" className="stat-number">
                  {stat.number}
                </Typography>
                <Typography variant="body2" className="stat-label">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Features Grid */}
        <Box className="features-grid">
          {features.map((feature, index) => (
            <Card key={index} className="feature-card">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" className="feature-title">
                  {feature.title}
                </Typography>
                <Typography variant="body2" className="feature-description">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Call to Action */}
        <Box sx={{ 
          mt: 6, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(17, 169, 159, 0.1), rgba(46, 204, 113, 0.1))',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid rgba(17, 169, 159, 0.2)'
        }}>
          <TrendingUp sx={{ fontSize: 48, color: '#11a99f', mb: 2 }} />
          <Typography variant="h5" sx={{ 
            color: '#2c3e50', 
            fontWeight: '700',
            mb: 2
          }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#5d6d7e',
            maxWidth: '500px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Explore the features above to manage your estate efficiently. 
            Track payments, generate reports, and keep everything organized in one platform.
          </Typography>
        </Box>

      </div>
    </div>
  );
}

export default Dashboard;