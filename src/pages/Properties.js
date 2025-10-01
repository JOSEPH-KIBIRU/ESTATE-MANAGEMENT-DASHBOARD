import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { 
  Button, 
  TextField, 
  Grid, 
  Alert, 
  CircularProgress,
  Box,
  Card,
  CardContent,
  Typography
} from '@mui/material';
import PropertyList from '../components/PropertyList';
import { useNavigate } from 'react-router-dom';

function Properties() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshList, setRefreshList] = useState(false);

  useEffect(() => {
    if (!user) {
      setErrorMessage('You must be logged in to add properties.');
      navigate('/'); // Redirect to Dashboard
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Property name is required';
    else if (name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (!location.trim()) newErrors.location = 'Location is required';
    else if (location.trim().length < 3) newErrors.location = 'Location must be at least 3 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    if (!user) {
      setErrorMessage('You must be logged in to add properties.');
      return;
    }
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('properties').insert([{ 
        name: name.trim(), 
        location: location.trim() 
      }]);
      if (error) throw error;
      setSuccessMessage('Property added successfully!');
      setName('');
      setLocation('');
      setErrors({});
      setRefreshList((prev) => !prev);
    } catch (error) {
      setErrorMessage(`Error adding property: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName('');
    setLocation('');
    setErrors({});
    setSuccessMessage('');
    setErrorMessage('');
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Properties Management
      </Typography>
      
      {/* Success and Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      {user ? (
        <>
          {/* Add Property Form */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'medium' }}>
                Add New Property
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Property Name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    fullWidth
                    margin="normal"
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                    placeholder="Enter property name"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Location"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
                    }}
                    fullWidth
                    margin="normal"
                    error={!!errors.location}
                    helperText={errors.location}
                    required
                    placeholder="Enter property address"
                    multiline
                    rows={1}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleAdd}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                      size="large"
                    >
                      {loading ? 'Adding Property...' : 'Add Property'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={clearForm}
                      disabled={loading}
                    >
                      Clear Form
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Property List */}
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
                All Properties
              </Typography>
              <PropertyList refresh={refreshList} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please log in to manage properties.
        </Alert>
      )}
    </Box>
  );
}

export default Properties;