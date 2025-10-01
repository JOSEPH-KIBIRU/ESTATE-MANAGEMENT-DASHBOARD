import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Grid, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import UnitList from '../components/UnitList';

function Units() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [propertyId, setPropertyId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [properties, setProperties] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshList, setRefreshList] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase.from('properties').select('id, name');
      console.log('Fetched properties:', data);
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
      const { error } = await supabase.from('units').insert([{ property_id: propertyId, unit_number: unitNumber.trim() }]);
      if (error) throw error;
      setSuccessMessage('Unit added successfully!');
      setPropertyId('');
      setUnitNumber('');
      setRefreshList((prev) => !prev);
    } catch (error) {
      setErrorMessage(`Error adding unit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add Unit</h2>
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
      {user ? (
        <Grid container spacing={2} sx={{ maxWidth: 600 }}>
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal" error={!!errors.propertyId}>
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
              {errors.propertyId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{errors.propertyId}</p>}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Unit Number"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              fullWidth
              margin="normal"
              error={!!errors.unitNumber}
              helperText={errors.unitNumber}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={loading || properties.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Adding...' : 'Add Unit'}
            </Button>
          </Grid>
        </Grid>
      ) : (
        <p>Please log in to add units.</p>
      )}
      <h3>Unit List</h3>
      <UnitList refresh={refreshList} />
    </div>
  );
}

export default Units;