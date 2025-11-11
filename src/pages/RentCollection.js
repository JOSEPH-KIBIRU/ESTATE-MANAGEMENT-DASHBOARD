import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  AttachMoney,
  Payment,
  CalendarMonth,
  Send,
  CheckCircle,
} from '@mui/icons-material';

const RentCollection = () => {
  const [tenants, setTenants] = useState([]);
  const [dueRents, setDueRents] = useState([]);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDueRents();
  }, []);

  const fetchDueRents = async () => {
    setLoading(true);
    try {
      // Fetch tenants with their units and rent information
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          email,
          phone,
          units (
            id,
            unit_number,
            rent_amount,
            properties (name)
          )
        `)
        .eq('status', 'active');

      if (tenantsData) {
        setTenants(tenantsData);
        
        // Calculate due rents (simplified - in real app, you'd check actual due dates)
        const dueRentsData = tenantsData.map(tenant => {
          const unit = tenant.units;
          return {
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            unit_info: `${unit.properties.name} - Unit ${unit.unit_number}`,
            due_amount: unit.rent_amount || 0,
            due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0], // 1st of next month
            status: 'pending'
          };
        });

        setDueRents(dueRentsData);
      }
    } catch (error) {
      console.error('Error fetching due rents:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async () => {
    if (!selectedTenant || !paymentData.amount) return;

    setLoading(true);
    try {
      const paymentRecord = {
        tenant_id: selectedTenant.id,
        amount: parseFloat(paymentData.amount),
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes,
        status: 'paid',
        type: 'rent',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('payments')
        .insert([paymentRecord]);

      if (!error) {
        setSuccess(`Payment recorded successfully for ${selectedTenant.name}`);
        setPaymentDialog(false);
        setPaymentData({
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          notes: ''
        });
        fetchDueRents(); // Refresh the list
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendRentReminder = async (tenant) => {
    // In a real app, this would send email/SMS
    console.log(`Sending rent reminder to ${tenant.name}`);
    alert(`Rent reminder sent to ${tenant.name}`);
  };

  const openPaymentDialog = (tenant) => {
    const unit = tenant.units;
    setSelectedTenant(tenant);
    setPaymentData(prev => ({
      ...prev,
      amount: unit.rent_amount?.toString() || ''
    }));
    setPaymentDialog(true);
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: '0 auto', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        <AttachMoney sx={{ mr: 2 }} />
        Rent Collection
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                {tenants.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Tenants
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                Ksh {dueRents.reduce((sum, rent) => sum + rent.due_amount, 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Due
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                {dueRents.filter(rent => rent.status === 'paid').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paid This Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" sx={{ fontWeight: 'bold' }}>
                {dueRents.filter(rent => rent.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Due Rents Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: '600', mb: 3 }}>
                Rent Due This Month
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Tenant</strong></TableCell>
                      <TableCell><strong>Unit</strong></TableCell>
                      <TableCell><strong>Due Amount</strong></TableCell>
                      <TableCell><strong>Due Date</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dueRents.map((rent, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {rent.tenant_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{rent.unit_info}</TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            Ksh {rent.due_amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarMonth fontSize="small" color="action" />
                            {new Date(rent.due_date).toLocaleDateString()}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={rent.status} 
                            color={rent.status === 'paid' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Payment />}
                              onClick={() => openPaymentDialog(tenants.find(t => t.id === rent.tenant_id))}
                            >
                              Record Payment
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Send />}
                              onClick={() => sendRentReminder(tenants.find(t => t.id === rent.tenant_id))}
                            >
                              Remind
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Record Rent Payment
          {selectedTenant && (
            <Typography variant="body2" color="text.secondary">
              for {selectedTenant.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Amount (KES)"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                fullWidth
                type="number"
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>Ksh</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Payment Date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
                  label="Payment Method"
                >
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="mpesa">M-Pesa</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes (Optional)"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                fullWidth
                placeholder="Add any payment reference or notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button 
            onClick={recordPayment}
            variant="contained"
            disabled={loading || !paymentData.amount}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RentCollection;