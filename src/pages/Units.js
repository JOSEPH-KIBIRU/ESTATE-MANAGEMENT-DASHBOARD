import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  TextField, 
  Grid, 
  Alert, 
  CircularProgress, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import { Apartment, Add } from '@mui/icons-material';
import UnitList from '../components/UnitList';

function Units() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [propertyId, setPropertyId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [unitType, setUnitType] = useState('residential');
  const [properties, setProperties] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshList, setRefreshList] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase.from('properties').select('id, name');
      if (error) {
        setErrorMessage(`Error fetching properties: ${error.message}`);
      } else {
        setProperties(data || []);
      }
    };
    if (user) fetchProperties();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setErrorMessage('You must be logged in to add units.');
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!propertyId) newErrors.propertyId = 'Please select a property';
    if (!unitNumber.trim()) newErrors.unitNumber = 'Unit number is required';
    else if (unitNumber.trim().length < 1) newErrors.unitNumber = 'Unit number must be at least 1 character';
    if (!rentAmount || parseFloat(rentAmount) <= 0) newErrors.rentAmount = 'Valid rent amount is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    if (!user) {
      setErrorMessage('You must be logged in to add units.');
      return;
    }
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('units').insert([{ 
        property_id: propertyId, 
        unit_number: unitNumber.trim(),
        rent_amount: parseFloat(rentAmount),
        unit_type: unitType
      }]);
      if (error) throw error;
      setSuccessMessage('Unit added successfully!');
      setPropertyId('');
      setUnitNumber('');
      setRentAmount('');
      setUnitType('residential');
      setRefreshList((prev) => !prev);
    } catch (error) {
      setErrorMessage(`Error adding unit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setPropertyId('');
    setUnitNumber('');
    setRentAmount('');
    setUnitType('residential');
    setErrors({});
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 4 }}>
        <Apartment sx={{ mr: 2 }} />
        Unit Management
      </Typography>

      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
      
      {user ? (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
                Add New Unit
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.propertyId}>
                    <InputLabel>Property</InputLabel>
                    <Select
                      value={propertyId}
                      onChange={(e) => setPropertyId(e.target.value)}
                      label="Property"
                    >
                      <MenuItem value=""><em>Select a property</em></MenuItem>
                      {properties.map((property) => (
                        <MenuItem key={property.id} value={property.id}>
                          {property.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.propertyId && <Typography color="error" variant="caption">{errors.propertyId}</Typography>}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Unit Number"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    fullWidth
                    error={!!errors.unitNumber}
                    helperText={errors.unitNumber}
                    placeholder="e.g., A101, Ground-1"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Unit Type</InputLabel>
                    <Select
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                      label="Unit Type"
                    >
                      <MenuItem value="residential">Residential</MenuItem>
                      <MenuItem value="commercial">Commercial</MenuItem>
                      <MenuItem value="storage">Storage</MenuItem>
                      <MenuItem value="parking">Parking</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Monthly Rent (KES)"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    fullWidth
                    type="number"
                    error={!!errors.rentAmount}
                    helperText={errors.rentAmount}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>Ksh</Typography>
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleAdd}
                      disabled={loading || properties.length === 0}
                      startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                      size="large"
                    >
                      {loading ? 'Adding...' : 'Add Unit'}
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


          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
            All Units
          </Typography>
          <UnitList refresh={refreshList} />
        </>
      ) : (
        <Alert severity="warning">
          Please log in to manage units.
        </Alert>
      )}
    </Box>
  );
}

export default Units;