// pages/Dashboard.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Typography, Box, Card, Button, Alert, Grid } from '@mui/material';
import { Analytics, TrendingUp, Assessment, People, Home, Receipt } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If user is not logged in, show public dashboard
  if (!user) {
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

            <Alert severity="info" sx={{ 
              maxWidth: '600px', 
              margin: '20px auto',
              borderRadius: 2
            }}>
              Please login to access all features and manage your properties
            </Alert>

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
        </div>
      </div>
    );
  }

  // If user is logged in, show the full dashboard with stats and quick access
  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        
        {/* Welcome Section for Logged-in User */}
        <Box className="welcome-section floating">
          <Typography variant="h1" className="main-title">
            Welcome Back!
          </Typography>
          <Typography variant="h5" className="subtitle">
            Here's your property management overview
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#5d6d7e', 
            fontSize: '1.1rem',
            maxWidth: '700px',
            margin: '20px auto 30px',
            lineHeight: '1.6'
          }}>
            Manage your properties, tenants, and finances efficiently from your dashboard.
          </Typography>
        </Box>

        {/* Quick Stats Grid for Logged-in User */}
        <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', borderRadius: 3, cursor: 'pointer' }} onClick={() => navigate('/properties')}>
              <Home sx={{ fontSize: 40, color: '#11a99f', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                5
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Properties
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', borderRadius: 3, cursor: 'pointer' }} onClick={() => navigate('/units')}>
              <Assessment sx={{ fontSize: 40, color: '#3498db', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                25
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Units
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', borderRadius: 3, cursor: 'pointer' }} onClick={() => navigate('/tenants')}>
              <People sx={{ fontSize: 40, color: '#9b59b6', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                20
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tenants
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, textAlign: 'center', borderRadius: 3, cursor: 'pointer' }} onClick={() => navigate('/maintenance')}>
              <TrendingUp sx={{ fontSize: 40, color: '#e67e22', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                3
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maintenance
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions for Logged-in User */}
        <Box sx={{ mt: 4, mb: 6 }}>
          <Typography variant="h4" component="h2" sx={{ 
            fontWeight: 'bold',
            color: '#2c3e50',
            mb: 3
          }}>
            Quick Actions
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/properties')}
                startIcon={<Home />}
                sx={{ 
                  py: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #11a99f, #2ecc71)',
                  justifyContent: 'flex-start',
                  textAlign: 'left'
                }}
              >
                Manage Properties
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/tenants')}
                startIcon={<People />}
                sx={{ 
                  py: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #3498db, #9b59b6)',
                  justifyContent: 'flex-start',
                  textAlign: 'left'
                }}
              >
                Manage Tenants
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => navigate('/payments')}
                startIcon={<Receipt />}
                sx={{ 
                  py: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #e74c3c, #e67e22)',
                  justifyContent: 'flex-start',
                  textAlign: 'left'
                }}
              >
                View Payments
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Feature Highlights (Same as public but with actual functionality) */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" component="h2" sx={{ 
            textAlign: 'center', 
            fontWeight: 'bold',
            color: '#2c3e50',
            mb: 4
          }}>
            Management Tools
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            <Card sx={{ textAlign: 'center', p: 3, borderRadius: 3, cursor: 'pointer' }} onClick={() => navigate('/properties')}>
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
                <Home fontSize="large" />
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Property Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage properties, units, and tenant information efficiently in one place.
              </Typography>
            </Card>

            <Card sx={{ textAlign: 'center', p: 3, borderRadius: 3, cursor: 'pointer' }} onClick={() => navigate('/payments')}>
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
                <Receipt fontSize="large" />
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Financial Tracking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track payments, generate invoices, and monitor financial performance.
              </Typography>
            </Card>

            <Card sx={{ textAlign: 'center', p: 3, borderRadius: 3, cursor: 'pointer' }} onClick={() => navigate('/advanced-analytics')}>
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

      </div>
    </div>
  );
}

export default Dashboard;