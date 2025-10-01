import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Grid, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import TenantList from '../components/TenantList';

function Tenants() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshList, setRefreshList] = useState(false);

  // Fetch properties
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

  // Fetch units when propertyId changes
  useEffect(() => {
    const fetchUnits = async () => {
      setUnits([]);
      setUnitId('');
      if (propertyId) {
        const { data, error } = await supabase
          .from('units')
          .select('id, unit_number')
          .eq('property_id', propertyId);
        if (error) {
          setErrorMessage(`Error fetching units: ${error.message}`);
        } else {
          setUnits(data || []);
        }
      }
    };
    if (user) fetchUnits();
  }, [propertyId, user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      setErrorMessage('You must be logged in to add tenants.');
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!propertyId) newErrors.propertyId = 'Please select a property';
    if (!unitId) newErrors.unitId = 'Please select a unit';
    if (!name.trim()) newErrors.name = 'Tenant name is required';
    else if (name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (phone && !/^\+?\d{10,14}$/.test(phone)) newErrors.phone = 'Invalid phone number (10-14 digits)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    if (!user) {
      setErrorMessage('You must be logged in to add tenants.');
      return;
    }
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('tenants').insert([
        {
          unit_id: unitId,
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        },
      ]);
      if (error) throw error;
      setSuccessMessage('Tenant added successfully!');
      setPropertyId('');
      setUnitId('');
      setName('');
      setEmail('');
      setPhone('');
      setRefreshList((prev) => !prev);
    } catch (error) {
      setErrorMessage(`Error adding tenant: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add Tenant</h2>
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
            <FormControl fullWidth margin="normal" error={!!errors.unitId}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                label="Unit"
                disabled={!propertyId}
              >
                <MenuItem value=""><em>Select a unit</em></MenuItem>
                {units.map((unit) => (
                  <MenuItem key={unit.id} value={unit.id}>
                    {unit.unit_number}
                  </MenuItem>
                ))}
              </Select>
              {errors.unitId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{errors.unitId}</p>}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Tenant Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Email (Optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Phone (Optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              margin="normal"
              error={!!errors.phone}
              helperText={errors.phone}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={loading || properties.length === 0 || (propertyId && units.length === 0)}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Adding...' : 'Add Tenant'}
            </Button>
          </Grid>
        </Grid>
      ) : (
        <p>Please log in to add tenants.</p>
      )}
      <h3>Tenant List</h3>
      <TenantList refresh={refreshList} />
    </div>
  );
}

export default Tenants;