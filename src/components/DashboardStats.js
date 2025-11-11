// pages/Dashboard.js
import { Typography, Box, Card, Button } from '@mui/material';
import { Analytics, TrendingUp, Assessment } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardStats from '../components/DashboardStats';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        
        {/* Welcome Section */}
        <Box className="welcome-section floating">
          <Typography variant="h1" className="main-title">
            J.K Estate Management
          </Typography>
          <Typography variant="h5" className="subtitle">
            Streamline Your Property Management with Powerful Tools
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#5d6d7e', 
            fontSize: '1.1rem',
            maxWidth: '700px',
            margin: '20px auto 30px',
            lineHeight: '1.6'
          }}>
            Welcome to your centralized dashboard for managing properties, tenants, 
            payments, and utilities. Everything you need to manage your estate efficiently.
          </Typography>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/properties')}
              startIcon={<TrendingUp />}
              sx={{ 
                px: 4,
                py: 1.5,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #11a99f, #2ecc71)'
              }}
            >
              Manage Properties
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/advanced-analytics')}
              startIcon={<Analytics />}
              sx={{ 
                px: 4,
                py: 1.5,
                borderRadius: 2,
                borderColor: '#11a99f',
                color: '#11a99f',
                '&:hover': {
                  borderColor: '#0d8c83',
                  backgroundColor: 'rgba(17, 169, 159, 0.04)'
                }
              }}
            >
              View Analytics
            </Button>
          </Box>
        </Box>

        {/* Dashboard Stats - ONLY SHOWS ON DASHBOARD PAGE */}
        <Box sx={{ mt: 4 }}>
          <DashboardStats />
        </Box>

        {/* Feature Highlights */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" component="h2" sx={{ 
            textAlign: 'center', 
            fontWeight: 'bold',
            color: '#2c3e50',
            mb: 4
          }}>
            What You Can Do
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            <Card sx={{ textAlign: 'center', p: 3, borderRadius: 3 }}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #11a99f, #2ecc71)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'white'
              }}>
                <TrendingUp fontSize="large" />
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Property Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage properties, units, and tenant information efficiently in one place.
              </Typography>
            </Card>

            <Card sx={{ textAlign: 'center', p: 3, borderRadius: 3 }}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #3498db, #9b59b6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'white'
              }}>
                <Assessment fontSize="large" />
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Financial Tracking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track payments, generate invoices, and monitor financial performance.
              </Typography>
            </Card>

            <Card sx={{ textAlign: 'center', p: 3, borderRadius: 3 }}>
              <Box sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #e74c3c, #e67e22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'white'
              }}>
                <Analytics fontSize="large" />
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Advanced Analytics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get detailed insights and reports on your estate performance.
              </Typography>
            </Card>
          </Box>
        </Box>

        {/* Call to Action for Analytics */}
        <Card sx={{ 
          mt: 6, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(17, 169, 159, 0.05), rgba(46, 204, 113, 0.05))',
          border: '2px dashed rgba(17, 169, 159, 0.3)',
          borderRadius: 3,
          p: 4
        }}>
          <Analytics sx={{ fontSize: 48, color: '#11a99f', mb: 2 }} />
          <Typography variant="h5" sx={{ 
            color: '#2c3e50', 
            fontWeight: '700',
            mb: 2
          }}>
            Ready for Detailed Insights?
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#5d6d7e',
            maxWidth: '500px',
            margin: '0 auto 20px',
            lineHeight: '1.6'
          }}>
            Access comprehensive analytics, financial reports, occupancy rates, 
            and performance metrics to make data-driven decisions for your estate.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/advanced-analytics')}
            startIcon={<Analytics />}
            sx={{ 
              px: 4,
              py: 1.5,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #11a99f, #2ecc71)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d8c83, #27ae60)'
              }
            }}
          >
            Go to Advanced Analytics
          </Button>
        </Card>

      </div>
    </div>
  );
}

export default Dashboard;