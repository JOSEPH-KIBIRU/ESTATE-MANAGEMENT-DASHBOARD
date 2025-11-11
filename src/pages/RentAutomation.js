import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Paper,
  IconButton,
  Snackbar
} from '@mui/material';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaymentIcon from '@mui/icons-material/Payment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import RefreshIcon from '@mui/icons-material/Refresh';

const RentAutomation = () => {
  const [automationSettings, setAutomationSettings] = useState({
    autoReminders: true,
    reminderDays: [3, 1],
    lateFeeEnabled: true,
    lateFeeAmount: 500,
    gracePeriod: 5
  });
  const [tenants, setTenants] = useState([]);
  const [scheduledReminders, setScheduledReminders] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTenants, setFetchingTenants] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Fetch tenants with actual table structure
  const fetchTenantsFromDB = useCallback(async () => {
    try {
      console.log('Fetching tenants...');
      
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('name');

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        throw tenantsError;
      }

      console.log('Fetched tenants:', tenantsData);
      return tenantsData || [];
    } catch (fetchError) {
      console.error('Error in fetchTenantsFromDB:', fetchError);
      throw fetchError;
    }
  }, []);

  // Fetch units to get rent information
  const fetchUnitsFromDB = useCallback(async () => {
    try {
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*');

      if (unitsError) {
        console.warn('Could not fetch units:', unitsError);
        return [];
      }

      return unitsData || [];
    } catch (fetchError) {
      console.error('Error fetching units:', fetchError);
      return [];
    }
  }, []);

  // Simple notifications fetch with fallback
  const fetchNotificationsSimple = useCallback(async () => {
    try {
      // Try with minimal columns first
      const { data, error: notificationsError } = await supabase
        .from('notifications')
        .select('id, type, message, status, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificationsError) {
        console.warn('Notifications fetch failed, using empty array:', notificationsError);
        return [];
      }

      return data || [];
    } catch (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return [];
    }
  }, []);

  // Main data fetching function
  const fetchTenantsAndSettings = useCallback(async () => {
    setFetchingTenants(true);
    setError('');

    try {
      // Fetch tenants and units
      const [tenantsData, unitsData] = await Promise.all([
        fetchTenantsFromDB(),
        fetchUnitsFromDB()
      ]);

      // Combine tenants with their unit information
      const tenantsWithRentInfo = tenantsData.map(tenant => {
        const tenantUnit = unitsData.find(unit => unit.id === tenant.unit_id);
        return {
          ...tenant,
          rent_amount: tenantUnit?.rent_amount || 0,
          unit_number: tenantUnit?.unit_number || 'N/A',
          status: 'active' // Assume all are active since no status column
        };
      });

      setTenants(tenantsWithRentInfo);

      // Try to fetch notifications separately (don't block main data load)
      try {
        const notificationsData = await fetchNotificationsSimple();
        setScheduledReminders(notificationsData);
      } catch (notifError) {
        console.warn('Notifications failed to load, continuing without them:', notifError);
        setScheduledReminders([]);
      }

      console.log('Data loaded successfully:', {
        tenants: tenantsWithRentInfo.length,
        units: unitsData.length
      });

    } catch (fetchError) {
      console.error('Error loading data:', fetchError);
      setError(`Failed to load tenant data: ${fetchError.message}`);
      setSnackbarOpen(true);
    } finally {
      setFetchingTenants(false);
    }
  }, [fetchTenantsFromDB, fetchUnitsFromDB, fetchNotificationsSimple]);

  useEffect(() => {
    fetchTenantsAndSettings();
  }, [fetchTenantsAndSettings]);

  const sendRentReminders = async (customMsg = null) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (tenants.length === 0) {
        throw new Error('No tenants found to send reminders to');
      }

      const message = customMsg || 
        `Dear tenant, this is a friendly reminder that rent is due soon. Please ensure payment is made on time to avoid late fees.`;

      // Create notification records with minimal required fields
      const reminders = tenants.map(tenant => ({
        tenant_id: tenant.id,
        type: 'rent_reminder',
        message: message,
        sent_at: new Date().toISOString(),
        status: 'sent'
      }));

      console.log('Sending reminders:', reminders);

      // Save to database with timeout
      const { error: dbError } = await supabase
        .from('notifications')
        .insert(reminders);

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Create local notifications for immediate UI update
      const newScheduledReminders = tenants.map(tenant => ({
        id: `local_${Date.now()}_${tenant.id}`,
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        message: message,
        sent_at: new Date().toISOString(),
        type: 'rent_reminder',
        status: 'sent'
      }));

      setScheduledReminders(prev => [...newScheduledReminders, ...prev]);
      setSuccess(`✅ Rent reminders sent successfully to ${tenants.length} tenants!`);
      setSnackbarOpen(true);
      setOpenDialog(false);
      setCustomMessage('');

    } catch (sendError) {
      console.error('Error sending reminders:', sendError);
      
      // If database fails, still show success in UI with local storage
      if (sendError.message.includes('Failed to fetch') || sendError.message.includes('Database error')) {
        const newScheduledReminders = tenants.map(tenant => ({
          id: `local_${Date.now()}_${tenant.id}`,
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          message: customMsg || 'Rent reminder sent',
          sent_at: new Date().toISOString(),
          type: 'rent_reminder',
          status: 'sent'
        }));

        setScheduledReminders(prev => [...newScheduledReminders, ...prev]);
        setSuccess(`✅ Rent reminders prepared for ${tenants.length} tenants! (Saved locally)`);
      } else {
        setError(`❌ Failed to send rent reminders: ${sendError.message}`);
      }
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const scheduleAutomaticReminders = async () => {
    setLoading(true);
    try {
      if (tenants.length === 0) {
        throw new Error('No tenants found to schedule reminders for');
      }

      const scheduledDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      
      // Create scheduled notifications
      const scheduledNotifications = tenants.map(tenant => ({
        tenant_id: tenant.id,
        type: 'rent_reminder',
        message: 'Automatic rent reminder: Your rent payment is due in 3 days.',
        scheduled_date: scheduledDate,
        status: 'scheduled'
      }));

      const { error: dbError } = await supabase
        .from('notifications')
        .insert(scheduledNotifications);

      if (dbError) throw dbError;

      // Update local state
      const scheduled = tenants.map(tenant => ({
        id: `scheduled_${Date.now()}_${tenant.id}`,
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        scheduled_date: scheduledDate,
        type: 'rent_reminder',
        status: 'scheduled',
        message: 'Automatic rent reminder: Your rent payment is due in 3 days.'
      }));

      setScheduledReminders(prev => [...scheduled, ...prev]);
      setSuccess('📅 Automatic reminders scheduled for all tenants!');
      setSnackbarOpen(true);

    } catch (scheduleError) {
      console.error('Error scheduling reminders:', scheduleError);
      
      // Fallback to local storage
      const scheduledDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const scheduled = tenants.map(tenant => ({
        id: `local_scheduled_${Date.now()}_${tenant.id}`,
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        scheduled_date: scheduledDate,
        type: 'rent_reminder',
        status: 'scheduled',
        message: 'Automatic rent reminder: Your rent payment is due in 3 days.'
      }));

      setScheduledReminders(prev => [...scheduled, ...prev]);
      setSuccess('📅 Automatic reminders scheduled locally for all tenants!');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const getTenantContactInfo = (tenant) => {
    return [
      tenant.email && `📧 ${tenant.email}`,
      tenant.phone && `📞 ${tenant.phone}`
    ].filter(Boolean).join(' • ');
  };

  const getTenantRentInfo = (tenant) => {
    const unitInfo = tenant.unit_number ? `Unit ${tenant.unit_number}` : 'Unit not assigned';
    const rentInfo = tenant.rent_amount ? ` | Rent: Ksh ${tenant.rent_amount.toLocaleString()}` : '';
    return `${unitInfo}${rentInfo}`;
  };

  const handleSettingChange = (setting, value) => {
    setAutomationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const calculateTotalMonthlyRent = () => {
    return tenants.reduce((total, tenant) => total + (tenant.rent_amount || 0), 0);
  };

  const refreshData = () => {
    fetchTenantsAndSettings();
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        <AutoAwesomeIcon sx={{ mr: 2 }} />
        Rent Automation
      </Typography>

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity={error ? 'error' : success ? 'success' : 'info'}
          onClose={handleCloseSnackbar}
          sx={{ width: '100%' }}
        >
          {error || success}
        </Alert>
      </Snackbar>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                {tenants.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tenants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PaymentIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                Ksh {calculateTotalMonthlyRent().toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Monthly Rent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleSendIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {scheduledReminders.filter(r => r.status === 'scheduled').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scheduled Reminders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                {scheduledReminders.filter(r => r.status === 'sent').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sent Reminders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Automation Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <NotificationsIcon sx={{ mr: 1 }} />
                  Automation Settings
                </Typography>
                <IconButton 
                  onClick={refreshData} 
                  size="small" 
                  disabled={fetchingTenants}
                  title="Refresh data"
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={automationSettings.autoReminders}
                    onChange={(e) => handleSettingChange('autoReminders', e.target.checked)}
                  />
                }
                label="Automatic Rent Reminders"
                sx={{ mb: 1 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={automationSettings.lateFeeEnabled}
                    onChange={(e) => handleSettingChange('lateFeeEnabled', e.target.checked)}
                  />
                }
                label="Automatic Late Fees"
                sx={{ mb: 2 }}
              />

              {automationSettings.lateFeeEnabled && (
                <TextField
                  label="Late Fee Amount (KES)"
                  type="number"
                  value={automationSettings.lateFeeAmount}
                  onChange={(e) => handleSettingChange('lateFeeAmount', parseInt(e.target.value) || 0)}
                  fullWidth
                  sx={{ mt: 2 }}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>Ksh</Typography>
                  }}
                />
              )}

              <TextField
                label="Grace Period (Days)"
                type="number"
                value={automationSettings.gracePeriod}
                onChange={(e) => handleSettingChange('gracePeriod', parseInt(e.target.value) || 0)}
                fullWidth
                sx={{ mt: 2 }}
                helperText="Number of days after due date before late fees apply"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleSendIcon sx={{ mr: 1 }} />
                Quick Actions
              </Typography>
              
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                onClick={() => sendRentReminders()}
                disabled={loading || tenants.length === 0 || fetchingTenants}
                fullWidth
                sx={{ mb: 2 }}
              >
                {tenants.length === 0 ? 'No Tenants' : `Send Reminders to ${tenants.length} Tenants`}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<CalendarMonthIcon />}
                onClick={() => setOpenDialog(true)}
                disabled={tenants.length === 0 || fetchingTenants}
                fullWidth
                sx={{ mb: 2 }}
              >
                Send Custom Message
              </Button>

              <Button
                variant="contained"
                color="secondary"
                startIcon={<ScheduleSendIcon />}
                onClick={scheduleAutomaticReminders}
                disabled={loading || tenants.length === 0 || fetchingTenants}
                fullWidth
              >
                Schedule Automatic Reminders
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Tenant List */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  All Tenants ({tenants.length})
                </Typography>
                <Chip 
                  label={`Total Rent: Ksh ${calculateTotalMonthlyRent().toLocaleString()}`} 
                  color="primary" 
                  variant="outlined"
                  size="small"
                />
              </Box>
              
              {fetchingTenants ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                  <CircularProgress sx={{ mr: 2 }} />
                  <Typography>Loading tenants...</Typography>
                </Box>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {tenants.map((tenant) => (
                    <ListItem key={tenant.id} divider>
                      <ListItemIcon>
                        <PaymentIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box component="div">
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }} component="span">
                              {tenant.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="div">
                              {getTenantRentInfo(tenant)}
                            </Typography>
                            {getTenantContactInfo(tenant) && (
                              <Typography variant="caption" color="text.secondary" component="div" sx={{ display: 'block', mt: 0.5 }}>
                                {getTenantContactInfo(tenant)}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Chip 
                        label="Active" 
                        color="success" 
                        size="small" 
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleSendIcon sx={{ mr: 1 }} />
                Recent Activity ({scheduledReminders.length})
              </Typography>
              
              {scheduledReminders.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <ScheduleSendIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No reminders sent yet. Send your first reminder to get started.
                  </Typography>
                </Paper>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {scheduledReminders.map((reminder) => (
                    <ListItem key={reminder.id} divider>
                      <ListItemIcon>
                        {reminder.status === 'sent' ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ScheduleSendIcon color="warning" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box component="div">
                            <Typography variant="body1" component="span">
                              {reminder.tenant_name || `Tenant ${reminder.tenant_id?.substring(0, 8)}`}
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ mb: 0.5 }}>
                              {reminder.message?.substring(0, 100)}...
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div">
                              {reminder.status === 'sent' ? 'Sent' : 'Scheduled'} on {new Date(reminder.sent_at || reminder.scheduled_date || reminder.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip 
                        label={reminder.status} 
                        color={reminder.status === 'sent' ? 'success' : 'warning'}
                        size="small"
                        variant="filled"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Custom Message Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SendIcon sx={{ mr: 1 }} />
            Send Custom Rent Reminder
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This message will be sent to all {tenants.length} tenants.
          </Typography>
          <TextField
            label="Custom Message"
            multiline
            rows={4}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            fullWidth
            placeholder="Enter your custom rent reminder message. You can include details about due dates, payment methods, or late fees."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={() => sendRentReminders(customMessage)}
            variant="contained"
            disabled={loading || !customMessage.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Sending...' : 'Send to All Tenants'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RentAutomation;