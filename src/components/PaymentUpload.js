/* eslint-disable no-unused-vars */
// components/PaymentUpload.js
import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Paper,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  AttachMoney,
  CalendarToday,
  Payment,
  Receipt,
  Person,
  Home,
  CheckCircle,
  Error as ErrorIcon,
  Schedule
} from '@mui/icons-material';

const PaymentUpload = () => {
  const [formData, setFormData] = useState({
    property_id: '',
    tenant_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0], // Default to today
    payment_method: 'bank_transfer',
    status: 'paid',
    notes: '',
  });

  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTenants, setFetchingTenants] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch properties on component mount
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;
        setProperties(data || []);
      } catch (error) {
        setError('Error loading properties: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Fetch all tenants initially
  useEffect(() => {
    const fetchAllTenants = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            id, 
            name,
            units (
              id,
              unit_number,
              property_id,
              properties (
                id,
                name
              )
            )
          `)
          .order('name', { ascending: true });

        if (error) throw error;
        setTenants(data || []);
      } catch (error) {
        console.error('Error fetching tenants:', error);
      }
    };

    fetchAllTenants();
  }, []);

  // Filter tenants when property is selected
  useEffect(() => {
    if (formData.property_id && tenants.length > 0) {
      setFetchingTenants(true);
      const filtered = tenants.filter(tenant => 
        tenant.units?.property_id === formData.property_id
      );
      setFilteredTenants(filtered);
      setFetchingTenants(false);
      
      // Auto-select first tenant if only one exists
      if (filtered.length === 1 && !formData.tenant_id) {
        setFormData(prev => ({ ...prev, tenant_id: filtered[0].id }));
      }
    } else {
      setFilteredTenants([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.property_id, tenants]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.property_id || !formData.tenant_id || !formData.amount || !formData.payment_date) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tenant_id: formData.tenant_id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();

      if (error) throw error;

      setSuccess(true);
      // Reset form but keep property selection for quick multiple entries
      setFormData({
        ...formData,
        tenant_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      setError('Error uploading payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle color="success" />;
      case 'pending': return <Schedule color="warning" />;
      case 'failed': return <ErrorIcon color="error" />;
      default: return <Payment />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return <AttachMoney />;
      case 'bank_transfer': return <Receipt />;
      case 'credit_card': return <Payment />;
      default: return <Payment />;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          fontWeight: 'bold', 
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}>
          <Payment fontSize="large" />
          Record New Payment
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add payment records for tenants with detailed information
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          Payment recorded successfully!
        </Alert>
      )}

      {/* Payment Form */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 3
          }}>
            <Receipt />
            Payment Details
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Property Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!formData.property_id}>
                  <InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Home fontSize="small" />
                      Property
                    </Box>
                  </InputLabel>
                  <Select
                    name="property_id"
                    value={formData.property_id}
                    onChange={handleChange}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Home fontSize="small" />
                        Property
                      </Box>
                    }
                  >
                    <MenuItem value=""><em>Select a Property</em></MenuItem>
                    {properties.map((property) => (
                      <MenuItem key={property.id} value={property.id}>
                        {property.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Tenant Selection */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  required 
                  error={!formData.tenant_id}
                  disabled={!formData.property_id || fetchingTenants}
                >
                  <InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" />
                      {fetchingTenants ? 'Loading Tenants...' : 'Tenant'}
                    </Box>
                  </InputLabel>
                  <Select
                    name="tenant_id"
                    value={formData.tenant_id}
                    onChange={handleChange}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" />
                        {fetchingTenants ? 'Loading Tenants...' : 'Tenant'}
                      </Box>
                    }
                  >
                    <MenuItem value=""><em>Select a Tenant</em></MenuItem>
                    {filteredTenants.map((tenant) => (
                      <MenuItem key={tenant.id} value={tenant.id}>
                        {tenant.name} 
                        {tenant.units && ` - Unit ${tenant.units.unit_number}`}
                      </MenuItem>
                    ))}
                    {formData.property_id && filteredTenants.length === 0 && !fetchingTenants && (
                      <MenuItem disabled>No tenants found for this property</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              {/* Amount */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  fullWidth
                  required
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="0.00"
                />
              </Grid>

              {/* Payment Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Payment Date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  fullWidth
                  required
                  type="date"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday />
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Payment Method */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Payment fontSize="small" />
                      Payment Method
                    </Box>
                  </InputLabel>
                  <Select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Payment fontSize="small" />
                        Payment Method
                      </Box>
                    }
                  >
                    <MenuItem value="bank_transfer">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Receipt fontSize="small" />
                        Bank Transfer
                      </Box>
                    </MenuItem>
                    <MenuItem value="cash">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachMoney fontSize="small" />
                        Cash
                      </Box>
                    </MenuItem>
                    <MenuItem value="credit_card">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Payment fontSize="small" />
                        Credit Card
                      </Box>
                    </MenuItem>
                    <MenuItem value="other">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Receipt fontSize="small" />
                        Other
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="paid">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle color="success" fontSize="small" />
                        Paid
                      </Box>
                    </MenuItem>
                    <MenuItem value="pending">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule color="warning" fontSize="small" />
                        Pending
                      </Box>
                    </MenuItem>
                    <MenuItem value="failed">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorIcon color="error" fontSize="small" />
                        Failed
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  label="Notes (Optional)"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Add any additional notes about this payment..."
                />
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setFormData({
                        property_id: '',
                        tenant_id: '',
                        amount: '',
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'bank_transfer',
                        status: 'paid',
                        notes: '',
                      });
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    Clear Form
                  </Button>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={loading || !formData.property_id || !formData.tenant_id || !formData.amount}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                    size="large"
                  >
                    {loading ? 'Recording Payment...' : 'Record Payment'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: '600' }}>
          💡 Quick Tips
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Select a property first to see tenants assigned to that property<br/>
          • Amount should be in the local currency (KES)<br/>
          • Use notes to record payment references or special instructions<br/>
          • Keep property selected for quick multiple entries for the same property
        </Typography>
      </Paper>
    </Box>
  );
};

export default PaymentUpload;