import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Grid, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import InvoiceList from '../components/InvoiceList';

function Invoices() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [propertyId, setPropertyId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [invoiceType, setInvoiceType] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
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

  // Fetch tenants when propertyId changes
  useEffect(() => {
    const fetchTenants = async () => {
      setTenants([]);
      setTenantId('');
      if (propertyId) {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, unit_id, units!inner(unit_number, property_id)')
          .eq('units.property_id', propertyId);
        console.log('Fetched tenants for property', propertyId, ':', data);
        if (error) {
          console.error('Tenant fetch error:', error);
          setErrorMessage(`Error fetching tenants: ${error.message}`);
        } else {
          setTenants(data || []);
          if (data.length === 0) {
            setErrorMessage('No tenants found for the selected property.');
          }
        }
      }
    };
    if (user && propertyId) fetchTenants();
  }, [propertyId, user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      setErrorMessage('You must be logged in to create invoices.');
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!propertyId) newErrors.propertyId = 'Please select a property';
    if (!tenantId) newErrors.tenantId = 'Please select a tenant';
    if (!invoiceType) newErrors.invoiceType = 'Please select an invoice type';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    if (!user) {
      setErrorMessage('You must be logged in to create invoices.');
      return;
    }
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Creating invoice with tenant_id:', tenantId);
      // Refresh session to ensure auth
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'authenticated' : 'anonymous');
      if (!session) {
        throw new Error('Authentication session expired. Please log in again.');
      }
      const { data, error } = await supabase.from('invoices').insert([
        {
          tenant_id: tenantId,
          invoice_type: invoiceType,
          amount: parseFloat(amount),
          due_date: dueDate,
        },
      ]).select();
      if (error) throw error;
      console.log('Inserted invoice:', data);
      setSuccessMessage('Invoice created successfully!');
      setPropertyId('');
      setTenantId('');
      setInvoiceType('');
      setAmount('');
      setDueDate('');
      setRefreshList((prev) => !prev);
    } catch (error) {
      console.error('Insert error:', error);
      if (error.message.includes('row-level security policy')) {
        setErrorMessage('Authentication required. Please log in again.');
        navigate('/'); // Redirect to login
      } else {
        setErrorMessage(`Error creating invoice: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Invoice</h2>
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
            <FormControl fullWidth margin="normal" error={!!errors.tenantId}>
              <InputLabel>Tenant</InputLabel>
              <Select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                label="Tenant"
                disabled={!propertyId}
              >
                <MenuItem value=""><em>Select a tenant</em></MenuItem>
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name} (Unit: {tenant.units?.unit_number || 'Unknown'})
                  </MenuItem>
                ))}
              </Select>
              {errors.tenantId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{errors.tenantId}</p>}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal" error={!!errors.invoiceType}>
              <InputLabel>Invoice Type</InputLabel>
              <Select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                label="Invoice Type"
              >
                <MenuItem value=""><em>Select invoice type</em></MenuItem>
                <MenuItem value="Service charge">Service charge</MenuItem>
                <MenuItem value="Water">Water</MenuItem>
                <MenuItem value="Electricity">Electricity</MenuItem>
                <MenuItem value="Land rates">Land rates</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
              </Select>
              {errors.invoiceType && <p style={{ color: 'red', fontSize: '0.75rem' }}>{errors.invoiceType}</p>}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              margin="normal"
              inputProps={{ step: '0.01', min: '0' }}
              error={!!errors.amount}
              helperText={errors.amount}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              error={!!errors.dueDate}
              helperText={errors.dueDate}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={loading || properties.length === 0 || (propertyId && tenants.length === 0)}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </Grid>
        </Grid>
      ) : (
        <p>Please log in to create invoices.</p>
      )}
      <h3>Invoice List</h3>
      <InvoiceList refresh={refreshList} />
    </div>
  );
}

export default Invoices;